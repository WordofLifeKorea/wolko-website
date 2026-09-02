/**
 * 허브(/hub) 이메일 로그인 계정/토큰 공용 헬퍼.
 *
 * 역할 3단계:
 *  - master : 하드코딩된 최고 관리자 2명. 승인 없이 항상 로그인 가능하고,
 *             다른 사람의 로그인 요청을 승인/거부할 수 있는 유일한 계정.
 *  - admin  : @wol.org 이메일만 요청 가능. master 승인 후 로그인 가능.
 *             허브를 통해 관리자/차량 스케줄/스케줄 플래너까지 SSO.
 *  - counselor : 아무 이메일이나 요청 가능. master 승인 후 로그인 가능.
 *             허브는 통과하지만 관리자 도구 SSO는 받지 않음(캠프 진행
 *             페이지의 기존 상담사 계정 체계는 이것과 완전히 별개).
 */

export const MASTER_EMAILS = ['wolkorea1@gmail.com', 'hkim3@wol.org'];
const ACCOUNT_PREFIX = 'hub:account:';
const USED_MAGIC_PREFIX = 'hub:usedmagic:';
const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000; // 15분
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24시간

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

export function isMasterEmail(email) {
  return MASTER_EMAILS.includes(normalizeEmail(email));
}

export function roleForEmail(email) {
  if (isMasterEmail(email)) return 'master';
  return normalizeEmail(email).endsWith('@wol.org') ? 'admin' : 'counselor';
}

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

/** data 문자열을 서명해 base64(data:sigHex) 토큰으로 반환 */
export async function signToken(secret, data) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${data}:${sigHex}`);
}

/** signToken으로 만든 토큰을 검증해 원본 data 문자열을 돌려주거나, 실패 시 null */
export async function verifyToken(secret, token) {
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const key = await hmacKey(secret);
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    return ok ? data : null;
  } catch {
    return null;
  }
}

/** 매직링크 토큰 발급: wolko-hub-magic:{email}:{role}:{expires} */
export async function createMagicLinkToken(secret, email, role) {
  const expires = Date.now() + MAGIC_LINK_LIFETIME_MS;
  const data = `wolko-hub-magic:${email}:${role}:${expires}`;
  return signToken(secret, data);
}

/** 매직링크 토큰 검증(형식 + 만료만) — 1회용 체크는 호출부에서 KV로 별도 처리 */
export async function parseMagicLinkToken(secret, token) {
  const data = await verifyToken(secret, token);
  if (!data) return null;
  const parts = data.split(':');
  if (parts[0] !== 'wolko-hub-magic' || parts.length !== 4) return null;
  const [, email, role, expiresStr] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() > expires) return null;
  return { email, role, raw: token };
}

/** 매직링크 토큰을 1회만 쓸 수 있게 표시. 이미 썼으면 false. */
export async function claimMagicLinkOnce(env, token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `${USED_MAGIC_PREFIX}${hashHex}`;
  const already = await env.CAMP_KV.get(key);
  if (already) return false;
  await env.CAMP_KV.put(key, '1', { expirationTtl: 60 * 60 }); // 1시간 뒤 자동 정리(매직링크 수명보다 충분히 김)
  return true;
}

/** 허브 세션 토큰 발급: wolko-hub:{email}:{role}:{expires} */
export async function createHubSessionToken(secret, email, role) {
  const expires = Date.now() + SESSION_LIFETIME_MS;
  const data = `wolko-hub:${email}:${role}:${expires}`;
  return signToken(secret, data);
}

/** 허브 세션 토큰 검증 → { email, role } 또는 null */
export async function parseHubSessionToken(secret, token) {
  const data = await verifyToken(secret, token);
  if (!data) return null;
  const parts = data.split(':');
  if (parts[0] !== 'wolko-hub' || parts.length !== 4) return null;
  const [, email, role, expiresStr] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() > expires) return null;
  return { email, role };
}

export async function getAccount(env, email) {
  return env.CAMP_KV.get(`${ACCOUNT_PREFIX}${normalizeEmail(email)}`, 'json');
}

export async function putAccount(env, account) {
  await env.CAMP_KV.put(`${ACCOUNT_PREFIX}${account.email}`, JSON.stringify(account));
}

export async function listAccounts(env) {
  const items = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: ACCOUNT_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    const values = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
    items.push(...values.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return items;
}

export async function sendEmail(env, { to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WOLKO Hub <hub@wolko.org>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

export function magicLinkEmailHtml({ url, role }) {
  const roleLabel = role === 'master' ? '마스터 관리자' : role === 'admin' ? '관리자' : '상담사';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">WOLKO 허브 로그인</h2>
      <p>아래 버튼을 눌러 로그인하세요 (${roleLabel} 권한, 15분 이내 1회만 유효).</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">허브 로그인</a>
      </p>
      <p style="color:#888;font-size:12px;">이 이메일을 요청하지 않았다면 무시하셔도 됩니다.</p>
    </div>`;
}

export function pendingRequestEmailHtml({ email, role }) {
  const roleLabel = role === 'admin' ? '관리자' : '상담사';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">새 허브 접속 요청</h2>
      <p><strong>${email}</strong> 님이 <strong>${roleLabel}</strong> 권한으로 WOLKO 허브 접속을 요청했습니다.</p>
      <p>허브에 로그인해서 "승인 대기" 목록에서 승인/거부해 주세요.</p>
    </div>`;
}

export function approvedEmailHtml({ url, role }) {
  const roleLabel = role === 'admin' ? '관리자' : '상담사';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">WOLKO 허브 접속이 승인되었습니다</h2>
      <p>${roleLabel} 권한으로 승인되었습니다. 아래 버튼으로 바로 로그인하세요 (15분 이내 1회만 유효).</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">허브 로그인</a>
      </p>
    </div>`;
}
