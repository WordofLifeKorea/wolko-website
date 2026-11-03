import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { ACCOUNTANT_EMAILS } from '../functions/lib/expenses.js';
import { onRequestGet as carCosts, summarizeCarCosts } from '../functions/api/expense/car-costs.js';

const cost = n => ({ totalKrw: n, splitCount: 1 });
const rec = (id, date, fields) => ({ id, vehicleId: 'silver-van', tripDate: date, photoTakenAt: `${date}T03:00:00Z`, recordedAt: `${date}T03:00:00Z`, tripKm: 10, ...fields });

test('vehicle costs are grouped by month: personal per person (charged), ministry per account (to process)', () => {
  const s = summarizeCarCosts([
    rec('a', '2026-11-02', { useType: 'personal', userEmail: 'a@x', userName: '김철수', cost: cost(8500) }),
    rec('b', '2026-11-20', { useType: 'personal', userEmail: 'a@x', userName: '김철수', cost: cost(1500), tripKm: 2 }),
    rec('c', '2026-11-05', { useType: 'ministry', chargeAccount: 'camp-team', userEmail: 'b@x', userName: '이영희', cost: cost(4000) }),
    rec('d', '2026-11-06', { useType: 'ministry', chargeAccount: 'personal', userEmail: 'b@x', userName: '이영희', cost: cost(3000) }),
    rec('e', '2026-11-07', { useType: 'ministry', chargeAccount: 'personal', userEmail: 'c@x', userName: '박지민', cost: cost(2000) }),
    rec('f', '2026-11-08', { useType: 'ministry', userEmail: 'c@x', userName: '박지민', cost: cost(1000) }),   // 계좌를 고르지 않은 예전 기록
    rec('g', '2026-11-09', { useType: 'personal', userEmail: 'c@x', userName: '박지민', tripKm: undefined }),     // 아직 계산 못 함
    rec('h', '2026-10-31', { useType: 'personal', userEmail: 'a@x', userName: '김철수', cost: cost(9999) }),   // 지난 달
  ], '2026-11');
  assert.equal(s.personal.total, 10000);
  assert.deepEqual(s.personal.rows.map(r => [r.name, r.amount, r.count, r.km]), [['김철수', 10000, 2, 12]]);
  assert.equal(s.ministry.total, 10000);
  assert.deepEqual(s.ministry.rows.map(r => [r.ko, r.holder, r.amount]), [['캠프팀', undefined, 4000], ['본인 개인 계좌', '이영희', 3000], ['본인 개인 계좌', '박지민', 2000], ['계좌 미지정', undefined, 1000]]);
  assert.equal(s.pending, 1);
});

test('only approvers and accountants can see vehicle costs; the month closes on its last day', async () => {
  const values = new Map();
  const env = { ADMIN_PASSWORD: 'test-secret', CAMP_KV: {
    async get(k, type) { const v = values.get(k); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { values.set(k, v); }, async delete(k) { values.delete(k); },
    async list({ prefix }) { return { keys: [...values.keys()].filter(n => n.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  } };
  const user = 'driver@wol.org', acct = ACCOUNTANT_EMAILS[0];
  for (const email of [user, acct]) await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: email.split('@')[0], status: 'approved' }));
  await env.CAMP_KV.put('car:usage:entry:a', JSON.stringify(rec('a', '2026-10-15', { useType: 'personal', userEmail: user, userName: '운전자', cost: cost(5000) })));
  const call = async (email, q = '') => carCosts({ env, request: new Request('https://example.com/api/expense/car-costs' + q, { headers: { Authorization: `Bearer ${await createHubSessionToken(env.ADMIN_PASSWORD, email, 'admin')}` } }) });
  assert.equal((await carCosts({ env, request: new Request('https://example.com/api/expense/car-costs') })).status, 401);
  assert.equal((await call(user)).status, 403);
  const body = await (await call(acct, '?month=2026-10')).json();
  assert.equal(body.month, '2026-10');
  assert.equal(body.closeDate, '2026-10-31');
  assert.equal(body.closed, true);
  assert.equal(body.personal.total, 5000);
  assert.ok(body.months.includes('2026-10'));
});
