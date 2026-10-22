import assert from 'node:assert/strict';
import test from 'node:test';
import * as Imp from '../functions/api/campteam/ledger-import.js';
import * as Ledger from '../functions/api/campteam/ledger.js';
import * as Periods from '../functions/api/campteam/ledger-periods.js';
import * as Plan from '../functions/api/campteam/ledger-plan.js';
import { normalizeRows, diffRows, fp } from '../functions/lib/campteamLedgerImport.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();
const mkEnv = () => makeEnv(fakeD1());
const newP = async (env, o = {}) => (await J(await call(Periods, 'onRequestPost', env, U.dir, { body: { name: '2030 상반기', startDate: '2030-01-01', endDate: '2030-06-30', ...o } }))).id;
// 엑셀 "장부" 탭과 같은 모양의 가짜 줄들 (금액은 모두 가짜)
const R = (row, date, kind, amount, category, description = '', note = '', extra = {}) => ({ row, date, kind, amount, category, description, note, ...extra });
const FILE1 = () => [R(4, '', 'income', 1000000, '이월금', '지난 캠프 이월금'), R(5, '2030-01-10', 'expense', 266000, '물품구입비', '액티비티 물품'), R(6, '2030-01-12', 'expense', 500000, '식비', '식사 선결제', '1차'), R(7, '2030-02-01', 'income', 2000000, '캠프비', '참가비 1차')];
const pv = (env, periodId, rows, extra = {}, who = U.fin) => call(Imp, 'onRequestPost', env, who, { body: { action: 'preview', periodId, rows, ...extra } });
const ap = (env, periodId, rows, options = {}, extra = {}, who = U.fin) => call(Imp, 'onRequestPost', env, who, { body: { action: 'apply', periodId, rows, fileName: 'x.xlsx', options, ...extra } });
const live = (env, pid) => env.DB.sqlite.prepare(`SELECT * FROM ledger_entries WHERE periodId=? AND deletedAt IS NULL ORDER BY entryDate, srcRow`).all(pid).map((r) => ({ ...r }));

test('줄 정리: 구분·금액·항목·날짜 검사, 날짜가 빈 줄은 앞 줄(없으면 기간 시작일) 날짜를 쓰고, 기간 밖은 건너뜀', () => {
  const period = { startDate: '2030-01-01', endDate: '2030-06-30' };
  const { ok, skipped } = normalizeRows([R(4, '', 'income', '1,000,000', '이월금'), R(5, '2030-02-01', 'expense', 5000, '식비'), R(6, '', 'expense', 100, '식비'), R(7, '2030-03-01', 'x', 1, '식비'), R(8, '2030-03-01', 'expense', 'abc', '식비'), R(9, '2030-03-01', 'expense', 10, ''), R(10, '2031-01-01', 'expense', 10, '식비'), R(11, 'zz', 'expense', 10, '식비'), R(12, '2030-03-01', 'expense', 0, '식비')], period);
  assert.deepEqual(ok.map((r) => [r.row, r.entryDate, r.amount, r.dateGuessed]), [[4, '2030-01-01', 1000000, true], [5, '2030-02-01', 5000, false], [6, '2030-02-01', 100, true]]);
  assert.deepEqual(skipped.map((s) => s.row), [7, 8, 9, 10, 11, 12]); assert.match(skipped[3].reason, /밖/);
});

test('비교 규칙: 같은 줄은 그대로, 같은 줄 번호·비슷한 줄은 "바뀐 줄", 짝이 없으면 새 줄/빠진 줄, 같은 줄이 둘이면 두 개로 센다', () => {
  const E = (id, row, date, amount, cat, desc, o = {}) => ({ id, entryDate: date, kind: 'expense', amount, category: cat, description: desc, note: '', source: 'excel', srcRow: row, editedLocal: 0, ...o });
  const existing = [E('a', 5, '2030-01-10', 266000, '물품구입비', '액티비티 물품'), E('b', 6, '2030-01-12', 500000, '식비', '식사 선결제'), E('c', 7, '2030-01-15', 70000, '식비', '간식'), E('d', 8, '2030-01-15', 70000, '식비', '간식'), E('x', 9, '2030-02-01', 9999, '기타', '엑셀에서 지워진 줄')];
  const u = (row, date, amount, cat, desc) => ({ row, id: null, entryDate: date, kind: 'expense', amount, category: cat, description: desc, note: '', dateGuessed: false });
  const r = diffRows([u(5, '2030-01-10', 266000, '물품구입비', '액티비티 물품'), u(6, '2030-01-12', 550000, '식비', '식사 선결제'), u(7, '2030-01-15', 70000, '식비', '간식'), u(8, '2030-01-15', 70000, '식비', '간식'), u(20, '2030-03-03', 12345, '기타', '새로 생긴 줄')], existing);
  assert.deepEqual(r.unchanged.map((x) => x.id).sort(), ['a', 'c', 'd']);
  assert.deepEqual(r.changed.map((x) => [x.id, x.fields, x.how]), [['b', ['amount'], 'row']]);
  assert.deepEqual(r.added.map((x) => x.row), [20]); assert.deepEqual(r.missing.map((x) => x.id), ['x']);
  // 줄 번호가 밀려도(중간에 줄을 끼워 넣음) 내용이 같으면 그대로
  const shifted = diffRows([u(6, '2030-01-10', 266000, '물품구입비', '액티비티 물품'), u(7, '2030-01-12', 500000, '식비', '식사 선결제')], existing.slice(0, 2));
  assert.equal(shifted.unchanged.length, 2); assert.equal(shifted.added.length, 0);
  // 줄 번호가 같아도 전혀 다른 줄이면 짝짓지 않는다
  const other = diffRows([u(5, '2031-05-05', 1, '기타', '전혀 다른 줄')], [E('a', 5, '2030-01-10', 266000, '물품구입비', '액티비티 물품')]);
  assert.equal(other.changed.length, 0); assert.equal(other.added.length, 1); assert.equal(other.missing.length, 1);
  assert.equal(fp({ entryDate: 'd', kind: 'k', amount: 1, category: ' 식비 ', description: 'a  b', note: '' }), fp({ entryDate: 'd', kind: 'k', amount: 1, category: '식비', description: 'a b', note: '' }), '공백 차이는 같은 줄');
});

test('권한: 월코 재정(조회)·일반 팀원·명단에 없는 사람은 가져올 수 없고, 캠프 재정·디렉터는 가능, 마감된 기간은 불가', async () => {
  const env = mkEnv(), pid = await newP(env);
  for (const who of [U.view, U.tre, U.mem]) assert.equal((await pv(env, pid, FILE1(), {}, who)).status, 403, who);
  assert.equal((await call(Imp, 'onRequestPost', env, null, { body: { action: 'preview', periodId: pid, rows: [] } })).status, 401);
  for (const who of [U.fin, U.dir, U.admin]) assert.equal((await pv(env, pid, FILE1(), {}, who)).status, 200, who);
  assert.equal((await pv(env, 'nope', FILE1())).status, 404);
  assert.equal((await pv(env, pid, 'x')).status, 400); assert.equal((await call(Imp, 'onRequestPost', env, U.fin, { body: { action: 'zzz', periodId: pid } })).status, 400);
  await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: pid, noCarry: true } });
  assert.equal((await ap(env, pid, FILE1())).status, 409, '마감된 기간에는 가져올 수 없다');
  assert.equal((await call(Imp, 'onRequestGet', env, U.tre, { qs: `?periodId=${pid}` })).status, 200, '기록은 조회 가능');
});

test('처음 가져오기 → 같은 파일 다시 → 바뀐 것만: 미리보기는 저장하지 않고, 두 번째는 변화가 없으며, 엑셀에서 고친 줄만 반영된다', async () => {
  const env = mkEnv(), pid = await newP(env);
  const p1 = await J(await pv(env, pid, FILE1(), { categories: { income: ['캠프비'], expense: ['식비'] } }));
  assert.equal(p1.summary.added, 4); assert.equal(p1.summary.changed, 0); assert.equal(live(env, pid).length, 0, '미리보기는 아무것도 저장하지 않는다');
  const a1 = await J(await ap(env, pid, FILE1(), {})); assert.equal(a1.result.added, 4);
  const e = live(env, pid); assert.equal(e.length, 4); assert.ok(e.every((x) => x.source === 'excel' && x.srcRow)); assert.equal(e.find((x) => x.category === '이월금').entryDate, '2030-01-01', '날짜 없는 줄은 기간 시작일');
  // 같은 파일을 다시
  const p2 = await J(await pv(env, pid, FILE1())); assert.deepEqual([p2.summary.added, p2.summary.changed, p2.summary.missing, p2.summary.unchanged], [0, 0, 0, 4]);
  const a2 = await J(await ap(env, pid, FILE1(), {})); assert.deepEqual([a2.result.added, a2.result.changed, a2.result.removed], [0, 0, 0]); assert.equal(live(env, pid).length, 4, '두 번 올려도 중복되지 않는다');
  // 엑셀에서 금액 하나 고치고 새 줄 하나 추가
  const f2 = FILE1(); f2[2] = R(6, '2030-01-12', 'expense', 550000, '식비', '식사 선결제', '1차'); f2.push(R(8, '2030-03-01', 'expense', 80000, '간식비', '간식 구입'));
  const p3 = await J(await pv(env, pid, f2)); assert.deepEqual([p3.summary.added, p3.summary.changed, p3.summary.unchanged], [1, 1, 3]);
  assert.deepEqual(p3.changed[0].fields, ['amount']); assert.deepEqual([p3.changed[0].before.amount, p3.changed[0].after.amount], [500000, 550000]);
  const a3 = await J(await ap(env, pid, f2, {})); assert.deepEqual([a3.result.added, a3.result.changed], [1, 1]);
  assert.equal(live(env, pid).find((x) => x.description === '식사 선결제').amount, 550000); assert.equal(live(env, pid).length, 5);
  // 기록
  const hist = (await J(await call(Imp, 'onRequestGet', env, U.tre, { qs: `?periodId=${pid}` }))).items; assert.equal(hist.length, 3); assert.equal(hist[0].summary.added, 1);
  assert.ok(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM audit_log WHERE action='import'`).get().n >= 3);
});

test('엑셀에서 지운 줄은 알려 주기만 하고, 고른 것만 지운다', async () => {
  const env = mkEnv(), pid = await newP(env); await ap(env, pid, FILE1());
  const less = FILE1().slice(0, 3);
  const p = await J(await pv(env, pid, less)); assert.equal(p.summary.missing, 1); const m = p.missing[0]; assert.equal(m.amount, 2000000);
  await ap(env, pid, less, {}); assert.equal(live(env, pid).length, 4, '고르지 않으면 지우지 않는다');
  const r = await J(await ap(env, pid, less, { removeIds: [m.id] })); assert.equal(r.result.removed, 1); assert.equal(live(env, pid).length, 3);
  assert.equal(env.DB.sqlite.prepare('SELECT deletedAt FROM ledger_entries WHERE id=?').get(m.id).deletedAt !== null, true, '삭제 표시만 한다');
});

test('포털에서 직접 고친 줄은 엑셀 값으로 덮어쓰지 않고(충돌), 고르면 덮어쓴다. 엑셀로 내려받은 시점에는 충돌이 풀린다', async () => {
  const env = mkEnv(), pid = await newP(env); await ap(env, pid, FILE1());
  const row = live(env, pid).find((x) => x.description === '식사 선결제');
  await call(Ledger, 'onRequestPatch', env, U.fin, { qs: `?id=${row.id}`, body: { amount: '520,000' } });               // 포털에서 고침
  const f = FILE1(); f[2] = R(6, '2030-01-12', 'expense', 550000, '식비', '식사 선결제', '1차');                         // 엑셀에서도 (다른 값으로) 고침
  const p = await J(await pv(env, pid, f)); assert.equal(p.summary.conflicts, 1); assert.equal(p.changed[0].conflict, true);
  const keep = await J(await ap(env, pid, f, {})); assert.equal(keep.result.keptPortal, 1); assert.equal(live(env, pid).find((x) => x.id === row.id).amount, 520000, '기본은 포털 값 유지');
  const take = await J(await ap(env, pid, f, { resolve: { [row.id]: 'excel' } })); assert.equal(take.result.changed, 1); assert.equal(live(env, pid).find((x) => x.id === row.id).amount, 550000);
  assert.equal(live(env, pid).find((x) => x.id === row.id).editedLocal, 0);
  await call(Ledger, 'onRequestPatch', env, U.fin, { qs: `?id=${row.id}`, body: { amount: '600,000' } });
  assert.equal((await J(await pv(env, pid, f))).summary.conflicts, 1);
  assert.equal((await call(Imp, 'onRequestPost', env, U.fin, { body: { action: 'markExported', periodId: pid } })).status, 200);
  assert.equal(live(env, pid).find((x) => x.id === row.id).editedLocal, 0, '내려받은 뒤에는 엑셀과 같은 상태로 본다');
  assert.equal((await call(Imp, 'onRequestPost', env, U.tre, { body: { action: 'markExported', periodId: pid } })).status, 403);
});

test('ID 열(포털에서 내려받은 파일): 엑셀에서 금액·내용·날짜를 고쳐도 같은 줄로 인식하고, 모르는 ID는 새 줄로 만들지 않는다', async () => {
  const env = mkEnv(), pid = await newP(env); await ap(env, pid, FILE1());
  const manual = await J(await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: pid, entryDate: '2030-04-01', kind: 'expense', amount: '10,000', category: '식비', description: '직접 입력' } }));
  const rows = live(env, pid).map((e, i) => R(i + 4, e.entryDate, e.kind, e.amount, e.category, e.description, e.note, { id: e.id }));
  const edit = rows.find((r) => r.id === manual.id); edit.amount = 12000; edit.description = '엑셀에서 고침'; edit.date = '2030-04-02';
  rows.push(R(40, '2030-05-05', 'expense', 1, '식비', '포털에 없는 ID', '', { id: 'deadbeef-0000-0000-0000-000000000000' }));
  const p = await J(await pv(env, pid, rows)); assert.deepEqual([p.summary.changed, p.summary.added, p.summary.idMissing], [1, 0, 1]); assert.deepEqual(p.changed[0].fields.sort(), ['amount', 'description', 'entryDate'].sort());
  await ap(env, pid, rows, {}); const e = live(env, pid).find((x) => x.id === manual.id); assert.deepEqual([e.amount, e.description, e.entryDate, e.source], [12000, '엑셀에서 고침', '2030-04-02', 'manual']);
  assert.equal(live(env, pid).length, 5, 'ID 를 모르는 줄은 만들지 않는다');
});

test('직접 입력한 줄·경비 리포트에서 온 줄과 같은 내용이면 새로 만들지 않고(중복 방지), 경비 리포트 줄은 금액·날짜를 바꾸지 않는다', async () => {
  const env = mkEnv(), pid = await newP(env), now = new Date().toISOString();
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: pid, entryDate: '2030-01-10', kind: 'expense', amount: '266,000', category: '물품구입비', description: '액티비티 물품' } });
  env.DB.sqlite.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,source,externalKey,createdAt,updatedAt) VALUES ('exp1',?1,'2030-01-12','expense',500000,'식비','식사 선결제','expense','exp:r1:0',?2,?2)`).run(pid, now);
  const rows = FILE1().slice(1, 3); const p = await J(await pv(env, pid, rows)); assert.deepEqual([p.summary.unchanged, p.summary.added], [1, 1], '직접 입력과 같은 줄은 그대로(중복 없음)'); 
  assert.equal(p.changed.length, 0);
  // 경비 리포트 줄을 엑셀에서 다른 금액·항목으로 올리면: 금액은 그대로, 항목·내용·메모만 반영
  const r2 = [R(6, '2030-01-12', 'expense', 999999, '기타', '식사 선결제 (엑셀)', '메모')];
  const q = await J(await pv(env, pid, r2)); assert.equal(q.summary.added + q.summary.changed >= 1, true);
  const chg = q.changed.find((c) => c.id === 'exp1'); if (chg) { await ap(env, pid, r2, {}); const e = env.DB.sqlite.prepare('SELECT * FROM ledger_entries WHERE id=?').get('exp1'); assert.equal(e.amount, 500000, '경비 리포트 줄의 금액은 그대로'); assert.equal(e.entryDate, '2030-01-12'); }
});

test('새 항목: 장부에 없는 항목은 미리 알려 주고, 허용하면 항목 목록에 자동으로 추가, 거부하면 그 줄은 건너뜀. 목록 탭의 항목도 추가', async () => {
  const env = mkEnv(), pid = await newP(env);
  const rows = [R(5, '2030-01-10', 'expense', 1000, '교통비', '버스'), R(6, '2030-01-11', 'expense', 2000, '식비', '점심')];
  const p = await J(await pv(env, pid, rows, { categories: { expense: ['교통비', '기타', '인쇄비'], income: ['바자회'] } }));
  assert.deepEqual(p.newCategories.map((c) => c.name), ['교통비']); assert.deepEqual(p.catsAdd.map((c) => c.name).sort(), ['바자회', '인쇄비'].sort());
  const no = await J(await ap(env, pid, rows, { addCategories: false })); assert.equal(no.result.added, 1, '허용하지 않으면 새 항목 줄은 건너뜀'); assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_categories WHERE name='교통비'`).get().n, 0);
  const yes = await J(await ap(env, pid, rows, {}, { categories: { expense: ['인쇄비'], income: ['바자회'] } })); assert.equal(yes.result.added, 1);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_categories WHERE name IN ('교통비','인쇄비','바자회') AND active=1`).get().n, 3);
});

test('이월금: 이전 기간에서 자동으로 넘어온 이월금이 있으면 엑셀의 이월금 줄은 기본으로 건너뛰고(이중 계산 방지), 첫 기간이면 그대로 가져온다', async () => {
  const env = mkEnv();
  const a = await newP(env, { name: '2030 상반기' }), b = await newP(env, { name: '2030 하반기', startDate: '2030-07-01', endDate: '2030-12-31' });
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: a, entryDate: '2030-02-01', kind: 'income', amount: '3,000,000', category: '캠프비' } });
  await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: a, nextPeriodId: b } });
  const rows = [R(4, '', 'income', 3000000, '이월금', '엑셀에 적어 둔 이월금'), R(5, '2030-07-10', 'expense', 100000, '식비', '식사')];
  const p = await J(await pv(env, b, rows)); assert.equal(p.summary.carryDup, 1); assert.equal(p.added.find((x) => x.row === 4).flags.carryDup, true);
  const r = await J(await ap(env, b, rows, {})); assert.equal(r.result.added, 1, '이월금 줄은 건너뜀');
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_entries WHERE periodId=? AND category='이월금' AND deletedAt IS NULL`).get(b).n, 1, '이월금은 자동으로 넘어온 한 줄뿐');
  // 포털에서 내려받은 파일(이월금 줄이 그대로 들어 있음)을 다시 올려도 이월금 줄은 "그대로"
  const again = [R(4, '2030-07-01', 'income', 3000000, '이월금', '2030 상반기 이월'), R(5, '2030-07-10', 'expense', 100000, '식비', '식사')];
  const pa = await J(await pv(env, b, again)); assert.deepEqual([pa.summary.unchanged, pa.summary.added, pa.summary.carryDup, pa.summary.changed, pa.summary.missing], [2, 0, 0, 0, 0], '이월금 줄과 앞서 가져온 식사 줄 모두 그대로');
  const first = await newP(env, { name: '처음', startDate: '2040-01-01', endDate: '2040-06-30' });
  const f = await J(await ap(env, first, [R(4, '', 'income', 1000000, '이월금', '맨 처음 이월금')])); assert.equal(f.result.added, 1, '넘어온 이월금이 없으면 그대로 가져온다');
});

test('기간 예산(엑셀의 예산 탭): 바뀌는 항목을 미리 보여 주고 합치기로 반영하며, 파일에 없는 항목은 그대로 둔다', async () => {
  const env = mkEnv(), pid = await newP(env);
  await call(Plan, 'onRequestPut', env, U.fin, { body: { periodId: pid, items: [{ kind: 'expense', category: '식비', amount: '1,000,000' }, { kind: 'expense', category: '강사비', amount: '400,000' }] } });
  const plan = [{ category: '식비', amount: '2,500,000' }, { category: '간식비', amount: 200000 }, { category: '강사비', amount: 400000 }, { category: '', amount: 5 }, { category: '기타', amount: 'abc' }];
  const p = await J(await pv(env, pid, [], { plan })); assert.deepEqual(p.plan.changes.map((c) => [c.category, c.from, c.to]).sort(), [['간식비', null, 200000], ['식비', 1000000, 2500000]].sort()); assert.equal(p.plan.invalid.length, 2);
  const zero = await J(await pv(env, pid, [], { plan: [{ category: '기타', amount: 0 }, { category: '영어활동비', amount: '' }] })); assert.equal(zero.summary.planChanges, 0, '없던 항목의 0원은 변경이 아니다(내려받은 파일을 그대로 올려도 잡음 없음)');
  await ap(env, pid, [], { planMode: 'none' }, { plan }); assert.equal(env.DB.sqlite.prepare(`SELECT amount FROM ledger_plan WHERE periodId=? AND category='식비'`).get(pid).amount, 1000000, '선택하지 않으면 건드리지 않는다');
  const r = await J(await ap(env, pid, [], { planMode: 'merge' }, { plan })); assert.equal(r.result.plan, 2);
  const get = (c) => env.DB.sqlite.prepare(`SELECT amount FROM ledger_plan WHERE periodId=? AND category=?`).get(pid, c)?.amount;
  assert.deepEqual([get('식비'), get('간식비'), get('강사비')], [2500000, 200000, 400000]);
});

test('많은 줄(150줄)도 한 번에 가져온다(묶음 처리) — 일부가 잘못돼도 나머지는 정상, 3000줄을 넘으면 거부', async () => {
  const env = mkEnv(), pid = await newP(env), calls = [];
  const rows = Array.from({ length: 150 }, (_, i) => R(4 + i, `2030-03-${String((i % 28) + 1).padStart(2, '0')}`, 'expense', 1000 + i, '식비', '줄 ' + i)); rows.push(R(500, '2030-03-01', 'expense', 'bad', '식비', '잘못된 줄'));
  const wrapped = { ...env, DB: { ...env.DB, batch: async (l) => { calls.push(l.length); return env.DB.batch(l); }, prepare: env.DB.prepare.bind(env.DB), sqlite: env.DB.sqlite } };
  const r = await J(await call(Imp, 'onRequestPost', wrapped, U.fin, { body: { action: 'apply', periodId: pid, rows, options: {} } })); assert.equal(r.result.added, 150); assert.equal(r.result.skipped, 1);
  assert.deepEqual(calls, [50, 50, 50], '50개씩 3번에 나눠 보낸다'); assert.equal(live(env, pid).length, 150);
  assert.equal((await pv(env, pid, Array.from({ length: 3001 }, (_, i) => R(i, '2030-01-01', 'expense', 1, '식비')))).status, 400);
});
