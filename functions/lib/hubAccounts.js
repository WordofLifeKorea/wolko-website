/**
 * 허브(/hub) 이메일+비밀번호 로그인 계정/토큰 공용 헬퍼.
 *
 * 역할 3단계:
 *  - master : 하드코딩된 최고 관리자 2명. 승인 없이 항상 가입/로그인 가능하고,
 *             다른 사람의 가입 요청을 승인(+역할 지정)/거부할 수 있는 유일한 계정.
 *  - admin  : master가 승인 시 "관리자"로 지정. @wol.org 이메일에만 지정 가능
 *             (가입/승인 양쪽에서 서버가 도메인을 검증). 허브를 통해 관리자/
 *             차량 스케줄까지 SSO.
 *  - counselor : master가 승인 시 "상담사"로 지정. 도메인 제한 없음. 허브는
 *             통과하지만 관리자 도구 SSO는 받지 않음(캠프 진행 페이지의
 *             기존 상담사 계정 체계는 이것과 완전히 별개).
 *
 * 가입 시점에는 역할이 정해지지 않고(role: null, status: 'pending'),
 * 대신 가입자가 고른 트랙(requestedRole: 'admin'|'counselor')을 참고용으로
 * 저장해둔다. master가 승인하면서 admin/counselor 중 하나로 역할을 최종
 * 지정하며, admin 지정은 서버가 @wol.org 도메인인지 다시 확인한다.
 *
 * 공유 비밀번호(ADMIN_PASSWORD) 로그인 경로는 없다 — master도 자기 이메일+
 * 비밀번호 계정으로 로그인한다.
 */

export const MASTER_EMAILS = ['wolkorea1@gmail.com', 'hkim3@wol.org'];
const ACCOUNT_PREFIX = 'hub:account:';
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24시간
const PBKDF2_ITERATIONS = 100000;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

const PASSWORD_RE = /^[\x21-\x7E]{8,}$/;
export function isValidPassword(password) {
  return typeof password === 'string' && PASSWORD_RE.test(password);
}

export function isMasterEmail(email) {
  return MASTER_EMAILS.includes(normalizeEmail(email));
}

export function isWolDomain(email) {
  return normalizeEmail(email).endsWith('@wol.org');
}

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
  let s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pbkdf2Bytes(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return new Uint8Array(bits);
}

/** 새 비밀번호를 해싱해 { hash, salt } (둘 다 base64url 문자열)로 반환 */
export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await pbkdf2Bytes(password, saltBytes);
  return { hash: b64url(hashBytes), salt: b64url(saltBytes) };
}

/** 입력한 비밀번호가 저장된 hash/salt와 일치하는지 확인(상수 시간 비교) */
export async function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const hashBytes = await pbkdf2Bytes(password, b64urlToBytes(salt));
  const computed = b64url(hashBytes);
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
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

export function pendingRequestEmailHtml({ email }) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">새 허브 가입 요청</h2>
      <p><strong>${email}</strong> 님이 WOLKO 허브 가입을 요청했습니다.</p>
      <p>허브에 로그인해서 "승인 대기" 목록에서 역할(관리자/상담사)을 지정하여 승인하거나 거부해 주세요.</p>
    </div>`;
}

export function approvedEmailHtml({ url, role }) {
  const roleLabel = role === 'admin' ? '관리자' : '상담사';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;">WOLKO 허브 접속이 승인되었습니다</h2>
      <p>${roleLabel} 권한으로 승인되었습니다. 가입하신 이메일과 비밀번호로 바로 로그인하세요.</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">허브 로그인</a>
      </p>
    </div>`;
}
