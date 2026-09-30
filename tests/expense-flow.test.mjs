// 경비 리포트 백엔드 흐름 테스트 — 모의 KV로 제출 → 반려/재제출 → 승인 → 장부 반영과 권한을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as R from '../functions/api/expense/reports.js';
import * as F from '../functions/api/expense/receipt.js';
import * as A from '../functions/api/hub/accountant.js';

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (!v) return null; return t === 'json' ? JSON.parse(v.value) : v.value; },
    async getWithMetadata(k) { const v = store.get(k); return v ? { value: v.value, metadata: v.metadata } : { value: null, metadata: null }; },
    async put(k, v, o) { store.set(k, { value: v, metadata: o?.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x' };
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

  const rows = [{ account: 'Meals Expenditure (5435)', currency: 'USD', amount: 100, rate: 1380, ministryPurpose: 'Camp meals', when: '2026-09-29', receipts: [{ id: fid, name: 'r.jpg', type: 'image/jpeg' }] }];
  const noRate = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'Sep', rows: [{ ...rows[0], rate: 0 }] });
  assert.equal(noRate.status, 400, 'USD 항목은 환율 필수');

  const sub = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'Sep', project: 'P1', rows });
  assert.equal(sub.status, 200);
  assert.equal(sub.report.total, 138000, '$100 × 1,380 = ₩138,000');
  assert.equal(sub.report.rows[0].amountKrw, 138000);
  const id = sub.report.id;
  assert.ok(sent[0].to.includes('boss@wol.org') && !sent[0].to.includes('cyn@x.com'), '승인자에게만 알림');
  assert.ok(store.has(`expense:receipt:${id}:${fid}`), '영수증이 영구 키로 이동');
  assert.ok(![...store.keys()].some(k => k.includes(':tmp:')), '임시 키 정리됨');

  assert.equal((await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', cyn, { id, action: 'approve' })).status, 403, '본인 승인 불가');
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
  const ok = await call(R.onRequestPatch, 'PATCH', '/api/expense/reports', boss, { id, action: 'approve' });
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

test('회계 담당 지정은 master만 가능', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  await acc('boss@wol.org', 'Boss', 'admin');
  assert.equal((await call(A.onRequestPost, 'POST', '/api/hub/accountant', boss, { email: 'cyn@x.com', isAccountant: true })).status, 403);
  const r = await call(A.onRequestPost, 'POST', '/api/hub/accountant', master, { email: 'cyn@x.com', isAccountant: true });
  assert.equal(r.isAccountant, true);
});

test('KRW 항목은 환율 없이 원화 그대로, 합계는 KRW', async () => {
  const { acc, call } = setup();
  await acc('cyn@x.com', 'Cynthia', 'counselor');
  const r = await call(R.onRequestPost, 'POST', '/api/expense/reports', cyn, { description: 'mix', rows: [
    { account: 'Office (5201)', currency: 'KRW', amount: 12500, ministryPurpose: 'pens', when: '2026-09-29' },
    { account: 'Office (5201)', currency: 'USD', amount: 10.5, rate: 1355.05, ministryPurpose: 'online', when: '2026-09-29' },
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
