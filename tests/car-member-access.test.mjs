import assert from 'node:assert/strict';
import test from 'node:test';
import * as Res from '../functions/api/car/reservations.js';
import * as Veh from '../functions/api/car/vehicles.js';
import * as Mnt from '../functions/api/car/maintenance.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';

function env() {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'secret',
    CAMP_KV: {
      async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
      async put(k, v) { values.set(k, v); },
      async delete(k) { values.delete(k); },
      async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
}
const get = (fn, e, token) => fn({ env: e, request: new Request('https://wolko.org/api/car/x', { headers: token ? { Authorization: `Bearer ${token}` } : {} }) });

test('any approved portal member can read the reservation, vehicle and maintenance lists; others cannot', async () => {
  const e = env();
  await putAccount(e, { email: 'esooy@wol.org', name: 'Estelle', role: 'counselor', status: 'approved' });
  await putAccount(e, { email: 'wait@x.com', name: 'W', role: 'counselor', status: 'pending' });
  await putAccount(e, { email: 'no@x.com', name: 'N', role: 'counselor', status: 'rejected' });
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'esooy@wol.org', 'counselor');
  const pending = await createHubSessionToken(e.ADMIN_PASSWORD, 'wait@x.com', 'counselor');
  const rejected = await createHubSessionToken(e.ADMIN_PASSWORD, 'no@x.com', 'counselor');
  const stranger = await createHubSessionToken(e.ADMIN_PASSWORD, 'ghost@x.com', 'admin');
  const master = await createHubSessionToken(e.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  for (const fn of [Res.onRequestGet, Veh.onRequestGet, Mnt.onRequestGet]) {
    assert.equal((await get(fn, e, member)).status, 200, '일반 멤버 허용');
    assert.equal((await get(fn, e, master)).status, 200, '마스터 허용');
    assert.equal((await get(fn, e, pending)).status, 401, '승인 대기는 거절');
    assert.equal((await get(fn, e, rejected)).status, 401, '거부된 계정은 거절');
    assert.equal((await get(fn, e, stranger)).status, 401, '계정이 없으면 등급을 주장해도 거절');
    assert.equal((await get(fn, e, null)).status, 401, '로그인 없이는 거절');
  }
});

test('a reservation can be deleted only by whoever made it, an admin, or the master', async () => {
  const e = env();
  for (const [email, role] of [['a@x.com', 'counselor'], ['b@x.com', 'counselor'], ['hkim3@wol.org', 'admin']]) await putAccount(e, { email, name: email, role, status: 'approved' });
  const tok = (email, role) => createHubSessionToken(e.ADMIN_PASSWORD, email, role);
  const [a, b, admin, master] = [await tok('a@x.com', 'counselor'), await tok('b@x.com', 'counselor'), await tok('hkim3@wol.org', 'admin'), await tok('wolkorea1@gmail.com', 'master')];
  const send = (fn, token, body, query = '') => fn({ env: e, request: new Request('https://wolko.org/api/car/reservations' + query, { method: 'X', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) });
  const mk = async (token, day) => (await (await send(Res.onRequestPost, token, { vehicleId: 'silver-van', startDate: day, endDate: day, reserverName: 'X', purpose: 'trip' })).json()).reservation;

  const r1 = await mk(a, '2030-01-10');
  assert.equal(r1.createdBy, 'a@x.com');
  const list = async token => (await (await get(Res.onRequestGet, e, token)).json()).reservations;
  assert.equal((await list(a)).find(r => r.id === r1.id).canDelete, true);
  assert.equal((await list(b)).find(r => r.id === r1.id).canDelete, false, '다른 멤버에게는 삭제 버튼을 보여주지 않는다');

  assert.equal((await send(Res.onRequestDelete, b, null, `?id=${r1.id}`)).status, 403, '남의 예약은 못 지운다');
  assert.equal((await send(Res.onRequestDelete, a, null, `?id=${r1.id}`)).status, 200, '본인은 지운다');

  const r2 = await mk(a, '2030-01-11');
  assert.equal((await send(Res.onRequestDelete, admin, null, `?id=${r2.id}`)).status, 200, '관리자는 지운다');
  const r3 = await mk(b, '2030-01-12');
  assert.equal((await send(Res.onRequestDelete, master, null, `?id=${r3.id}`)).status, 200, '마스터는 지운다');

  // 만든 사람이 기록되지 않은 예전 예약은 관리자·마스터만
  await e.CAMP_KV.put('car:res:legacy', JSON.stringify({ id: 'legacy', vehicleId: 'silver-van', startAt: '2030-02-01T09:00:00', endAt: '2030-02-01T18:00:00' }));
  assert.equal((await send(Res.onRequestDelete, a, null, '?id=legacy')).status, 403, '기록 없는 예전 예약은 일반 멤버가 못 지운다');
  assert.equal((await send(Res.onRequestDelete, admin, null, '?id=legacy')).status, 200);
});
