import test from 'node:test';
import assert from 'node:assert/strict';
import * as admin from '../functions/api/admin/registrations.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function makeEnv({ staleList = false } = {}) {
  const store = new Map();
  const hidden = new Set(); // keys written but not yet visible to list() — KV is eventually consistent
  const kv = {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); if (staleList && k.includes(':reg:')) hidden.add(k); },
    delete: async k => { store.delete(k); hidden.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix) && !hidden.has(k)).map(name => ({ name })), list_complete: true }),
  };
  return { store, env: { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' } };
}

async function setup(opts) {
  const { store, env } = makeEnv(opts);
  const token = await createHubSessionToken('secret', 'wolkorea1@gmail.com', 'master');
  const call = async (fn, url, init = {}) => {
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}

const campId = '2027-wolko-winter';
const reg = { regId: 'r1', campId, registrationType: 'individual', name: 'Kim', phone: '010-1111-2222', email: 'a@b.com', gender: 'male', status: 'deposit', registeredAt: '2026-10-16T00:00:00.000Z' };

test('deleting moves the registration to the trash and restoring brings it back to the list and counters', async () => {
  const { store, call } = await setup();
  store.set(`camp:${campId}:reg:r1`, JSON.stringify(reg));
  store.set(`camp:${campId}:email:a@b.com`, 'r1');

  assert.equal((await call(admin.onRequestDelete, `https://x/api/admin/registrations?regId=r1&campId=${campId}`, { method: 'DELETE' })).status, 200);
  assert.equal(store.has(`camp:${campId}:reg:r1`), false);
  assert.equal((await call(admin.onRequestGet, 'https://x/api/admin/registrations?trash=1')).body.trash.length, 1);

  const restored = await call(admin.onRequestPost, 'https://x/api/admin/registrations', { method: 'POST', body: JSON.stringify({ action: 'restore', regId: 'r1', campId }) });
  assert.equal(restored.status, 200);
  assert.equal(restored.body.reg.regId, 'r1');
  assert.deepEqual((await call(admin.onRequestGet, 'https://x/api/admin/registrations')).body.registrations.map(r => r.regId), ['r1']);
  assert.equal((await call(admin.onRequestGet, 'https://x/api/admin/registrations?trash=1')).body.trash.length, 0);
});

test('restore counts the restored registration even when the KV list has not caught up yet', async () => {
  const { store, call } = await setup({ staleList: true });
  store.set(`camp:${campId}:reg:r1`, JSON.stringify(reg));
  await call(admin.onRequestDelete, `https://x/api/admin/registrations?regId=r1&campId=${campId}`, { method: 'DELETE' });
  const restored = await call(admin.onRequestPost, 'https://x/api/admin/registrations', { method: 'POST', body: JSON.stringify({ action: 'restore', regId: 'r1', campId }) });
  assert.equal(restored.status, 200);
  assert.equal(store.get(`camp:${campId}:submissions`), '1');
  assert.equal(store.get(`camp:${campId}:count`), '1'); // deposit-verified counts toward the gauge
});

test('restore is blocked when the same name and phone registered again, and only admins can restore', async () => {
  const { store, call } = await setup();
  store.set(`camp:${campId}:reg:r1`, JSON.stringify(reg));
  await call(admin.onRequestDelete, `https://x/api/admin/registrations?regId=r1&campId=${campId}`, { method: 'DELETE' });
  store.set(`camp:${campId}:person:kim|01011112222`, 'r2'); // a new registration took the same person key
  const blocked = await call(admin.onRequestPost, 'https://x/api/admin/registrations', { method: 'POST', body: JSON.stringify({ action: 'restore', regId: 'r1', campId }) });
  assert.equal(blocked.status, 409);

  const anon = await admin.onRequestPost({ env: { CAMP_KV: {}, ADMIN_PASSWORD: 'secret' }, request: new Request('https://x/api/admin/registrations', { method: 'POST', body: '{}' }) });
  assert.equal(anon.status, 401);
});
