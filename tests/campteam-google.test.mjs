import assert from 'node:assert/strict';
import test from 'node:test';
import * as GLogin from '../functions/api/campteam/google-login.js';
import * as Me from '../functions/api/campteam/me.js';
import * as Cal from '../functions/api/campteam/calendar-sync.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import { verifyGoogleIdToken, issueCampToken, parseCampToken, resetGoogleKeyCache } from '../functions/lib/campteamGoogleAuth.js';
import { toGoogleEvent } from '../functions/api/campteam/calendar-sync.js';
import { autoSync } from '../functions/lib/campteamCalendarSync.js';
import { parseHubSessionToken, createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { fakeD1, makeEnv, req, U, SECRET } from './helpers/campteam-fakes.mjs';

const CLIENT = 'test-client.apps.googleusercontent.com';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function newKey() { return crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']); }
async function jwt(privateKey, payload, header = { alg: 'RS256', kid: 'k1', typ: 'JWT' }) {
  const data = b64(header) + '.' + b64(payload); const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(data)); return data + '.' + Buffer.from(sig).toString('base64url');
}
const good = (o = {}) => ({ iss: 'https://accounts.google.com', aud: CLIENT, exp: Math.floor(Date.now() / 1000) + 3600, email: 'someone@wolko.org', email_verified: true, hd: 'wolko.org', name: 'Some One', ...o });
async function withGoogle(keys, fn) {
  resetGoogleKeyCache(); const real = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url) => { if (String(url).includes('/oauth2/v3/certs')) { calls++; return Response.json({ keys: await keys() }); } throw new Error('unexpected ' + url); };
  try { return await fn(() => calls); } finally { globalThis.fetch = real; resetGoogleKeyCache(); }
}

test('Google 신분증 확인: 올바른 wolko.org 계정만 통과, 나머지는 모두 거부', async () => {
  const { privateKey, publicKey } = await newKey(), jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', use: 'sig' };
  await withGoogle(async () => [jwk], async () => {
    const v = (t) => verifyGoogleIdToken(t, { clientId: CLIENT });
    assert.deepEqual(await v(await jwt(privateKey, good())), { email: 'someone@wolko.org', name: 'Some One' });
    assert.equal(await v(await jwt(privateKey, good({ aud: 'other-app' }))), null, '다른 앱용 신분증');
    assert.equal(await v(await jwt(privateKey, good({ exp: Math.floor(Date.now() / 1000) - 3600 }))), null, '만료');
    assert.equal(await v(await jwt(privateKey, good({ email_verified: false }))), null);
    assert.equal(await v(await jwt(privateKey, good({ hd: 'gmail.com', email: 'a@gmail.com' }))), null, '개인 gmail');
    assert.equal(await v(await jwt(privateKey, good({ hd: undefined, email: 'a@wolko.org' }))), null, 'hd 가 없으면(개인 계정이 wolko.org 주소를 흉내) 거부');
    assert.equal(await v(await jwt(privateKey, good({ email: 'a@evilwolko.org' }))), null); assert.equal(await v(await jwt(privateKey, good({ iss: 'https://evil.example' }))), null);
    assert.equal(await v(await jwt(privateKey, good(), { alg: 'none', kid: 'k1' })), null, 'alg=none 거부');
    const other = await newKey(); assert.equal(await v(await jwt(other.privateKey, good())), null, '다른 키로 서명');
    const t = await jwt(privateKey, good()); assert.equal(await v(t.slice(0, -4) + 'AAAA'), null, '서명 변조'); assert.equal(await v('a.b'), null); assert.equal(await v(''), null); assert.equal(await verifyGoogleIdToken(t, { clientId: '' }), null);
  });
  // 키 교체: 캐시에 없는 kid 면 한 번 새로 받아 본다
  let current = [{ ...jwk, kid: 'old' }]; const k2 = await newKey(), jwk2 = { ...(await crypto.subtle.exportKey('jwk', k2.publicKey)), kid: 'k2' };
  await withGoogle(async () => current, async (calls) => {
    assert.equal(await verifyGoogleIdToken(await jwt(privateKey, good()), { clientId: CLIENT }), null); assert.equal(calls(), 2, 'kid 를 못 찾으면 새로 받아 한 번 더');
    current = [jwk2]; assert.ok(await verifyGoogleIdToken(await jwt(k2.privateKey, good(), { alg: 'RS256', kid: 'k2' }), { clientId: CLIENT }));
  });
});

test('Google 로그인 API → 캠프팀 출입증: 조회만, 명단/고정 관리자 권한 반영, 기존 포털과 출입증이 섞이지 않는다', async () => {
  const { privateKey, publicKey } = await newKey(), jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
  const off = makeEnv(fakeD1()); assert.equal((await GLogin.onRequestPost({ env: off, request: await req(null, { method: 'POST', body: { credential: 'x' } }) })).status, 503);
  const env = makeEnv(fakeD1(), { CAMPTEAM_GOOGLE_CLIENT_ID: CLIENT, CAMPTEAM_DEV_AUTH: '' });
  await withGoogle(async () => [jwk], async () => {
    const login = async (payload) => GLogin.onRequestPost({ env, request: await req(null, { method: 'POST', body: { credential: await jwt(privateKey, payload) } }) });
    assert.equal((await login(good({ email: 'x@gmail.com', hd: undefined }))).status, 403);
    const ok = await login(good({ email: 'newperson@wolko.org' })); assert.equal(ok.status, 200); const { token } = await ok.json();
    const me = async (t) => (await Me.onRequestGet({ env, request: new Request('https://wolko.org/api/campteam/me', { headers: { Authorization: 'Bearer ' + t } }) }));
    const m = await me(token); assert.equal(m.status, 200); const mj = await m.json(); assert.equal(mj.campRole, null); assert.equal(mj.perms.write, false); assert.equal(mj.perms.moneyRead, false); assert.equal(mj.hubRole, 'google');
    const post = await Tasks.onRequestPost({ env, request: new Request('https://wolko.org/api/campteam/tasks', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x' }) }) }); assert.equal(post.status, 403, '조회만');
    env.DB.sqlite.prepare(`INSERT INTO camp_members (email,name,role,active,createdAt,updatedAt) VALUES ('newperson@wolko.org','','member',1,'n','n')`).run();
    assert.equal((await (await me(token)).json()).campRole, 'member', '명단에 올리면 그 역할이 적용');
    const fixed = await (await login(good({ email: 'aidenpark@wolko.org' }))).json(); assert.equal((await (await me(fixed.token)).json()).campRole, 'admin', '고정 관리자');
    // 출입증은 서로 다른 용도: 캠프 출입증은 기존 포털 토큰 해석기에서 무효, 기존 포털 토큰은 운영 주소에서(KV 없이) 캠프팀에 통하지 않는다
    assert.equal(await parseHubSessionToken(SECRET, token), null); assert.equal(await parseCampToken(SECRET, await createHubSessionToken(SECRET, 'a@wolko.org', 'admin')), null);
    assert.equal((await me('garbage')).status, 401); assert.equal(await parseCampToken(SECRET, await issueCampToken('other-secret', 'a@wolko.org')), null, '다른 비밀로 서명한 출입증');
  });
});

test('구글 달력 연동: 미리보기만 기본, 쓰기는 설정+확인이 있어야 하고 바뀐 것만, 지운 일정은 구글에서 자동 삭제하지 않는다', async () => {
  const env = makeEnv(fakeD1()); const call = async (fn, e, who, body) => Cal[fn]({ env: e, request: await req(who, { method: fn === 'onRequestGet' ? 'GET' : 'POST', body, url: 'http://localhost/x' }) });
  assert.equal((await call('onRequestGet', env, U.mem)).status, 403);
  const pv = await (await call('onRequestGet', env, U.admin)).json(); assert.equal(pv.configured, false); assert.equal(pv.writeEnabled, false); assert.equal(pv.plan.creates.length, 6); assert.equal('calendarId' in pv && pv.calendarId !== undefined, false, '달력 ID 는 응답에 없다');
  assert.equal((await call('onRequestPost', env, U.admin, { confirm: true })).status, 400);
  const real = globalThis.fetch, calls = []; globalThis.fetch = async (...a) => { calls.push(String(a[0])); throw new Error('no network'); };
  try {
    const cfg = makeEnv(fakeD1(), { CAMPTEAM_CALENDAR_ID: 'cal@group.calendar.google.com', GOOGLE_SERVICE_ACCOUNT_JSON: '{}' });
    assert.equal((await call('onRequestPost', cfg, U.admin, { confirm: true })).status, 403); assert.equal(calls.length, 0, '쓰기가 꺼져 있으면 외부 요청이 없다');
  } finally { globalThis.fetch = real; }
  const { privateKey } = await newKey(), der = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const on = makeEnv(fakeD1(), { CAMPTEAM_CALENDAR_ID: 'cal@group.calendar.google.com', CAMPTEAM_CALENDAR_WRITE: '1', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 's@x.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` }) });
  assert.equal((await call('onRequestPost', on, U.admin, {})).status, 400, 'confirm 필요'); const seen = []; let n = 0;
  globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), method: init.method, body: init.body }); if (String(url).includes('oauth2')) return Response.json({ access_token: 'tok' }); return Response.json({ id: 'g' + (++n) }); };
  try {
    on.DB.sqlite.exec(`UPDATE events SET deletedAt='2026-10-21T00:00:00Z' WHERE id='e5'`);
    const r = await (await call('onRequestPost', on, U.admin, { confirm: true })).json(); assert.equal(r.created, 5); assert.equal(r.updated, 0);
    const ev = seen.filter(x => x.method === 'POST' && x.url.includes('/calendars/')); assert.equal(ev.length, 5); assert.ok(ev.every(x => x.url.startsWith('https://www.googleapis.com/calendar/v3/calendars/cal%40group.calendar.google.com/events')));
    const allDay = JSON.parse(ev.find(x => JSON.parse(x.body).summary === 'Leader D Out of Office').body); assert.deepEqual([allDay.start, allDay.end], [{ date: '2026-10-18' }, { date: '2026-10-22' }], '종일 일정의 끝은 다음 날'); assert.equal(allDay.extendedProperties.private.portalId, 'e1');
    const timed = JSON.parse(ev.find(x => JSON.parse(x.body).summary.startsWith('Camp & Outreach')).body); assert.equal(timed.start.dateTime, '2026-10-27T10:00:00'); assert.equal(timed.start.timeZone, 'Asia/Seoul');
    assert.equal(on.DB.sqlite.prepare(`SELECT COUNT(*) n FROM events WHERE googleEventId <> ''`).get().n, 5);
    on.DB.sqlite.exec(`UPDATE events SET title='바뀐 제목', updatedAt='2099-01-01T00:00:00Z' WHERE id='e2'`); seen.length = 0;
    const r2 = await (await call('onRequestPost', on, U.admin, { confirm: true })).json(); assert.deepEqual([r2.created, r2.updated], [0, 1], '바뀐 것만 고친다');
    assert.equal(seen.filter(x => x.method === 'PATCH').length, 1); assert.ok(!seen.some(x => x.method === 'DELETE'), '구글 일정을 자동으로 지우지 않는다');
  } finally { globalThis.fetch = real; }
  assert.deepEqual(toGoogleEvent({ id: 'a', title: 'T', startDate: '2026-12-31', endDate: null, startTime: '', endTime: '' }).end, { date: '2027-01-01' });
});

test('일정 자동 반영: 켜져 있을 때만 돌고, 동시에 두 번 불려도 같은 일정이 구글에 두 번 생기지 않으며, 실패해도 던지지 않는다', async () => {
  const { privateKey } = await newKey(), der = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const vars = { CAMPTEAM_CALENDAR_ID: 'cal@group.calendar.google.com', CAMPTEAM_CALENDAR_WRITE: '1', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 's@x.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` }) };
  const real = globalThis.fetch, seen = []; let n = 0;
  globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), method: init.method }); if (String(url).includes('oauth2')) return Response.json({ access_token: 'tok' }); await new Promise((r) => setTimeout(r, 5)); return Response.json({ id: 'g' + (++n) }); };
  try {
    const off = makeEnv(fakeD1(), vars); await autoSync(off, U.admin); assert.equal(seen.length, 0, 'AUTO 설정이 없으면 아무 일도 하지 않는다');
    const on = makeEnv(fakeD1(), { ...vars, CAMPTEAM_CALENDAR_AUTO: '1' }); on.DB.sqlite.exec(`UPDATE events SET deletedAt='x' WHERE id='e5'`);
    const live = on.DB.sqlite.prepare(`SELECT COUNT(*) n FROM events WHERE deletedAt IS NULL`).get().n;
    await Promise.all([autoSync(on, U.admin), autoSync(on, U.admin)]);
    assert.equal(seen.filter((x) => x.method === 'POST' && x.url.includes('/calendars/')).length, live, '일정마다 한 번만 만들어진다');
    assert.equal(on.DB.sqlite.prepare(`SELECT COUNT(*) n FROM events WHERE googleEventId <> ''`).get().n, live);
    globalThis.fetch = async () => { throw new Error('network down'); }; on.DB.sqlite.exec(`UPDATE events SET title='또 바뀜', updatedAt='2099-01-01T00:00:00Z' WHERE id='e2'`);
    await autoSync(on, U.admin); // 던지지 않는다
    assert.equal(on.DB.sqlite.prepare(`SELECT updatedAt FROM notify_settings WHERE key='gcal_lock'`).get().updatedAt, '1970-01-01T00:00:00.000Z', '실패해도 잠금은 풀린다');
  } finally { globalThis.fetch = real; }
});
