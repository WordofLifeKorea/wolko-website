import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyModel, newRow, sanitizeModel, peopleOf, timesOf, parts, rowAmount, evaluate, breakEven, feeHeadcount, toPlan, template, WHO, PER, mealPlan, mealCounts } from '../public/portal/campteam/calc-core.js';
import * as Calc from '../functions/api/campteam/ledger-calc.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const R = (o) => ({ ...newRow(o.kind || 'fixed'), ...o });
// 캠퍼 70명(얼리버드 60 + 일반 10) + 스태프 30명, 4일 3박. 모든 금액은 가짜.
const model = () => ({ vars: { campers: 70, staff: 30, days: 4, nights: 3 }, contingencyPct: 10, includeOpening: false,
  income: [R({ label: '캠프비 (얼리버드)', category: '캠프비', kind: 'unit', unit: 80000, who: 'direct', qty: 60 }), R({ label: '캠프비 (일반)', category: '캠프비', kind: 'unit', unit: 90000, who: 'direct', qty: 10 }), R({ label: '후원', category: '후원금', amount: 1000000 })],
  expense: [R({ label: '식비', category: '식비', kind: 'unit', unit: 10000, who: 'all', per: 'days', mult: 3 }), R({ label: '숙박', category: '숙박시설비', kind: 'unit', unit: 30000, who: 'all', per: 'nights' }), R({ label: '강사비', category: '강사비', amount: 400000 }), R({ label: '물품', category: '', amount: 500000 })] });

test('질문하신 계산: 얼리버드 80,000원 × 60명 = 4,800,000원 (인원은 직접 입력한 60명만 곱해진다)', () => {
  const v = model().vars, early = model().income[0];
  assert.equal(rowAmount(early, v), 4800000); assert.deepEqual(parts(early, v), { fixed: false, unit: 80000, people: 60, times: 1, mult: 1, per: 'none', meal: null, total: 4800000 });
  assert.equal(rowAmount(model().income[1], v), 900000);
  assert.equal(evaluate(model()).income, 4800000 + 900000 + 1000000);
});
test('인원·반복 기준: 직접·캠퍼·스태프·전체, 한 번만·일수·숙박 수, 하루 횟수는 일수 반복일 때만', () => {
  const v = { campers: 70, staff: 30, days: 4, nights: 3 };
  assert.deepEqual(WHO.map((who) => peopleOf({ who, qty: 7 }, v)), [7, 70, 30, 100]); assert.deepEqual(PER.map((per) => timesOf({ per }, v)), [1, 4, 3, 10], '끼니: 4일, 첫날 점심부터 마지막 날 점심까지 = 10끼');
  assert.equal(rowAmount(R({ kind: 'unit', unit: 10000, who: 'all', per: 'days', mult: 3 }), v), 10000 * 100 * 4 * 3, '식비: 1끼 단가 × 전체 × 일수 × 하루 끼니');
  assert.equal(rowAmount(R({ kind: 'unit', unit: 30000, who: 'all', per: 'nights', mult: 9 }), v), 30000 * 100 * 3, '숙박에는 하루 횟수를 곱하지 않는다(mult 무시)');
  assert.equal(rowAmount(R({ kind: 'unit', unit: 5000, who: 'staff', per: 'none', mult: 9 }), v), 150000);
  assert.equal(rowAmount(R({ kind: 'fixed', amount: 400000, unit: 99, qty: 99 }), v), 400000);
});
test('계산: 수입·지출·예비비·남는 금액, 1인당 비용·평균 캠프비, 항목별 합계, 이월금 포함 옵션', () => {
  const e = evaluate(model());
  assert.equal(e.income, 6700000); assert.equal(e.expense, 12000000 + 9000000 + 400000 + 500000); assert.equal(e.contingency, Math.round(e.expense * 0.1)); assert.equal(e.net, e.income - e.expense - e.contingency);
  assert.equal(e.costPerCamper, Math.round((e.expense + e.contingency) / 70)); assert.equal(e.feePerCamper, Math.round(5700000 / 70));
  assert.deepEqual(e.byCategory.income, { 캠프비: 5700000, 후원금: 1000000 }); assert.equal(e.byCategory.expense['식비'], 12000000); assert.equal(e.byCategory.expense['물품'], 500000);
  assert.equal(evaluate({ ...model(), includeOpening: true }, { opening: 1200000 }).net, e.net + 1200000); assert.equal(evaluate(model(), { opening: 1200000 }).net, e.net);
});
test('캠프비 인원 확인: 얼리버드 + 일반 인원 합이 캠퍼 수와 같은지', () => {
  assert.deepEqual(feeHeadcount(model()), { rows: 2, total: 70 });
  const m = model(); m.income[1].qty = 5; assert.equal(feeHeadcount(m).total, 65);
});
test('손익분기: 필요한 평균 캠프비, 캠프비 배율(같은 비율로 올리면 0), 캠퍼 전체에 곱하는 캠프비일 때만 필요한 캠퍼 수', () => {
  const m = model(), be = breakEven(m), e = evaluate(m);
  assert.equal(be.avgNow, Math.round(5700000 / 70)); assert.equal(be.avgNeeded, Math.ceil((e.expense + e.contingency - 1000000) / 70));
  const t = be.feeScale, scaled = { ...m, income: m.income.map((r) => (r.label.startsWith('캠프비') ? { ...r, unit: r.unit * t } : r)) }; assert.ok(Math.abs(evaluate(scaled).net) <= 100 * 100, '배율을 적용하면 거의 0');
  assert.deepEqual(be.fees.map((f) => f.label), ['캠프비 (얼리버드)', '캠프비 (일반)']); assert.ok(be.fees.every((f) => f.neededRounded % 1000 === 0 && f.neededRounded >= f.needed));
  assert.equal(be.camperLinked, false); assert.equal(be.campers, null, '인원을 직접 입력했으면 캠퍼 수 손익분기는 계산하지 않는다');
  const linked = { ...m, income: [R({ label: '캠프비', category: '캠프비', kind: 'unit', unit: 250000, who: 'campers' }), m.income[2]] }, bl = breakEven(linked);
  const at = (n) => evaluate({ ...linked, vars: { ...linked.vars, campers: n } }).net; assert.equal(bl.camperLinked, true); assert.ok(bl.campers != null && at(bl.campers) >= 0 && (bl.campers === 0 || at(bl.campers - 1) < 0));
  assert.equal(breakEven({ ...emptyModel() }).feeScale, null);
});
test('기간 예산으로 변환: 분류가 있는 줄만 항목별 합계로', () => {
  const plan = toPlan(model()); const get = (k, c) => plan.find((p) => p.kind === k && p.category === c)?.amount;
  assert.equal(get('expense', '식비'), 12000000); assert.equal(get('income', '캠프비'), 5700000); assert.equal(plan.some((p) => p.category === '' || p.category === '(미분류)'), false);
});
test('입력 정리: 이상한 값은 안전한 값으로, 형식이 틀리면 거부, 뼈대는 통과, 예전 저장 형식(basis)도 새 형식으로 읽는다', () => {
  const s = sanitizeModel({ vars: { campers: '60', staff: -5, days: 999, nights: 'x' }, contingencyPct: 99, income: [{ label: '<b>x</b>'.repeat(30), kind: 'weird', who: 'nope', per: '??', amount: '1,000,000원', unit: 'abc', qty: -3, mult: 1e9, evil: 1 }], expense: [] }).model;
  assert.deepEqual(s.vars, { campers: 60, staff: 0, days: 60, nights: 0, startMeal: 'lunch', endMeal: 'lunch', edits: {} }); assert.equal(s.contingencyPct, 50); const r = s.income[0];
  assert.deepEqual([r.kind, r.who, r.per, r.unit, r.qty, r.mult, 'evil' in r], ['fixed', 'direct', 'none', 0, 0, 1000, false]); assert.equal(r.label.length, 60); assert.equal(r.amount, 1000000);
  for (const bad of [null, [], 'x', { income: 'x' }, { income: [null] }, { expense: new Array(61).fill({}) }]) assert.ok(sanitizeModel(bad).error, JSON.stringify(bad)?.slice(0, 30));
  const t = sanitizeModel(template()); assert.ok(t.model && t.model.income.length === 3 && t.model.expense.length === 8); assert.equal(evaluate(t.model).net, 0, '뼈대는 금액이 모두 0');
  const old = sanitizeModel({ vars: { campers: 70, staff: 30, days: 4, nights: 3 }, income: [{ kind: 'unit', unit: 80000, basis: 'campers', mult: 60 }, { kind: 'unit', unit: 100, basis: 'campersPct', qty: 50 }], expense: [{ kind: 'unit', unit: 10000, basis: 'allDays', mult: 3 }, { kind: 'unit', unit: 30000, basis: 'allNights' }] }).model;
  assert.deepEqual(old.income.map((x) => [x.who, x.per, x.qty]), [['campers', 'none', 0], ['direct', 'none', 35]]); assert.deepEqual(old.expense.map((x) => [x.who, x.per]), [['all', 'days'], ['all', 'nights']]);
  assert.equal(rowAmount(old.income[0], old.vars), 80000 * 70, '예전 저장본의 엉뚱한 배수(60)는 더 이상 곱해지지 않는다');
});

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (fn, env, who, { qs = '', body } = {}) => Calc[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
test('시나리오 저장 API: 조회는 금액 조회 권한자, 저장·수정·삭제는 캠프 재정·디렉터, 모양 검사와 개수 제한, 삭제는 복구 가능한 표시', async () => {
  const env = makeEnv(fakeD1()), body = { name: '캠프비 9만원 안', model: model() };
  assert.equal((await call('onRequestGet', env, null)).status, 401); assert.equal((await call('onRequestGet', env, U.view)).status, 403);
  for (const who of [U.tre, U.mem, U.view]) assert.equal((await call('onRequestPost', env, who, { body })).status, 403, who);
  const made = await call('onRequestPost', env, U.fin, { body }); assert.equal(made.status, 201); const { id } = await made.json();
  for (const who of [U.tre, U.mem, U.dir]) { const list = (await (await call('onRequestGet', env, who)).json()).items; assert.equal(list.length, 1); assert.equal(list[0].name, '캠프비 9만원 안'); assert.equal(list[0].model.vars.campers, 70); }
  assert.equal((await call('onRequestPost', env, U.fin, { body: { name: '', model: model() } })).status, 400); assert.equal((await call('onRequestPost', env, U.fin, { body: { name: 'x', model: 'bad' } })).status, 400);
  assert.equal((await call('onRequestPost', env, U.fin, { body: { name: 'x', model: model(), campId: 'nope' } })).status, 400); assert.equal((await call('onRequestPost', env, U.fin, { body: { name: 'x', model: model(), periodId: 'lp-2027h1', campId: 'camp-w27' } })).status, 201);
  const m2 = model(); m2.vars.campers = 80; assert.equal((await call('onRequestPatch', env, U.dir, { qs: `?id=${id}`, body: { model: m2, name: '수정' } })).status, 200); assert.equal(JSON.parse(env.DB.sqlite.prepare('SELECT model FROM calc_scenarios WHERE id=?').get(id).model).vars.campers, 80);
  assert.equal((await call('onRequestPatch', env, U.tre, { qs: `?id=${id}`, body: { name: 'x' } })).status, 403); assert.equal((await call('onRequestPatch', env, U.fin, { qs: '?id=nope', body: { name: 'x' } })).status, 404);
  assert.equal((await call('onRequestDelete', env, U.mem, { qs: `?id=${id}` })).status, 403); assert.equal((await call('onRequestDelete', env, U.fin, { qs: `?id=${id}` })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT deletedAt FROM calc_scenarios WHERE id=?').get(id).deletedAt !== null, true);
  assert.equal((await (await call('onRequestGet', env, U.fin)).json()).items.some((x) => x.id === id), false);
  for (let i = 0; i < 70; i++) { const r = await call('onRequestPost', env, U.fin, { body }); if (r.status === 409) { assert.ok(i >= 50, '60개 제한'); return; } }
  assert.fail('개수 제한이 동작하지 않음');
});

test('끼니 일정: 2박 3일 첫날 점심부터 마지막 날 점심까지 = 7끼 (아침 2·점심 3·저녁 2)', () => {
  const v = { campers: 70, staff: 30, days: 3, nights: 2, startMeal: 'lunch', endMeal: 'lunch', edits: {} };
  assert.deepEqual(mealPlan(v), [{ day: 1, b: 0, l: 1, d: 1, s: 1 }, { day: 2, b: 1, l: 1, d: 1, s: 1 }, { day: 3, b: 1, l: 1, d: 0, s: 1 }]);
  assert.deepEqual(mealCounts(v), { breakfast: 2, lunch: 3, dinner: 2, snack: 3, main: 7 });
  const food = R({ kind: 'unit', unit: 10000, who: 'all', per: 'meals', meal: 'main' });
  assert.equal(timesOf(food, v), 7); assert.equal(rowAmount(food, v), 10000 * 100 * 7); assert.equal(parts(food, v).meal, 'main');
  assert.equal(rowAmount(R({ kind: 'unit', unit: 5000, who: 'campers', per: 'meals', meal: 'lunch' }), v), 5000 * 70 * 3);
  assert.equal(rowAmount(R({ kind: 'unit', unit: 2000, who: 'all', per: 'meals', meal: 'snack' }), v), 2000 * 100 * 3);
  assert.equal(rowAmount(R({ kind: 'unit', unit: 10000, who: 'all', per: 'days', mult: 3 }), v), 10000 * 100 * 3 * 3, '예전 방식(일수 × 하루 3끼)은 그대로 계산돼요');
});
test('끼니 일정: 다른 시작·끝, 하루짜리 캠프, 칸을 사람이 고치면 자동 계산보다 우선', () => {
  assert.equal(mealCounts({ days: 3, startMeal: 'breakfast', endMeal: 'dinner', edits: {} }).main, 9);
  assert.equal(mealCounts({ days: 3, startMeal: 'dinner', endMeal: 'breakfast', edits: {} }).main, 1 + 3 + 1);
  assert.deepEqual(mealCounts({ days: 1, startMeal: 'lunch', endMeal: 'dinner', edits: {} }), { breakfast: 0, lunch: 1, dinner: 1, snack: 1, main: 2 });
  assert.equal(mealCounts({ days: 0, startMeal: 'lunch', endMeal: 'lunch', edits: {} }).main, 0);
  const v = { days: 3, startMeal: 'lunch', endMeal: 'lunch', edits: { '1d': 0, '3b': 0, '2s': 0, '3d': 1 } };
  assert.deepEqual(mealCounts(v), { breakfast: 1, lunch: 3, dinner: 2, snack: 2, main: 6 }, '첫날 저녁 빼고(−1), 마지막 날 아침 빼고(−1), 마지막 날 저녁 넣고(+1), 둘째 날 간식 뺌');
});
test('끼니 일정 저장 검사: 잘못된 값은 기본으로, 고친 칸 형식만 통과, 예전 저장본은 그대로 열림', () => {
  const ok = sanitizeModel({ vars: { days: 3, startMeal: 'dinner', endMeal: 'nope', edits: { '1d': 0, '2l': '1', bad: 1, '3x': 1, '9b': 2 } }, income: [], expense: [{ label: '식', kind: 'unit', unit: 100, who: 'all', per: 'meals', meal: 'snack' }, { label: '이상', kind: 'unit', per: 'meals', meal: 'weird' }] }).model;
  assert.equal(ok.vars.startMeal, 'dinner'); assert.equal(ok.vars.endMeal, 'lunch'); assert.deepEqual(ok.vars.edits, { '1d': 0, '2l': 1 });
  assert.equal(ok.expense[0].per, 'meals'); assert.equal(ok.expense[0].meal, 'snack'); assert.equal(ok.expense[1].meal, 'main');
  const legacy = sanitizeModel({ vars: { campers: 10, days: 2, nights: 1 }, income: [], expense: [{ label: '식비', kind: 'unit', unit: 1000, who: 'all', per: 'days', mult: 3 }] }).model;
  assert.equal(legacy.vars.startMeal, 'lunch'); assert.deepEqual(legacy.vars.edits, {}); assert.equal(legacy.expense[0].per, 'days');
  const t = template(); assert.equal(t.expense.find((r) => r.category === '식비').per, 'meals'); assert.equal(t.expense.find((r) => r.category === '간식비').meal, 'snack');
});
