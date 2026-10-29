// 경비 리포트 고정 지출 — 매달 / 1년에 한 번, 이미 보고됐으면 건너뛰고, 안 낸 회차는 다음 리포트로 이월된다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as R from '../functions/api/expense/reports.js';
import * as C from '../functions/api/expense/recurring.js';
import * as D from '../functions/api/expense/draft.js';
import { bustReportCache } from '../functions/lib/expenses.js';
import { occurrencesOf, pendingRows, reportedKeysOf, nextDue, cleanTemplate } from '../functions/lib/expenseRecurring.js';

function setup() {
  R.resetCampusCache(); bustReportCache();
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (!v) return null; return t === 'json' ? JSON.parse(v.value) : v.value; },
    async getWithMetadata(k) { const v = store.get(k); return v ? { value: v.value, metadata: v.metadata } : { value: null, metadata: null }; },
    async put(k, v, o) { store.set(k, { value: v, metadata: o?.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  globalThis.fetch = async () => ({ ok: true });
  const acc = (email, name) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role: 'counselor', status: 'approved' }));
  const call = async (fn, method, path, who, body) => {
    const request = new Request('https://t.co' + path, { method, headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const res = await fn({ env, request, waitUntil: p => p });
    return { status: res.status, ...((res.headers.get('Content-Type') || '').includes('json') ? await res.json() : {}) };
  };
  return { store, acc, call };
}
const cyn = ['cyn@wol.org', 'counselor'];
const other = ['other@wol.org', 'counselor'];
const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);
const back = n => new Date(Date.UTC(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5)) - 1 - n, 1)).toISOString().slice(0, 7);
const tpl = (over = {}) => ({ item: 'Adobe 구독', source: '월코', account: '', currency: 'KRW', amount: 30000, frequency: 'monthly', day: 1, startMonth: back(2), ...over });

test('회차 계산: 매달은 시작 달부터 결제일이 지난 달까지, 1년에 한 번은 그 달만, 결제일이 아직이면 이번 달은 제외', () => {
  const t = { id: 'r1', active: true, frequency: 'monthly', day: 15, startMonth: '2026-08', month: null };
  assert.deepEqual(occurrencesOf(t, '2026-10-20').map(o => o.when), ['2026-08-15', '2026-09-15', '2026-10-15']);
  assert.deepEqual(occurrencesOf(t, '2026-10-10').map(o => o.when), ['2026-08-15', '2026-09-15'], '이번 달 결제일 전이면 아직 아님');
  const y = { id: 'r2', active: true, frequency: 'yearly', day: 5, month: 3, startMonth: '2025-01' };
  assert.deepEqual(occurrencesOf(y, '2026-10-20').map(o => o.when), ['2026-03-05'], '12개월 안의 3월 한 번');
  assert.deepEqual(occurrencesOf({ ...y, month: 11 }, '2026-10-20').map(o => o.when), ['2025-11-05'], '작년 11월분이 12개월 안이라 이월 대상');
  assert.deepEqual(occurrencesOf({ ...y, month: 11, startMonth: '2026-10' }, '2026-10-20'), [], '시작 달 전의 회차는 없다');
  assert.deepEqual(occurrencesOf({ ...y, month: 9 }, '2026-10-20').map(o => o.when), ['2026-09-05'], '12개월보다 오래된 작년 9월분은 이월하지 않는다');
  // 31일 결제는 짧은 달의 마지막 날로
  assert.deepEqual(occurrencesOf({ id: 'r3', frequency: 'monthly', day: 31, startMonth: '2026-02', month: null }, '2026-03-31').map(o => o.when), ['2026-02-28', '2026-03-31']);
  assert.equal(nextDue(y, '2026-10-20'), '2027-03-05');
  assert.equal(nextDue({ ...t, active: false }, '2026-10-20'), null);
});

test('등록 검증: 필수 항목 · 주기 · 결제일 · 1년에 한 번이면 달', () => {
  assert.equal(cleanTemplate({ ...tpl(), item: '' }).error?.includes('품목'), true);
  assert.equal(cleanTemplate({ ...tpl(), amount: 0 }).error?.includes('금액'), true);
  assert.equal(cleanTemplate({ ...tpl(), frequency: 'weekly' }).error?.includes('주기'), true);
  assert.equal(cleanTemplate({ ...tpl(), day: 40 }).error?.includes('결제일'), true);
  assert.equal(cleanTemplate({ ...tpl(), frequency: 'yearly', month: 13 }).error?.includes('달'), true);
  const ok = cleanTemplate({ ...tpl(), frequency: 'yearly', month: '6', day: '10', startMonth: 'nope' });
  assert.equal(ok.template.month, 6); assert.equal(ok.template.startMonth, thisMonth, '잘못된 시작 달은 이번 달로');
});

test('등록 → 새 리포트에 들어올 대기 줄(지난 회차 이월) → 제출하면 그 회차는 빠지고 다음 회차만 남는다', async () => {
  const t = setup(); await t.acc('cyn@wol.org', 'Cynthia');
  const created = await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl());
  assert.equal(created.status, 200);
  const first = await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn);
  const periods = first.pending.map(r => r.recurring.period);
  assert.deepEqual(periods, [back(2), back(1), thisMonth], '지난 두 달 + 이번 달이 함께 이월');
  assert.equal(first.pending[0].amount, '30000'); assert.equal(first.pending[0].item, 'Adobe 구독');
  assert.equal(first.templates[0].nextDue > today, true);

  // 가운데 한 줄(지난달)만 빼고 제출 → 그 회차는 이월로 남는다. 제출한 두 회차는 다시 들어오지 않는다.
  const rows = first.pending.filter(r => r.recurring.period !== back(1)).map(r => ({ ...r, amount: Number(r.amount), account: 'Others' }));
  const sub = await t.call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', project: 'p', rows });
  assert.equal(sub.status, 200, JSON.stringify(sub));
  assert.deepEqual(sub.report.rows.map(r => r.recurring.period), [back(2), thisMonth], '회차 표시가 리포트 줄에 남는다');
  const second = await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn);
  assert.deepEqual(second.pending.map(r => r.recurring.period), [back(1)], '빠뜨린 회차만 다음 리포트로 이월');
});

test('리포트를 철회(삭제)하면 그 회차가 다시 대기로 돌아온다 · 다른 사람의 리포트는 영향이 없다', async () => {
  const t = setup(); await t.acc('cyn@wol.org', 'Cynthia'); await t.acc('other@wol.org', 'Other');
  await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl({ startMonth: thisMonth, day: 1 }));
  await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', other, tpl({ startMonth: thisMonth, day: 1, item: '다른 사람 구독' }));
  const mine = (await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending;
  assert.equal(mine.length, 1);
  const sub = await t.call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', project: 'p', rows: mine.map(r => ({ ...r, amount: Number(r.amount), account: 'Others' })) });
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending.length, 0, '제출한 회차는 대기가 아니다');
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', other)).pending.length, 1, '다른 사람 것은 그대로');
  const del = await t.call(R.onRequestDelete, 'DELETE', `/api/expense/reports?id=${encodeURIComponent(sub.report.id)}`, cyn);
  assert.ok([200, 204].includes(del.status), String(del.status));
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending.length, 1, '철회하면 다시 대기');
});

test('일시 중지는 대기에서 빠지고, 다시 켜면 돌아온다 · 수정 · 삭제 · 개수 제한 · 로그인 필요', async () => {
  const t = setup(); await t.acc('cyn@wol.org', 'Cynthia');
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', ['x@wol.org', 'counselor'])).status, 401, '계정 없는 사람');
  const id = (await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl({ startMonth: thisMonth, day: 1 }))).template.id;
  assert.equal((await t.call(C.onRequestPatch, 'PATCH', '/api/expense/recurring', cyn, { id, active: false })).template.active, false);
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending.length, 0);
  await t.call(C.onRequestPatch, 'PATCH', '/api/expense/recurring', cyn, { id, active: true });
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending.length, 1);
  const edited = await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, { ...tpl({ startMonth: thisMonth, day: 1 }), id, amount: 45000 });
  assert.equal(edited.template.amount, 45000); assert.equal(edited.template.id, id);
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).templates.length, 1, '수정은 새로 만들지 않는다');
  assert.equal((await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, { ...tpl(), id: 'nope' })).status, 404);
  assert.equal((await t.call(C.onRequestDelete, 'DELETE', `/api/expense/recurring?id=${id}`, cyn)).status, 200);
  assert.equal((await t.call(C.onRequestDelete, 'DELETE', `/api/expense/recurring?id=${id}`, cyn)).status, 404);
  for (let i = 0; i < 20; i++) assert.equal((await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl({ item: `항목 ${i}` }))).status, 200);
  assert.equal((await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl({ item: '21번째' }))).status, 400, '최대 20개');
});

test('1년에 한 번: 그 해 결제 달이 지나 보고하지 않았으면 이월, 보고하면 같은 해에는 다시 안 들어온다', async () => {
  const t = setup(); await t.acc('cyn@wol.org', 'Cynthia');
  const month = Number(back(2).slice(5));
  await t.call(C.onRequestPost, 'POST', '/api/expense/recurring', cyn, tpl({ item: '도메인 연회비', frequency: 'yearly', month, day: 1, startMonth: back(2) }));
  const p = (await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending;
  assert.equal(p.length, 1); assert.equal(p[0].recurring.period, back(2));
  const sub = await t.call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', project: 'p', rows: p.map(r => ({ ...r, amount: Number(r.amount), account: 'Others' })) });
  assert.equal(sub.status, 200);
  assert.equal((await t.call(C.onRequestGet, 'GET', '/api/expense/recurring', cyn)).pending.length, 0, '이번 해 회차는 보고 완료');
});

test('초안: 작성 중 지운 회차 목록(skippedRecurring)이 계정에 저장된다', async () => {
  const t = setup(); await t.acc('cyn@wol.org', 'Cynthia');
  const form = { rows: [{ item: 'a', amount: '1', receipts: [], recurring: { id: 'rec-1', period: '2026-10' } }], description: 'd', project: 'p', skippedRecurring: ['rec-1:2026-09', ''] };
  assert.equal((await t.call(D.onRequestPut, 'PUT', '/api/expense/draft', cyn, { form })).status, 200);
  const got = (await t.call(D.onRequestGet, 'GET', '/api/expense/draft', cyn)).draft.form;
  assert.deepEqual(got.skippedRecurring, ['rec-1:2026-09']);
  assert.deepEqual(got.rows[0].recurring, { id: 'rec-1', period: '2026-10' }, '초안 줄의 회차 표시도 그대로');
});
