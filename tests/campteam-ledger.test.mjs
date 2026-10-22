import assert from 'node:assert/strict';
import test from 'node:test';
import * as Cats from '../functions/api/campteam/ledger-categories.js';
import * as Periods from '../functions/api/campteam/ledger-periods.js';
import * as Ledger from '../functions/api/campteam/ledger.js';
import * as Summary from '../functions/api/campteam/ledger-summary.js';
import * as Plan from '../functions/api/campteam/ledger-plan.js';
import * as Members from '../functions/api/campteam/members.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();
const mk = () => makeEnv(fakeD1());
const P1 = 'lp-2027h1', P0 = 'lp-2026h2';
const newPeriod = async (env, o = {}) => J(await call(Periods, 'onRequestPost', env, U.dir, { body: { name: '2030 상반기', startDate: '2030-01-01', endDate: '2030-06-30', ...o } }));
const add = (env, o, who = U.fin) => call(Ledger, 'onRequestPost', env, who, { body: { periodId: P1, entryDate: '2027-03-01', kind: 'expense', amount: '10,000', category: '식비', description: 'x', ...o } });

test('장부 권한: 월코 재정(조회 전용)은 보기만, 일반 팀원도 보기만, 명단에 없으면 아무것도 못 봄, 캠프 재정·디렉터는 같은 권한', async () => {
  const env = mk();
  const GET = [['categories', Cats, ''], ['periods', Periods, ''], ['entries', Ledger, `?periodId=${P1}`], ['summary', Summary, `?periodId=${P1}`], ['plan', Plan, `?periodId=${P1}`]];
  for (const [n, mod, qs] of GET) {
    assert.equal((await call(mod, 'onRequestGet', env, null, { qs })).status, 401, n);
    assert.equal((await call(mod, 'onRequestGet', env, U.view, { qs })).status, 403, n + ' 명단에 없음');
    for (const who of [U.tre, U.mem, U.fin, U.dir, U.admin]) assert.equal((await call(mod, 'onRequestGet', env, who, { qs })).status, 200, n);
  }
  const body = { periodId: P1, entryDate: '2027-03-01', kind: 'expense', amount: '1000', category: '식비' };
  for (const who of [U.view, U.tre, U.mem]) {
    assert.equal((await call(Ledger, 'onRequestPost', env, who, { body })).status, 403, '거래 쓰기 ' + who);
    assert.equal((await call(Cats, 'onRequestPost', env, who, { body: { kind: 'expense', name: 'Z' } })).status, 403);
    assert.equal((await call(Plan, 'onRequestPut', env, who, { body: { periodId: P1, items: [] } })).status, 403);
    assert.equal((await call(Periods, 'onRequestPost', env, who, { body: { name: 'n', startDate: '2031-01-01', endDate: '2031-06-30' } })).status, 403, '기간 만들기 ' + who);
  }
  for (const who of [U.fin, U.dir, U.admin]) assert.equal((await call(Ledger, 'onRequestPost', env, who, { body })).status, 201, '거래 쓰기 ' + who);
  assert.equal((await call(Periods, 'onRequestPost', env, U.fin, { body: { name: '재정이 만든 기간', startDate: '2031-01-01', endDate: '2031-06-30' } })).status, 201, '캠프 재정 담당도 기간을 만든다');
});

test('역할 추가: 명단에 디렉터·월코 재정(조회) 역할을 줄 수 있고 그 권한이 적용된다', async () => {
  const env = mk();
  for (const role of ['director', 'treasurer', 'finance']) assert.equal((await call(Members, 'onRequestPost', env, U.admin, { body: { email: `new-${role}@wolko.org`, name: role, role } })).status, 200, role);
  assert.equal((await call(Members, 'onRequestPost', env, U.admin, { body: { email: 'x@wolko.org', role: 'boss' } })).status, 400);
  assert.equal((await call(Members, 'onRequestPost', env, U.dir, { body: { email: 'y@wolko.org', role: 'member' } })).status, 403, '명단 관리는 관리자만');
  const me = await import('../functions/api/campteam/me.js');
  const who = async (email) => J(await me.onRequestGet({ env, request: await req(email, { url: 'http://localhost:8788/api/campteam/me' }) }));
  assert.equal((await who('new-treasurer@wolko.org')).perms.moneyWrite, false); assert.equal((await who('new-treasurer@wolko.org')).perms.moneyRead, true);
  assert.equal((await who('new-director@wolko.org')).perms.moneyAdmin, true);
});

test('항목 목록: 기본 항목, 추가·이름 바꾸기(쓴 거래도 같이)·사용 안 함·삭제 규칙', async () => {
  const env = mk();
  const l = await J(await call(Cats, 'onRequestGet', env, U.fin));
  assert.deepEqual(l.income.map((c) => c.name), ['캠프비', '이월금', '후원금', '기타수입']);
  assert.deepEqual(l.expense.map((c) => c.name), ['식비', '간식비', '프로그램활동비', '영어활동비', '숙박시설비', '물품구입비', '스텝관리비', '강사비', '기타']);
  assert.equal((await call(Cats, 'onRequestPost', env, U.fin, { body: { kind: 'expense', name: '식비' } })).status, 409, '같은 이름은 안 됨');
  const made = await call(Cats, 'onRequestPost', env, U.fin, { body: { kind: 'expense', name: '교통비' } }); assert.equal(made.status, 201); const { id } = await J(made);
  assert.equal((await add(env, { category: '교통비' })).status, 201);
  assert.equal((await add(env, { category: '없는항목' })).status, 400, '목록에 없는 항목은 거래에 못 쓴다');
  // 쓴 항목은 지울 수 없고, 이름을 바꾸면 거래에도 반영
  assert.equal((await call(Cats, 'onRequestDelete', env, U.fin, { qs: `?id=${id}` })).status, 409);
  assert.equal((await call(Cats, 'onRequestPatch', env, U.fin, { qs: `?id=${id}`, body: { name: '식비' } })).status, 409);
  assert.equal((await call(Cats, 'onRequestPatch', env, U.fin, { qs: `?id=${id}`, body: { name: '차량·교통비' } })).status, 200);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_entries WHERE category='차량·교통비'`).get().n, 1);
  // 사용 안 함 → 새 거래에는 못 쓰고, 이미 쓴 거래는 그대로. 다시 켜기
  await call(Cats, 'onRequestPatch', env, U.fin, { qs: `?id=${id}`, body: { active: false } });
  assert.equal((await add(env, { category: '차량·교통비' })).status, 400);
  assert.equal((await call(Cats, 'onRequestPost', env, U.fin, { body: { kind: 'expense', name: '차량·교통비' } })).status, 201, '같은 이름을 다시 추가하면 다시 켜진다');
  assert.equal((await add(env, { category: '차량·교통비' })).status, 201);
  // 안 쓴 항목은 지울 수 있다
  const unused = await J(await call(Cats, 'onRequestPost', env, U.fin, { body: { kind: 'income', name: '바자회' } }));
  assert.equal((await call(Cats, 'onRequestDelete', env, U.fin, { qs: `?id=${unused.id}` })).status, 200);
  assert.equal((await call(Cats, 'onRequestPost', env, U.fin, { body: { kind: 'weird', name: 'x' } })).status, 400);
});

test('거래: 입력 검사, 금액 쉼표, 기간 밖 날짜, 수정·삭제(복구 가능한 삭제 표시), 줄마다 잔액', async () => {
  const env = mk();
  for (const [bad, re] of [[{ kind: 'x' }, /구분/], [{ entryDate: '2027-13-40' }, /날짜/], [{ entryDate: '2028-01-01' }, /기간/], [{ amount: '0' }, /금액/], [{ amount: 'abc' }, /금액/], [{ amount: '-5' }, /금액/], [{ category: '' }, /항목/], [{ campId: 'nope' }, /캠프/]]) {
    const r = await add(env, bad); assert.equal(r.status, 400, JSON.stringify(bad)); assert.match((await J(r)).error, re);
  }
  const ok = await J(await add(env, { amount: '1,234,567', entryDate: '2027-02-10', kind: 'income', category: '캠프비' })); assert.ok(ok.id);
  const list = await J(await call(Ledger, 'onRequestGet', env, U.tre, { qs: `?periodId=${P1}` }));
  const bal = list.items.map((e) => e.balance), last = list.items.at(-1);
  assert.equal(list.items[0].category, '이월금', '이월금이 맨 앞(1월 1일)'); assert.equal(bal[0], 1200000);
  // 잔액 = 앞의 줄들의 수입-지출 누적
  let run = 0; for (const e of list.items) { run += e.kind === 'income' ? e.amount : -e.amount; assert.equal(e.balance, run); }
  assert.equal(last.balance, run);
  assert.equal(list.items.find((e) => e.id === ok.id).amount, 1234567);
  // 필터
  const q = async (s) => J(await call(Ledger, 'onRequestGet', env, U.fin, { qs: `?periodId=${P1}&${s}` }));
  assert.ok((await q('kind=income')).items.every((e) => e.kind === 'income'));
  assert.ok((await q('month=2027-01')).items.every((e) => e.entryDate.startsWith('2027-01')));
  assert.ok((await q('q=숙소')).items.length >= 1); assert.equal((await q('category=식비')).items.every((e) => e.category === '식비'), true);
  // 수정·삭제
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.dir, { qs: `?id=${ok.id}`, body: { amount: '2,000,000', description: '고침' } })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT amount FROM ledger_entries WHERE id=?').get(ok.id).amount, 2000000);
  assert.equal((await call(Ledger, 'onRequestDelete', env, U.fin, { qs: `?id=${ok.id}` })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT deletedAt FROM ledger_entries WHERE id=?').get(ok.id).deletedAt !== null, true, '삭제 표시만 한다');
  assert.equal((await call(Ledger, 'onRequestDelete', env, U.fin, { qs: `?id=${ok.id}` })).status, 404);
  // 이월금 줄은 못 고치고 못 지운다
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.fin, { qs: '?id=le-carry', body: { amount: '1' } })).status, 409);
  assert.equal((await call(Ledger, 'onRequestDelete', env, U.fin, { qs: '?id=le-carry' })).status, 409);
  // 변경 기록이 남는다
  assert.ok(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM audit_log WHERE entity='ledger_entry'`).get().n >= 3);
});

test('경비 리포트에서 온 줄은 금액·날짜를 못 고치고 항목·메모만 고칠 수 있다', async () => {
  const env = mk(), now = new Date().toISOString();
  env.DB.sqlite.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,source,externalKey,needsReview,createdAt,updatedAt) VALUES ('le-exp',?1,'2027-03-03','expense',55000,'기타','리포트에서 옴','expense','exp:r1:0',1,?2,?2)`).run(P1, now);
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.fin, { qs: '?id=le-exp', body: { amount: '1' } })).status, 409);
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.fin, { qs: '?id=le-exp', body: { entryDate: '2027-03-04' } })).status, 409);
  assert.equal((await call(Ledger, 'onRequestPatch', env, U.fin, { qs: '?id=le-exp', body: { category: '식비', note: '점심' } })).status, 200);
  const row = env.DB.sqlite.prepare('SELECT * FROM ledger_entries WHERE id=?').get('le-exp'); assert.equal(row.category, '식비'); assert.equal(row.amount, 55000); assert.equal(row.needsReview, 0, '분류를 고치면 확인 필요 표시가 사라진다');
});

test('기간: 만들기 검사(날짜·겹침), 이름·날짜 수정, 지우기 규칙', async () => {
  const env = mk();
  const bad = (o) => call(Periods, 'onRequestPost', env, U.dir, { body: { name: 'n', startDate: '2030-01-01', endDate: '2030-06-30', ...o } });
  assert.equal((await bad({ name: '' })).status, 400); assert.equal((await bad({ startDate: '2030-07-01' })).status, 400); assert.equal((await bad({ startDate: 'x' })).status, 400);
  assert.equal((await bad({ startDate: '2027-05-01', endDate: '2027-08-01' })).status, 409, '기존 기간과 겹침');
  const a = await newPeriod(env); assert.ok(a.id);
  assert.equal((await bad({})).status, 409, '같은 날짜로 또 만들 수 없다');
  const list = (await J(await call(Periods, 'onRequestGet', env, U.tre))).periods;
  assert.deepEqual(list.map((p) => p.id), [a.id, P1, P0], '최근 기간이 위');
  assert.equal(list.find((p) => p.id === P1).balance, 1200000 + 2400000 + 500000 - 245000 - 3000000 - 600000);
  assert.equal((await call(Periods, 'onRequestPatch', env, U.dir, { qs: `?id=${a.id}`, body: { name: '2030 H1', endDate: '2030-05-31' } })).status, 200);
  assert.equal((await call(Periods, 'onRequestPatch', env, U.dir, { qs: `?id=${a.id}`, body: { startDate: '2031-01-01' } })).status, 400, '시작이 끝보다 늦음');
  // 거래가 있는 기간은 날짜를 줄여 거래를 밖으로 내보낼 수 없다
  await call(Ledger, 'onRequestPost', env, U.dir, { body: { periodId: a.id, entryDate: '2030-05-20', kind: 'income', amount: '1000', category: '캠프비' } });
  assert.equal((await call(Periods, 'onRequestPatch', env, U.dir, { qs: `?id=${a.id}`, body: { endDate: '2030-04-30' } })).status, 409);
  assert.equal((await call(Periods, 'onRequestDelete', env, U.dir, { qs: `?id=${a.id}` })).status, 409, '거래가 있으면 못 지움');
  const empty = await newPeriod(env, { name: '빈 기간', startDate: '2032-01-01', endDate: '2032-06-30' });
  assert.equal((await call(Periods, 'onRequestDelete', env, U.dir, { qs: `?id=${empty.id}` })).status, 200);
  assert.equal((await call(Periods, 'onRequestDelete', env, U.dir, { qs: `?id=${P0}` })).status, 409, '마감된 기간은 못 지움');
});

test('마감·이월: 남은 금액이 다음 기간의 이월금이 되고, 마감된 기간은 잠기며, 다시 열면 이월금이 거둬진다', async () => {
  const env = mk();
  const a = await newPeriod(env), b = await newPeriod(env, { name: '2030 하반기', startDate: '2030-07-01', endDate: '2030-12-31' });
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: a.id, entryDate: '2030-01-10', kind: 'income', amount: '5,000,000', category: '캠프비' } });
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: a.id, entryDate: '2030-02-10', kind: 'expense', amount: '1,800,000', category: '식비' } });
  const close = (body) => call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: a.id, ...body } });
  assert.equal((await close({})).status, 400, '다음 기간을 고르거나 "넘기지 않음"을 골라야 한다');
  assert.equal((await close({ nextPeriodId: a.id })).status, 400, '같은 기간으로는 못 넘김');
  assert.equal((await close({ nextPeriodId: P0 })).status, 409, '이미 마감된 기간으로는 못 넘김');
  assert.equal((await close({ nextPeriodId: 'nope' })).status, 400);
  assert.equal((await call(Periods, 'onRequestPost', env, U.mem, { body: { action: 'close', id: a.id, nextPeriodId: b.id } })).status, 403, '일반 팀원은 마감 못 함');
  const r = await close({ nextPeriodId: b.id }); assert.equal(r.status, 200); assert.equal((await J(r)).closingBalance, 3200000);
  // 다음 기간에 이월금 줄이 생긴다
  const carry = env.DB.sqlite.prepare(`SELECT * FROM ledger_entries WHERE periodId=? AND source='carry' AND deletedAt IS NULL`).get(b.id);
  assert.equal(carry.amount, 3200000); assert.equal(carry.kind, 'income'); assert.equal(carry.category, '이월금'); assert.equal(carry.entryDate, '2030-07-01');
  assert.equal((await J(await call(Periods, 'onRequestGet', env, U.fin))).periods.find((p) => p.id === b.id).balance, 3200000);
  // 마감된 기간은 잠긴다 (거래·기간 예산·기간 정보)
  assert.equal((await call(Ledger, 'onRequestPost', env, U.dir, { body: { periodId: a.id, entryDate: '2030-03-01', kind: 'expense', amount: '1', category: '식비' } })).status, 409);
  assert.equal((await call(Plan, 'onRequestPut', env, U.dir, { body: { periodId: a.id, items: [] } })).status, 409);
  assert.equal((await call(Periods, 'onRequestPatch', env, U.dir, { qs: `?id=${a.id}`, body: { name: 'x' } })).status, 409);
  assert.equal((await close({ nextPeriodId: b.id })).status, 409, '이미 마감');
  // 다음 기간이 마감되면 이전 기간은 다시 못 연다
  const c = await newPeriod(env, { name: '2031', startDate: '2031-01-01', endDate: '2031-12-31' });
  await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: b.id, nextPeriodId: c.id } });
  assert.equal(env.DB.sqlite.prepare(`SELECT amount FROM ledger_entries WHERE periodId=? AND source='carry' AND deletedAt IS NULL`).get(c.id).amount, 3200000, '이월이 이어진다');
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'reopen', id: a.id } })).status, 409);
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'reopen', id: b.id } })).status, 200);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_entries WHERE periodId=? AND source='carry' AND deletedAt IS NULL`).get(c.id).n, 0, '다시 열면 넘어간 이월금이 거둬진다');
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'reopen', id: a.id } })).status, 200);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM ledger_entries WHERE periodId=? AND source='carry' AND deletedAt IS NULL`).get(b.id).n, 0);
  // 수정한 뒤 다시 마감하면 새 금액으로 이월
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: a.id, entryDate: '2030-03-01', kind: 'expense', amount: '200,000', category: '식비' } });
  await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: a.id, nextPeriodId: b.id } });
  assert.equal(env.DB.sqlite.prepare(`SELECT amount FROM ledger_entries WHERE periodId=? AND source='carry' AND deletedAt IS NULL`).get(b.id).amount, 3000000);
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'reopen', id: P1 } })).status, 409, '열려 있는 기간');
});

test('마감 시 다음 기간을 같이 만들거나, 적자는 "이월 적자" 지출로 넘기거나, 넘기지 않을 수 있다', async () => {
  const env = mk();
  const a = await newPeriod(env);
  await call(Ledger, 'onRequestPost', env, U.fin, { body: { periodId: a.id, entryDate: '2030-01-10', kind: 'expense', amount: '700,000', category: '식비' } });
  const r = await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: a.id, next: { name: '2030 하반기', startDate: '2030-07-01', endDate: '2030-12-31' } } });
  assert.equal(r.status, 200); const next = (await J(r)).nextPeriodId; assert.ok(next);
  const carry = env.DB.sqlite.prepare(`SELECT * FROM ledger_entries WHERE periodId=? AND source='carry'`).get(next);
  assert.equal(carry.kind, 'expense'); assert.equal(carry.amount, 700000); assert.equal(carry.category, '이월 적자');
  assert.ok(env.DB.sqlite.prepare(`SELECT 1 FROM ledger_categories WHERE kind='expense' AND name='이월 적자'`).get(), '필요한 항목이 자동으로 생긴다');
  const bad = await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: next, next: { name: 'x', startDate: '2030-12-01', endDate: '2031-03-01' } } });
  assert.equal(bad.status, 409, '겹치는 다음 기간은 만들어지지 않는다'); assert.equal(env.DB.sqlite.prepare('SELECT status FROM ledger_periods WHERE id=?').get(next).status, 'open', '실패하면 마감도 되지 않는다');
  const none = await newPeriod(env, { name: '독립', startDate: '2033-01-01', endDate: '2033-06-30' });
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'close', id: none.id, noCarry: true } })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT carryPeriodId FROM ledger_periods WHERE id=?').get(none.id).carryPeriodId, null);
  assert.equal((await call(Periods, 'onRequestPost', env, U.dir, { body: { action: 'reopen', id: none.id } })).status, 200);
});

test('요약: 수입·지출·잔액, 항목별 예산 대비 실제(지출은 남은 예산·수입은 목표 대비), 월별 흐름, 편집 가능 여부', async () => {
  const env = mk();
  const s = await J(await call(Summary, 'onRequestGet', env, U.dir, { qs: `?periodId=${P1}` }));
  assert.equal(s.totals.income, 1200000 + 2400000 + 500000); assert.equal(s.totals.expense, 245000 + 3000000 + 600000); assert.equal(s.totals.balance, 4100000 - 3845000);
  assert.deepEqual(s.opening, { kind: 'income', amount: 1200000 });
  const food = s.byCategory.find((c) => c.kind === 'expense' && c.category === '식비'); assert.deepEqual([food.plan, food.actual, food.diff], [1800000, 600000, 1200000]);
  const camp = s.byCategory.find((c) => c.kind === 'income' && c.category === '캠프비'); assert.deepEqual([camp.plan, camp.actual, camp.diff], [5000000, 2400000, -2600000], '수입은 목표에 못 미치면 음수');
  assert.equal(s.byCategory.find((c) => c.category === '간식비').actual, 0, '안 쓴 활성 항목도 보인다');
  assert.equal(s.plan.expense, 1800000 + 4000000 + 500000 + 400000); assert.equal(s.plan.income, 6000000); assert.equal(s.plan.expectedBalance, 6000000 - 6700000);
  assert.deepEqual(s.monthly.map((m) => m.month), ['2027-01', '2027-02']); assert.equal(s.monthly[0].expense, 245000 + 3000000 + 600000);
  assert.equal(s.canEdit, true); assert.equal(s.canAdmin, true);
  const t = await J(await call(Summary, 'onRequestGet', env, U.tre, { qs: `?periodId=${P1}` })); assert.equal(t.canEdit, false); assert.equal(t.canAdmin, false);
  const old = await J(await call(Summary, 'onRequestGet', env, U.dir, { qs: `?periodId=${P0}` })); assert.equal(old.canEdit, false, '마감된 기간은 편집 불가'); assert.equal(old.period.closingBalance, 1200000);
  assert.equal((await call(Summary, 'onRequestGet', env, U.dir, { qs: '?periodId=nope' })).status, 404);
  // 사용 안 함 + 안 쓴 항목은 숨겨진다
  const gone = env.DB.sqlite.prepare(`SELECT id FROM ledger_categories WHERE name='기타수입'`).get(); await call(Cats, 'onRequestPatch', env, U.fin, { qs: `?id=${gone.id}`, body: { active: false } });
  assert.ok(!(await J(await call(Summary, 'onRequestGet', env, U.dir, { qs: `?periodId=${P1}` }))).byCategory.some((c) => c.category === '기타수입'));
});

test('기간 예산: 저장은 통째로 바뀌고, 0원·빈 칸은 빠지며, 이상한 값·목록에 없는 항목은 거부, 지난 기간 예산 가져오기는 비어 있을 때만', async () => {
  const env = mk();
  const put = (items, who = U.fin, periodId = P1) => call(Plan, 'onRequestPut', env, who, { body: { periodId, items } });
  assert.equal((await put([{ kind: 'expense', category: '식비', amount: '2,000,000' }, { kind: 'expense', category: '간식비', amount: '' }, { kind: 'income', category: '캠프비', amount: '0' }])).status, 200);
  assert.deepEqual((await J(await call(Plan, 'onRequestGet', env, U.tre, { qs: `?periodId=${P1}` }))).items, [{ kind: 'expense', category: '식비', amount: 2000000 }]);
  assert.equal((await put([{ kind: 'expense', category: '식비', amount: 'abc' }])).status, 400);
  assert.equal((await put([{ kind: 'expense', category: '식비', amount: '-1' }])).status, 400);
  assert.equal((await put([{ kind: 'expense', category: '없음', amount: '1' }])).status, 400);
  assert.equal((await put([{ kind: 'expense', category: '식비', amount: '1' }, { kind: 'expense', category: '식비', amount: '2' }])).status, 400, '중복');
  assert.equal((await put([{ kind: 'weird', category: '식비', amount: '1' }])).status, 400);
  assert.equal((await put([])).status, 200); assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM ledger_plan WHERE periodId=?').get(P1).n, 0);
  const a = await newPeriod(env);
  const copy = (id, from) => call(Plan, 'onRequestPost', env, U.fin, { body: { periodId: id, fromPeriodId: from } });
  await put([{ kind: 'expense', category: '식비', amount: '5' }], U.fin, P1);
  assert.equal((await copy(a.id, P1)).status, 200); assert.equal(env.DB.sqlite.prepare('SELECT amount FROM ledger_plan WHERE periodId=?').get(a.id).amount, 5);
  assert.equal((await copy(a.id, P1)).status, 409, '이미 있으면 덮어쓰지 않는다');
});
