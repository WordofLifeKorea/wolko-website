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
  await putAccount(e, { email: 'wait@wol.org', name: 'W', role: 'counselor', status: 'pending' });
  await putAccount(e, { email: 'no@wol.org', name: 'N', role: 'counselor', status: 'rejected' });
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'esooy@wol.org', 'counselor');
  const pending = await createHubSessionToken(e.ADMIN_PASSWORD, 'wait@wol.org', 'counselor');
  const rejected = await createHubSessionToken(e.ADMIN_PASSWORD, 'no@wol.org', 'counselor');
  const stranger = await createHubSessionToken(e.ADMIN_PASSWORD, 'ghost@wol.org', 'admin');
  const master = await createHubSessionToken(e.ADMIN_PASSWORD, 'admin@wolko.org', 'master');
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
  for (const [email, role] of [['a@wol.org', 'counselor'], ['b@wol.org', 'counselor'], ['hkim3@wol.org', 'admin']]) await putAccount(e, { email, name: email, role, status: 'approved' });
  const tok = (email, role) => createHubSessionToken(e.ADMIN_PASSWORD, email, role);
  const [a, b, admin, master] = [await tok('a@wol.org', 'counselor'), await tok('b@wol.org', 'counselor'), await tok('hkim3@wol.org', 'admin'), await tok('admin@wolko.org', 'master')];
  const send = (fn, token, body, query = '') => fn({ env: e, request: new Request('https://wolko.org/api/car/reservations' + query, { method: 'X', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) });
  const mk = async (token, day) => (await (await send(Res.onRequestPost, token, { vehicleId: 'silver-van', startDate: day, endDate: day, reserverName: 'X', purpose: 'trip' })).json()).reservation;

  const r1 = await mk(a, '2030-01-10');
  assert.equal(r1.createdBy, 'a@wol.org');
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
