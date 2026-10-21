/**
 * "섬기고 싶어요" 문의 받은함 — 담당자·마스터 전용.
 *   GET   /api/portal/serve-inquiries                → 내가 볼 수 있는 문의 목록 (마스터는 전체, 담당자는 자기 언어만)
 *   PATCH /api/portal/serve-inquiries  { id, action, note? }
 *         action: interview(인터뷰 진행 승인) | hold(보류) | reject(거절) | reopen(다시 열기) | reassign(다른 언어 담당자에게 넘기기)
 * 인증: Authorization: Bearer <포탈 세션 토큰>
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { SERVE_INQUIRY_PREFIX, canViewServeInquiry, loadServeInquiries, findDuplicates, SERVE_REVIEWER_EMAILS } from '../../lib/serveInquiry.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

const ACTIONS = {
  interview: { status: 'interview' },
  hold: { status: 'hold' },
  reject: { status: 'rejected' },
  reopen: { status: 'new' },
};

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const all = await loadServeInquiries(env);
  const mine = all.filter(item => canViewServeInquiry(session, item));
  if (session.role !== 'master' && !mine.length && !Object.values(SERVE_REVIEWER_EMAILS).flat().includes(session.email)) {
    return fail('이 화면을 볼 권한이 없습니다.', 403);
  }
  const inquiries = mine.map(item => ({ ...item, duplicates: findDuplicates(all, item) }));
  return Response.json({ me: { email: session.email, role: session.role }, inquiries }, { headers: H });
}

export async function onRequestPatch({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const key = `${SERVE_INQUIRY_PREFIX}${String(body?.id || '')}`;
  const inquiry = body?.id ? await env.CAMP_KV.get(key, 'json') : null;
  if (!inquiry) return fail('문의를 찾을 수 없습니다.', 404);
  if (!canViewServeInquiry(session, inquiry)) return fail('이 문의를 처리할 권한이 없습니다.', 403);

  const action = String(body.action || '');
  const note = String(body.note || '').trim().slice(0, 500);
  const now = new Date().toISOString();
  if (action === 'reassign') {
    inquiry.lang = inquiry.lang === 'ko' ? 'en' : 'ko';
  } else if (ACTIONS[action]) {
    inquiry.status = ACTIONS[action].status;
    if (action === 'interview') { inquiry.approvedAt = now; inquiry.approvedBy = session.email; }
  } else {
    return fail('알 수 없는 처리입니다.');
  }
  inquiry.history = [...(inquiry.history || []), { at: now, by: session.email, action, ...(note ? { note } : {}) }];
  await env.CAMP_KV.put(key, JSON.stringify(inquiry));
  return Response.json({ ok: true, inquiry }, { headers: H });
}
