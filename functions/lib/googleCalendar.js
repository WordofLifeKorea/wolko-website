/**
 * Google Calendar API helper for Cloudflare Workers runtime.
 * Reuses the same service-account RS256 JWT signing approach as googleSheets.js,
 * just requesting the Calendar scope instead of Sheets.
 *
 * One-way sync only: WOLKO reservation → Calendar event.
 * Editing/deleting the event directly in Google Calendar has no effect back on WOLKO.
 */

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

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

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(serviceAccount) {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(enc.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: CALENDAR_SCOPE,
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
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
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
 * WOLKO reservation id → 캘린더 이벤트 ID로 결정적 변환.
 * Calendar API 이벤트 ID는 [a-v0-9] 문자만 허용(5~1024자) — "wolko" 같은
 * 흔한 접두사도 w가 섞이면 규칙을 어기므로 해시 결과만 그대로 쓴다.
 */
async function toEventId(rawId) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`wolko-car:${rawId}`));
  const bytes = new Uint8Array(digest);
  const chars = '0123456789abcdefghijklmnopqrstuv'; // [a-v0-9]
  let out = '';
  for (let i = 0; i < 26; i++) out += chars[bytes[i % bytes.length] % chars.length];
  return out;
}

/** 예약을 캘린더 이벤트로 생성/갱신(upsert). 캘린더에 없으면 새로 만들고, 있으면 덮어씀. */
export async function upsertCalendarEvent({ serviceAccountJson, calendarId, reservationId, summary, description, startAt, endAt }) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  const token = await getAccessToken(serviceAccount);
  const eventId = await toEventId(reservationId);
  const body = {
    summary,
    description,
    start: { dateTime: startAt, timeZone: 'Asia/Seoul' },
    end: { dateTime: endAt, timeZone: 'Asia/Seoul' },
  };

  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const putRes = await fetch(`${base}/${eventId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (putRes.ok) return;
  if (putRes.status !== 404 && putRes.status !== 410) {
    throw new Error(`Calendar update error ${putRes.status}: ${await putRes.text()}`);
  }

  const postRes = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, id: eventId }),
  });
  if (!postRes.ok) {
    throw new Error(`Calendar create error ${postRes.status}: ${await postRes.text()}`);
  }
}

/** 예약 삭제 시 캘린더 이벤트도 함께 삭제. 이미 없으면 조용히 무시. */
export async function deleteCalendarEvent({ serviceAccountJson, calendarId, reservationId }) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  const token = await getAccessToken(serviceAccount);
  const eventId = await toEventId(reservationId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete error ${res.status}: ${await res.text()}`);
  }
}
