import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyModel, newRow, sanitizeModel, qtyOf, rowAmount, evaluate, breakEven, toPlan, template, BASES } from '../public/campteam/calc-core.js';
import * as Calc from '../functions/api/campteam/ledger-calc.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const R = (o) => ({ ...newRow(o.kind || 'fixed'), ...o });
// 캠퍼 60 + 스태프 15, 3일 2박. 모든 금액은 가짜.
const model = () => ({ vars: { campers: 60, staff: 15, days: 3, nights: 2 }, contingencyPct: 10, includeOpening: false,
  income: [R({ label: '캠프비 (얼리버드)', category: '캠프비', kind: 'unit', unit: 180000, basis: 'campersPct', qty: 30 }), R({ label: '캠프비 (일반)', category: '캠프비', kind: 'unit', unit: 200000, basis: 'campersPct', qty: 70 }), R({ label: '후원', category: '후원금', amount: 1000000 })],
  expense: [R({ label: '식비', category: '식비', kind: 'unit', unit: 10000, basis: 'allDays', mult: 3 }), R({ label: '숙박', category: '숙박시설비', kind: 'unit', unit: 30000, basis: 'allNights' }), R({ label: '강사비', category: '강사비', amount: 400000 }), R({ label: '물품', category: '', amount: 500000 })] });

test('수량 기준: 직접·캠퍼·스태프·전체·일수·숙박수·비율', () => {
  const v = { campers: 60, staff: 15, days: 3, nights: 2 };
  const q = (basis, qty) => qtyOf({ basis, qty }, v);
  assert.deepEqual([q('qty', 7), q('campers'), q('staff'), q('all'), q('camperDays'), q('staffDays'), q('allDays'), q('camperNights'), q('staffNights'), q('allNights'), q('campersPct', 30)], [7, 60, 15, 75, 180, 45, 225, 120, 30, 150, 18]);
  assert.ok(BASES.every((b) => typeof q(b, 1) === 'number'));
  assert.equal(rowAmount(R({ kind: 'unit', unit: 10000, basis: 'allDays', mult: 3 }), v), 6750000); assert.equal(rowAmount(R({ kind: 'fixed', amount: 400000 }), v), 400000); assert.equal(rowAmount(R({ kind: 'unit', unit: 100, basis: 'campers' }), v), 6000, '배수를 안 쓰면 1');
});
test('계산: 수입·지출·예비비·남는 금액, 1인당 비용, 항목별 합계, 이월금 포함 옵션', () => {
  const e = evaluate(model());
  const fee = 180000 * 18 + 200000 * 42; // 얼리버드 30% = 18명, 일반 70% = 42명
  assert.equal(e.income, fee + 1000000); assert.equal(e.expense, 6750000 + 4500000 + 400000 + 500000);
  assert.equal(e.contingency, Math.round(e.expense * 0.1)); assert.equal(e.net, e.income - e.expense - e.contingency);
  assert.equal(e.costPerCamper, Math.round((e.expense + e.contingency) / 60)); assert.equal(e.feePerCamper, Math.round(fee / 60));
  assert.deepEqual(e.byCategory.income, { 캠프비: fee, 후원금: 1000000 }); assert.equal(e.byCategory.expense['식비'], 6750000); assert.equal(e.byCategory.expense['물품'], 500000, '분류가 비면 이름으로');
  const open = evaluate({ ...model(), includeOpening: true }, { opening: 1200000 }); assert.equal(open.net, e.net + 1200000); assert.equal(evaluate(model(), { opening: 1200000 }).net, e.net, '옵션이 꺼져 있으면 더하지 않는다');
});
test('손익분기: 캠퍼 수와 캠프비 배율(캠프비가 캠퍼 수에 연동될 때만 캠퍼 수를 계산)', () => {
  const m = model(), be = breakEven(m);
  assert.equal(be.camperLinked, true); const at = (n) => evaluate({ ...m, vars: { ...m.vars, campers: n } }).net;
  assert.ok(be.campers != null && at(be.campers) >= 0 && (be.campers === 0 || at(be.campers - 1) < 0), '그 인원부터 흑자');
  // 캠프비를 배율 t 로 올리면 net 이 0 이 된다
  const t = be.feeScale; const scaled = { ...m, income: m.income.map((r) => (r.label.startsWith('캠프비') ? { ...r, unit: r.unit * t } : r)) };
  assert.ok(Math.abs(evaluate(scaled).net) <= 60 * 100, '배율을 적용하면 거의 0');
  assert.deepEqual(be.fees.map((f) => f.label), ['캠프비 (얼리버드)', '캠프비 (일반)']); assert.ok(be.fees.every((f) => f.neededRounded % 1000 === 0 && f.neededRounded >= f.needed));
  // 캠프비가 직접 수량(고정 인원)이면 캠퍼 수 손익분기는 계산하지 않는다
  const fixedFee = { ...m, income: [R({ label: '캠프비', category: '캠프비', kind: 'unit', unit: 90000, basis: 'qty', qty: 50 })] }; assert.equal(breakEven(fixedFee).camperLinked, false); assert.equal(breakEven(fixedFee).campers, null); assert.ok(breakEven(fixedFee).feeScale > 0);
  assert.equal(breakEven({ ...emptyModel() }).feeScale, null);
});
test('기간 예산으로 변환: 분류가 있는 줄만 항목별 합계로', () => {
  const plan = toPlan(model()); const get = (k, c) => plan.find((p) => p.kind === k && p.category === c)?.amount;
  assert.equal(get('expense', '식비'), 6750000); assert.equal(get('income', '캠프비'), 180000 * 18 + 200000 * 42); assert.equal(plan.some((p) => p.category === '' || p.category === '(미분류)'), false);
});
test('입력 정리: 이상한 값은 안전한 값으로, 목록·형식이 틀리면 거부, 뼈대 모델은 통과', () => {
  const s = sanitizeModel({ vars: { campers: '60', staff: -5, days: 999, nights: 'x' }, contingencyPct: 99, income: [{ label: '<b>x</b>'.repeat(30), kind: 'weird', basis: 'nope', amount: '1,000,000원', unit: 'abc', qty: -3, mult: 1e9, evil: 1 }], expense: [] }).model;
  assert.deepEqual(s.vars, { campers: 60, staff: 0, days: 60, nights: 0 }); assert.equal(s.contingencyPct, 50); const r = s.income[0];
  assert.deepEqual([r.kind, r.basis, r.unit, r.qty, r.mult, 'evil' in r], ['fixed', 'qty', 0, 0, 1e4, false]); assert.equal(r.label.length, 60); assert.equal(r.amount, 1000000);
  for (const bad of [null, [], 'x', { income: 'x' }, { income: [null] }, { expense: new Array(61).fill({}) }]) assert.ok(sanitizeModel(bad).error, JSON.stringify(bad)?.slice(0, 30));
  const t = sanitizeModel(template()); assert.ok(t.model && t.model.income.length === 3 && t.model.expense.length === 8); assert.deepEqual(evaluate(t.model).net, 0, '뼈대는 금액이 모두 0');
});

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (fn, env, who, { qs = '', body } = {}) => Calc[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
test('시나리오 저장 API: 조회는 금액 조회 권한자, 저장·수정·삭제는 캠프 재정·디렉터, 모양 검사와 개수 제한, 삭제는 복구 가능한 표시', async () => {
  const env = makeEnv(fakeD1()), body = { name: '캠프비 9만원 안', model: model() };
  assert.equal((await call('onRequestGet', env, null)).status, 401); assert.equal((await call('onRequestGet', env, U.view)).status, 403);
  for (const who of [U.tre, U.mem, U.view]) assert.equal((await call('onRequestPost', env, who, { body })).status, 403, who);
  const made = await call('onRequestPost', env, U.fin, { body }); assert.equal(made.status, 201); const { id } = await made.json();
  for (const who of [U.tre, U.mem, U.dir]) { const list = (await (await call('onRequestGet', env, who)).json()).items; assert.equal(list.length, 1); assert.equal(list[0].name, '캠프비 9만원 안'); assert.equal(list[0].model.vars.campers, 60); }
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
