/**
 * POST /api/teach/portal-login   Authorization: Bearer <포탈 세션 토큰>
 * 캠프 자료실을 포탈 로그인으로 쓴다: 승인된 포탈 멤버(등급 무관)에게 자료실 토큰(24시간)을 발급한다.
 *  - 마스터 · 지정 관리자 → admin 토큰 (수정 · 캠프 관리 가능)
 *  - 그 외 멤버 → member 토큰 (보기 · 자료 추가 · 본인 수정/삭제)
 * 타인 삭제 권한은 별도의 서명된 마스터 신원으로 구분한다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { generateTeachToken, isTeachManager } from '../../lib/teachAuth.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

export async function onRequestPost({ env, request }) {
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  const s = await portalSession(request, env);
  if (!s) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  const isManager = await isTeachManager(env, s);
  return Response.json({ token: await generateTeachToken(env.ADMIN_PASSWORD, isManager ? 'admin' : 'member', s), uploaderName: s.name || s.email, uploaderEmail: s.email, role: isManager ? 'admin' : 'member', isManager, isMaster: s.role === 'master' }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
