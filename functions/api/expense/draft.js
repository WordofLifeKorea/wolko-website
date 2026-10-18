/**
 * 경비 리포트 임시저장 — 브라우저(localStorage)가 아니라 로그인한 계정에 귀속된다.
 *   GET    /api/expense/draft   → { draft: { form, updatedAt } | null }
 *   PUT    /api/expense/draft   body: { form }  → { ok, updatedAt }   (계정마다 1개, 마지막 저장이 이긴다)
 *   DELETE /api/expense/draft   → { ok }        (제출 완료 · "작성 내용 지우기")
 * 다른 기기·다른 브라우저에서 로그인해도 같은 초안을 이어서 쓸 수 있다. 임시 영수증 파일(receipt.js)과 같은 30일 동안 보관한다.
 */
import { MAX_ROWS, MAX_RECEIPTS_PER_ROW, err, clip, expenseSession } from '../../lib/expenses.js';

export const DRAFT_PREFIX = 'expense:draft:';
export const DRAFT_TTL = 60 * 60 * 24 * 30;
const MAX_DRAFT_BYTES = 200 * 1024;
const JSON_HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
const draftKey = email => `${DRAFT_PREFIX}${email}`;

/** 화면이 보낸 초안을 안전한 모양으로 정리한다 — 줄 수·영수증 수·글자 수 제한, 수정 중인 리포트는 저장하지 않는다. */
export function sanitizeDraft(form) {
  if (!form || typeof form !== 'object' || !Array.isArray(form.rows) || !form.rows.length) return null;
  const rows = form.rows.slice(0, MAX_ROWS).map(row => {
    const r = row && typeof row === 'object' ? { ...row } : {};
    r.receipts = (Array.isArray(r.receipts) ? r.receipts : []).slice(0, MAX_RECEIPTS_PER_ROW)
      .filter(f => f && typeof f === 'object')
      .map(f => ({ ...f, id: clip(f.id, 80), fid: clip(f.fid || f.id, 80), name: clip(f.name, 160), type: clip(f.type, 60) }));
    return r;
  });
  return { editingId: null, description: clip(form.description, 500), project: clip(form.project, 200), rows };
}

export async function onRequestGet({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  const draft = await env.CAMP_KV.get(draftKey(session.email), 'json');
  return Response.json({ draft: draft && draft.form ? draft : null }, { headers: JSON_HEADERS });
}

export async function onRequestPut({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const form = sanitizeDraft(body?.form);
  if (!form) return err('저장할 내용이 없습니다.');
  const updatedAt = Date.now();
  const text = JSON.stringify({ form, updatedAt });
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES) return err('임시저장 내용이 너무 큽니다.', 413);
  await env.CAMP_KV.put(draftKey(session.email), text, { expirationTtl: DRAFT_TTL });
  return Response.json({ ok: true, updatedAt }, { headers: JSON_HEADERS });
}

export async function onRequestDelete({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  await env.CAMP_KV.delete(draftKey(session.email));
  return Response.json({ ok: true }, { headers: JSON_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } });
}
