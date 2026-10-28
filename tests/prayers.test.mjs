import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../functions/api/portal/prayers.js';
import { parsePrayerInput, readPrayers, PRAYERS_KEY, DAILY_LIMIT } from '../functions/lib/prayers.js';
import { buildDashboard } from '../functions/lib/portalDashboard.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function setup() {
  const store = new Map();
  const CAMP_KV = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  const env = { CAMP_KV, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor', name = '') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: name || email, role, status: 'approved' }));
  const call = async (method, who, { query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await createHubSessionToken('secret', who[0], who[1]);
    const request = new Request(`https://t.co/api/portal/prayers${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const res = await { GET: api.onRequestGet, POST: api.onRequestPost, DELETE: api.onRequestDelete }[method]({ env, request });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, env, acc, call };
}
const anna = ['anna@wol.org', 'counselor'], ben = ['ben@wol.org', 'counselor'], admin = ['hkim3@wol.org', 'admin'];

test('기도제목 입력: 내용 필수, 300자까지, 줄바꿈은 정리', () => {
  assert.ok(parsePrayerInput({ text: '  ' }).error);
  assert.equal(parsePrayerInput({ text: 'a'.repeat(400) }).value.text.length, 300);
  assert.equal(parsePrayerInput({ text: 'a\n\n\n\nb' }).value.text, 'a\n\nb');
  assert.equal(parsePrayerInput({ text: 'x', anonymous: true }).value.anonymous, true);
});

test('기도제목: 로그인 필요, 올리기·보기·함께 기도·지우기', async () => {
  const t = setup(); t.acc(anna[0], 'counselor', 'Anna Lee'); t.acc(ben[0], 'counselor', 'Ben Kim'); t.acc(admin[0], 'admin', 'Admin');
  assert.equal((await t.call('GET', null)).status, 401);
  assert.equal((await t.call('POST', null, { body: { text: 'x' } })).status, 401);
  assert.equal((await t.call('POST', anna, { body: { text: ' ' } })).status, 400);

  const posted = await t.call('POST', anna, { body: { text: '이번 주 캠프를 위해 기도해 주세요' } });
  assert.equal(posted.status, 201); assert.equal(posted.prayers.length, 1);
  assert.equal(posted.prayers[0].name, 'Anna Lee'); assert.equal(posted.prayers[0].mine, true); assert.equal(posted.prayers[0].canDelete, true);
  const id = posted.prayers[0].id;

  const asBen = (await t.call('GET', ben)).prayers[0];
  assert.equal(asBen.mine, false); assert.equal(asBen.canDelete, false); assert.equal(asBen.count, 0); assert.equal(asBen.prayed, false);
  assert.equal((await t.call('POST', ben, { body: { action: 'pray', id } })).count, 1);
  assert.deepEqual(await t.call('POST', ben, { body: { action: 'pray', id } }).then(r => [r.count, r.prayed]), [0, false], '다시 누르면 취소');
  await t.call('POST', ben, { body: { action: 'pray', id } });
  assert.equal((await t.call('GET', ben)).prayers[0].prayed, true);
  assert.equal((await t.call('GET', anna)).prayers[0].count, 1);
  assert.equal((await t.call('POST', ben, { body: { action: 'pray', id: 'nope' } })).status, 404);

  assert.equal((await t.call('DELETE', ben, { query: `?id=${id}` })).status, 403, '남의 것은 못 지운다');
  assert.equal((await t.call('GET', admin)).prayers[0].canDelete, true, '관리자는 지울 수 있다');
  assert.equal((await t.call('DELETE', anna, { query: `?id=${id}` })).status, 200);
  assert.equal((await t.call('GET', anna)).prayers.length, 0);
  assert.equal((await t.call('DELETE', anna, { query: `?id=${id}` })).status, 404);
});

test('기도제목: 익명이면 이름이 저장되지 않고, 누가 올렸고 누가 기도했는지는 어디에도 이메일로 남지 않는다', async () => {
  const t = setup(); t.acc(anna[0], 'counselor', 'Anna Lee'); t.acc(ben[0], 'counselor', 'Ben Kim');
  await t.call('POST', anna, { body: { text: '비공개로 나누는 기도제목', anonymous: true } });
  const id = (await t.call('GET', anna)).prayers[0].id;
  await t.call('POST', ben, { body: { action: 'pray', id } });
  const seen = await t.call('GET', ben);
  assert.equal(seen.prayers[0].anonymous, true); assert.equal(seen.prayers[0].name, '');
  assert.equal(/anna|Anna|ben|Ben|@/.test(JSON.stringify(seen)), false, '응답에 이름·이메일이 없다');
  assert.equal(/anna|Anna|ben|Ben|@/.test(t.store.get(PRAYERS_KEY)), false, '저장값에도 없다');
  assert.equal((await t.call('GET', anna)).prayers[0].mine, true, '본인은 자기 것을 알아본다');
});

test('기도제목: 하루 5개까지, 45일이 지나면 사라진다, 첫 화면 데이터에도 들어 있다', async () => {
  const t = setup(); t.acc(anna[0]);
  for (let i = 0; i < DAILY_LIMIT; i++) assert.equal((await t.call('POST', anna, { body: { text: `기도 ${i}` } })).status, 201);
  assert.equal((await t.call('POST', anna, { body: { text: '여섯째' } })).status, 429);
  const old = JSON.parse(t.store.get(PRAYERS_KEY)); old[0].createdAt = new Date(Date.now() - 46 * 86400000).toISOString();
  t.store.set(PRAYERS_KEY, JSON.stringify(old));
  assert.equal((await readPrayers(t.env)).length, DAILY_LIMIT - 1);
  const d = await buildDashboard(t.env, { email: anna[0], role: 'counselor', name: 'Anna' }, Date.now());
  assert.equal(d.prayers.length, DAILY_LIMIT - 1);
});
