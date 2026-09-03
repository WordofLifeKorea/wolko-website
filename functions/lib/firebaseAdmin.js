/**
 * Firebase Admin 없이(Workers 런타임 호환) 커스텀 토큰을 직접 서명해 발급하는 헬퍼.
 * 서비스 계정 JSON(client_email, private_key)만 있으면 되고, firebase-admin
 * npm 패키지는 Node 전용 API에 의존해 Cloudflare Pages Functions에서 동작하지 않는다.
 *
 * 참고: https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
 */

function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Firebase 로그인용 커스텀 토큰(JWT) 발급.
 * @param {object|string} serviceAccount - Firebase 서비스 계정 JSON(또는 JSON 문자열)
 * @param {string} uid - Firebase Auth 사용자 uid (없으면 최초 로그인 시 자동 생성됨)
 * @param {object} [extraClaims] - signInWithCustomToken 이후 idToken에 실릴 추가 클레임
 */
export async function createFirebaseCustomToken(serviceAccount, uid, extraClaims) {
  const sa = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error('서비스 계정 JSON에 client_email/private_key가 없습니다.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
    ...(extraClaims ? { claims: extraClaims } : {}),
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));

  return `${unsigned}.${base64url(signature)}`;
}
