/**
 * GET /api/hub/pending
 * Authorization: Bearer <허브 세션 토큰> — master 권한만 허용.
 *
 * 승인 대기 중인 계정 목록을 반환.
 */
import { parseHubSessionToken, listAccounts } from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function requireMaster(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  if (!session || session.role !== 'master') return null;
  return session;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const session = await requireMaster(request, env);
  if (!session) {
    return Response.json({ error: '마스터 관리자만 접근할 수 있습니다.' }, { status: 403, headers: CORS });
  }

  const accounts = await listAccounts(env);
  accounts.sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
  return Response.json({ accounts }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
