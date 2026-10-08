import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { onRequestGet as listUsage, onRequestPost as saveUsage, onRequestPatch as patchUsage, onRequestDelete as clearUsage } from '../functions/api/car/usage.js';
import { onRequestGet as getPhoto } from '../functions/api/car/usage-photo.js';

function memoryEnv() {
  const values = new Map();
  const metas = new Map();
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
      async put(key, value, options) { values.set(key, value); if (options?.metadata) metas.set(key, options.metadata); },
      async getWithMetadata(key, type) {
        const value = values.get(key);
        if (value === undefined) return { value: null, metadata: null };
        const out = type === 'arrayBuffer' ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : value;
        return { value: out, metadata: metas.get(key) ?? null };
      },
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
  if (fields.purpose !== undefined) form.set('purpose', fields.purpose);
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

test('usage log offers only Silver Carnival and Santa Fe, even if missionary vehicles exist', async () => {
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

test('clearing the usage log is master-only, needs confirmation, runs in batches and keeps a backup', async () => {
  const env = memoryEnv();
  await env.CAMP_KV.put('hub:account:driver@wol.org', JSON.stringify({ email: 'driver@wol.org', name: '운전자', status: 'approved' }));
  const user = await createHubSessionToken(env.ADMIN_PASSWORD, 'driver@wol.org', 'counselor');
  const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  for (let i = 0; i < 7; i++) await saveUsage({ env, request: postRequest(user) });
  const del = (token, body) => clearUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  assert.equal((await del(user, { confirm: 'DELETE-ALL' })).status, 403);
  assert.equal((await del(master, {})).status, 400);
  const first = await (await del(master, { confirm: 'DELETE-ALL' })).json();
  assert.deepEqual([first.count, first.remaining], [5, 2]);
  const second = await (await del(master, { confirm: 'DELETE-ALL' })).json();
  assert.deepEqual([second.count, second.remaining], [2, 0]);
  const list = await (await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${master}` } }) })).json();
  assert.equal(list.entries.length, 0);
  const trashed = await env.CAMP_KV.list({ prefix: 'car:usage:trash:entry:' });
  assert.equal(trashed.keys.length, 7, '삭제 보관함에 백업');
});

test('selected records: master can edit vehicle/purpose of chosen entries only, and delete only the chosen ones (with backup)', async () => {
  const env = memoryEnv();
  await env.CAMP_KV.put('hub:account:driver@wol.org', JSON.stringify({ email: 'driver@wol.org', name: '운전자', status: 'approved' }));
  const user = await createHubSessionToken(env.ADMIN_PASSWORD, 'driver@wol.org', 'counselor');
  const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push((await (await saveUsage({ env, request: postRequest(user) })).json()).entry.id);
  const call = (fn, method, token, body) => fn({ env, request: new Request('https://example.com/api/car/usage', { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const list = async () => (await (await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${master}` } }) })).json()).entries;
  // 수정: 마스터만, 바꿀 내용이 있어야 하고, 고른 기록만 바뀐다
  assert.equal((await call(patchUsage, 'PATCH', user, { ids, useType: 'personal' })).status, 403);
  assert.equal((await call(patchUsage, 'PATCH', master, { ids: [], useType: 'personal' })).status, 400);
  assert.equal((await call(patchUsage, 'PATCH', master, { ids })).status, 400, '바꿀 내용이 없으면 거절');
  assert.equal((await call(patchUsage, 'PATCH', master, { ids, vehicleId: 'nope' })).status, 400);
  assert.equal((await call(patchUsage, 'PATCH', master, { ids, useType: 'x' })).status, 400);
  const edited = await (await call(patchUsage, 'PATCH', master, { ids: [ids[0], ids[1]], useType: 'personal', vehicleId: 'santa-fe' })).json();
  assert.equal(edited.count, 2);
  const after = await list();
  const byId = Object.fromEntries(after.map(e => [e.id, e]));
  assert.deepEqual([byId[ids[0]].useType, byId[ids[0]].vehicleId, byId[ids[0]].vehicleName, byId[ids[0]].editedBy], ['personal', 'santa-fe', 'Santa Fe', 'wolkorea1@gmail.com']);
  assert.notEqual(byId[ids[2]].useType, 'x');
  assert.equal(byId[ids[2]].editedBy, undefined, '고르지 않은 기록은 그대로');
  // 삭제: 마스터만, 고른 것만, 백업이 남는다
  assert.equal((await call(clearUsage, 'DELETE', user, { ids: [ids[2]] })).status, 403);
  assert.equal((await call(clearUsage, 'DELETE', master, { ids: [] })).status, 400);
  assert.equal((await call(clearUsage, 'DELETE', master, { ids: Array.from({ length: 51 }, (_, i) => 'x' + i) })).status, 400, '한 번에 50건까지');
  const gone = await (await call(clearUsage, 'DELETE', master, { ids: [ids[2], ids[3], 'missing-id'] })).json();
  assert.deepEqual([gone.count, gone.removed.sort()], [2, [ids[2], ids[3]].sort()]);
  assert.deepEqual((await list()).map(e => e.id).sort(), [ids[0], ids[1]].sort(), '고르지 않은 기록은 남는다');
  assert.equal((await env.CAMP_KV.list({ prefix: 'car:usage:trash:entry:' })).keys.length, 2, '삭제 보관함에 백업');
});

test('usage log page: master-only "관리" button with checkbox selection, and photos auto-fit the screen', async () => {
  const { readFileSync } = await import('node:fs');
  const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
  const page = read('../src/pages/car-log/index.astro'), js = read('../public/car-log.js'), css = read('../public/car-log.css');
  assert.match(page, /id="manageBtn"[^>]*hidden[^>]*>관리</, '기본은 숨김, 이름은 관리');
  assert.doesNotMatch(page + js, /전체 비우기|clearAllBtn/, '전체 비우기 버튼은 없다');
  assert.match(js, /\$\('manageBtn'\)\.hidden = me\.role !== 'master'/);
  assert.match(js, /check\.type = 'checkbox'/);
  assert.match(page, /id="editSelBtn"[^>]*>선택 수정</);
  assert.match(page, /id="delSelBtn"[^>]*>선택 삭제</);
  assert.match(css, /\.log-photo-dialog img \{[^}]*max-height:calc\(100dvh - 72px\)/, '사진은 화면 높이 안에 맞춰 축소');
});

test('usage log page: one card per vehicle, one line per record, click to expand', async () => {
  const { readFileSync } = await import('node:fs');
  const js = readFileSync(new URL('../public/car-log.js', import.meta.url), 'utf8');
  assert.match(js, /log-vehicle-head/);
  assert.match(js, /openVehicles/);
  assert.match(js, /log-line-toggle/);
  assert.match(js, /openEntries/);
  assert.match(js, /log-line-body/);
});

test('ministry trips store a short trimmed purpose; personal trips never keep one', async () => {
  const env = memoryEnv();
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: '운전자', status: 'approved' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');
  const ministry = await (await saveUsage({ env, request: postRequest(token, { purpose: '  평택   캠프 장보기 ' }) })).json();
  assert.equal(ministry.entry.purpose, '평택 캠프 장보기');
  const long = await (await saveUsage({ env, request: postRequest(token, { purpose: 'a'.repeat(200) }) })).json();
  assert.equal(long.entry.purpose.length, 60);
  const personal = await (await saveUsage({ env, request: postRequest(token, { useType: 'personal', purpose: '개인 일정' }) })).json();
  assert.equal(personal.entry.purpose, undefined);
});
