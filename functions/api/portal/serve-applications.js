/**
 * 섬김 지원 신청서 — 담당자·마스터 전용 (인터뷰하면서 담당자가 입력한다).
 *   GET    /api/portal/serve-applications            → 내가 볼 수 있는 신청서 목록(요약만) + 항목 정의(schema)
 *   GET    /api/portal/serve-applications?id=        → 신청서 한 건(민감 항목 포함, 열람 기록이 남는다). &export=1 이면 내보내기 기록
 *   POST   /api/portal/serve-applications { inquiryId } → "인터뷰 진행 승인"된 문의로 신청서를 만든다(이미 있으면 그것을 돌려준다)
 *   PUT    /api/portal/serve-applications { id, values, submit? } → 저장(자동 저장) / submit 이면 필수 항목 검사 후 제출
 *   PATCH  /api/portal/serve-applications { id, action: 'decide'|'reopen', status?, note? } → 최종 결정(승인·보류·거절) / 다시 열기
 *   DELETE /api/portal/serve-applications?id=        → 삭제(마스터만)
 * 인증: Authorization: Bearer <포탈 세션 토큰>
 */
import { loadReferenceAnswers, REFERENCE_SECTIONS, withOpened } from '../../lib/serveReference.js';
import { portalSession } from '../../lib/hubAccounts.js';
import { SERVE_INQUIRY_PREFIX, canViewServeInquiry, SERVE_REVIEWER_EMAILS } from '../../lib/serveInquiry.js';
import { SERVE_APPLICATION_SECTIONS } from '../../lib/serveApplicationSchema.js';
import {
  APP_PREFIX, canAccessServeApplication, isOnlineAppViewer, createApplication, loadApplication, loadFullApplication, saveApplication,
  cleanApplicationValues, missingRequired, addAudit, summarize, listApplications, deleteApplication, RETENTION_DAYS,
} from '../../lib/serveApplication.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const json = body => Response.json(body, { headers: H });

async function requireSession(request, env) {
  const session = await portalSession(request, env);
  if (!session) return { res: fail('포탈 로그인이 필요합니다.', 401) };
  const allowed = session.role === 'master' || Object.values(SERVE_REVIEWER_EMAILS).flat().includes(session.email) || isOnlineAppViewer(session);
  if (!allowed) return { res: fail('이 화면을 볼 권한이 없습니다.', 403) };
  return { session };
}

export async function onRequestGet({ env, request }) {
  const g = await requireSession(request, env);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const meta = { schema: SERVE_APPLICATION_SECTIONS, retentionDays: RETENTION_DAYS, me: { email: g.session.email, role: g.session.role } };
  if (!id) {
    const apps = (await listApplications(env)).filter(a => canAccessServeApplication(g.session, a));
    return json({ ...meta, applications: apps.map(summarize) });
  }
  let app;
  try { app = await loadFullApplication(env, id); } catch (error) { return fail(error.message, 500); }
  if (!app) return fail('신청서를 찾을 수 없습니다.', 404);
  if (!canAccessServeApplication(g.session, app)) return fail('이 신청서를 볼 권한이 없습니다.', 403);
  // 열람·내보내기 기록 (같은 사람의 열람은 5분에 한 번만 남긴다)
  const stored = await loadApplication(env, id);
  addAudit(stored, g.session.email, url.searchParams.get('export') ? 'export' : 'view', { minGapMinutes: url.searchParams.get('export') ? 0 : 5 });
  await env.CAMP_KV.put(`${APP_PREFIX}${id}`, JSON.stringify(stored));
  // 온라인 지원서의 추천서(암호화 저장) — 검토 권한이 있는 사람에게만
  const referenceAnswers = {};
  for (const n of [1, 2]) { try { const a = await loadReferenceAnswers(env, id, n); if (a) referenceAnswers[n] = a; } catch (error) { referenceAnswers[n] = { error: error.message }; } }
  return json({ ...meta, referenceSchema: REFERENCE_SECTIONS, application: { ...app, references: await withOpened(env, app.references), audit: stored.audit, referenceAnswers } });
}

export async function onRequestPost({ env, request }) {
  const g = await requireSession(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const inquiryKey = `${SERVE_INQUIRY_PREFIX}${String(body?.inquiryId || '')}`;
  const inquiry = body?.inquiryId ? await env.CAMP_KV.get(inquiryKey, 'json') : null;
  if (!inquiry) return fail('문의를 찾을 수 없습니다.', 404);
  if (!canViewServeInquiry(g.session, inquiry)) return fail('이 문의를 처리할 권한이 없습니다.', 403);
  if (inquiry.status !== 'interview') return fail('"인터뷰 진행 승인"한 문의만 신청서를 만들 수 있습니다.', 409);
  if (inquiry.applicationId) {
    const existing = await loadApplication(env, inquiry.applicationId);
    if (existing) return json({ ok: true, application: summarize(existing), existing: true });
  }
  const app = await createApplication(env, { inquiry, by: g.session.email });
  inquiry.applicationId = app.id;
  inquiry.history = [...(inquiry.history || []), { at: new Date().toISOString(), by: g.session.email, action: 'application' }];
  await env.CAMP_KV.put(inquiryKey, JSON.stringify(inquiry));
  return json({ ok: true, application: summarize(app) });
}

export async function onRequestPut({ env, request }) {
  const g = await requireSession(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  let app;
  try { app = await loadFullApplication(env, String(body?.id || '')); } catch (error) { return fail(error.message, 500); }
  if (!app) return fail('신청서를 찾을 수 없습니다.', 404);
  if (!canAccessServeApplication(g.session, app)) return fail('이 신청서를 수정할 권한이 없습니다.', 403);
  if (!['draft', 'submitted'].includes(app.status)) return fail('결정이 끝난 신청서는 수정할 수 없습니다. 먼저 "다시 열기"를 해 주세요.', 409);

  const merged = { ...app.values, ...cleanApplicationValues(body.values) };
  if (body.submit) {
    const missing = missingRequired(merged);
    if (missing.length) return fail('필수 항목이 비어 있습니다.', 400, { missing });
    app.status = 'submitted';
    app.submittedAt = new Date().toISOString();
    addAudit(app, g.session.email, 'submit');
  } else {
    addAudit(app, g.session.email, 'save', { minGapMinutes: 10 });
  }
  await saveApplication(env, app, merged);
  return json({ ok: true, appStatus: app.status, updatedAt: app.updatedAt });
}

export async function onRequestPatch({ env, request }) {
  const g = await requireSession(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const app = await loadApplication(env, String(body?.id || ''));
  if (!app) return fail('신청서를 찾을 수 없습니다.', 404);
  if (!canAccessServeApplication(g.session, app)) return fail('이 신청서를 처리할 권한이 없습니다.', 403);
  const note = String(body.note || '').trim().slice(0, 500);
  const now = new Date().toISOString();
  if (body.action === 'decide') {
    if (!['approved', 'hold', 'rejected'].includes(body.status)) return fail('결정은 승인·보류·거절 중에서 골라 주세요.');
    if (app.status === 'draft') return fail('신청서를 먼저 제출해 주세요.', 409);
    app.status = body.status; app.decidedAt = now; app.decidedBy = g.session.email;
    addAudit(app, g.session.email, `decide:${body.status}`, { note });
  } else if (body.action === 'reopen') {
    app.status = app.submittedAt ? 'submitted' : 'draft'; delete app.decidedAt; delete app.decidedBy;
    addAudit(app, g.session.email, 'reopen', { note });
  } else {
    return fail('알 수 없는 처리입니다.');
  }
  app.updatedAt = now;
  await env.CAMP_KV.put(`${APP_PREFIX}${app.id}`, JSON.stringify(app));
  return json({ ok: true, application: summarize(app) });
}

export async function onRequestDelete({ env, request }) {
  const g = await requireSession(request, env);
  if (g.res) return g.res;
  if (g.session.role !== 'master') return fail('신청서 삭제는 마스터만 할 수 있습니다.', 403);
  const id = new URL(request.url).searchParams.get('id');
  const target = id ? await loadApplication(env, id) : null;
  if (!target) return fail('신청서를 찾을 수 없습니다.', 404);
  if (!canAccessServeApplication(g.session, target)) return fail('이 신청서를 삭제할 권한이 없습니다.', 403);   // 온라인 지원서는 볼 수 있는 사람만
  await deleteApplication(env, id);
  return json({ ok: true });
}
