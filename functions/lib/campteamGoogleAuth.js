/**
 * "Google 로 로그인" 확인. 기존 포털 로그인과는 완전히 별개이고, 캠프팀 페이지에서만 통한다.
 *  - 브라우저가 받은 Google 신분증(ID token)을 서버가 Google 의 공개 키로 직접 검증한다 (서명, 발급 대상 앱, 만료, 이메일 인증, wolko.org 계정 여부).
 *  - 통과하면 "wolko-camp" 전용 짧은 출입증(서명된 토큰)을 준다. 이 출입증은 캠프팀 API 에서만 인정되고, 기존 포털 API 에서는 아무 효력이 없다.
 *  - wolko.org 계정이면 캠프팀 명단에 없어도 "조회만" 가능하다. 쓰기·금액 권한은 팀 명단이 정한다.
 */
import { signToken, verifyToken } from './hubAccounts.js';

export const GOOGLE_DOMAIN = 'wolko.org';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISS = ['https://accounts.google.com', 'accounts.google.com'];
const CAMP_TOKEN_PREFIX = 'wolko-camp';
export const CAMP_TOKEN_LIFETIME_MS = 14 * 24 * 3600 * 1000;
let certCache = { at: 0, keys: null };

const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
const parseJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function googleKeys(fetchImpl, force) {
  if (!force && certCache.keys && Date.now() - certCache.at < 3600000) return certCache.keys;
  const res = await fetchImpl(CERTS_URL); if (!res.ok) throw new Error('certs unavailable');
  certCache = { at: Date.now(), keys: (await res.json()).keys || [] }; return certCache.keys;
}
export function resetGoogleKeyCache() { certCache = { at: 0, keys: null }; }

/** 통과하면 { email, name } , 아니면 null */
export async function verifyGoogleIdToken(idToken, { clientId, fetchImpl = fetch, now = Date.now() } = {}) {
  try {
    if (!clientId || typeof idToken !== 'string') return null;
    const parts = idToken.split('.'); if (parts.length !== 3) return null;
    const header = parseJson(parts[0]), payload = parseJson(parts[1]);
    if (header.alg !== 'RS256') return null;
    let keys = await googleKeys(fetchImpl, false), jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) { keys = await googleKeys(fetchImpl, true); jwk = keys.find(k => k.kid === header.kid); } // 키가 새로 바뀐 경우
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])))) return null;
    if (!ISS.includes(payload.iss) || payload.aud !== clientId || !(payload.exp * 1000 > now - 60000) || payload.email_verified !== true) return null;
    const email = String(payload.email || '').toLowerCase();
    if (payload.hd !== GOOGLE_DOMAIN || !email.endsWith('@' + GOOGLE_DOMAIN) || email.split('@').length !== 2) return null; // wolko.org 계정만
    return { email, name: String(payload.name || '').slice(0, 80) };
  } catch { return null; }
}

export async function issueCampToken(secret, email) { return signToken(secret, `${CAMP_TOKEN_PREFIX}:${email}:${Date.now() + CAMP_TOKEN_LIFETIME_MS}`); }
/** 출입증 확인 → { email } 또는 null */
export async function parseCampToken(secret, token) {
  const data = await verifyToken(secret, token); if (!data) return null;
  const [prefix, email, exp] = data.split(':'); if (prefix !== CAMP_TOKEN_PREFIX || !email || !(Number(exp) > Date.now()) || !email.endsWith('@' + GOOGLE_DOMAIN)) return null;
  return { email };
}
