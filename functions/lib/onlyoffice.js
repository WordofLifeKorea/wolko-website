const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64Url(value) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(value) {
  let padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) padded += '=';
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, usages,
  );
}

export function onlyOfficeSecret(env) {
  return String(env.ONLYOFFICE_JWT_SECRET || '').trim();
}

export function onlyOfficeOrigin(env) {
  const configured = String(env.ONLYOFFICE_PUBLIC_URL || 'https://docs.wolko.org').trim();
  try { return new URL(configured).origin; } catch { return 'https://docs.wolko.org'; }
}

export async function signJwt(payload, secret) {
  const header = textToBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = textToBase64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const key = await hmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned));
  return `${unsigned}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyJwt(token, secret) {
  try {
    const [header, body, signature, extra] = String(token || '').split('.');
    if (!header || !body || !signature || extra) return null;
    const key = await hmacKey(secret, ['verify']);
    const valid = await crypto.subtle.verify(
      'HMAC', key, base64UrlToBytes(signature), encoder.encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (payload.exp && Date.now() >= Number(payload.exp) * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createFileAccessToken({ id, fileId, expires }, secret) {
  return signJwt({ id, fileId, exp: Math.floor(expires / 1000) }, secret);
}

export function callbackToken(request, body) {
  const header = request.headers.get('Authorization') || '';
  return String(body?.token || header.replace(/^Bearer\s+/i, '')).trim();
}
