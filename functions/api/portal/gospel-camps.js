/**
 * GET  /api/portal/gospel-camps  — 지난 캠프까지 모두의 자동 집계(최근 시작일 순). 포탈 로그인한 계정 누구나, 숫자만.
 * 확정 캠퍼·확정 스태프·구원·헌신은 모두 신청 기록에서 자동으로 센다(functions/lib/gospelCamps.js).
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { allCamps } from '../../lib/gospelCamps.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  return Response.json({ camps: await allCamps(env, request) }, { headers: H });
}
