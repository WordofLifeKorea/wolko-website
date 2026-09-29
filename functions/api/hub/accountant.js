/**
 * GET  /api/hub/accountant                    — 승인된 계정 목록과 회계 담당 여부 (master 전용)
 * POST /api/hub/accountant  body: { email, isAccountant: boolean }
 *                                              — 회계 담당(장부 관리) 지정/해제 (master 전용)
 *
 * 회계 담당자는 승인된 경비 리포트를 보고 "장부 반영 완료" 처리를 하며,
 * 경비가 승인될 때마다 알림 메일을 받는다.
 */
import { parseHubSessionToken, getAccount, putAccount, listAccounts, normalizeEmail } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

async function requireMaster(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  return session?.role === 'master' ? session : null;
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV || !(await requireMaster(request, env))) {
    return Response.json({ error: '마스터 관리자만 접근할 수 있습니다.' }, { status: 403, headers: CORS });
  }
  const accounts = (await listAccounts(env))
    .filter(a => a.status === 'approved')
    .map(a => ({ email: a.email, name: a.name || '', role: a.role, isAccountant: !!a.isAccountant }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return Response.json({ accounts }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV || !(await requireMaster(request, env))) {
    return Response.json({ error: '마스터 관리자만 접근할 수 있습니다.' }, { status: 403, headers: CORS });
  }
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }
  const account = await getAccount(env, normalizeEmail(body.email));
  if (!account || account.status !== 'approved') {
    return Response.json({ error: '승인된 계정을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
  }
  account.isAccountant = !!body.isAccountant;
  await putAccount(env, account);
  return Response.json({ ok: true, email: account.email, isAccountant: account.isAccountant }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
