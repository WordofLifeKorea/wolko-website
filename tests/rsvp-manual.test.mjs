import test from 'node:test';
import assert from 'node:assert/strict';
import * as manual from '../functions/api/rsvp-manual.js';
import * as rsvp from '../functions/api/rsvp.js';
import { canAddRsvp, RSVP_ADDER_EMAILS } from '../functions/lib/rsvpAccess.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function setup() {
  const store = new Map();
  const CAMP_KV = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); }, async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } };
  const env = { CAMP_KV, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  const as = async (who, fn, init = {}, url = 'https://t.co/api/rsvp-manual') => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await createHubSessionToken('secret', who[0], who[1]);
    const res = await fn({ env, request: new Request(url, { headers, ...init }), waitUntil() {} });
    return { status: res.status, body: await res.json() };
  };
  return { store, acc, as };
}
const peter = ['peterchae@wol.org', 'counselor'], anna = ['anna@wol.org', 'counselor'], admin = ['hkim3@wol.org', 'admin'];

test('참석자 직접 추가 권한: peterchae · 마스터 · 관리자만', () => {
  assert.ok(RSVP_ADDER_EMAILS.includes('peterchae@wol.org'));
  assert.equal(canAddRsvp({ email: 'PeterChae@wol.org', role: 'counselor' }), true);
  assert.equal(canAddRsvp({ email: 'x@wol.org', role: 'admin' }), true);
  assert.equal(canAddRsvp({ email: 'x@wol.org', role: 'master' }), true);
  assert.equal(canAddRsvp({ email: 'anna@wol.org', role: 'counselor' }), false);
  assert.equal(canAddRsvp(null), false);
});

test('참석자 직접 추가: 이름만 있어도 되고, 목록에 나타나며, 중복 이메일·잘못된 값은 거절한다', async () => {
  const t = setup(); t.acc(peter[0]); t.acc(anna[0]); t.acc(admin[0], 'admin');
  const post = (who, body) => t.as(who, manual.onRequestPost, { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await post(null, { name: 'A' })).status, 401);
  assert.equal((await post(anna, { name: 'A' })).status, 403, '일반 계정은 못 추가한다');
  assert.equal((await post(peter, { name: '  ' })).status, 400);
  assert.equal((await post(peter, { name: 'A', email: 'nope' })).status, 400);
  assert.equal((await post(peter, { name: 'A', partySize: 0 })).status, 400);
  assert.equal((await post(peter, { eventId: 'unknown', name: 'A' })).status, 404);

  const onlyName = await post(peter, { name: '김 집사' });
  assert.equal(onlyName.status, 201); assert.equal(onlyName.body.rsvp.partySize, 1); assert.equal(onlyName.body.rsvp.source, 'manual'); assert.equal(onlyName.body.rsvp.addedBy, 'peterchae@wol.org');
  const full = await post(admin, { name: '박 성도', phone: '01012345678', email: 'Park@Example.com', partySize: '3', notes: '유모차' });
  assert.equal(full.status, 201); assert.equal(full.body.rsvp.email, 'park@example.com'); assert.equal(full.body.rsvp.partySize, 3);
  assert.equal((await post(peter, { name: '중복', email: 'park@example.com' })).status, 409, '같은 이메일은 한 번만');

  // 참석 목록(GET)에 나타나고, 추가 권한 여부(canAdd)가 내려간다
  const list = (who) => t.as(who, rsvp.onRequestGet, {}, 'https://t.co/api/rsvp?eventId=thanksgiving-night');
  const asPeter = await list(peter);
  assert.equal(asPeter.body.totalRsvps, 2); assert.equal(asPeter.body.totalGuests, 4); assert.equal(asPeter.body.canAdd, true);
  assert.deepEqual(asPeter.body.rsvps.map(r => r.name).sort(), ['김 집사', '박 성도']);
  assert.equal((await list(anna)).body.canAdd, false);
});
