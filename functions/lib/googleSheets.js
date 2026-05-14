/**
 * Google Sheets API helper for Cloudflare Workers runtime.
 * Uses crypto.subtle (Web Crypto API) for RS256 JWT signing —
 * the googleapis npm package is not compatible with Workers.
 */

/** Strip PEM armor and decode base64 → ArrayBuffer */
function pemToDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Base64url-encode an ArrayBuffer or Uint8Array */
function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Obtain a short-lived Google OAuth2 access token for the Sheets scope.
 * @param {{ client_email: string, private_key: string }} serviceAccount
 * @returns {Promise<string>} access_token
 */
export async function getAccessToken(serviceAccount) {
  const enc = new TextEncoder();

  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(enc.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));

  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    enc.encode(signingInput)
  );

  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const json = await res.json();
  if (!json.access_token) throw new Error(`Google token error: ${JSON.stringify(json)}`);
  return json.access_token;
}

/**
 * Append one row to a Google Sheet.
 * @param {object} opts
 * @param {string} opts.serviceAccountJson  - raw JSON string (GOOGLE_SERVICE_ACCOUNT_JSON env var)
 * @param {string} opts.sheetId             - spreadsheet ID (GOOGLE_SHEET_ID env var)
 * @param {string} opts.range               - e.g. "Sheet1!A:R"
 * @param {Array<string|number>} opts.row   - values in column order
 */
export async function appendRow({ serviceAccountJson, sheetId, range, row }) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  const token = await getAccessToken(serviceAccount);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets append error ${res.status}: ${err}`);
  }
}
