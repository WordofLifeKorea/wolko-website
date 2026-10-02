// 경비 리포트 백엔드 흐름 테스트 — 모의 KV로 제출 → 반려/재제출 → 승인 → 장부 반영과 권한을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as R from '../functions/api/expense/reports.js';
import * as F from '../functions/api/expense/receipt.js';
import { ACCOUNTANT_EMAILS, EXPENSE_ADMIN_EMAILS, NEW_REPORT_NOTIFY_EMAILS } from '../functions/lib/expenses.js';

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (!v) return null; return t === 'json' ? JSON.parse(v.value) : v.value; },
    async getWithMetadata(k) { const v = store.get(k); return v ? { value: v.value, metadata: v.metadata } : { value: null, metadata: null }; },
    async put(k, v, o) { store.set(k, { value: v, metadata: o?.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x', EXPENSE_EMAIL: 'on' };
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
  return { store, sent, acc, call };
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

  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { id, action: 'approve', categories: ['Car Gas (8400)'] })).status, 403, '본인 승인 불가');
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
  const ok = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: ['Car Gas (8400)'] });
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

  // 관리자(승인자)와 회계 담당은 모든 사람의 리포트(승인 전 포함)를 본다
  for (const who of [boss, ann]) {
    const all = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', who);
    assert.equal(all.status, 200);
    assert.deepEqual(all.reports.map(r => r.description).sort(), ['A', 'B']);
  }
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
  const dev = ['hkim3@wol.org', 'master'];         // Developer (포탈 master)
  const estelle = ['esooy@wol.org', 'admin'];
  const row = { account: 'Office (5201)', currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29' };
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'A', rows: [row] });
  const id = sub.report.id;

  for (const who of [dev, estelle]) {
    assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=all', who)).status, 403, '전체 조회 불가');
    assert.equal((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=approve', who)).status, 403, '승인 목록 불가');
    assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', who, { id, action: 'approve', categories: ['Car Gas (8400)'] })).status, 403, '승인 불가');
    const me = await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=counts', who);
    assert.equal(me.me.isApprover, false);
    assert.equal(me.me.canViewAll, false);
  }
  // 본인 리포트 제출/조회는 가능
  const own = await call(R.onRequestPost, 'POST', '/api/expense/reports', dev, { description: 'dev', rows: [row] });
  assert.equal(own.status, 200);
  assert.deepEqual((await call(R.onRequestGet, 'GET', '/api/expense/reports?scope=mine', dev)).reports.map(x => x.description), ['dev']);
  // 관리자 등급은 승인 가능
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ['boss@wol.org', 'admin'], { id, action: 'approve', categories: ['Car Gas (8400)'] })).report.status, 'approved');
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
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', owner, { id: sub.report.id, action: 'approve', categories: ['Car Gas (8400)'] })).report.status, 'approved');
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
  await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', ['boss@wol.org', 'admin'], { id, action: 'approve', categories: ['Car Gas (8400)'] });
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
    description: 'cat', rows: [row('휘발유', 'Car Gas (8400)'), row('간식', 'Office (5201)')],
  });
  const id = sub.report.id;
  assert.equal(sub.report.campus, 'jeju');

  const approve = categories => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories });
  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve' })).status, 400, '카테고리 없이 승인 불가');
  assert.equal((await approve(['Car Gas (8400)'])).status, 400, '일부 항목만 확정 불가');
  assert.equal((await approve(['Car Gas (8400)', 'Made Up (1)'])).status, 400, '목록에 없는 카테고리 불가');

  sent.length = 0;
  const ok = await approve(['Car Gas (8400)', 'Food Supplies (5251)'].map((c, i) => i === 1 ? 'SYME Food (8968)' : c));
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].account, 'Car Gas (8400)');
  assert.equal(ok.report.rows[1].account, 'SYME Food (8968)', '승인자가 확정한 카테고리로 교체');
  assert.equal(ok.report.rows[1].submittedAccount, 'Office (5201)', '제출자가 고른 원래 값은 보존');
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



test('메모: 모든 카테고리에서 입력 가능, Other/Unknown은 필수, 메모 항목은 승인자가 확인해야 하고 승인 메모가 남는다', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  const row = (account, memo) => ({ account, currency: 'KRW', amount: 1000, item: 'Pen', ministryPurpose: 'camp', when: '2026-09-29', memo });
  const noMemo = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'x', rows: [row('Other/Unknown', '')] });
  assert.equal(noMemo.status, 400, 'Other/Unknown은 메모 필수');
  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'm', rows: [row('Car Gas (8400)', '주유소 영수증 2장 합산'), row('Teacher (8052)', '')] });
  assert.equal(sub.status, 200);
  assert.equal(sub.report.rows[0].memo, '주유소 영수증 2장 합산');
  const id = sub.report.id, cats = ['Car Gas (8400)', 'Teacher (8052)'];
  const approve = body => call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve', categories: cats, ...body });
  assert.equal((await approve({ checks: [false, true] })).status, 400, '메모 항목 확인 없이는 승인 불가');
  const ok = await approve({ checks: [true, true], approverMemos: ['확인함, 합산 맞음', ''] });
  assert.equal(ok.status, 200);
  assert.equal(ok.report.rows[0].approverMemo, '확인함, 합산 맞음');
  assert.equal(ok.report.rows[0].memoCheckedBy, 'boss@wol.org');
  assert.equal(ok.report.rows[1].approverMemo, undefined);
});
