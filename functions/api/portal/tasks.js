/**
 * 업무관리(/portal/tasks) — 포탈에 로그인한 계정이면 누구나, 자기 보드만
 *   GET    /api/portal/tasks              → { boards: [...] }
 *   PUT    /api/portal/tasks  { board }   → { ok, rev }  (겹치면 409 { error, board: 저장된 보드 })
 *   DELETE /api/portal/tasks?id=…         → { ok }
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { deleteBoard, listBoards, saveBoard, tasksOwner } from '../../lib/tasksBoards.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });

async function owner(request, env) {
  const session = await portalSession(request, env);
  return session ? { owner: await tasksOwner(env, session.email) } : { response: fail('포탈 로그인이 필요합니다.', 401) };
}

export async function onRequestGet({ env, request }) {
  const { owner: who, response } = await owner(request, env);
  if (response) return response;
  return Response.json({ boards: await listBoards(env, who) }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const { owner: who, response } = await owner(request, env);
  if (response) return response;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const out = await saveBoard(env, who, body?.board);
  if (out.error) return fail(out.error, out.status, out.board ? { board: out.board } : {});
  return Response.json(out, { headers: H });
}

export async function onRequestDelete({ env, request }) {
  const { owner: who, response } = await owner(request, env);
  if (response) return response;
  const out = await deleteBoard(env, who, new URL(request.url).searchParams.get('id') || '');
  return out.error ? fail(out.error, out.status) : Response.json(out, { headers: H });
}
