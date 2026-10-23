/**
 * POST /api/hub/verify-email   { token, newPassword }
 *
 * 가입 확인 메일의 링크(/portal/?verify=토큰)에서 비밀번호를 정하면 계정이 승인(일반 멤버)된다.
 * wolko.org / wol.org 일반 멤버 가입은 마스터 승인 없이 이 단계로 끝난다. (functions/lib/hubVerify.js)
 */
import { getAccount, putAccount, hashPassword, isValidPassword } from '../../lib/hubAccounts.js';
import { peekVerification, clearVerification } from '../../lib/hubVerify.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: CORS });

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return fail('서버 설정이 필요합니다.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const token = String(body?.token || '');
  const newPassword = String(body?.newPassword || '');
  if (!token) return fail('링크가 만료됐거나 올바르지 않아요.');
  if (!isValidPassword(newPassword)) return fail('비밀번호는 8자 이상의 영문/숫자/특수문자로 입력해 주세요.');
  const email = await peekVerification(env, token);
  if (!email) return fail('링크가 만료됐거나 올바르지 않아요. 가입을 다시 눌러 새 메일을 받아 주세요.');
  const account = await getAccount(env, email);
  // 인증 전('unverified') 계정, 또는 예전에 승인됐지만 비밀번호가 아직 없는 계정만 비밀번호를 정할 수 있다
  const settable = account && (account.status === 'unverified' || (account.status === 'approved' && !account.passwordHash));
  if (!settable) return fail('링크가 만료됐거나 이미 사용됐어요. 로그인해 주세요.');
  const { hash, salt } = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const approvedNow = account.status === 'unverified';
  await putAccount(env, {
    ...account, passwordHash: hash, passwordSalt: salt, emailVerifiedAt: now,
    ...(approvedNow ? { role: 'counselor', status: 'approved', approvedAt: now, approvedBy: 'auto:email-verified' } : {}),
  });
  await clearVerification(env, token, email);
  return Response.json({ ok: true, email }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
