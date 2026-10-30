import test from 'node:test';
import assert from 'node:assert/strict';
import { extraCalendars, listMergedEvents, isExtraEventId } from '../functions/lib/extraCalendars.js';
import * as E from '../functions/api/schedule/events.js';
import * as H from '../functions/lib/hubAccounts.js';

const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pkcs8 = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))));
const SA = JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----` });

function mockGoogle(byCalendar) {
  const real = globalThis.fetch;
  globalThis.fetch = async url => {
    url = String(url);
    if (url.includes('oauth2.googleapis.com')) return Response.json({ access_token: 't', expires_in: 3600 });
    const id = decodeURIComponent(/calendars\/([^/]+)\/events/.exec(url)[1]);
    const items = byCalendar[id];
    if (!items) return new Response('forbidden', { status: 403 });
    return Response.json({ items });
  };
  return () => { globalThis.fetch = real; };
}
const ev = (id, summary, date) => ({ id, summary, start: { date }, end: { date } });
const EXTRA = JSON.stringify([{ key: 'jeju', id: 'jeju@group.calendar.google.com', name_ko: '제주 일정', name_en: 'Jeju', color: '#0b8043' }, { key: 'broken', id: 'nope@group.calendar.google.com', name_ko: '안 됨', color: 'red' }]);

test('다른 캘린더 설정: 환경 변수 JSON을 읽고, 이상한 key·색은 걸러 낸다', () => {
  const cals = extraCalendars({ GOOGLE_EXTRA_CALENDARS: EXTRA });
  assert.deepEqual(cals.map(c => c.key), ['jeju', 'broken']);
  assert.equal(cals[1].color, '#8a6d3b', '잘못된 색은 기본색');
  assert.deepEqual(extraCalendars({ GOOGLE_EXTRA_CALENDARS: '{oops' }), []);
  assert.equal(isExtraEventId('jeju:abc'), true);
  assert.equal(isExtraEventId('abc123'), false);
});

test('월코 캘린더 + 다른 캘린더를 합쳐 보여 주고, 하나가 실패해도 나머지는 보인다', async () => {
  const restore = mockGoogle({ 'main@x': [ev('m1', '스태프 회의', '2026-11-02')], 'jeju@group.calendar.google.com': [ev('j1', '제주 캠프', '2026-11-03')] });
  try {
    const env = { GOOGLE_SERVICE_ACCOUNT_JSON: SA, GOOGLE_EXTRA_CALENDARS: EXTRA };
    const { events, calendars } = await listMergedEvents(env, { mainCalendarId: 'main@x', timeMin: 'a', timeMax: 'b' });
    assert.deepEqual(events.map(e => [e.id, e.calendar, !!e.readOnly]), [['m1', 'main', false], ['jeju:j1', 'jeju', true]]);
    assert.deepEqual(calendars.map(c => [c.key, !!c.error]), [['jeju', false], ['broken', true]]);
  } finally { restore(); }
});

test('일정 API: 다른 캘린더 일정은 포탈에서 고치거나 지울 수 없다', async () => {
  const env = { ADMIN_PASSWORD: 'secret', GOOGLE_SERVICE_ACCOUNT_JSON: SA, GOOGLE_STAFF_CALENDAR_ID: 'main@x', GOOGLE_EXTRA_CALENDARS: EXTRA };
  const auth = { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', 'admin@wolko.org', 'master') };
  const del = await E.onRequestDelete({ env, request: new Request('https://wolko.org/api/schedule/events?id=jeju:j1', { method: 'DELETE', headers: auth }) });
  assert.equal(del.status, 403);
  const put = await E.onRequestPut({ env, request: new Request('https://wolko.org/api/schedule/events', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'jeju:j1', summary: 'x', allDay: true, startDate: '2026-11-03', endDate: '2026-11-03' }) }) });
  assert.equal(put.status, 403);
});
