import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, noticesForWeek, parseNoticeInput, recentChurches, kitchenToday, carToday } from '../functions/lib/portalDashboard.js';
import * as noticeApi from '../functions/api/portal/notices.js';
import { createHubSessionToken, MASTER_EMAILS, ADMIN_EMAILS } from '../functions/lib/hubAccounts.js';

function kvEnv(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return { store, env: { ADMIN_PASSWORD: 'secret', CAMP_KV: {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); },
  } } };
}
const TODAY = '2026-10-28'; // Wednesday
const NOW = Date.parse(`${TODAY}T03:00:00Z`);

test('notices show only for their own week; pinned first, then newest', () => {
  const list = [
    { id: '1', body: 'a', weekStart: '2026-10-26', createdAt: '2026-10-26T01:00:00Z' },
    { id: '2', body: 'b', weekStart: '2026-10-26', createdAt: '2026-10-27T01:00:00Z' },
    { id: '3', body: 'c', weekStart: '2026-10-26', createdAt: '2026-10-25T01:00:00Z', pinned: true },
    { id: '4', body: 'next week', weekStart: '2026-11-02', createdAt: '2026-10-27T05:00:00Z' },
  ];
  assert.deepEqual(noticesForWeek(list, '2026-10-26').map(n => n.id), ['3', '2', '1']);
});

test('notice input: body required, this/next week, trimmed', () => {
  assert.ok(parseNoticeInput({ body: '   ' }, TODAY).error);
  assert.equal(parseNoticeInput({ body: ' hello ', week: 'this' }, TODAY).value.weekStart, '2026-10-26');
  assert.equal(parseNoticeInput({ body: 'x', week: 'next' }, TODAY).value.weekStart, '2026-11-02');
  assert.equal(parseNoticeInput({ body: 'x', title: '  T  ', pinned: true }, TODAY).value.title, 'T');
});

test('kitchen duty today lists only meals that have people', async () => {
  const { env } = kvEnv({ [`kitchen:day:${TODAY}`]: { lunch_prep: [{ email: 'a@b.c', name: 'Amy' }], dinner_clean: [{ email: 'd@e.f', name: 'Dan' }, { email: 'g@h.i', name: 'Eve' }] } });
  const out = await kitchenToday(env, TODAY);
  assert.deepEqual(out.map(m => m.meal), ['lunch', 'dinner']);
  assert.equal(out[1].clean.length, 2);
  assert.deepEqual(await kitchenToday(kvEnv().env, TODAY), []);
});

test('car drivers today: pickup and drop-off, null when nobody', async () => {
  const { env } = kvEnv({ [`drive:slot:${TODAY}:pickup`]: { email: 'a@b.c', name: 'Amy' } });
  const out = await carToday(env, TODAY);
  assert.ok(out.pickup);
  assert.equal(out.dropoff, null);
});

test('recent churches are sorted by update time and expose only name and dates', () => {
  const out = recentChurches({
    a: { churchName: 'Old', updatedAt: 100, phone: '010-1' },
    b: { churchName: 'New', updatedAt: 300, lastVisitDate: '2026-10-20', pastorEmail: 'x@y.z' },
    c: { churchName: 'Never updated' },
    d: { updatedAt: 500 },
  });
  assert.deepEqual(out.map(c => c.name), ['New', 'Old']);
  assert.deepEqual(Object.keys(out[0]).sort(), ['lastVisitDate', 'name', 'updatedAt']);
});

test('dashboard keeps working when optional sources are not connected', async () => {
  const { env } = kvEnv();
  const d = await buildDashboard(env, { role: 'counselor' }, NOW);
  assert.equal(d.today, TODAY);
  assert.equal(d.canEditNotices, false);
  assert.deepEqual(d.notices, []);
  assert.deepEqual(d.kitchen, []);
  assert.equal(d.events, null);
  assert.equal(d.churches, null);
  assert.equal((await buildDashboard(env, { role: 'admin' }, NOW)).canEditNotices, true);
});

test('only admins can add and delete notices', async () => {
  const { env, store } = kvEnv();
  const call = async (fn, role, url, init = {}) => {
    const token = await createHubSessionToken('secret', role === 'master' ? MASTER_EMAILS[0] : ADMIN_EMAILS[0], role);
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  const anon = await noticeApi.onRequestPost({ env, request: new Request('https://x/api/portal/notices', { method: 'POST', body: '{}' }) });
  assert.equal(anon.status, 401);
  const empty = await call(noticeApi.onRequestPost, 'master', 'https://x/api/portal/notices', { method: 'POST', body: JSON.stringify({ body: '' }) });
  assert.equal(empty.status, 400);
  const made = await call(noticeApi.onRequestPost, 'master', 'https://x/api/portal/notices', { method: 'POST', body: JSON.stringify({ body: '이번 주 공지', week: 'this' }) });
  assert.equal(made.status, 201);
  assert.equal(JSON.parse(store.get('portal:notices')).length, 1);
  const del = await call(noticeApi.onRequestDelete, 'master', `https://x/api/portal/notices?id=${made.body.notice.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal(JSON.parse(store.get('portal:notices')).length, 0);
});
