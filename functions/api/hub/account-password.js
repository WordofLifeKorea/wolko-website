/**
 * POST /api/hub/account-password
 * Authorization: Bearer <portal session token>
 * body: { currentPassword, newPassword }
 */
import {
  parseHubSessionToken, getAccount, putAccount, verifyPassword,
  isValidPassword, hashPassword,
} from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function failure(error, code, status) {
  return Response.json({ error, code }, { status, headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return failure('서버 설정이 필요합니다.', 'SERVER_CONFIG', 500);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session) return failure('포털 로그인이 필요합니다.', 'SESSION_INVALID', 401);

  let body;
  try { body = await request.json(); }
  catch { return failure('잘못된 요청입니다.', 'BAD_REQUEST', 400); }

  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword) return failure('현재 비밀번호를 입력해 주세요.', 'CURRENT_PASSWORD_REQUIRED', 400);
  if (!isValidPassword(newPassword)) return failure('비밀번호는 8자 이상의 영문/숫자/특수문자로 입력해 주세요.', 'PASSWORD_INVALID', 400);
  if (currentPassword === newPassword) return failure('새 비밀번호는 현재 비밀번호와 다르게 설정해 주세요.', 'SAME_PASSWORD', 400);

  try {
    const account = await getAccount(env, session.email);
    if (!account || account.status !== 'approved') return failure('사용자 계정을 확인할 수 없습니다.', 'ACCOUNT_NOT_FOUND', 404);
    const currentOk = await verifyPassword(currentPassword, account.passwordHash, account.passwordSalt);
    if (!currentOk) return failure('현재 비밀번호가 올바르지 않습니다.', 'CURRENT_PASSWORD_INVALID', 403);

    const { hash, salt } = await hashPassword(newPassword);
    await putAccount(env, {
      ...account,
      passwordHash: hash,
      passwordSalt: salt,
      passwordChangedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true }, { headers: CORS });
  } catch (error) {
    console.error('hub account-password error:', error);
    return failure('비밀번호를 변경하지 못했습니다.', 'CHANGE_FAILED', 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
