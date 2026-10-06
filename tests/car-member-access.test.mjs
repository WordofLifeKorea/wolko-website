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
