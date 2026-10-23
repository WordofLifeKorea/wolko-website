/**
 * 포탈 가입 이메일 인증 — wolko.org / wol.org 일반 멤버 가입은 승인 없이 바로 사용할 수 있지만,
 * 그 주소의 주인인지 확인하려고 메일의 링크를 한 번 거친다(도메인만 보고 자동 승인하면 남의 주소로 가입할 수 있다).
 *   1) 가입 → 계정이 'unverified' 로 만들어지고(비밀번호는 아직 없다) 인증 메일이 간다 (24시간 유효)
 *   2) 메일의 링크(/portal/?verify=토큰)에서 비밀번호를 정하면 → 계정이 'approved'(일반 멤버)가 된다
 * 비밀번호를 링크에서 정하는 이유: 가입 칸에서 비밀번호를 받으면, 남이 내 주소로 먼저 가입해 두고(자기 비밀번호로)
 * 내가 메일의 링크를 누르는 순간 그 계정이 승인되는 일이 생긴다.
 * 토큰 원문은 메일에만 있고 서버에는 해시만 저장한다. 한 번 쓰면 지워지고, 같은 이메일로는 1분에 한 번만 메일을 보낸다.
 */
import { sendEmail } from './hubAccounts.js';

export const VERIFY_TTL = 24 * 60 * 60;
const tokenKey = h => `hub:verify:${h}`;
const lastKey = e => `hub:verify-last:${e}`;
const cooldownKey = e => `hub:verify-cd:${e}`;

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function verifyEmailHtml(url, name) {
  const hello = name ? `${String(name).replace(/[<>&"]/g, '')}님, ` : '';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">WOLKO 포탈 가입 확인</h2>
      <p>${hello}아래 버튼을 눌러 비밀번호를 정하면 가입이 끝나고 바로 포탈을 사용할 수 있어요. 링크는 24시간 동안만 쓸 수 있어요.</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">비밀번호 정하고 가입 마치기</a>
      </p>
      <p style="color:#6a808a;font-size:13px;">가입을 요청하지 않으셨다면 이 메일은 무시하셔도 돼요. 링크를 누르지 않으면 아무 일도 일어나지 않아요.</p>
      <hr style="border:0;border-top:1px solid #e1e9ee;margin:22px 0;">
      <p style="color:#6a808a;font-size:13px;">Confirm your WOLKO Portal sign-up: use the button above to choose a password and finish. The link works for 24 hours. If you did not sign up, you can ignore this email — nothing will happen.</p>
    </div>`;
}

/** 인증 메일을 보낸다(1분 안에 다시 요청하면 보내지 않는다). 보냈으면 true */
export async function issueVerification(env, origin, { email, name }, waitUntil) {
  if (await env.CAMP_KV.get(cooldownKey(email))) return false;
  await env.CAMP_KV.put(cooldownKey(email), '1', { expirationTtl: 60 });
  const old = await env.CAMP_KV.get(lastKey(email));
  if (old) await env.CAMP_KV.delete(tokenKey(old));
  const token = randomToken();
  const hash = await sha256Hex(token);
  await env.CAMP_KV.put(tokenKey(hash), JSON.stringify({ email, at: new Date().toISOString() }), { expirationTtl: VERIFY_TTL });
  await env.CAMP_KV.put(lastKey(email), hash, { expirationTtl: VERIFY_TTL });
  const send = sendEmail(env, { to: email, subject: '[WOLKO 포탈] 가입 확인 / Confirm your sign-up', html: verifyEmailHtml(`${origin}/portal/?verify=${token}`, name) })
    .catch(error => console.error('verification email failed:', error));
  if (waitUntil) waitUntil(send); else await send;
  return true;
}

/** 토큰이 유효하면 그 이메일 — 아니면 null (지우지는 않는다) */
export async function peekVerification(env, token) {
  if (!token) return null;
  const stored = await env.CAMP_KV.get(tokenKey(await sha256Hex(String(token))), 'json');
  return stored?.email || null;
}

export async function clearVerification(env, token, email) {
  await env.CAMP_KV.delete(tokenKey(await sha256Hex(String(token))));
  await env.CAMP_KV.delete(lastKey(email));
}
