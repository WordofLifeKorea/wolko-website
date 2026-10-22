import assert from 'node:assert/strict';
import test from 'node:test';
import * as Exp from '../functions/api/campteam/ledger-expense.js';
import * as Rec from '../functions/api/campteam/ledger-reconcile.js';
import * as Ledger from '../functions/api/campteam/ledger.js';
import * as Periods from '../functions/api/campteam/ledger-periods.js';
import * as Summary from '../functions/api/campteam/ledger-summary.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();

// 가짜 경비 리포트 저장소(읽기만 가능: 쓰기·삭제를 시도하면 시험이 실패한다)
function fakeKV(reports) {
  const log = { puts: 0, gets: 0, lists: 0 };
  return { log, reports, async list({ prefix }) { log.lists++; return { keys: Object.keys(reports).filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
    async get(k) { log.gets++; return reports[k] ? JSON.parse(JSON.stringify(reports[k])) : null; }, async put() { log.puts++; throw new Error('쓰면 안 된다'); }, async delete() { log.puts++; throw new Error('지우면 안 된다'); } };
}
const row = (o) => ({ item: '품목', amount: 1, amountKrw: 1, currency: 'KRW', account: 'Other/Unknown', withdrawAccount: 'junior-camp', project: 'Winter', source: '월코캠', ...o });
const rep = (id, status, processedAt, rows, o = {}) => ({ id, status, submitterEmail: 'secret@wolko.org', submitterName: '홍길동', description: '캠프 장보기', project: 'Winter', submittedAt: '2027-01-01T00:00:00Z', processedAt, rows, ...o });
const reports = () => ({
  'expense:report:r1': rep('r1', 'processed', '2027-02-10T05:00:00Z', [row({ item: '버스 대절', amountKrw: 300000, amount: 300000, account: 'Teacher (8052)' }), row({ item: '개인 지출', amountKrw: 50000, withdrawAccount: 'personal' })]),
  'expense:report:r2': rep('r2', 'approved', null, [row({ item: '아직 승인만', amountKrw: 70000 })]),
  'expense:report:r3': rep('r3', 'processed', '2026-03-01T00:00:00Z', [row({ item: '옛날 경비', amountKrw: 11111 })]),
  'expense:report:r4': rep('r4', 'processed', '2027-03-01T00:00:00Z', [row({ item: '미국 구입', currency: 'USD', amount: 100, amountKrw: 135000, account: 'Food (8968)' })]),
  'expense:report:r5': rep('r5', 'processed', '2027-01-15T02:00:00Z', [row({ item: '식사 선결제(중복 가능)', amountKrw: 600000, account: 'Food (8968)' })]),
  'expense:report:r6': rep('r6', 'processed', '2028-05-01T02:00:00Z', [row({ item: '내년 경비', amountKrw: 40000 })]),
  'expense:report:r7': rep('r7', 'rejected', null, [row({ item: '반려됨', amountKrw: 5 })]),
});
const mk = (extra = {}) => { const kv = fakeKV(reports()); const env = makeEnv(fakeD1(), { CAMP_KV: kv }); return { env, kv, ...extra }; };
const RULES = { action: 'rules', withdraw: ['junior-camp'], account: { 'Teacher (8052)': '강사비', 'Food (8968)': '식비' } };
const post = (env, body, who = U.fin) => call(Exp, 'onRequestPost', env, who, { body });
const ex = (env, id) => env.DB.sqlite.prepare('SELECT * FROM ledger_entries WHERE externalKey = ? AND deletedAt IS NULL').get('exp:' + id);

test('경비 연동 권한: 월코 재정·일반 팀원·명단 밖은 설정·반영을 못 하고, 조회는 금액 조회 권한자만', async () => {
  const { env } = mk();
  for (const who of [U.tre, U.mem, U.view]) { assert.equal((await post(env, RULES, who)).status, 403, who); assert.equal((await post(env, { action: 'sync' }, who)).status, 403, who); }
  assert.equal((await call(Exp, 'onRequestGet', env, U.view)).status, 403); assert.equal((await call(Exp, 'onRequestGet', env, null)).status, 401);
  for (const who of [U.tre, U.mem, U.fin, U.dir]) assert.equal((await call(Exp, 'onRequestGet', env, who)).status, 200, who);
  for (const who of [U.fin, U.dir, U.admin]) assert.equal((await post(env, RULES, who)).status, 200, who);
  assert.equal((await post(env, { action: 'zzz' })).status, 404 === 404 ? 404 : 400, '모르는 줄 처리');
});

test('설정: 캠프 계좌는 경비 화면에 있는 출금 계좌만, 카테고리 매핑은 경비 카테고리 → 장부 지출 항목만', async () => {
  const { env } = mk();
  assert.equal((await post(env, { action: 'rules', withdraw: ['nope'], account: {} })).status, 400);
  assert.equal((await post(env, { action: 'rules', withdraw: ['junior-camp'], account: { 'Not A Category': '식비' } })).status, 400);
  assert.equal((await post(env, { action: 'rules', withdraw: ['junior-camp'], account: { 'Food (8968)': '없는항목' } })).status, 400);
  assert.equal((await post(env, RULES)).status, 200);
  const g = await J(await call(Exp, 'onRequestGet', env, U.tre)); assert.deepEqual(g.rules.withdraw, ['junior-camp']); assert.equal(g.rules.account['Food (8968)'], '식비');
  assert.ok(g.withdrawOptions.some((a) => a.id === 'junior-camp') && g.accountOptions.includes('Food (8968)')); assert.equal(g.connected, true);
  assert.equal(JSON.stringify(g).includes('secret@wolko.org'), false, '제출자 이메일은 가져오지 않는다');
});

test('가져오기: 캠프 계좌 항목만 지출로 반영(카테고리는 규칙대로, 외화는 원화 환산액), 진행 중·반려·옛 기간 전·다른 계좌는 제외, 같은 것은 두 번 반영되지 않는다. 읽기만 한다', async () => {
  const { env, kv } = mk();
  assert.deepEqual(await J(await post(env, { action: 'sync' })), { available: true, configured: false, scanned: 0, linked: 0, pending: 0 }, '규칙이 없으면 아무것도 하지 않는다');
  await post(env, RULES);
  const r = await J(await post(env, { action: 'sync' }));
  assert.equal(r.linked, 2); assert.equal(r.pending, 2, '중복 가능 1 + 기간 없음 1');
  const e1 = ex(env, 'r1:0'); assert.deepEqual([e1.amount, e1.category, e1.kind, e1.source, e1.entryDate, e1.description, e1.needsReview, e1.periodId], [300000, '강사비', 'expense', 'expense', '2027-02-10', '버스 대절', 0, 'lp-2027h1']);
  assert.match(e1.note, /경비 리포트/); assert.equal(e1.note.includes('secret@'), false);
  const e4 = ex(env, 'r4:0'); assert.deepEqual([e4.amount, e4.category], [135000, '식비']); assert.match(e4.note, /USD 100/);
  assert.equal(ex(env, 'r1:1'), undefined, '다른 출금 계좌 항목은 가져오지 않는다'); assert.equal(ex(env, 'r2:0'), undefined, '승인만 된 리포트는 아직'); assert.equal(ex(env, 'r3:0'), undefined, '장부 시작 전의 옛 경비'); assert.equal(ex(env, 'r7:0'), undefined);
  // 읽기만 했다
  assert.equal(kv.log.puts, 0); assert.ok(kv.log.gets >= 5);
  // 다시 실행해도 중복되지 않고, 끝난 리포트는 다시 읽지 않는다
  const before = kv.log.gets; const again = await J(await post(env, { action: 'sync' })); assert.equal(again.linked, 0);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_entries WHERE source='expense' AND deletedAt IS NULL`).get().n, 2);
  assert.ok(kv.log.gets - before <= 2, '끝난 리포트(송금 완료·반려)는 다시 읽지 않는다: ' + (kv.log.gets - before));
  // 승인만 되어 있던 r2 가 송금 완료되면 다음에 반영
  kv.reports['expense:report:r2'] = rep('r2', 'processed', '2027-02-20T00:00:00Z', [row({ item: '이제 송금됨', amountKrw: 70000 })]);
  assert.equal((await J(await post(env, { action: 'sync' }))).linked, 1); assert.equal(ex(env, 'r2:0').amount, 70000);
  // 장부 합계에 지출로 잡힌다
  const sum = await J(await call(Summary, 'onRequestGet', env, U.tre, { qs: '?periodId=lp-2027h1' })); assert.equal(sum.byCategory.find((c) => c.category === '강사비').actual, 300000);
});

test('카테고리 매핑이 없으면 "기타 + 분류 확인 필요"로 들어오고, 매핑을 저장하면 자동으로 항목이 맞춰진다. 직접 고쳐도 확인 표시가 사라진다', async () => {
  const { env } = mk();
  await post(env, { action: 'rules', withdraw: ['junior-camp'], account: {} }); await post(env, { action: 'sync' });
  const e = ex(env, 'r1:0'); assert.deepEqual([e.category, e.needsReview], ['기타', 1]);
  const s = await J(await call(Summary, 'onRequestGet', env, U.fin, { qs: '?periodId=lp-2027h1' })); assert.ok(s.needsReview >= 2);
  const saved = await J(await post(env, RULES)); assert.ok(saved.reclassified >= 1);
  assert.deepEqual([ex(env, 'r1:0').category, ex(env, 'r1:0').needsReview], ['강사비', 0]);
  const e4 = ex(env, 'r4:0'); await call(Ledger, 'onRequestPatch', env, U.fin, { qs: `?id=${e4.id}`, body: { category: '물품구입비' } }); assert.equal(ex(env, 'r4:0').needsReview, 0);
});

test('연동함: 중복 가능은 사람이 고르고(기존 줄에 연결/새로 추가/제외), 기간이 없으면 보류했다가 기간을 만들면 자동 반영된다', async () => {
  const { env } = mk(); await post(env, RULES); await post(env, { action: 'sync' });
  const inbox = await J(await call(Exp, 'onRequestGet', env, U.fin)); const dup = inbox.pending.find((p) => p.reason === 'dup'), np = inbox.pending.find((p) => p.reason === 'noPeriod');
  assert.ok(dup && np); assert.equal(dup.candidateEntry.id, 'le-03', '장부에 있는 비슷한 거래를 보여 준다'); assert.equal(dup.candidateEntry.amount, 600000);
  // 중복 가능 → 기존 줄에 연결 (새 줄을 만들지 않음)
  const before = env.DB.sqlite.prepare('SELECT COUNT(*) n FROM ledger_entries WHERE deletedAt IS NULL').get().n;
  assert.equal((await post(env, { action: 'merge', reportId: dup.reportId, rowIdx: dup.rowIdx, entryId: 'le-03' })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM ledger_entries WHERE deletedAt IS NULL').get().n, before, '새 줄 없음');
  assert.equal(env.DB.sqlite.prepare('SELECT state, entryId FROM ledger_expense_rows WHERE reportId=?').get(dup.reportId).state, 'linked');
  assert.equal((await post(env, { action: 'merge', reportId: dup.reportId, rowIdx: dup.rowIdx, entryId: 'le-03' })).status, 409, '이미 처리됨');
  // 기간이 없는 항목: 강제로 반영 시도하면 안내, 제외·되돌리기
  assert.equal((await post(env, { action: 'link', reportId: np.reportId, rowIdx: np.rowIdx })).status, 409);
  assert.equal((await post(env, { action: 'ignore', reportId: np.reportId, rowIdx: np.rowIdx })).status, 200); assert.equal((await J(await post(env, { action: 'sync' }))).linked, 0, '제외한 항목은 다시 들어오지 않는다');
  assert.equal((await post(env, { action: 'restore', reportId: np.reportId, rowIdx: np.rowIdx })).status, 200);
  // 그 날짜의 기간을 만들면 다음 가져오기에서 자동 반영
  await call(Periods, 'onRequestPost', env, U.dir, { body: { name: '2028 상반기', startDate: '2028-01-01', endDate: '2028-06-30' } });
  const after = await J(await post(env, { action: 'sync' })); assert.equal(after.linked, 1); assert.equal(ex(env, np.reportId + ':' + np.rowIdx).entryDate, '2028-05-01');
  // 닫힌 기간이면 보류(closed), 다시 열면 반영
  const { env: e2 } = mk(); await post(e2, RULES);
  const p = await J(await call(Periods, 'onRequestPost', e2, U.dir, { body: { name: '2028', startDate: '2028-01-01', endDate: '2028-12-31' } }));
  await call(Periods, 'onRequestPost', e2, U.dir, { body: { action: 'close', id: p.id, noCarry: true } }); await post(e2, { action: 'sync' });
  assert.equal(e2.DB.sqlite.prepare("SELECT reason FROM ledger_expense_rows WHERE reportId='r6'").get().reason, 'closed');
  await call(Periods, 'onRequestPost', e2, U.dir, { body: { action: 'reopen', id: p.id } }); await post(e2, { action: 'sync' });
  assert.equal(e2.DB.sqlite.prepare("SELECT state FROM ledger_expense_rows WHERE reportId='r6'").get().state, 'linked');
});

test('연동함에서 직접 "새로 추가"(중복 아님)하면 항목을 골라 반영되고, 연동 줄은 금액·날짜를 고칠 수 없다', async () => {
  const { env } = mk(); await post(env, RULES); await post(env, { action: 'sync' });
  const dup = (await J(await call(Exp, 'onRequestGet', env, U.fin))).pending.find((p) => p.reason === 'dup');
  assert.equal((await post(env, { action: 'link', reportId: dup.reportId, rowIdx: dup.rowIdx, category: '없는항목' })).status, 400);
  assert.equal((await post(env, { action: 'link', reportId: dup.reportId, rowIdx: dup.rowIdx, category: '식비' })).status, 200);
  const e = ex(env, dup.reportId + ':' + dup.rowIdx); assert.equal(e.category, '식비'); assert.equal(e.amount, 600000);
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.fin, { qs: `?id=${e.id}`, body: { amount: '1' } })).status, 409);
});

test('자동 가져오기(autoSync)는 간격 제한이 있고, 경비 저장소에 연결이 없으면 조용히 건너뛴다', async () => {
  const { env, kv } = mk(); await post(env, RULES);
  const a = await J(await post(env, { action: 'autoSync' })); assert.equal(a.linked, 2); const g1 = kv.log.gets;
  const b = await J(await post(env, { action: 'autoSync' })); assert.equal(b.throttled, true); assert.equal(kv.log.gets, g1, '간격 안에는 읽지 않는다');
  const none = makeEnv(fakeD1()); await post(none, RULES); assert.deepEqual(await J(await post(none, { action: 'autoSync' })), { available: false });
  assert.equal((await post(none, { action: 'sync' })).status, 503); assert.equal((await J(await call(Exp, 'onRequestGet', none, U.tre))).connected, false);
});

test('잔액 대조: 통장 잔액과 그 날짜까지의 장부 잔액의 차이를 기록하고, 요약에 최근 대조가 보이며, 월코 재정(조회)은 보기만 한다', async () => {
  const env = makeEnv(fakeD1());
  const get = (who, qs) => call(Rec, 'onRequestGet', env, who, { qs }), P = 'lp-2027h1';
  // 2027-01-20 까지: 이월 1,200,000 − 245,000 − 3,000,000 − 600,000 + 2,400,000 = −245,000
  const cur = await J(await get(U.tre, `?periodId=${P}&asOf=2027-01-20`)); assert.equal(cur.current.ledgerBalance, 1200000 - 245000 - 3000000 - 600000 + 2400000);
  assert.equal((await call(Rec, 'onRequestPost', env, U.tre, { body: { periodId: P, asOfDate: '2027-01-20', bankBalance: '1' } })).status, 403);
  assert.equal((await call(Rec, 'onRequestPost', env, U.mem, { body: { periodId: P, asOfDate: '2027-01-20', bankBalance: '1' } })).status, 403);
  for (const bad of [{ asOfDate: '2027-13-01', bankBalance: '1' }, { asOfDate: '2028-01-01', bankBalance: '1' }, { asOfDate: '2027-01-20', bankBalance: 'abc' }, { asOfDate: '2027-01-20' }]) assert.equal((await call(Rec, 'onRequestPost', env, U.fin, { body: { periodId: P, ...bad } })).status, 400, JSON.stringify(bad));
  const ok = await J(await call(Rec, 'onRequestPost', env, U.fin, { body: { periodId: P, asOfDate: '2027-01-20', bankBalance: '1,000,000', note: '월코 재정에게 받은 잔액' } })); assert.equal(ok.diff, 1000000 - cur.current.ledgerBalance);
  await call(Rec, 'onRequestPost', env, U.dir, { body: { periodId: P, asOfDate: '2027-02-05', bankBalance: String(cur.current.ledgerBalance + 500000), note: '' } });
  const list = (await J(await get(U.tre, `?periodId=${P}`))).items; assert.deepEqual(list.map((i) => i.asOfDate), ['2027-02-05', '2027-01-20']);
  const sum = await J(await call(Summary, 'onRequestGet', env, U.tre, { qs: `?periodId=${P}` })); assert.equal(sum.lastReconcile.asOfDate, '2027-02-05'); assert.equal(sum.lastReconcile.diff, 0 + (sum.lastReconcile.bankBalance - sum.lastReconcile.ledgerBalance));
  assert.equal((await call(Rec, 'onRequestDelete', env, U.tre, { qs: `?id=${list[0].id}` })).status, 403); assert.equal((await call(Rec, 'onRequestDelete', env, U.fin, { qs: `?id=${list[0].id}` })).status, 200);
  assert.equal((await J(await get(U.fin, `?periodId=${P}`))).items.length, 1); assert.equal((await get(U.view, `?periodId=${P}`)).status, 403);
  assert.ok(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE entity='ledger_reconcile'").get().n >= 3);
});
