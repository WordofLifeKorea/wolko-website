/**
 * 추천서 작성 — 메일로 받은 개인 링크(/reference/?t=…)가 부르는 공개 API. 포탈 로그인 없음, 토큰이 곧 권한.
 *   GET  /api/apply/reference?t=TOKEN   지원자 이름 · 추천인 이름 · 상태 · 질문
 *   POST /api/apply/reference { t, answers }   추천서 제출(한 번만) → 암호화 저장 · 신청서의 추천인 상태 '답변 받음' · 담당자 알림
 */
import { REFERENCE_SECTIONS, cleanReferenceAnswers, missingReference, refKey, TOKEN_RE, saveReferenceAnswers } from '../../lib/serveReference.js';
import { loadApplication, loadFullApplication, saveApplication, addAudit } from '../../lib/serveApplication.js';
import { reviewersFor } from '../../lib/serveInquiry.js';
import { MASTER_EMAILS, normalizeEmail, sendEmail } from '../../lib/hubAccounts.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const PAGE_URL = 'https://wolko.org/portal/serve-applications/';
const REPLY_DAYS = 14;

async function lookup(env, token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  const key = await refKey(token);
  const record = await env.CAMP_KV.get(key, 'json');
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) return null;
  return { key, record };
}

export async function onRequestGet({ env, request }) {
  const found = await lookup(env, new URL(request.url).searchParams.get('t'));
  if (!found) return fail('This link is invalid or has expired. · 링크가 올바르지 않거나 기한이 지났습니다.', 404);
  const r = found.record;
  const app = await loadApplication(env, r.appId);
  const docNo = app?.refNo ? `REF-${app.refNo}-${r.n}` : '';
  const dueAt = new Date(new Date(r.sentAt).getTime() + REPLY_DAYS * 86400000).toISOString();   // 요청 메일에 적은 회신 기한과 같다
  return Response.json({ applicant: r.applicant, referee: r.name, refereeKo: r.nameKo, n: r.n, status: r.status, completedAt: r.completedAt || null, expiresAt: r.expiresAt, sentAt: r.sentAt, dueAt, docNo, sections: REFERENCE_SECTIONS }, { headers: H });
}

export async function onRequestPost({ env, request, waitUntil }) {
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const found = await lookup(env, body?.t);
  if (!found) return fail('This link is invalid or has expired. · 링크가 올바르지 않거나 기한이 지났습니다.', 404);
  const { key, record } = found;
  if (record.status === 'completed') return fail('This reference has already been submitted. · 이미 제출된 추천서입니다.', 409);
  const answers = cleanReferenceAnswers(body?.answers);
  const missing = missingReference(answers);
  if (missing.length) return fail('Please complete all required fields. · 필수 항목을 모두 작성해 주세요.', 400, { missing });

  const now = new Date().toISOString();
  await saveReferenceAnswers(env, record.appId, record.n, { ...answers, submittedAt: now, email: record.email });
  record.status = 'completed'; record.completedAt = now;
  await env.CAMP_KV.put(key, JSON.stringify(record), { expirationTtl: 60 * 86400 });

  const app = await loadFullApplication(env, record.appId);
  if (app) {
    app.references = (app.references || []).map(x => (x.n === record.n ? { ...x, status: 'completed', completedAt: now } : x));
    addAudit(app, `referee:${record.email}`, 'reference', { note: `ref${record.n}` });
    await saveApplication(env, app, { ...app.values, [`ref${record.n}Status`]: 'received' });
    const lang = app.lang;
    const notify = async () => {
      if (!env.RESEND_API_KEY) return;
      const to = [...new Set([...reviewersFor(lang), ...MASTER_EMAILS.map(normalizeEmail)])];
      await sendEmail(env, { to, subject: lang === 'en' ? '[WOLKO] A reference was submitted' : '[WOLKO] 추천서가 도착했습니다', html: `<div style="word-break:keep-all;font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;"><p>${lang === 'en' ? `Reference ${record.n} has been submitted for application ${app.refNo || ''}.` : `신청서 ${app.refNo || ''}의 추천인 ${record.n} 추천서가 도착했습니다.`}</p><p><a href="${PAGE_URL}">${PAGE_URL}</a></p></div>` }).catch(e => console.error('reference notify failed:', e.message));
    };
    if (waitUntil) waitUntil(notify()); else await notify();
  }
  return Response.json({ ok: true }, { headers: H });
}
