// 경비 리포트 백엔드 흐름 테스트 — 모의 KV로 제출 → 반려/재제출 → 승인 → 장부 반영과 권한을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as R from '../functions/api/expense/reports.js';
import * as F from '../functions/api/expense/receipt.js';
import { ACCOUNTANT_EMAILS, EXPENSE_ADMIN_EMAILS, NEW_REPORT_NOTIFY_EMAILS, bustReportCache } from '../functions/lib/expenses.js';

function setup(emailOn = true) {
  R.resetCampusCache(); bustReportCache();
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (!v) return null; return t === 'json' ? JSON.parse(v.value) : v.value; },
    async getWithMetadata(k) { const v = store.get(k); return v ? { value: v.value, metadata: v.metadata } : { value: null, metadata: null }; },
    async put(k, v, o) { store.set(k, { value: v, metadata: o?.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x', ...(emailOn ? { EXPENSE_EMAIL: 'on' } : {}) };
  const sent = [];
  globalThis.fetch = async (_url, o) => { sent.push(JSON.parse(o.body)); return { ok: true }; };
  const acc = (email, name, role, extra = {}) =>
    kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role, status: 'approved', ...extra }));
  const ctx = request => ({ env, request, waitUntil: p => p });
  const req = async (method, path, [email, role], body) => new Request('https://t.co' + path, {
    method,
    headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', email, role), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const call = async (fn, method, path, who, body) => {
    const res = await fn(ctx(await req(method, path, who, body)));
    const isJson = (res.headers.get('Content-Type') || '').includes('json');
    return { status: res.status, res, ...(isJson ? await res.json() : {}) };
  };
  return { store, sent, acc, call, kv };
}

const cyn = ['cyn@x.com', 'counselor'];
const boss = ['boss@wol.org', 'admin'];
const ann = ['acct@x.com', 'counselor'];
const master = ['wolkorea1@gmail.com', 'master'];
if (!ACCOUNTANT_EMAILS.includes('acct@x.com')) ACCOUNTANT_EMAILS.push('acct@x.com');
if (!EXPENSE_ADMIN_EMAILS.includes('boss@wol.org')) EXPENSE_ADMIN_EMAILS.push('boss@wol.org'); // 테스트용 '관리자' 등급
const DEFAULT_NOTIFY = [...NEW_REPORT_NOTIFY_EMAILS];
if (!NEW_REPORT_NOTIFY_EMAILS.includes('boss@wol.org')) NEW_REPORT_NOTIFY_EMAILS.push('boss@wol.org');

test('경비 리포트: 제출 → 반려 → 재제출 → 승인 → 장부 반영', async () => {
  const { store, sent, acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor', { isAccountant: true });

  const up = await call(F.onRequestPost, 'POST', '/api/expense/receipt', cyn,
    { name: 'r.jpg', type: 'image/jpeg', data: 'data:image/jpeg;base64,' + btoa('hello') });
  assert.equal(up.status, 200);
  const fid = up.id;
  const bad = await call(F.onRequestPost, 'POST', '/api/expense/receipt', cyn,
    { name: 'x.exe', type: 'application/x-msdownload', data: 'data:x;base64,AA==' });
  assert.equal(bad.status, 400, '허용되지 않은 파일 형식');

  const rows = [{ account: 'Meals Expenditure (5435)', currency: 'USD', amount: 100, rate: 1380, item: 'Pizza', ministryPurpose: 'Camp meals', when: '2026-09-29', receipts: [{ id: fid, name: 'r.jpg', type: 'image/jpeg' }] }];
  const noRate = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'Sep', rows: [{ ...rows[0], rate: 0 }] });
  assert.equal(noRate.status, 400, 'USD 항목은 환율 필수');

  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'Sep', project: 'P1', rows });
  assert.equal(sub.status, 200);
  assert.equal(sub.report.total, 138000, '$100 × 1,380 = ₩138,000');
  assert.equal(sub.report.rows[0].amountKrw, 138000);
  const id = sub.report.id;
  assert.ok(sent[0].to.includes('boss@wol.org') && !sent[0].to.includes('cyn@x.com'), '승인자에게만 알림');
  for (const e of ['jeremyrodgers@wol.org', 'jacobmorse@wol.org', 'samuelsong@wol.org']) assert.ok(sent[0].to.includes(e), e + ' 알림');
  assert.ok(!sent[0].to.includes('jennyson@wol.org') && !sent[0].to.includes('wolkorea1@gmail.com'), '새 리포트 알림은 세 명에게만');
  assert.equal(sent[0].reply_to, 'wolkorea1@gmail.com', '답장은 wolkorea1로');
  assert.deepEqual(DEFAULT_NOTIFY, ['samuelsong@wol.org', 'jacobmorse@wol.org', 'jeremyrodgers@wol.org']);
  assert.ok(store.has(`expense:receipt:${id}:${fid}`), '영수증이 영구 키로 이동');
  assert.ok(![...store.keys()].some(k => k.includes(':tmp:')), '임시 키 정리됨');

  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] })).status, 403, '본인 승인 불가');
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=approve', cyn)).status, 403);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', boss)).approve, 1);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=accounting', ann)).reports.length, 0, '승인 전에는 회계에 안 보임');

  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'reject' })).status, 400, '반려 사유 필수');
  const rej = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'reject', note: '영수증 흐림' });
  assert.equal(rej.report.status, 'rejected');

  const re = await call(R.onRequestPut, 'PUT', '/api/expense/reports', cyn, { id, description: 'Sep v2', project: 'P1', rows: [{ ...rows[0], receipts: [{ id: fid, name: 'r.jpg', type: 'image/jpeg' }] }] });
  assert.equal(re.report.status, 'submitted');
  assert.equal(re.report.reviewNote, '');
  assert.equal(re.report.rows[0].receipts.length, 1, '재제출해도 영수증 유지');

  sent.length = 0;
  const ok = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] });
  assert.equal(ok.report.status, 'approved');
  assert.ok(sent.some(m => m.to.includes('acct@x.com')), '승인 시 회계 담당자에게 알림');
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=accounting', ann)).reports.length, 1);

  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'process' })).status, 403, '회계 담당만 처리');
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'process' })).report.status, 'processed');
  assert.equal((await call(R.onRequestDelete, 'DELETE', '/api/expense/reports?id=' + id, cyn)).status, 409, '승인 후 철회 불가');

  const view = await call(F.onRequestGet, 'GET', `/api/expense/receipt?reportId=${id}&fileId=${fid}`, ann);
  assert.equal(view.status, 200);
  assert.equal(await view.res.text(), 'hello');
  await acc('other@x.com', 'Other', 'counselor');
  assert.equal((await call(F.onRequestGet, 'GET', `/api/expense/receipt?reportId=${id}&fileId=${fid}`, ['other@x.com', 'counselor'])).status, 403, '제3자는 영수증 열람 불가');
});

test('전체 리포트 조회는 관리자·회계 담당만, 일반 계정은 본인 것만', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('bob@x.com', 'Bob', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const bob = ['bob@x.com', 'counselor'];
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'A', rows: [row] });
  await call(R.onRequestPost, 'POST', '/api/expense/reports', bob, { description: 'B', rows: [row] });

  // 일반 계정: 본인 것만, 전체 조회 거부
  const mine = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', cyn);
  assert.deepEqual(mine.reports.map(r => r.description), ['A']);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', cyn)).status, 403);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', cyn)).me.canViewAll, false);

  // 관리자(승인자)는 모든 사람의 리포트(승인 대기 포함)를 본다
  const allBoss = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', boss);
  assert.equal(allBoss.status, 200);
  assert.deepEqual(allBoss.reports.map(r => r.description).sort(), ['A', 'B']);
  // 회계 담당(승인 권한 없음)은 조회는 되지만 승인 대기 건은 보이지 않는다
  const allAnn = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', ann);
  assert.equal(allAnn.status, 200);
  assert.deepEqual(allAnn.reports, []);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', ann)).me.canViewAll, true);

  // 다른 사람의 영수증은 일반 계정이 못 보고, 관리자/회계는 승인 전이어도 열람
  const up = await call(F.onRequestPost, 'POST', '/api/expense/receipt', cyn, { name: 'r.png', type: 'image/png', data: 'data:image/png;base64,' + btoa('img') });
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'C', rows: [{ ...row, receipts: [{ id: up.id, name: 'r.png', type: 'image/png' }] }] });
  const url = `/api/expense/receipt?reportId=${sub.report.id}&fileId=${up.id}`;
  assert.equal((await call(F.onRequestGet, 'GET', url, bob)).status, 403);
  assert.equal((await call(F.onRequestGet, 'GET', url, ann)).status, 200);
  assert.equal((await call(F.onRequestGet, 'GET', url, boss)).status, 200);
});

test('회계 담당은 코드 목록의 계정(jennyson@wol.org 포함)', async () => {
  assert.ok(ACCOUNTANT_EMAILS.includes('jennyson@wol.org'));
});

test('KRW 항목은 환율 없이 원화 그대로, 합계는 KRW', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const r = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'mix', rows: [
    { account: 'Office (5201)', currency: 'KRW', amount: 12500, item: 'Pens', ministryPurpose: 'pens', when: '2026-09-29' },
    { account: 'Office (5201)', currency: 'USD', amount: 10.5, rate: 1355.05, item: 'Books', ministryPurpose: 'online', when: '2026-09-29' },
  ] });
  assert.equal(r.status, 200);
  assert.equal(r.report.rows[0].amountKrw, 12500);
  assert.equal(r.report.rows[0].rate, null);
  assert.equal(r.report.rows[1].amountKrw, 14228); // 10.5 × 1355.05 = 14228.025
  assert.equal(r.report.total, 26728);
});

test('환율 조회: 날짜 기준으로 가져오고 캐시한다', async () => {
  const { store, acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    assert.match(String(url), /\/v1\/2026-09-27\?base=USD&symbols=KRW/);
    return { ok: true, json: async () => ({ date: '2026-09-25', rates: { KRW: 1355.05 } }) };
  };
  const RT = await import('../functions/api/expense/rate.js');
  const a = await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=2026-09-27', cyn);
  assert.equal(a.rate, 1355.05);
  assert.equal(a.date, '2026-09-25', '주말은 직전 영업일 환율');
  const b = await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=2026-09-27', cyn);
  assert.equal(b.rate, 1355.05);
  assert.equal(calls, 1, '두 번째는 캐시');
  assert.ok(store.has('expense:rate:2026-09-27'));
  assert.equal((await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=bad', cyn)).status, 400);
});

test('구매 품목명은 필수', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const base = { account: 'Office (5201)', currency: 'KRW', amount: 1000, ministryPurpose: '캠프', when: '2026-09-29' };
  const miss = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', rows: [base] });
  assert.equal(miss.status, 400);
  assert.match(miss.error, /구매 품목명/);
  const ok = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', rows: [{ ...base, item: '볼펜' }] });
  assert.equal(ok.report.rows[0].item, '볼펜');
});

test('경비 권한은 "관리자" 등급만: master/포탈 admin이어도 목록에 없으면 승인·전체 조회 불가', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('esooy@wol.org', 'Estelle', 'admin'); // 포탈 role은 admin이지만 경비 관리자 등급 아님
  await acc('hkim3@wol.org', 'Dev', 'admin');
  const dev = ['hkim3@wol.org', 'admin'];          // Developer (포탈 관리자 — 경비 관리자 등급은 아님)
  const estelle = ['esooy@wol.org', 'admin'];
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'A', rows: [row] });
  const id = sub.report.id;

  for (const who of [dev, estelle]) {
    assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', who)).status, 403, '전체 조회 불가');
    assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=approve', who)).status, 403, '승인 목록 불가');
    assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] })).status, 403, '승인 불가');
    const me = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', who);
    assert.equal(me.me.isApprover, false);
    assert.equal(me.me.canViewAll, false);
  }
  // 본인 리포트 제출/조회는 가능
  const own = await call(R.onRequestPost, 'POST', '/api/expense/reports', dev, { description: 'dev', rows: [row] });
  assert.equal(own.status, 200);
  assert.deepEqual((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', dev)).reports.map(x => x.description), ['dev']);
  // 관리자 등급은 승인 가능
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ['boss@wol.org', 'admin'], { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] })).report.status, 'approved');
});

test('경비 관리자 등급 목록 확인', () => {
  for (const e of ['samuelsong@wol.org', 'jacobmorse@wol.org', 'jeremyrodgers@wol.org', 'jennyson@wol.org']) assert.ok(EXPENSE_ADMIN_EMAILS.includes(e), e);
  for (const e of ['hkim3@wol.org', 'ychae@wol.org', 'joemin@wol.org', 'peterchae@wol.org']) assert.ok(!EXPENSE_ADMIN_EMAILS.includes(e), e);
});

test('Owner(wolkorea1@gmail.com)는 홈페이지 개발이 끝날 때까지 임시 회계 관리자', async () => {
  assert.ok(EXPENSE_ADMIN_EMAILS.includes('wolkorea1@gmail.com'));
  assert.ok(ACCOUNTANT_EMAILS.includes('wolkorea1@gmail.com'));
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const owner = ['wolkorea1@gmail.com', 'master'];
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'A', rows: [row] });
  const me = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', owner);
  assert.equal(me.me.isApprover, true);
  assert.equal(me.me.isAccountant, true);
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', owner, { id: sub.report.id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] })).report.status, 'approved');
});

test('회계 담당은 리포트를 삭제해도 영수증까지 백업되어 복구할 수 있다', async () => {
  const { store, acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const up = await call(F.onRequestPost, 'POST', '/api/expense/receipt', cyn, { name: 'r.png', type: 'image/png', data: 'data:image/png;base64,' + btoa('img') });
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'Del', rows: [{ ...row, receipts: [{ id: up.id, name: 'r.png', type: 'image/png' }] }] });
  const id = sub.report.id;
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ['boss@wol.org', 'admin'], { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] });
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'process' });
  assert.ok(store.has(`expense:receipt:${id}:${up.id}`));

  // 회계 담당이 아니면 삭제/복구/휴지통 조회 불가
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { id, action: 'trash' })).status, 403);
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ['boss@wol.org', 'admin'], { id, action: 'trash' })).status, 403);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=trash', ['boss@wol.org', 'admin'])).status, 403);

  // 삭제: 리포트·원본 영수증은 사라지고 백업만 남는다
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'trash' })).status, 200);
  assert.ok(!store.has(`expense:report:${id}`));
  assert.ok(!store.has(`expense:receipt:${id}:${up.id}`));
  assert.ok(store.has(`expense:trash:${id}`));
  assert.ok(store.has(`expense:trashfile:${id}:${up.id}`));
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', ann)).reports.length, 0);
  const trash = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=trash', ann);
  assert.deepEqual(trash.trash.map(x => x.report.id), [id]);
  assert.equal(trash.trash[0].deletedBy, 'acct@x.com');

  // 복구: 리포트와 영수증이 그대로 돌아온다
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { id, action: 'restore' })).status, 403);
  const back = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'restore' });
  assert.equal(back.status, 200);
  assert.equal(back.report.status, 'processed');
  assert.ok(store.has(`expense:receipt:${id}:${up.id}`));
  assert.ok(!store.has(`expense:trash:${id}`));
  assert.ok(!store.has(`expense:trashfile:${id}:${up.id}`));
  assert.equal((await call(F.onRequestGet, 'GET', `/api/expense/receipt?reportId=${id}&fileId=${up.id}`, ann)).status, 200);
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'restore' })).status, 404, '이미 복구된 건은 다시 복구할 수 없다');
});

test('승인 시 모든 항목의 카테고리를 확정해야 하고, 확정값이 회계로 넘어간다', async () => {
  const { acc, sent, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor', { campus: 'jeju' });
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = (item, account) => ({ account, currency: 'KRW', amount: 1000, item, ministryPurpose: 'camp', when: '2026-09-29' });
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, {
    description: 'cat', rows: [row('휘발유', 'Car Gas (8400)'), row('간식', 'Furniture & Fixtures (8395)')],
  });
  const id = sub.report.id;
  assert.equal(sub.report.campus, 'jeju');

  const approve = categories => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories, withdrawals: ['wolko', 'wolko'] });
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve' })).status, 400, '출금 계좌 없이 승인 불가');
  assert.equal((await approve(['Car Gas (8400)'])).status, 400, '일부 항목만 확정 불가');
  assert.equal((await approve(['Car Gas (8400)', 'Made Up (1)'])).status, 400, '목록에 없는 카테고리 불가');

  sent.length = 0;
  const ok = await approve(['Car Gas (8400)', 'Food (8968)']);
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].account, 'Car Gas (8400)');
  assert.equal(ok.report.rows[1].account, 'Food (8968)', '승인자가 확정한 카테고리로 교체');
  assert.equal(ok.report.rows[1].submittedAccount, 'Furniture & Fixtures (8395)', '제출자가 고른 원래 값은 보존');
  assert.equal(ok.report.categoriesConfirmedBy, 'boss@wol.org');
  assert.ok(sent.some(m => m.to.includes('acct@x.com')), '회계 담당에게 송금 요청 알림');

  // 송금 완료 → 제출자에게 알림
  sent.length = 0;
  const paid = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'process' });
  assert.equal(paid.report.status, 'processed');
  assert.ok(sent.some(m => m.to.includes('cyn@x.com') && /송금/.test(m.subject)), '제출자에게 송금 완료 알림');
});

test('캠퍼스(평택|제주)는 포탈 가입 때 정한 계정 값 기준, 값이 없는 기존 계정은 평택', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('jj@x.com', 'Jeju', 'counselor', { campus: 'jeju' });
  await acc('boss@wol.org', 'Boss', 'admin');
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const a = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'a', campus: 'jeju', rows: [row] });
  assert.equal(a.report.campus, 'wolko', '요청 값은 무시, 기존 계정은 평택');
  const b = await call(R.onRequestPost, 'POST', '/api/expense/reports', ['jj@x.com', 'counselor'], { description: 'b', rows: [row] });
  assert.equal(b.report.campus, 'jeju');
  const all = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', boss);
  assert.deepEqual(all.reports.map(r => [r.description, r.campus]).sort(), [['a', 'wolko'], ['b', 'jeju']]);
});

test('전체 비우기: 회계 담당만, 확인 값 필요, 백업되어 복구 가능', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('acct@x.com', 'Ann', 'counselor', { isAccountant: true });
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const a = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'a', rows: [row] });
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { action: 'trash-all', confirm: 'DELETE-ALL' })).status, 403);
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { action: 'trash-all' })).status, 400, '확인 값 없이는 불가');
  const out = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { action: 'trash-all', confirm: 'DELETE-ALL' });
  assert.equal(out.count, 1);
  assert.equal(out.remaining, 0);
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', cyn)).reports.length, 0);
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id: a.report.id, action: 'restore' })).status, 200);

  for (let i = 0; i < 6; i++) await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'n' + i, rows: [row] });
  const first = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { action: 'trash-all', confirm: 'DELETE-ALL' });
  assert.deepEqual([first.count, first.remaining], [4, 3], '한 번에 4건씩, 남은 건수를 알려준다');
  const second = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { action: 'trash-all', confirm: 'DELETE-ALL' });
  assert.deepEqual([second.count, second.remaining], [3, 0]);
});



test('메모: 모든 항목에서 입력 가능, 메모 항목은 승인자가 확인해야 하고 승인 메모가 남는다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  const row = (account, memo) => ({ account, currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29', memo });
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'm', rows: [row('Car Gas (8400)', '주유소 영수증 2장 합산'), row('Teacher (8052)', '')] });
  assert.equal(sub.status, 200);
  assert.equal(sub.report.rows[0].memo, '주유소 영수증 2장 합산');
  const id = sub.report.id, cats = ['Car Gas (8400)', 'Teacher (8052)'];
  const approve = body => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: cats, withdrawals: ['wolko', 'wolko'], ...body });
  assert.equal((await approve({ checks: [false, true] })).status, 400, '메모 항목 확인 없이는 승인 불가');
  const ok = await approve({ checks: [true, true], approverMemos: ['확인함, 합산 맞음', ''] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].approverMemo, '확인함, 합산 맞음');
  assert.equal(ok.report.rows[0].memoCheckedBy, 'boss@wol.org');
  assert.equal(ok.report.rows[1].approverMemo, undefined);
});

test('작성자는 선교 항목·계좌를 직접 적고, 출금 계좌는 승인자가 확정한다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  const row = (source, extra = {}) => ({ source, currency: 'KRW', amount: 1000, item: 'Pen', when: '2026-09-29', ...extra });
  assert.equal((await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', rows: [row('')] })).status, 400, '선교 항목·계좌는 필수');
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 's', rows: [row('월코캠프', { memo: '카드 아님' }), row('개인 사역계좌')] });
  assert.equal(sub.status, 200, '구매 목적은 비워도 된다');
  assert.deepEqual(sub.report.rows.map(r => [r.source, r.account, r.withdrawAccount]), [['월코캠프', '', undefined], ['개인 사역계좌', '', undefined]], '작성자는 출금 계좌를 정할 수 없다');
  const id = sub.report.id;
  const approve = body => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', ...body });
  assert.equal((await approve({ withdrawals: ['wolko', ''], checks: [true, true] })).status, 400, '출금 계좌를 모두 골라야 승인');
  const ok = await approve({ withdrawals: ['junior-camp', 'personal'], checks: [true, true] });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.report.rows.map(r => [r.source, r.withdrawAccount]), [['월코캠프', 'junior-camp'], ['개인 사역계좌', 'personal']]);
});

test('외화: 캐나다 달러·베트남 동도 영수 날짜 환율로 원화 환산, 환율 범위를 검증한다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const row = extra => ({ source: '월코캠프', amount: 100, item: 'x', when: '2026-09-29', ...extra });
  const ok = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'fx', rows: [
    row({ currency: 'CAD', amount: 10, rate: 955.55 }),
    row({ currency: 'VND', amount: 1000000, rate: 0.0537 }),
  ] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].amountKrw, 9556);   // 10 × 955.55
  assert.equal(ok.report.rows[1].amountKrw, 53700);  // 1,000,000 × 0.0537
  assert.equal(ok.report.rows[1].rate, 0.0537, 'VND는 환율 소수 4자리까지 보존');
  assert.equal((await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'bad', rows: [row({ currency: 'VND', rate: 1355 })] })).status, 400, 'VND에 달러 환율을 넣으면 거절');
  assert.equal((await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'bad', rows: [row({ currency: 'CAD', rate: 0 })] })).status, 400, '환율 필수');
  assert.equal((await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'bad', rows: [row({ currency: 'EUR', rate: 1500 })] })).report?.rows?.[0]?.currency ?? 'KRW', 'KRW', '지원하지 않는 통화는 원화로 처리');
});

test('환율 조회: CAD는 frankfurter, VND는 별도 일별 환율 데이터, 지원하지 않는 통화는 거절', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(String(url));
    if (String(url).includes('currency-api')) return { ok: true, json: async () => ({ date: '2026-09-29', vnd: { krw: 0.05373 } }) };
    return { ok: true, json: async () => ({ date: '2026-09-29', rates: { KRW: 955.553 } }) };
  };
  const RT = await import('../functions/api/expense/rate.js');
  const cad = await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=2026-09-29&currency=CAD', cyn);
  assert.equal(cad.rate, 955.55);
  assert.match(urls[0], /base=CAD&symbols=KRW/);
  const vnd = await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=2026-09-29&currency=VND', cyn);
  assert.equal(vnd.rate, 0.0537);
  assert.match(urls[1], /currency-api@2026-09-29\/v1\/currencies\/vnd\.json/);
  const bad = await call(RT.onRequestGet, 'GET', '/api/expense/rate?date=2026-09-29&currency=XYZ', cyn);
  assert.ok(bad.error);
});

test('이예영(ylee7@wol.org)은 회계 담당이지만 경비 승인 권한은 없다', async () => {
  assert.ok(ACCOUNTANT_EMAILS.includes('ylee7@wol.org'));
  assert.ok(!EXPENSE_ADMIN_EMAILS.includes('ylee7@wol.org'));
});

test('회계 담당(승인 권한 없음)은 전체 리포트에서 승인 대기 건을 볼 수 없고, Jeremy는 제주로 분류된다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('ylee7@wol.org', 'Rose', 'counselor');
  await acc('jeremyrodgers@wol.org', 'Jeremy', 'admin');
  const row = { source: '월코캠프', currency: 'KRW', amount: 1000, item: 'x', when: '2026-09-29' };
  const s1 = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'pending', rows: [row] });
  const j = await call(R.onRequestPost, 'POST', '/api/expense/reports', ['jeremyrodgers@wol.org', 'admin'], { description: 'jeremy', rows: [row] });
  assert.equal(j.report.campus, 'jeju');
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id: s1.report.id, action: 'approve', categories: ['Teacher (8052)'], withdrawals: ['wolko'], checks: [true] });
  const s2 = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'still pending', rows: [row] });
  const rose = ['ylee7@wol.org', 'counselor'];
  const asRose = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', rose);
  assert.ok(asRose.reports.length > 0 && asRose.reports.every(r => r.status !== 'submitted'), '승인 대기는 보이지 않는다');
  assert.ok(asRose.reports.some(r => r.id === s1.report.id), '승인된 건은 보인다');
  const asBoss = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', boss);
  assert.ok(asBoss.reports.some(r => r.id === s2.report.id), '승인 권한자는 승인 대기도 본다');
  assert.equal(asBoss.reports.find(r => r.id === j.report.id).campus, 'jeju');
});

test('승인된 리포트는 내용 고정: 작성자 수정·철회 불가, 카테고리(코드)만 회계 담당이 수정 가능', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = { source: '월코캠프', currency: 'KRW', amount: 1000, item: 'Pen', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'lock', rows: [row] });
  const id = sub.report.id;
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: ['Junior Camp (8040)'], withdrawals: ['wolko'], checks: [true] });
  assert.equal((await call(R.onRequestPut, 'PUT', '/api/expense/reports', cyn, { id, description: 'x', rows: [{ ...row, amount: 9 }] })).status, 409, '승인 후 작성자 수정 불가');
  assert.equal((await call(R.onRequestDelete, 'DELETE', '/api/expense/reports?id=' + id, cyn)).status, 409, '승인 후 철회 불가');
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'reject', note: 'x' })).status, 409, '승인 후 반려 불가');
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'recategorize', categories: ['Teacher (8052)'] })).status, 403, '승인자도 카테고리 재수정 불가');
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'recategorize', categories: ['Nope'] })).status, 400);
  const ok = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'recategorize', categories: ['Teacher (8052)'] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].account, 'Teacher (8052)');
  assert.equal(ok.report.rows[0].amountKrw, 1000, '금액 등 내용은 그대로');
  assert.equal(ok.report.rows[0].categoryHistory[0].from, 'Junior Camp (8040)');
  assert.ok(ok.report.log.some(l => l.action === 'recategorize' && l.by === 'acct@x.com'));
});

test('회계 담당은 송금 처리 전에 항목별 회계 노트를 남길 수 있고, 처리 후에는 바꿀 수 없다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = { source: '월코캠프', currency: 'KRW', amount: 1000, item: 'Pen', when: '2026-09-29', memo: '신청자 노트' };
  const id = (await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'n', rows: [row] })).report.id;
  const patch = (who, body) => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id, ...body });
  await patch(boss, { action: 'approve', categories: ['Junior Camp (8040)'], withdrawals: ['wolko'], checks: [true], approverMemos: ['승인자 노트'] });
  assert.equal((await patch(boss, { action: 'recategorize', categories: ['Junior Camp (8040)'], accountantMemos: ['x'] })).status, 403, '승인자는 회계 노트 불가');
  const ok = await patch(ann, { action: 'recategorize', categories: ['Junior Camp (8040)'], accountantMemos: ['송금 전 확인 요망'] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].accountantMemo, '송금 전 확인 요망');
  assert.equal(ok.report.rows[0].memo, '신청자 노트');
  assert.equal(ok.report.rows[0].approverMemo, '승인자 노트');
  const cleared = await patch(ann, { action: 'recategorize', categories: ['Junior Camp (8040)'], accountantMemos: [''] });
  assert.equal(cleared.report.rows[0].accountantMemo, undefined, '비우면 삭제');
  await patch(ann, { action: 'recategorize', categories: ['Junior Camp (8040)'], accountantMemos: ['다시'] });
  await patch(ann, { action: 'process' });
  const after = await patch(ann, { action: 'recategorize', categories: ['Junior Camp (8040)'], accountantMemos: ['처리 후'] });
  assert.equal(after.report.rows[0].accountantMemo, '다시', '송금 처리 후에는 노트 고정');
});

test('회계 담당이 승인된 리포트를 반려하면 승인자에게 되돌아가 다시 승인해야 한다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = { source: '월코캠프', currency: 'KRW', amount: 1000, item: 'Pen', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'ret', rows: [row] });
  const id = sub.report.id;
  const patch = (who, body) => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id, ...body });
  assert.equal((await patch(ann, { action: 'return', note: 'x' })).status, 409, '승인 전에는 되돌릴 수 없음');
  await patch(boss, { action: 'approve', categories: ['Junior Camp (8040)'], withdrawals: ['wolko'], checks: [true] });
  assert.equal((await patch(boss, { action: 'return', note: 'x' })).status, 403, '승인자는 회계 반려 불가');
  assert.equal((await patch(ann, { action: 'return', note: '' })).status, 400, '사유 필수');
  const back = await patch(ann, { action: 'return', note: '영수증 금액이 달라요' });
  assert.equal(back.status, 200);
  assert.equal(back.report.status, 'submitted');
  assert.equal(back.report.returnNote, '영수증 금액이 달라요');
  assert.equal((await call(R.onRequestPut, 'PUT', '/api/expense/reports', cyn, { id, description: 'x', rows: [row] })).status, 409, '되돌려진 리포트는 작성자도 수정 불가');
  assert.equal((await call(R.onRequestDelete, 'DELETE', '/api/expense/reports?id=' + id, cyn)).status, 409, '철회도 불가');
  const approveList = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=approve', boss);
  assert.ok(approveList.reports.some(r => r.id === id), '승인자의 승인 대기에 다시 나타남');
  const asAnn = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', ann);
  assert.ok(!asAnn.reports.some(r => r.id === id), '회계 담당에게는 승인 대기가 보이지 않음');
  const again = await patch(boss, { action: 'approve', categories: ['Teacher (8052)'], withdrawals: ['wolko'], checks: [true] });
  assert.equal(again.status, 200);
  assert.equal(again.report.status, 'approved');
  assert.equal(again.report.returnNote, undefined, '다시 승인하면 되돌림 메모는 기록으로만 남음');
  assert.equal(again.report.returnHistory[0].note, '영수증 금액이 달라요');
  assert.equal((await patch(ann, { action: 'process' })).status, 200);
  assert.equal((await patch(ann, { action: 'return', note: 'late' })).status, 409, '송금 완료 후에는 불가');
});

test('내 소속 캠퍼스가 counts 응답에 담겨 전체 리포트에서 먼저 보인다 (Jeremy는 제주)', async () => {
  const { acc, call } = setup();
  await acc('jj@x.com', 'Jeju person', 'counselor', { campus: 'jeju' });
  await acc('pt@x.com', 'Pyeongtaek person', 'counselor');
  await acc('jeremyrodgers@wol.org', 'Jeremy', 'admin');
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', ['jj@x.com', 'counselor'])).me.campus, 'jeju');
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', ['pt@x.com', 'counselor'])).me.campus, 'wolko');
  assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', ['jeremyrodgers@wol.org', 'admin'])).me.campus, 'jeju');
});

test('승인자는 출금 계좌(별칭)를 확정하고, 계정과목(코드)은 회계가 마지막에 확인한다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const row = (item, extra = {}) => ({ source: '월코캠프', currency: 'KRW', amount: 1000, item, when: '2026-09-29', ...extra });
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'w', rows: [row('a'), row('b', { memo: '확인 필요' }), row('c')] });
  const id = sub.report.id;
  const patch = (who, body) => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id, ...body });
  assert.equal((await patch(boss, { action: 'approve', checks: [true, true, true] })).status, 400, '출금 계좌 없이 승인 불가');
  assert.equal((await patch(boss, { action: 'approve', withdrawals: ['personal', 'wolko'], checks: [true, true, true] })).status, 400, '모든 항목의 출금 계좌가 필요');
  assert.equal((await patch(boss, { action: 'approve', withdrawals: ['personal', 'nope', 'syme'], checks: [true, true, true] })).status, 400, '목록에 없는 계좌');
  assert.equal((await patch(boss, { action: 'approve', withdrawals: ['personal', 'junior-camp', 'syme'], checks: [true, false, true] })).status, 400, '메모 항목은 확인해야 승인');
  const ok = await patch(boss, { action: 'approve', withdrawals: ['personal', 'junior-camp', 'syme'], checks: [true, true, true] });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.report.rows.map(r => r.withdrawAccount), ['personal', 'junior-camp', 'syme']);
  assert.equal(ok.report.withdrawConfirmedBy, 'boss@wol.org');
  assert.deepEqual(ok.report.rows.map(r => r.account), ['Missionary Account (8025)', 'Junior Camp (8040)', ''], '아는 계좌는 코드를 미리 채우고, 나머지는 비워 둔다');
  assert.equal(ok.report.categoriesConfirmedBy, undefined, '코드는 승인자가 아니라 회계 담당이 확인한다');
  assert.equal(JSON.stringify(ok.report).includes('301-'), false, '승인자에게는 계좌번호가 내려가지 않는다');
  assert.equal((await patch(ann, { action: 'process' })).status, 409, '코드가 빈 항목이 있으면 송금 처리 불가');
  assert.equal((await patch(ann, { action: 'recategorize', categories: ['Missionary Account (8025)', 'Junior Camp (8040)', 'Nope'] })).status, 400);
  const done = await patch(ann, { action: 'recategorize', categories: ['Missionary Account (8025)', 'Junior Camp (8040)', 'Food (8968)'] });
  assert.equal(done.status, 200);
  assert.equal(done.report.categoriesConfirmedBy, 'acct@x.com');
  assert.equal(done.report.rows.some(r => r.accountSuggested), false, '회계가 확인하면 추천 표시가 사라진다');
  assert.equal(done.report.rows[1].withdrawNumber, '301-0343-5409-21', '회계 담당에게는 계좌번호가 보인다');
  assert.equal(done.report.rows[0].withdrawNumber, undefined, '개인 사역계좌는 번호가 없다');
  assert.equal((await patch(ann, { action: 'process' })).status, 200);
});

test('계좌번호는 회계 담당 화면에만: 작성자·승인자 목록에는 별칭 id 만 내려간다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor');
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'n', rows: [{ source: '월코', currency: 'KRW', amount: 1000, item: 'a', when: '2026-09-29' }] });
  const id = sub.report.id;
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', withdrawals: ['wolko'] });
  const list = async (who, scope) => JSON.stringify(await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=' + scope, who));
  assert.equal((await list(cyn, 'mine')).includes('301-'), false, '작성자');
  assert.equal((await list(boss, 'approve')).includes('301-'), false, '승인자');
  assert.equal((await list(boss, 'all')).includes('301-'), false, '승인자의 전체 보기');
  assert.ok((await list(boss, 'all')).includes('"withdrawAccount":"wolko"'), '별칭 id 는 보인다');
  assert.ok((await list(ann, 'accounting')).includes('301-0278-8159-81'), '회계 담당');
  assert.ok((await list(ann, 'all')).includes('301-0278-8159-81'), '회계 담당의 전체 보기');
});

test('출금 계좌 목록: 맨 위가 개인 사역계좌, 에쌈·트리하우스·장학금은 빠지고 Others 가 들어간다, 번호는 서버에만 있고 화면 설정에는 없다', async () => {
  const { WITHDRAW_ACCOUNTS } = await import('../src/lib/expense-config.js');
  const { WITHDRAW_NUMBERS, WITHDRAW_IDS } = await import('../functions/lib/expenseAccounts.js');
  assert.equal(WITHDRAW_ACCOUNTS[0].id, 'personal');
  assert.deepEqual(WITHDRAW_IDS, ['personal', 'wolko', 'syme', 'new-missionary-support', 'project', 'sm-ministry', 'teachers', 's-mart', 'ministry-center', 'junior-camp', 'others'], '새로 고를 수 있는 계좌');
  assert.deepEqual(WITHDRAW_ACCOUNTS.filter(a => a.retired).map(a => a.id).sort(), ['essam', 'syme-scholarship', 'treehouse'], '빠진 계좌는 옛 리포트를 읽기 위해 retired 로만 남는다');
  assert.equal(new Set(WITHDRAW_ACCOUNTS.map(a => a.id)).size, WITHDRAW_ACCOUNTS.length);
  assert.deepEqual(Object.keys(WITHDRAW_NUMBERS).sort(), WITHDRAW_ACCOUNTS.map(a => a.id).filter(id => id !== 'personal' && id !== 'others').sort(), '개인 사역계좌와 Others 를 뺀 모든 계좌에 번호가 있다');
  assert.ok(!JSON.stringify(WITHDRAW_ACCOUNTS).match(/\d{3}-\d{4}/), '화면 설정에는 계좌번호가 없다');
});

test('카테고리 정리: Car Tax · SYME Program Event · Pyeongtaek EM 은 빠지고, SYME Food → Food, SYME Equipment → Furniture & Fixtures', async () => {
  const C = await import('../src/lib/expense-config.js');
  for (const gone of ['Car Tax (8320)', 'SYME Program Event (8974)', 'Pyeongtaek EM (8067)']) assert.ok(!C.ACCOUNTS.includes(gone), gone);
  assert.deepEqual(C.RETIRED_ACCOUNTS, ['Car Tax (8320)', 'SYME Program Event (8974)', 'Pyeongtaek EM (8067)']);
  assert.ok(C.ACCOUNTS.includes('Food (8968)') && C.ACCOUNTS.includes('Furniture & Fixtures (8395)'));
  assert.ok(!C.ACCOUNTS.some(a => /SYME/.test(a)), 'SYME 가 붙은 카테고리는 없다');
  assert.equal(C.canonAccount('SYME Food (8968)'), 'Food (8968)');
  assert.equal(C.canonAccount('SYME Equipment (8395)'), 'Furniture & Fixtures (8395)');
  assert.equal(C.canonAccount('Car Tax (8320)'), '', '쓰지 않는 카테고리는 비운다');
  assert.equal(C.canonAccount('Nope'), '');
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'c', rows: [{ source: '월코', account: 'SYME Food (8968)', currency: 'KRW', amount: 1000, item: 'a', when: '2026-10-01' }, { source: '월코', account: 'Car Tax (8320)', currency: 'KRW', amount: 1000, item: 'b', when: '2026-10-01' }] });
  assert.deepEqual(sub.report.rows.map(r => r.account), ['Food (8968)', ''], '예전 이름은 새 이름으로 저장되고, 쓰지 않는 카테고리는 비워진다');
});

test('카테고리 → 추천 출금 계좌 규칙이 정해진 대로이고, Others 는 승인자 메모가 꼭 필요하다', async () => {
  const C = await import('../src/lib/expense-config.js');
  assert.deepEqual(C.WITHDRAW_FOR_CATEGORY, {
    'Missionary Account (8025)': 'personal', 'WOLKO (8021)': 'wolko', 'Car Gas (8400)': 'teachers', 'Car Maintenance (8500)': 'teachers',
    'Junior Camp (8040)': 'junior-camp', 'Student Ministries (8042)': 'sm-ministry', 'Furniture & Fixtures (8395)': 'others',
  });
  assert.deepEqual(C.WITHDRAW_NOTE_REQUIRED, ['others']);
  assert.ok(Object.values(C.WITHDRAW_FOR_CATEGORY).every(id => C.WITHDRAW_ACCOUNTS.some(a => a.id === id && !a.retired)), '추천 계좌는 모두 지금 고를 수 있는 계좌');
  assert.ok(Object.keys(C.WITHDRAW_FOR_CATEGORY).every(k => C.ACCOUNTS.includes(k)), '추천 규칙의 카테고리는 모두 지금 있는 카테고리');
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'o', rows: [{ source: '월코', account: 'Furniture & Fixtures (8395)', currency: 'KRW', amount: 1000, item: '의자', when: '2026-10-01' }] });
  const id = sub.report.id;
  const approve = body => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', ...body });
  const noNote = await approve({ withdrawals: ['others'] });
  assert.equal(noNote.status, 400);
  assert.match(noNote.error, /Others/);
  assert.equal((await approve({ withdrawals: ['others'], approverMemos: ['  '] })).status, 400, '공백만 있는 메모는 안 된다');
  assert.equal((await approve({ withdrawals: ['essam'], approverMemos: ['x'] })).status, 400, '빠진 계좌로는 승인할 수 없다');
  const ok = await approve({ withdrawals: ['others'], approverMemos: ['교실 의자 구입, 후원금 외 지출'] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].withdrawAccount, 'others');
  assert.equal(ok.report.rows[0].approverMemo, '교실 의자 구입, 후원금 외 지출');
  assert.equal(ok.report.rows[0].account, 'Furniture & Fixtures (8395)', '작성자가 고른 카테고리는 그대로 회계가 확인한다');
});

test('옛 이름·쓰지 않는 카테고리로 저장된 리포트: 이름은 새로 보이고, 쓰지 않는 값은 회계가 새 값으로 골라야 송금할 수 있다', async () => {
  const { acc, call, kv } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('acct@x.com', 'Ann', 'counselor');
  const report = { id: 'exp-old-1', status: 'approved', submitterEmail: 'cyn@x.com', submitterName: 'Cynthia', description: 'old', project: '', campus: 'wolko', total: 3000, submittedAt: '2026-10-01T00:00:00Z', log: [],
    rows: [{ source: '월코', account: 'SYME Food (8968)', currency: 'KRW', amount: 1000, amountKrw: 1000, item: 'a', withdrawAccount: 'treehouse' }, { source: '월코', account: 'Car Tax (8320)', currency: 'KRW', amount: 2000, amountKrw: 2000, item: 'b', withdrawAccount: 'wolko' }] };
  await kv.put('expense:report:exp-old-1', JSON.stringify(report));
  const list = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=accounting', ann);
  assert.equal(list.reports[0].rows[0].account, 'Food (8968)', '옛 이름은 새 이름으로 보인다');
  const patch = body => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id: 'exp-old-1', ...body });
  assert.equal((await patch({ action: 'process' })).status, 409, '쓰지 않는 카테고리가 남아 있으면 송금 처리 불가');
  assert.equal((await patch({ action: 'recategorize', categories: ['Food (8968)', 'Car Tax (8320)'] })).status, 400, '쓰지 않는 카테고리로는 다시 고를 수 없다');
  const done = await patch({ action: 'recategorize', categories: ['Food (8968)', 'Car Gas (8400)'] });
  assert.equal(done.status, 200);
  assert.equal(done.report.rows[0].categoryChanged, undefined, '이름만 바뀐 것은 변경 기록이 아니다');
  assert.equal(done.report.rows[1].categoryChanged, true);
  assert.equal(done.report.rows[0].withdrawNumber, '301-0278-8175-21', '이미 이 계좌로 승인된 옛 리포트는 번호까지 읽힌다');
  assert.equal((await patch({ action: 'process' })).status, 200);
});

test('KV 조회 절약: 목록은 잠깐 재사용하고, 쓰기 직후에는 바로 새로 읽는다', async () => {
  const { acc, call, kv } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  let lists = 0;
  const origList = kv.list.bind(kv);
  kv.list = async o => { if (o.prefix === 'expense:report:') lists++; return origList(o); };
  const row = { source: '월코캠프', currency: 'KRW', amount: 1000, item: 'x', when: '2026-09-29' };
  await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'one', rows: [row] });
  lists = 0;
  await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', cyn);
  await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', cyn);
  assert.equal(lists, 1, '연속 조회는 목록을 한 번만 읽는다');
  await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'two', rows: [row] });
  const mine = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', cyn);
  assert.equal(mine.reports.length, 2, '쓰기 직후에는 새로 읽어 바로 반영');
});

test('참석 인원 조회는 KV가 실패해도 500을 내지 않는다', async () => {
  const RC = await import('../functions/api/rsvp-count.js');
  const env = { CAMP_KV: { list: async () => { throw new Error('KV list() limit exceeded for the day.'); } } };
  const res = await RC.onRequestGet({ env, request: new Request('https://t.co/api/rsvp-count') });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).unavailable, true);
});

test('이메일 전체 스위치가 꺼져 있어도 새 리포트·재제출은 세 명에게, 승인/반려/송금 완료는 제출자에게 가고, 회계 담당자 요청은 가지 않는다', async () => {
  const { sent, acc, call } = setup(false);
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  await acc('acct@x.com', 'Ann', 'counselor', { isAccountant: true });
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'A', rows: [row] });
  assert.equal(sub.status, 200);
  assert.equal(sent.length, 1, '새 리포트 알림 한 통');
  for (const e of ['samuelsong@wol.org', 'jacobmorse@wol.org', 'jeremyrodgers@wol.org']) assert.ok(sent[0].to.includes(e), e);
  const id = sub.report.id;

  // 반려 → 제출자에게
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'reject', note: '영수증 흐림' });
  assert.equal(sent.length, 2, '반려 피드백');
  assert.deepEqual(sent[1].to, ['cyn@x.com']);
  assert.match(sent[1].subject, /반려/);

  // 수정해서 재제출 → 다시 세 명에게
  const re = await call(R.onRequestPut, 'PUT', '/api/expense/reports', cyn, { id, description: 'A', rows: [row] });
  assert.equal(re.status, 200);
  assert.equal(sent.length, 3, '재제출 알림');
  assert.ok(sent[2].to.includes('jacobmorse@wol.org'));

  // 승인 → 제출자에게만 (회계 담당자에게 가는 송금 요청 메일은 꺼져 있다)
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: ['Car Gas (8400)'], withdrawals: ['wolko'] });
  assert.equal(sent.length, 4, '승인 피드백 한 통만');
  assert.deepEqual(sent[3].to, ['cyn@x.com']);
  assert.match(sent[3].subject, /승인됨/);

  // 송금 처리 완료 → 제출자에게
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ann, { id, action: 'process' });
  assert.equal(sent.length, 5);
  assert.deepEqual(sent[4].to, ['cyn@x.com']);
  assert.match(sent[4].subject, /송금 처리 완료/);
});

test('작성 중(제출 전) 임시 영수증은 본인만 다시 열어볼 수 있다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('bob@x.com', 'Bob', 'counselor');
  const up = await call(F.onRequestPost, 'POST', '/api/expense/receipt', cyn, { name: 'shot.png', type: 'image/png', data: 'data:image/png;base64,' + btoa('img') });
  assert.equal(up.status, 200);
  const get = (who, fileId) => call(F.onRequestGet, 'GET', `/api/expense/receipt?draft=1&fileId=${fileId}`, who);
  const mine = await get(cyn, up.id);
  assert.equal(mine.status, 200);
  assert.equal(mine.res.headers.get('Content-Type'), 'image/png');
  assert.equal(await mine.res.text(), 'img');
  assert.equal((await get(['bob@x.com', 'counselor'], up.id)).status, 404, '다른 사람의 임시 파일은 못 본다');
  assert.equal((await get(cyn, 'missing')).status, 404);
});

test('회계 화면의 카테고리 선택칸과 노트칸은 34px 로 낮게 고정된다 (공용 44px 최소 높이를 덮는다)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /:root:root \.ex-d-edit \.ex-select-plain,[\s\S]*?:root:root \.ex-anote \{\s*min-height: 0 !important; height: 34px !important;/);
});


test('회계 항목: 코드는 작성자 입력 › 승인자가 확정한 출금 계좌 › 회계 확인 순서로, 회계 노트는 평소 닫혀 있다가 노트 버튼을 누르면 말풍선으로 연다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  assert.match(src, /srcLbl: '작성자 입력'/);
  assert.match(src, /wdLbl: '출금 계좌'/);
  assert.match(src, /acctSelLbl: '회계 확인 \(필요시 변경\)'/);
  assert.doesNotMatch(src, /apprAccountOf/, '승인자가 코드를 정하는 흐름은 없다');
  assert.match(src, /data-act="anote-toggle"/);
  assert.match(src, /<span class="ex-npop" hidden>/);          // 말풍선은 기본으로 숨김
  assert.match(src, /data-anote-i="\$\{i\}"/);                   // 저장 때 모으는 입력칸은 말풍선 안에 그대로 있다
  assert.doesNotMatch(src, /<input class="ex-input ex-anote"/, '평소에 펼쳐진 노트 입력칸은 없다');
});

test('회계 항목: 카테고리·출금 계좌 텍스트를 직접 선택하고 출금 줄 오른쪽에 금액을 표시한다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  const flow = src.slice(src.indexOf('const codeFlow = '), src.indexOf('// 보기 화면: 영수증은'));
  assert.doesNotMatch(flow, /ex-cf-toggle|code-change|ex-cf-panel/);
  assert.match(flow, /ex-inline-select/);
  assert.match(flow, /ex-inline-amount/);
  assert.match(flow, /data-recat-i="\$\{i\}"/);   // 접혀 있어도 선택박스는 DOM 에 있어 저장 때 그대로 모인다
  assert.match(flow, /data-wd-i="\$\{i\}"/);
  assert.equal((flow.match(/class="ex-cf-row[ "]/g) || []).length, 2, '카테고리 줄과 출금 계좌 줄');
  assert.doesNotMatch(src, /ex-cf-btn/);
});

test('회계 코드 글자는 굵게 하지 않는다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-cf-head > b \{[^}]*font-weight: 400;/);
  assert.match(css, /\.ex-cf b \{[^}]*font-weight: 400;/);
});

test('승인 대기: 카테고리·출금 계좌 두 줄, 출금 계좌 드롭박스는 늘 보이고 [펼치기]는 없다 — 승인 메모 입력칸은 34px', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  const cell = src.slice(src.indexOf('function catCell('), src.indexOf('// 승인 메모:'));
  assert.equal((cell.match(/class="ex-cf-row[ "]/g) || []).length, 2, '카테고리 줄과 출금 계좌 줄');
  assert.doesNotMatch(cell, /ex-wd-text|wd-edit/, '글자↔드롭박스로 모양이 바뀌지 않는다');
  assert.match(cell, /<select class="ex-select-plain ex-wd-select" data-cat="\$\{i\}"(?![^>]*hidden)[^>]*>/, '드롭박스는 처음부터 보인다');
  assert.match(cell, /data-act="confirm-cat"/);
  assert.doesNotMatch(cell, /ex-cf-toggle|ex-cf-panel|code-change/, '승인 화면에는 [펼치기]가 없다');
  assert.match(src, /<div class="ex-item-split">/);
  assert.match(src, /apprMemoInput\(rep, i, st\)/);
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-itembody \{ line-height: 1\.6; \}/);
  assert.match(css, /:root:root \.ex-table--approve \.ex-item-memo \{[^}]*height: 34px !important/);
  assert.match(css, /\.ex-cf-row \{ min-height: 36px;/, '카테고리 줄과 출금 계좌 줄 높이가 같다');
  assert.match(css, /\.ex-cf-toggle\[aria-expanded="true"\] \.ex-chev \{ transform: rotate\(180deg\); \}/, '회계의 펼치기 화살표는 svg 로 글자와 가운데 정렬');
});

test('회계 노트 말풍선에 [저장]이 있고 눌러서 실제로 저장된다 (말풍선 안 클릭을 막는 규칙에서 저장 버튼은 제외), 카테고리와 출금 계좌가 두 줄로 보인다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  assert.match(src, /data-act="anote-save"/);
  assert.match(src, /acNoteSave: '저장'/);
  assert.match(src, /acNoteSave: 'Save'/);
  assert.match(src, /act === 'recat-save' \|\| act === 'anote-save'/);
  assert.match(src, /!e\.target\.closest\('\[data-act="anote-close"\], \[data-act="anote-save"\]'\)/, '말풍선 안을 누르면 무시하는 규칙에서 [저장]은 빠져야 한다');
  assert.match(src, /<div class="ex-cf-rows">/);
  assert.match(src, /class="ex-select-plain ex-inline-select" data-recat-i=/, '카테고리 텍스트 선택창');
  assert.match(src, /cfOpen: '펼치기'/);
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-cf-row \{[^}]*border-top: 1px solid #e6edf1/, '줄마다 연한 구분선');
});

test('출금 계좌: 회계 담당이 마지막에 확인하며 채우거나 바꿀 수 있고(예전 승인 리포트의 빈 항목 포함), 바꾼 기록이 남는다', async () => {
  const { acc, call, kv } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('acct@x.com', 'Ann', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  const row = (item, extra = {}) => ({ source: '월코', account: 'Car Gas (8400)', currency: 'KRW', amount: 1000, amountKrw: 1000, item, ...extra });
  await kv.put('expense:report:exp-legacy-1', JSON.stringify({ id: 'exp-legacy-1', status: 'approved', submitterEmail: 'cyn@x.com', submitterName: 'Cynthia', description: 'legacy', project: '', campus: 'wolko', total: 2000, submittedAt: '2026-10-01T00:00:00Z', log: [], rows: [row('a'), row('b', { withdrawAccount: 'wolko' })] }));
  const patch = (who, body) => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id: 'exp-legacy-1', action: 'recategorize', categories: ['Car Gas (8400)', 'Car Gas (8400)'], ...body });
  assert.equal((await patch(boss, { withdrawals: ['teachers', ''] })).status, 403, '승인자는 회계 화면의 이 기능을 쓸 수 없다');
  assert.equal((await patch(ann, { withdrawals: ['nope', ''] })).status, 400, '목록에 없는 계좌');
  assert.equal((await patch(ann, { withdrawals: ['essam', ''] })).status, 400, '빠진 계좌는 고를 수 없다');
  const ok = await patch(ann, { withdrawals: ['teachers', 'junior-camp'] });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.report.rows.map(r => r.withdrawAccount), ['teachers', 'junior-camp']);
  assert.equal(ok.report.rows[0].withdrawSetBy, 'acct@x.com', '비어 있던 항목은 채운 사람이 남는다');
  assert.equal(ok.report.rows[0].withdrawChanged, undefined);
  assert.equal(ok.report.rows[1].withdrawChanged, true, '이미 있던 계좌를 바꾸면 변경 표시');
  assert.deepEqual(ok.report.rows[1].withdrawHistory.map(h => [h.from, h.to, h.by]), [['wolko', 'junior-camp', 'acct@x.com']]);
  assert.equal(ok.report.rows[0].withdrawNumber, '301-0278-8185-71');
  assert.equal(ok.withdrawSet, 2);
  assert.match(ok.report.log.at(-1).note, /출금 계좌 2개/);
  const same = await patch(ann, { withdrawals: ['teachers', 'junior-camp'] });
  assert.equal(same.withdrawSet, 0, '같은 값이면 아무것도 바뀌지 않는다');
  const blank = await patch(ann, { withdrawals: ['', ''] });
  assert.deepEqual(blank.report.rows.map(r => r.withdrawAccount), ['teachers', 'junior-camp'], '비워 보내면 그대로');
});

test('회계 항목: 품목과 목적 사이에 줄이 있고 목적은 카테고리·출금 계좌 값과 같은 위치로 들여쓴다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-d-item > \.ex-d-purpose \{ border-top: 1px solid #e6edf1;[^}]*padding: 8px 0 8px 76px;/);
  assert.match(css, /\.ex-cf-row > i \{[^}]*flex: 0 0 66px/, '라벨 66px + 간격 10px = 76px 와 같은 값');
});

test('회계 항목: 목적 · 카테고리 · 출금 계좌 줄은 높이도 간격도 36px 로 같다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-d-item > \.ex-d-purpose \{ margin: 6px 0 0; height: 36px;/);
  assert.match(css, /\.ex-d-item \.ex-cf-row \{ height: 36px;/);
  assert.match(css, /\.ex-d-item > \.ex-code-flow \{ margin-top: 0; gap: 0; \}/, '목적 줄과 카테고리 줄 사이에 틈이 없다');
});

test('작성 폼: 사역명·계좌 칸 없이 카테고리만 고르고, 드롭박스 화살표는 제자리에 고정된다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  const row = src.slice(src.indexOf('<div class="ex-row" data-i="${i}">'), src.indexOf('<div class="ex-r2">'));
  assert.doesNotMatch(row, /data-f="srcSel"|data-f="source"/, '사역명·계좌 칸은 없다');
  const order = ['data-f="when"', 'data-f="account"', 'data-f="item"', 'data-f="ministryPurpose"'].map(k => row.indexOf(k));
  assert.ok(order.every((v, i) => v > -1 && (i === 0 || v > order[i - 1])), '1줄: 날짜 → 카테고리 → 구매 품목 → 구매 목적');
  const r2 = src.slice(src.indexOf('<div class="ex-r2">'), src.indexOf('<div class="ex-r2">') + 2500);
  const order2 = ['data-f="memo"', 'data-f="amount"', 'data-f="currency"', 'data-f="receipt"'].map(k => r2.indexOf(k));
  assert.ok(order2.every((v, i) => v > -1 && (i === 0 || v > order2[i - 1])), '2줄: 메모 → 금액 → 화폐 단위 → 영수증');
  assert.equal((row.match(/data-f="account"/g) || []).length, 1, '카테고리 선택칸 하나');
  assert.doesNotMatch(row, /class="ex-lcat"/);
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-row \.ex-select \{ background-repeat: no-repeat !important; background-position: right 8px center !important; background-size: 10px 6px !important; \}/);
});

test('엑셀로 내보내기 버튼은 리포트 줄 머리에는 없고, 펼친 상세 안에서만 보인다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /class="ex-sub-dl"[^>]*data-act="xlsx-rep"/, '줄 머리의 버튼은 없다');
  const detail = src.slice(src.indexOf('function detailHtml('), src.indexOf('function detailHtml(') + 6000);
  assert.match(detail, /data-act="xlsx-rep"/, '상세 안의 버튼');
});

test('승인 대기 표·회계 상세: 한 줄짜리 칸도 세로 가운데 정렬', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-table td \{ vertical-align: middle; \}/);
  assert.match(css, /\.ex-item-split \{ align-items: center; \}/);
  assert.match(css, /\.ex-d-item \{ align-items: center; \}/);
});

test('작성 폼: 영수증 버튼 말고는 글자가 굵지 않다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-row \.ex-r2 \.ex-amt[^{]*\{ font-weight: 400 !important; \}/);
  assert.match(css, /\.ex-row \.ex-btn\.ex-attach \{ font-weight: 700 !important; \}/);
});

test('승인 표 열 순서: 날짜 | 품목·목적과 출금 계좌 | 승인 메모 | 금액', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  assert.match(src, /<th>\$\{t\('thWhen'\)\}<\/th><th>\$\{t\('thItem'\)\}\$\{approving \? ' · ' \+ t\('wdLbl'\) : ''\}<\/th><th>\$\{approving \? t\('aMemoLbl'\) : t\('thCat'\)\}<\/th><th style="text-align:right">/);
  const rows = src.slice(src.indexOf("const rows = rep.rows.map((r, i) => `"), src.indexOf("let notes = ''"));
  const pos = [rows.indexOf("esc(r.when || '')"), rows.indexOf('ex-item-split'), rows.indexOf('catCell(rep, r, i, st)'), rows.indexOf('apprMemoInput(rep, i, st)'), rows.indexOf('krw(r.amountKrw)')];
  assert.ok(pos.every((v, i) => v > -1 && (i === 0 || v > pos[i - 1])), '날짜 → 품목·목적 → 출금 계좌 → 승인 메모 → 금액');
});

test('승인 대기·회계 업무: 항목마다 아주 옅은 배경', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-card \.ex-table tbody td \{ background: #f7fafc;/);
  assert.match(css, /\.ex-d-item \{ background: #f7fafc; border-radius: 10px;/);
});

test('회계 업무: 코드 확인·노트 저장 버튼과 리포트별 삭제 버튼은 없고, 바꾸면 자동 저장 · 카드 머리 [관리]로 선택 삭제', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  const detail = src.slice(src.indexOf('function detailHtml('), src.indexOf('function detailHtml(') + 6000);
  assert.doesNotMatch(detail, /data-act="recat-save"|data-act="trash"/);
  assert.match(src, /async function saveRecat\(box, id, silent\)/);
  assert.match(src, /autoTimer = setTimeout\(\(\) => saveRecat\(box, box\.dataset\.recat, true\)/, '바꾸면 자동 저장');
  assert.match(src, /clearTimeout\(autoTimer\); await saveRecat\(.*, id, true\);/, '송금 처리 전에도 저장');
  assert.match(src, /data-act="manage-toggle"/);
  assert.match(src, /data-act="del-sel"/);
  assert.match(src, /type="checkbox" data-sel=/);
});

test('회계 상세: 날짜는 영수증 사진 위, 품목 | 목적은 한 줄이고 잘리면 툴팁으로 전체', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
  const detail = src.slice(src.indexOf('function detailHtml('), src.indexOf('function detailHtml(') + 4000);
  assert.ok(detail.indexOf('ex-d-date') < detail.indexOf('receiptChips(rep, r)'), '날짜가 사진 앞(위)');
  assert.match(detail, /class="ex-d-text ex-d-purpose-inline"[^>]*aria-label="\$\{esc\(r\.ministryPurpose\)\}"/, '목적 전체 내용');
  assert.match(detail, /class="ex-d-text-tip" aria-hidden="true">\$\{esc\(r\.ministryPurpose\)\}/, '목적에 툴팁');
  assert.doesNotMatch(detail, /<div class="ex-d-purpose">/, '목적 별도 줄은 없다');
  const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');
  assert.match(css, /\.ex-d-text-label \{[^}]*text-overflow: ellipsis; white-space: nowrap;/);
});
