/**
 * POST /api/hub/reset-password — master 전용
 * Authorization: Bearer <포탈 세션 토큰>
 * body: { email, tempPassword }
 *
 * 비밀번호를 잊은 멤버의 계정에 임시 비밀번호를 걸어 준다. 계정에는 mustChangePassword 표시가 붙고,
 * 그 계정으로 로그인하면 화면마다 '새 비밀번호 설정' 창이 먼저 뜬다(account-password.js 로 바꾸면 표시가 지워진다).
 * 임시 비밀번호는 일반 규칙(8자 이상)보다 짧아도 되지만 4자 이상이어야 한다.
 */
import {
  parseHubSessionToken, getAccount, putAccount, hashPassword, normalizeEmail, isValidEmail, isMasterEmail,
} from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const fail = (error, status) => Response.json({ error }, { status, headers: CORS });

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return fail('서버 설정이 필요합니다.', 500);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session || session.role !== 'master') return fail('마스터 관리자만 사용할 수 있습니다.', 403);

  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 400); }
  const email = normalizeEmail(body?.email);
  const temp = String(body?.tempPassword ?? '');
  if (!isValidEmail(email)) return fail('이메일을 확인해 주세요.', 400);
  if (temp.length < 4 || temp.length > 72 || /\s/.test(temp)) return fail('임시 비밀번호는 공백 없이 4자 이상으로 입력해 주세요.', 400);
  if (isMasterEmail(email)) return fail('마스터 계정은 여기서 초기화할 수 없습니다.', 400);

  const account = await getAccount(env, email);
  if (!account || account.status !== 'approved') return fail('승인된 계정이 아닙니다.', 404);

  const { hash, salt } = await hashPassword(temp);
  await putAccount(env, {
    ...account,
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: true,
    passwordResetAt: new Date().toISOString(),
    passwordResetBy: normalizeEmail(session.email),
  });
  return Response.json({ ok: true, email, name: account.name || '' }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}
