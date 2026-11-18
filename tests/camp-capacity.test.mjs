// 캠프 정원은 서버가 캠프 일정(camp_schedules)에서 정한다 — 요청 본문의 capacity 를 부풀려도 정원·예비 검사를 건너뛸 수 없다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/register.js';
import { campCapacityFor, resetCampCapacityCache } from '../functions/lib/campCapacity.js';
import { fakeAssets } from './helpers/campSchedulesAssets.mjs';

import { campSchedulesFromContent } from './helpers/campSchedulesAssets.mjs';

const UNITY = '2027-unity-winter';
const NO_CAP_FIELD = '2027-siheung-jungang-elementary-english';
// 신청 테스트는 고정 목록으로 한다 — 캠프 파일의 정원이 바뀌어도 테스트가 깨지지 않게(wolko-dev-guide 3번)
const FIXTURE = [{ id: UNITY, capacity: 70 }, { id: NO_CAP_FIELD, capacity: 40 }, { id: '2027-jeju-english', capacity: 60 }, { id: '2027-wolko-winter', capacity: 50 }];
const fixtureAssets = (opts = {}) => fakeAssets({ list: FIXTURE, ...opts });

async function register(overrides = {}, { assets = fixtureAssets(), seed = {} } = {}) {
  resetCampCapacityCache();
  const store = new Map(Object.entries(seed));
  const env = { ASSETS: assets, CAMP_KV: { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v) } };
  const background = [];
  const payload = { registrationType: 'individual', campId: UNITY, name: '테스트 캠퍼', phone: '01012345678', email: 't@example.com',
    grade: '6', gender: 'male', church: '테스트교회', refundBank: '은행', refundAccount: '123', refundHolder: '홍길동', mediaConsent: 'yes', ...overrides };
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-11-20T12:00:00+09:00');
  let response;
  try {
    response = await onRequestPost({ env, request: new Request('https://example.com/api/register', { method: 'POST', body: JSON.stringify(payload) }), waitUntil: t => background.push(t) });
  } finally { Date.now = realNow; }
  await Promise.allSettled(background);
  const regs = [...store.entries()].filter(([k]) => k.includes(':reg:')).map(([, v]) => JSON.parse(v));
  return { response, body: await response.json(), store, regs };
}

test('캠프 일정 목록(/camp-schedules.json)이 정원을 내보낸다', () => {
  const src = readFileSync(new URL('../src/pages/camp-schedules.json.ts', import.meta.url), 'utf8');
  assert.match(src, /capacity: data\.capacity/);
  const schema = readFileSync(new URL('../src/content/config.ts', import.meta.url), 'utf8');
  assert.match(schema, /capacity: z\.number\(\)\.default\(40\)/, '서버 기본값(40)과 스키마 기본값이 같아야 한다');
});

test('서버 정원은 캠프 일정 파일 값이다 (칸이 없으면 40) — 모든 캠프', async () => {
  resetCampCapacityCache();
  const env = { ASSETS: fakeAssets() };   // 실제 캠프 파일
  const req = new Request('https://example.com/api/register');
  const dir = new URL('../src/content/camp_schedules/', import.meta.url);
  const camps = campSchedulesFromContent();
  assert.ok(camps.length > 0);
  for (const { id } of camps) {
    const file = JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
    assert.deepEqual(await campCapacityFor(env, req, id), { ok: true, capacity: file.capacity ?? 40 }, id);
  }
  assert.deepEqual(await campCapacityFor(env, req, 'no-such-camp'), { ok: false, reason: 'unknown-camp' });
});

test('정원(70)이 찬 캠프에 capacity 를 부풀려 보내도 예비로 접수된다', async () => {
  const { response, body, regs } = await register({ capacity: 100000 }, { seed: { [`camp:${UNITY}:submissions`]: '70' } });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.isWaitlist, true);
  assert.equal(body.waitlistNumber, 1);
  assert.equal(regs.length, 1);
  assert.equal(regs[0].isWaitlist, true);
});

test('정원과 예비까지 찬 캠프는 capacity 를 부풀려도 마감으로 거절된다', async () => {
  const { response, body, regs } = await register({ capacity: 100000 }, { seed: { [`camp:${UNITY}:submissions`]: '80' } });
  assert.equal(response.status, 409);
  assert.match(body.error, /마감/);
  assert.equal(regs.length, 0);
});

test('capacity 칸이 없는 캠프는 기본 정원 40 으로 센다 — 요청 값과 무관', async () => {
  const { body } = await register({ campId: NO_CAP_FIELD, capacity: 999 }, { seed: { [`camp:${NO_CAP_FIELD}:submissions`]: '40' } });
  assert.equal(body.isWaitlist, true);
  assert.equal(body.waitlistNumber, 1);
});

test('capacity 를 작게 보내도 실제 정원 안이면 확정 신청으로 받는다', async () => {
  const { response, body } = await register({ capacity: 1 }, { seed: { [`camp:${UNITY}:submissions`]: '69' } });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.isWaitlist, false);
});

test('캠프 일정에 없는 campId 는 거절하고 아무것도 저장하지 않는다', async () => {
  const { response, body, store } = await register({ campId: 'made-up-camp', capacity: 100000 });
  assert.equal(response.status, 400);
  assert.equal(body.code, 'unknown-camp');
  assert.equal(store.size, 0);
});

test('캠프 일정을 읽지 못하면 정원을 짐작하지 않고 503 으로 다시 시도하게 한다', async () => {
  const { response, body, store } = await register({ capacity: 100000 }, { assets: fixtureAssets({ fail: true }) });
  assert.equal(response.status, 503);
  assert.equal(body.code, 'capacity-unavailable');
  assert.equal(store.size, 0);
  const noAssets = await register({}, { assets: null });   // ASSETS 가 아예 없을 때
  assert.equal(noAssets.response.status, 503);
});

test('단체 신청도 capacity 를 부풀려 잔여 정원 검사를 건너뛸 수 없다 (2027-jeju-english 정원 60)', async () => {
  const campId = '2027-jeju-english';
  const participants = [{ name: '학생1', gender: 'male' }, { name: '학생2', gender: 'female' }, { name: '학생3', gender: 'male' }];
  const over = await register({ campId, registrationType: 'group', groupCount: 3, participants, capacity: 100000 }, { seed: { [`camp:${campId}:submissions`]: '58' } });
  assert.equal(over.response.status, 409);
  assert.match(over.body.error, /잔여 정원은 2명/);
  assert.equal(over.regs.length, 0);
  const fits = await register({ campId, registrationType: 'group', groupCount: 2, participants: participants.slice(0, 2), capacity: 1 }, { seed: { [`camp:${campId}:submissions`]: '58' } });
  assert.equal(fits.response.status, 200, JSON.stringify(fits.body));
  assert.equal(fits.body.isWaitlist, false);
});

test('문자열이 아닌 campId(배열 등)는 거절한다', async () => {
  const { response, store } = await register({ campId: ['2027-wolko-winter'] });
  assert.equal(response.status, 400);
  assert.equal(store.size, 0);
  assert.deepEqual(await campCapacityFor({ ASSETS: fixtureAssets() }, new Request('https://example.com/'), ['2027-unity-winter']), { ok: false, reason: 'unknown-camp' });
});

test('일정 읽기 실패는 캐시하지 않는다 — 다음 요청에서 다시 읽는다', async () => {
  resetCampCapacityCache();
  const req = new Request('https://example.com/api/register');
  assert.deepEqual(await campCapacityFor({ ASSETS: fixtureAssets({ fail: true }) }, req, UNITY), { ok: false, reason: 'unavailable' });
  const assets = fixtureAssets();
  assert.deepEqual(await campCapacityFor({ ASSETS: assets }, req, UNITY), { ok: true, capacity: 70 });
  await campCapacityFor({ ASSETS: assets }, req, UNITY);
  assert.equal(assets.calls.length, 1, '성공한 목록은 캐시해서 다시 읽지 않는다');
});
