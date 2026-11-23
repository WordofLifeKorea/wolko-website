/**
 * 포탈 팀 그룹
 *   GET  /api/portal/teams   → { teams, mine, canManage, people? }  (people 은 마스터 · 관리자에게만: 승인된 계정과 그 사람의 팀)
 *   POST /api/portal/teams   { action: 'create', name } | { action: 'rename', id, name } | { action: 'delete', id } | { action: 'assign', email, teams: [id] }
 *                            → 마스터 · 관리자만. 바뀐 뒤의 전체 모양을 함께 돌려준다
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { manageTeams, teamsView } from '../../lib/portalTeams.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  return Response.json(await teamsView(env, session), { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const out = await manageTeams(env, session, body);
  if (out.error) return fail(out.error, out.status);
  return Response.json({ ...out, ...(await teamsView(env, session)) }, { headers: H });
}
