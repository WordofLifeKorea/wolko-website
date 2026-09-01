/**
 * Google Calendar API helper for Cloudflare Workers runtime.
 * Reuses the same service-account RS256 JWT signing approach as googleSheets.js,
 * just requesting the Calendar scope instead of Sheets.
 *
 * One-way sync only: WOLKO reservation → Calendar event.
 * Editing/deleting the event directly in Google Calendar has no effect back on WOLKO.
 *
 * 예약을 수정할 때는 기존 이벤트를 갱신하지 않고 삭제 후 새로 만든다(요청 사항).
 * 방금 지운 이벤트 ID는 구글 쪽에서 바로 재사용하면 오류가 날 수 있어서,
 * 매번 구글이 새로 발급하는 ID를 받아 예약 레코드에 저장해두고 다음
 * 수정/삭제 때 그 ID를 그대로 쓴다.
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
 * 새 이벤트 ID를 구글이 발급해주기 전, 이 코드가 배포되기 전에 만들어진
 * 옛날 예약(calendarEventId가 저장 안 되어 있는 경우)을 지울 때 쓰는
 * 하위호환용 폴백이다.
 */
export async function legacyDeterministicEventId(rawId) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`wolko-car:${rawId}`));
  const bytes = new Uint8Array(digest);
  const chars = '0123456789abcdefghijklmnopqrstuv'; // [a-v0-9]
  let out = '';
  for (let i = 0; i < 26; i++) out += chars[bytes[i % bytes.length] % chars.length];
  return out;
}

/** 새 캘린더 이벤트 생성. 이벤트 ID는 구글이 발급 — 반환값의 id를 예약 레코드에 저장해둬야 다음에 지울 수 있다. */
export async function createCalendarEvent({ serviceAccountJson, calendarId, summary, description, startAt, endAt }) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  const token = await getAccessToken(serviceAccount);
  const body = {
    summary,
    description,
    start: { dateTime: startAt, timeZone: 'Asia/Seoul' },
    end: { dateTime: endAt, timeZone: 'Asia/Seoul' },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`Calendar create error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.id;
}

/** 이벤트 ID로 캘린더 이벤트 삭제. 이미 없으면(404/410) 조용히 무시. */
export async function deleteCalendarEventById({ serviceAccountJson, calendarId, eventId }) {
  if (!eventId) return;
  const serviceAccount = JSON.parse(serviceAccountJson);
  const token = await getAccessToken(serviceAccount);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete error ${res.status}: ${await res.text()}`);
  }
}
