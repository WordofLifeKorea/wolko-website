/**
 * 업무관리(/portal/tasks) — 포탈에 로그인한 계정이면 누구나. 내 프로젝트와 내가 속한 팀의 팀 프로젝트
 *   GET    /api/portal/tasks                    → { boards: [...], teams: [{ id, name }] (내가 속한 팀) }
 *   PUT    /api/portal/tasks  { board }         → { ok, rev, canDelete }  (겹치면 409 { error, board: 저장된 보드 })
 *                                                 board.team = 팀 id 면 팀 프로젝트, board.prevTeam 이 있으면 공유 범위를 옮긴 것
 *   DELETE /api/portal/tasks?id=…[&team=…]      → { ok }
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { canManageTeams, readTeams } from '../../lib/portalTeams.js';
import { deleteBoard, listBoards, saveBoard, tasksOwner } from '../../lib/tasksBoards.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });

async function context(request, env) {
  const session = await portalSession(request, env);
  if (!session) return { response: fail('포탈 로그인이 필요합니다.', 401) };
  const { teams, members } = await readTeams(env);
  const mine = members[String(session.email || '').toLowerCase()] || [];
  return { ctx: { owner: await tasksOwner(env, session.email), teams: mine, canManage: canManageTeams(session) }, teamList: teams.filter(t => mine.includes(t.id)).map(t => ({ id: t.id, name: t.name })) };
}

export async function onRequestGet({ env, request }) {
  const { ctx, teamList, response } = await context(request, env);
  if (response) return response;
  return Response.json({ boards: await listBoards(env, ctx), teams: teamList }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const { ctx, response } = await context(request, env);
  if (response) return response;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const out = await saveBoard(env, ctx, body?.board);
  if (out.error) return fail(out.error, out.status, out.board ? { board: out.board } : {});
  return Response.json(out, { headers: H });
}

export async function onRequestDelete({ env, request }) {
  const { ctx, response } = await context(request, env);
  if (response) return response;
  const q = new URL(request.url).searchParams;
  const out = await deleteBoard(env, ctx, q.get('id') || '', q.get('team') || '');
  return out.error ? fail(out.error, out.status) : Response.json(out, { headers: H });
}
