/** Google API 접근 도우미(서비스 계정). 기존 helper 와 같은 방식(Web Crypto 로 RS256 서명)이지만 권한 범위(scope)를 고를 수 있다. 기존 파일은 수정하지 않았다. */
const b64url = (buf) => { const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const pemToDer = (pem) => { const bin = atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
export async function getGoogleAccessToken(serviceAccount, scope, fetchImpl = fetch) {
  const enc = new TextEncoder(), now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))), claims = b64url(enc.encode(JSON.stringify({ iss: serviceAccount.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(serviceAccount.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${claims}`));
  const res = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${b64url(sig)}` }) });
  if (!res.ok) throw new Error('Google token request failed (' + res.status + ')');
  return (await res.json()).access_token;
}
