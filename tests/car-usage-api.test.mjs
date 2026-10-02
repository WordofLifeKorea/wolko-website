import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { onRequestGet as listUsage, onRequestPost as saveUsage, onRequestPatch as patchUsage } from '../functions/api/car/usage.js';
import { onRequestGet as getPhoto } from '../functions/api/car/usage-photo.js';

function memoryEnv() {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'test-secret',
    CAMP_KV: {
      async get(key, type) {
        const value = values.get(key);
        if (value === undefined) return null;
        if (type === 'json') return JSON.parse(value);
        if (type === 'arrayBuffer') return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        return value;
      },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); },
      async list({ prefix }) { return { keys: [...values.keys()].filter(name => name.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
}

function jpeg() {
  const bytes = new Uint8Array(120);
  bytes.set([0xff, 0xd8], 0);
  bytes.set([0xff, 0xd9], 118);
  return new File([bytes], 'before.jpg', { type: 'image/jpeg' });
}

function postRequest(token, fields = {}) {
  const form = new FormData();
  form.set('vehicleId', fields.vehicleId || 'silver-van');
  form.set('useType', fields.useType || 'ministry');
  form.set('photo', fields.photo || jpeg());
  if (fields.photoTakenAt) {
    form.set('photoTakenAt', fields.photoTakenAt);
    form.set('timeSource', 'exif');
  }
  return new Request('https://example.com/api/car/usage', {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
  });
}

test('usage entries require login and bind the author to the verified account', async () => {
  const env = memoryEnv();
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: '운전자', status: 'approved' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');

  assert.equal((await saveUsage({ env, request: postRequest(null) })).status, 401);
  assert.equal((await saveUsage({ env, request: postRequest(token, { vehicleId: 'unknown' }) })).status, 400);
  assert.equal((await saveUsage({ env, request: postRequest(token, { useType: 'other' }) })).status, 400);

  const photoTakenAt = new Date(Date.now() - 60_000).toISOString();
  const saved = await saveUsage({ env, request: postRequest(token, { photoTakenAt }) });
  assert.equal(saved.status, 201);
  const { entry } = await saved.json();
  assert.equal(entry.userEmail, email);
  assert.equal(entry.userName, '운전자');
  assert.equal(entry.useType, 'ministry');
  assert.equal(entry.timeSource, 'exif');
  assert.equal(entry.photoTakenAt, photoTakenAt);
  assert.ok(entry.recordedAt);

  const listed = await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${token}` } }) });
  assert.equal((await listed.json()).entries[0].id, entry.id);

  const url = `https://example.com/api/car/usage-photo?id=${entry.id}`;
  assert.equal((await getPhoto({ env, request: new Request(url) })).status, 401);
  const image = await getPhoto({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` } }) });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
});

test('old EXIF time cannot be used as an old vehicle-use timestamp', async () => {
  const env = memoryEnv();
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, status: 'approved' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');
  const saved = await saveUsage({ env, request: postRequest(token, { photoTakenAt: '2020-01-01T00:00:00.000Z' }) });
  const { entry } = await saved.json();
  assert.equal(entry.timeSource, 'recorded');
  assert.equal(entry.photoTakenAt, entry.recordedAt);
});

test('a rejected account cannot use an existing signed session', async () => {
  const env = memoryEnv();
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, status: 'rejected' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');
  assert.equal((await saveUsage({ env, request: postRequest(token) })).status, 401);
});

test('usage log offers only Silver Van and Santa Fe, even if missionary vehicles exist', async () => {
  const env = memoryEnv();
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: '운전자', status: 'approved' }));
  await env.CAMP_KV.put('car:vehicles:missionary', JSON.stringify([{ id: 'kim-car', name: 'Kim' }]));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'counselor');
  const res = await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${token}` } }) });
  const data = await res.json();
  assert.deepEqual(data.vehicles.map(v => v.id), ['silver-van', 'santa-fe']);
  const bad = await saveUsage({ env, request: postRequest(token, { vehicleId: 'kim-car' }) });
  assert.equal(bad.status, 400, '선교사 개인 차량은 사용 일지에서 선택할 수 없다');
});

test('mileage after use can be added by the author only', async () => {
  const env = memoryEnv();
  for (const [email, name] of [['driver@wol.org', '운전자'], ['other@wol.org', '다른사람']]) {
    await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name, status: 'approved' }));
  }
  const mine = await createHubSessionToken(env.ADMIN_PASSWORD, 'driver@wol.org', 'counselor');
  const other = await createHubSessionToken(env.ADMIN_PASSWORD, 'other@wol.org', 'counselor');
  const saved = await (await saveUsage({ env, request: postRequest(mine) })).json();
  const patch = (token, body) => patchUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  assert.equal((await patch(other, { id: saved.entry.id, mileageAfter: 1000 })).status, 403);
  assert.equal((await patch(mine, { id: saved.entry.id, mileageAfter: -5 })).status, 400);
  assert.equal((await patch(mine, { id: saved.entry.id, mileageAfter: 'abc' })).status, 400);
  const ok = await patch(mine, { id: saved.entry.id, mileageAfter: 45210 });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).entry.mileageAfter, 45210);
  const list = await (await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${mine}` } }) })).json();
  assert.equal(list.entries[0].mileageAfter, 45210);
});
