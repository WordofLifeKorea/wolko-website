/**
 * 포탈 첫 화면의 기도제목 나눔 — 포탈에 로그인한 계정이면 누구나
 *   GET    /api/portal/prayers[?all=1]               → { prayers: [...], total } (최근 것부터 10개, all=1 이면 지난 것까지 전부)
 *   POST   /api/portal/prayers  { text, anonymous? } → 기도제목 올리기
 *   POST   /api/portal/prayers  { action:'pray', id } → "함께 기도해요" 켜고 끄기
 *   POST   /api/portal/prayers  { action:'edit', id, title, text, anonymous? } → 내가 올린 것 고치기 (본인만)
 *   DELETE /api/portal/prayers?id=…                  → 내가 올린 것 지우기 (본인만)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { addPrayer, editPrayer, prayerBoard, removePrayer, togglePrayed } from '../../lib/prayers.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

const wantsAll = request => new URL(request.url).searchParams.get('all') === '1';

async function need(request, env) {
  const session = await portalSession(request, env);
  return session ? { session } : { response: fail('포탈 로그인이 필요합니다.', 401) };
}

export async function onRequestGet({ env, request }) {
  const { session, response } = await need(request, env);
  if (response) return response;
  return Response.json(await prayerBoard(env, session, { all: wantsAll(request) }), { headers: H });
}

export async function onRequestPost({ env, request }) {
  const { session, response } = await need(request, env);
  if (response) return response;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  if (body?.action === 'pray') {
    const out = await togglePrayed(env, session, String(body.id || ''));
    return out.error ? fail(out.error, out.status) : Response.json(out, { headers: H });
  }
  if (body?.action === 'edit') {
    const edited = await editPrayer(env, session, String(body.id || ''), body);
    if (edited.error) return fail(edited.error, edited.status);
    return Response.json({ ok: true, translated: edited.translated, ...(await prayerBoard(env, session, { all: wantsAll(request) })) }, { headers: H });
  }
  const out = await addPrayer(env, session, body);
  if (out.error) return fail(out.error, out.status);
  return Response.json({ ok: true, translated: out.translated, ...(await prayerBoard(env, session, { all: wantsAll(request) })) }, { status: 201, headers: H });
}

export async function onRequestDelete({ env, request }) {
  const { session, response } = await need(request, env);
  if (response) return response;
  const out = await removePrayer(env, session, new URL(request.url).searchParams.get('id') || '');
  return out.error ? fail(out.error, out.status) : Response.json({ ok: true, ...(await prayerBoard(env, session, { all: wantsAll(request) })) }, { headers: H });
}
