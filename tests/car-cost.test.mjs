import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { costRates, personalCost, todayKst, gapKmByEntry } from '../functions/lib/carCost.js';
import { onRequestGet as listUsage, onRequestPost as saveUsage, onRequestPatch as patchUsage } from '../functions/api/car/usage.js';

function memoryEnv(extra = {}) {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'test-secret', ...extra,
    CAMP_KV: {
      async get(key, type) { const v = values.get(key); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v; },
      async put(key, value) { values.set(key, value); },
      async getWithMetadata(key) { const v = values.get(key); return { value: v ?? null, metadata: null }; },
      async delete(key) { values.delete(key); },
      async list({ prefix }) { return { keys: [...values.keys()].filter(n => n.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
}

const daysAgo = n => todayKst(Date.now() - n * 86400_000);
// 오피넷(최근 7일 경유 평균) · 환율 응답을 흉내 낸다
function stubFetch({ diesel = '1850.5', krw = 1400 } = {}) {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (String(url).includes('opinet')) return Response.json({ RESULT: { OIL: [
      { DATE: daysAgo(1).replaceAll('-', ''), PRODCD: 'D047', PRICE: diesel },
      { DATE: daysAgo(2).replaceAll('-', ''), PRODCD: 'D047', PRICE: '1840' },
    ] } });
    if (String(url).includes('frankfurter')) return Response.json({ date: String(url).match(/v1\/(\d{4}-\d{2}-\d{2})/)?.[1] || daysAgo(0), rates: { KRW: krw } });
    return new Response('', { status: 404 });
  };
  return calls;
}

test('trip cost = fuel (km ÷ km/L × diesel) + 35 won per km, split evenly', () => {
  const c = personalCost({ dieselKrw: 1842, usdKrw: 1400 }, 'silver-van', 42, 3);
  assert.equal(c.kmPerLiter, 11);
  assert.equal(c.fuelKrw, Math.round(42 / 11 * 1842));
  assert.equal(c.maintKrw, 1470);
  // 42 km: 기름값 7,033 + 정비비 1,470 = 8,503 → 10원 단위 버림 8,500, 3명이면 2,834.3 → 2,800
  assert.equal(c.fuelKrw, 7033);
  assert.equal(c.totalKrw, 8500);
  assert.equal(c.perPersonKrw, 2800);
  assert.equal(personalCost({ dieselKrw: 1842 }, 'silver-van', 10).totalKrw, 2000);   // 1,675 + 350 = 2,025 → 2,000
  assert.equal(c.totalUsd, Math.round(c.totalKrw / 1400 * 100) / 100);
  assert.equal(personalCost({ dieselKrw: 1842, usdKrw: null }, 'santa-fe', 10).totalUsd, null);
});

test('rates use that day\'s Opinet diesel and exchange rate, the nearest day when missing, and the default without a key', async () => {
  const sent = stubFetch();
  const env = memoryEnv({ OPINET_API_KEY: 'k' });
  const withKey = await costRates(env, daysAgo(1));
  assert.equal(withKey.dieselKrw, 1850.5);
  assert.equal(withKey.dieselDate, daysAgo(1));
  assert.equal(withKey.dieselSource, 'opinet');
  assert.equal(withKey.usdKrw, 1400);
  assert.equal(withKey.fxDate, daysAgo(1));
  assert.ok(sent.some(u => u.includes(`/v1/${daysAgo(1)}?`)));
  assert.equal((await costRates(env, daysAgo(2))).dieselKrw, 1840);
  // 예전에 캐시해 둔 기준값(정비비 20원)이 있어도 정비비는 지금 값(35원)을 쓴다
  await env.CAMP_KV.put(`car:cost:rates:${daysAgo(3)}`, JSON.stringify({ date: daysAgo(3), dieselKrw: 1800, dieselSource: 'opinet', maintenancePerKm: 20 }));
  const cachedOld = await costRates(env, daysAgo(3));
  assert.equal(cachedOld.dieselKrw, 1800);
  assert.equal(cachedOld.maintenancePerKm, 35);
  const old = await costRates(env, '2026-01-05');
  assert.equal(old.dieselSource, 'nearest');
  assert.equal(old.dieselDate, daysAgo(2));

  const calls = stubFetch();
  const noKey = await costRates(memoryEnv());
  assert.equal(noKey.dieselSource, 'default');
  assert.ok(noKey.dieselKrw > 0);
  assert.ok(!calls.some(u => u.includes('opinet')));
});

test('a personal log saves the split memo and the cost; editing the distance recalculates it', async () => {
  stubFetch();
  const env = memoryEnv({ OPINET_API_KEY: 'k' });
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: '운전자', status: 'approved' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');
  const form = new FormData();
  form.set('vehicleId', 'silver-van'); form.set('useType', 'personal'); form.set('tripKm', '42');
  form.set('splitNote', '김철수, 이영희'); form.set('splitCount', '3'); form.set('tripDate', daysAgo(1));
  const saved = await saveUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }) });
  assert.equal(saved.status, 201);
  const { entry } = await saved.json();
  assert.equal(entry.splitNote, '김철수, 이영희');
  assert.equal(entry.tripDate, daysAgo(1));
  assert.equal(entry.cost.splitCount, 3);
  assert.equal(entry.cost.dieselKrw, 1850.5);
  assert.equal(entry.cost.totalKrw, Math.floor((Math.round(42 / 11 * 1850.5) + 1470) / 100) * 100);

  const patched = await patchUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, tripKm: 84 }) }) });
  const after = (await patched.json()).entry;
  assert.equal(after.cost.totalKrw, Math.floor((Math.round(84 / 11 * 1850.5) + 2940) / 100) * 100);
  assert.equal(after.cost.splitCount, 3);

  // 사역용 기록도 비용을 남기고(나눠 내지 않음), 나눠 낼 사람 메모는 남기지 않는다
  const m = new FormData();
  m.set('vehicleId', 'silver-van'); m.set('useType', 'ministry'); m.set('purpose', '장보기'); m.set('chargeAccount', 'wolko'); m.set('tripKm', '10'); m.set('splitNote', 'x');
  const ministry = (await (await saveUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: m }) })).json()).entry;
  assert.equal(ministry.cost.totalKrw, Math.floor((Math.round(10 / 11 * 1850.5) + 350) / 100) * 100);
  assert.equal(ministry.cost.splitCount, 1);
  assert.equal(ministry.cost.maintenancePerKm, 35);
  assert.equal(ministry.splitNote, undefined);
});

const at = m => new Date(Date.UTC(2026, 10, 1, 0, m)).toISOString();
const rec = (id, m, fields) => ({ id, vehicleId: 'silver-van', photoTakenAt: at(m), recordedAt: at(m), ...fields });

test('a blank-distance record is charged the odometer gap between the records around it, minus distances written in between', () => {
  const gaps = gapKmByEntry([
    rec('d', 40, { useType: 'ministry', tripKm: 15, odometerBefore: 1080 }),
    rec('a', 10, { useType: 'ministry', tripKm: 20, odometerBefore: 1000, odometerAfter: 1020 }),
    rec('b', 20, { useType: 'personal' }),
    rec('c', 30, { useType: 'ministry', tripKm: 10 }),
    rec('e', 50, { useType: 'personal' }),
  ]);
  assert.deepEqual(gaps.get('b'), { km: 50, from: 1020, to: 1080, shared: 1 });   // 1080 − 1020 − 10
  assert.deepEqual(gaps.get('e'), { pending: true });                              // 다음 기록이 아직 없다
  assert.equal(gaps.has('a'), false);
  // 빈 기록 둘이 같은 구간에 있으면 나눈다 · 자기 운행 후 계기판이 있으면 그 값까지
  const two = gapKmByEntry([
    rec('a', 10, { tripKm: 5, odometerAfter: 500 }), rec('x', 20, {}), rec('y', 30, {}), rec('z', 40, { tripKm: 3, odometerBefore: 560 }),
  ]);
  assert.equal(two.get('x').km, 30);
  assert.equal(two.get('x').shared, 2);
  assert.deepEqual(gapKmByEntry([rec('a', 10, { tripKm: 5, odometerAfter: 500 }), rec('x', 20, { mileageAfter: 523 })]).get('x'), { km: 23, from: 500, to: 523, shared: 1 });
});

test('both ministry and personal logs need a distance; old records without one get the odometer-gap charge', async () => {
  stubFetch();
  const env = memoryEnv({ OPINET_API_KEY: 'k' });
  const email = 'driver@wol.org';
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: '운전자', status: 'approved' }));
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin');
  const post = fields => { const f = new FormData(); Object.entries(fields).forEach(([k, v]) => f.set(k, v)); return saveUsage({ env, request: new Request('https://example.com/api/car/usage', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: f }) }); };
  assert.equal((await post({ vehicleId: 'silver-van', useType: 'ministry', purpose: 'x', chargeAccount: 'wolko', tripKm: '' })).status, 400);
  assert.equal((await post({ vehicleId: 'silver-van', useType: 'personal', tripKm: '' })).status, 400);
  // 거리 없이 남은 예전 기록(개인용 · 사역용)을 시간 순서가 분명하게 넣는다
  const put = (id, m, fields) => env.CAMP_KV.put(`car:usage:entry:${id}`, JSON.stringify(rec(id, m, { vehicleName: 'Silver Carnival', userEmail: email, ...fields })));
  await put('before', 10, { useType: 'ministry', tripKm: 20, odometerBefore: 1000, odometerAfter: 1020 });
  await put('old-personal', 20, { useType: 'personal', tripDate: daysAgo(1), splitNote: '김철수', splitCount: 2 });
  await put('mid', 30, { useType: 'ministry', tripKm: 5, odometerBefore: 1064, odometerAfter: 1069 });
  await put('old-ministry', 40, { useType: 'ministry', chargeAccount: 'wolko', tripDate: daysAgo(1) });
  const list = async () => (await (await listUsage({ env, request: new Request('https://example.com/api/car/usage', { headers: { Authorization: `Bearer ${token}` } }) })).json()).entries;
  const byId = Object.fromEntries((await list()).map(e => [e.id, e]));
  assert.equal(byId['old-personal'].autoKm.km, 44);
  assert.equal(byId['old-personal'].cost.totalKrw, Math.floor((Math.round(44 / 11 * 1850.5) + 1540) / 100) * 100);
  assert.equal(byId['old-personal'].cost.splitCount, 2);
  assert.deepEqual(byId['old-ministry'].autoKm, { pending: true });   // 다음 기록이 아직 없다
  await put('after', 50, { useType: 'ministry', tripKm: 3, odometerBefore: 1090 });
  const later = Object.fromEntries((await list()).map(e => [e.id, e]));
  assert.equal(later['old-ministry'].autoKm.km, 21);
  assert.equal(later['old-ministry'].cost.splitCount, 1);
});

test('하이패스 금액은 100원 단위로 버리지 않고 운행 비용에 그대로 더한다 (나눠 내면 1인당도 나눔)', () => {
  // 10 km: 기름값 + 정비비 2,025 → 2,000, 하이패스 3,450 그대로 → 5,450
  const one = personalCost({ dieselKrw: 1842 }, 'silver-van', 10, 1, 3450);
  assert.equal(one.tollKrw, 3450);
  assert.equal(one.totalKrw, 5450);
  // 3명: 2,025 ÷ 3 = 675 → 600, 하이패스 3,450 ÷ 3 = 1,150 → 1인당 1,750
  assert.equal(personalCost({ dieselKrw: 1842 }, 'silver-van', 10, 3, 3450).perPersonKrw, 1750);
  assert.equal(personalCost({ dieselKrw: 1842 }, 'silver-van', 10).tollKrw, undefined, '하이패스가 없으면 값도 남기지 않는다');
});
