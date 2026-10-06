/**
 * 비밀번호를 잊었을 때 스스로 다시 정하기 (포탈 로그인 창의 '비밀번호를 잊으셨나요?')
 *   POST { action: 'request', email }          → 가입 이메일로 재설정 링크를 보낸다 (30분 유효). 계정이 있든 없든 같은 응답을 준다.
 *   POST { action: 'confirm', token, newPassword } → 링크로 들어와 새 비밀번호를 정한다 (8자 이상)
 * 링크의 토큰은 메일에만 있고 서버에는 해시만 저장한다. 한 번 쓰면 지워지고, 같은 이메일로는 1분에 한 번만 요청할 수 있다.
 * 카운슬러 페이지 계정은 별개라서 여기서 다루지 않는다.
 */
import { getAccount, putAccount, hashPassword, normalizeEmail, isValidEmail, isValidPassword, sendEmail } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const TOKEN_TTL = 30 * 60;
const tokenKey = h => `hub:pwreset:${h}`;
const lastKey = e => `hub:pwreset-last:${e}`;
const cooldownKey = e => `hub:pwreset-cd:${e}`;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const fail = (error, status = 400) => Response.json({ error }, { status, headers: CORS });

export function resetEmailHtml(url) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">WOLKO 포탈 비밀번호 재설정</h2>
      <p>아래 버튼을 눌러 새 비밀번호를 정해 주세요. 링크는 30분 동안만 쓸 수 있어요.</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">새 비밀번호 정하기</a>
      </p>
      <p style="color:#6a808a;font-size:13px;">요청하지 않으셨다면 이 메일은 무시하셔도 돼요. 비밀번호는 바뀌지 않아요.</p>
      <hr style="border:0;border-top:1px solid #e1e9ee;margin:22px 0;">
      <p style="color:#6a808a;font-size:13px;">Reset your WOLKO Portal password with the button above. The link works for 30 minutes. If you did not ask for this, you can ignore this email.</p>
    </div>`;
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return fail('서버 설정이 필요합니다.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }

  if (body?.action === 'request') {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return fail('이메일을 확인해 주세요.');
    const generic = Response.json({ ok: true }, { headers: CORS }); // 계정이 있는지 알려주지 않는다
    const account = await getAccount(env, email);
    if (!account || account.status !== 'approved' || !account.passwordHash) return generic;
    if (await env.CAMP_KV.get(cooldownKey(email))) return generic;
    await env.CAMP_KV.put(cooldownKey(email), '1', { expirationTtl: 60 });
    const old = await env.CAMP_KV.get(lastKey(email));
    if (old) await env.CAMP_KV.delete(tokenKey(old));
    const token = randomToken();
    const hash = await sha256Hex(token);
    await env.CAMP_KV.put(tokenKey(hash), JSON.stringify({ email, at: new Date().toISOString() }), { expirationTtl: TOKEN_TTL });
    await env.CAMP_KV.put(lastKey(email), hash, { expirationTtl: TOKEN_TTL });
    if (env.RESEND_API_KEY) {
      const url = `${new URL(request.url).origin}/portal/?reset=${token}`;
      const send = sendEmail(env, { to: email, subject: '[WOLKO 포탈] 비밀번호 재설정 / Password reset', html: resetEmailHtml(url) }).catch(e => console.error('password reset email failed:', e));
      if (context.waitUntil) context.waitUntil(send); else await send;
    }
    return generic;
  }

  if (body?.action === 'confirm') {
    const token = String(body.token || '');
    const newPassword = String(body.newPassword || '');
    if (!token) return fail('링크가 만료됐거나 올바르지 않아요.', 400);
    if (!isValidPassword(newPassword)) return fail('비밀번호는 8자 이상의 영문/숫자/특수문자로 입력해 주세요.');
    const hash = await sha256Hex(token);
    const stored = await env.CAMP_KV.get(tokenKey(hash), 'json');
    if (!stored) return fail('링크가 만료됐거나 올바르지 않아요. 다시 요청해 주세요.', 400);
    const account = await getAccount(env, stored.email);
    if (!account || account.status !== 'approved') return fail('링크가 만료됐거나 올바르지 않아요.', 400);
    const { mustChangePassword, ...rest } = account;
    const next = await hashPassword(newPassword);
    await putAccount(env, { ...rest, passwordHash: next.hash, passwordSalt: next.salt, passwordChangedAt: new Date().toISOString(), passwordResetVia: 'email' });
    await env.CAMP_KV.delete(tokenKey(hash));
    await env.CAMP_KV.delete(lastKey(stored.email));
    return Response.json({ ok: true }, { headers: CORS });
  }
  return fail('잘못된 요청입니다.');
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
