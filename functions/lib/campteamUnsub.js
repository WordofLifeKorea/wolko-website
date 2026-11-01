/**
 * 「이 메일 그만 받기」 링크의 서명 토큰.
 * 형식: base64url(이메일).만료(초).서명 — 서명은 HMAC-SHA256(목적 이름 + 이메일 + 만료). 키는 기존 세션 비밀값(ADMIN_PASSWORD)에
 * 목적 이름을 붙여 따로 만든 것이라 로그인 토큰으로는 이 링크를 만들 수 없고, 이 링크로는 로그인할 수 없다. 새 비밀값은 필요 없다.
 * 이 링크로 할 수 있는 일은 "그 이메일 주소의 메일 끄기(와 다시 켜기)" 하나뿐이다. 로그인 없이 열리고, 만료는 400일(받은 메일함에 오래 남아 있어도 쓸 수 있게).
 */
export const UNSUB_LABEL = 'campteam-email-off:v1';
export const UNSUB_TTL_SEC = 400 * 86400;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (str) => { const t = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
const key = (env) => env && env.ADMIN_PASSWORD ? crypto.subtle.importKey('raw', enc.encode(`${UNSUB_LABEL}:${env.ADMIN_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']) : null;
const msg = (email, exp) => enc.encode(`${UNSUB_LABEL}|${email}|${exp}`);

/** 토큰 만들기. 비밀값이 없으면 null (링크 없이 보낸다) */
export async function signEmailOff(env, email, nowMs = Date.now()) {
  const k = key(env); if (!k) return null;
  const e = String(email || '').trim().toLowerCase(), exp = Math.floor(nowMs / 1000) + UNSUB_TTL_SEC;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await k, msg(e, exp)));
  return `${b64(enc.encode(e))}.${exp}.${b64(sig)}`;
}
/** 토큰 확인 → 이메일 주소(소문자) 또는 null. 모양이 틀리거나 서명이 안 맞거나 만료됐으면 null */
export async function verifyEmailOff(env, token, nowMs = Date.now()) {
  try {
    const k = key(env); if (!k) return null;
    const parts = String(token || '').split('.'); if (parts.length !== 3 || parts[0].length > 400) return null;
    const email = dec.decode(unb64(parts[0])), exp = Number(parts[1]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(exp) || exp * 1000 < nowMs) return null;
    return (await crypto.subtle.verify('HMAC', await k, unb64(parts[2]), msg(email, exp))) ? email : null;
  } catch { return null; }
}
