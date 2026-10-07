/**
 * POST /api/teach/portal-login   Authorization: Bearer <포탈 세션 토큰>
 * 캠프 자료실을 포탈 로그인으로 쓴다: 승인된 포탈 멤버(등급 무관)에게 자료실 토큰(24시간)을 발급한다.
 * 토큰 형식은 예전 공유 비밀번호 로그인과 같아서 /api/teach/data · camps · upload 가 그대로 인식한다.
 */
import { portalSession } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

async function generateToken(secret) {
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const data = `wolko-teach:admin:${expires}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(`${data}:${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
}

export async function onRequestPost({ env, request }) {
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  const s = await portalSession(request, env);
  if (!s) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  return Response.json({ token: await generateToken(env.ADMIN_PASSWORD) }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
