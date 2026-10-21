import assert from 'node:assert/strict';
import test from 'node:test';
import * as Budget from '../functions/api/campteam/budget.js';
import * as Report from '../functions/api/campteam/budget-report.js';
import * as Home from '../functions/api/campteam/home.js';
import { parseAmount, formatMinor, summarize } from '../functions/lib/campteamMoney.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const mk = (o) => makeEnv(fakeD1(o));
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: fn === 'onRequestGet' ? 'GET' : fn === 'onRequestPatch' ? 'PATCH' : fn === 'onRequestDelete' ? 'DELETE' : 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = r => r.json();
const line = (o = {}) => ({ kind: 'line', campId: 'camp-u26', category: 'print', label: '새 항목', currency: 'KRW', plannedAmount: '100,000', ...o });

test('금액 입력 해석과 표시: 원은 소수 없이, 달러는 센트까지, 소수점 오차 없음', () => {
  assert.equal(parseAmount('1,234,567', 'KRW'), 1234567); assert.equal(parseAmount('₩5000', 'KRW'), 5000); assert.equal(parseAmount('12.34', 'USD'), 1234); assert.equal(parseAmount('12.3', 'USD'), 1230); assert.equal(parseAmount('12', 'USD'), 1200);
  assert.equal(parseAmount('0.1', 'USD') + parseAmount('0.2', 'USD'), 30, '0.1+0.2 도 정확히 30센트');
  assert.ok(Number.isNaN(parseAmount('12.345', 'USD'))); assert.ok(Number.isNaN(parseAmount('12.5', 'KRW'))); assert.ok(Number.isNaN(parseAmount('abc', 'KRW'))); assert.ok(Number.isNaN(parseAmount('1', 'EUR')));
  assert.equal(parseAmount('12.00', 'KRW'), 12, '0 으로 끝나는 소수는 허용'); assert.equal(parseAmount('', 'KRW'), null); assert.equal(parseAmount(null, 'USD'), null);
  assert.equal(formatMinor(1500000, 'KRW'), '₩1,500,000'); assert.equal(formatMinor(123456, 'USD'), '$1,234.56'); assert.equal(formatMinor(5, 'USD'), '$0.05');
});

test('합계: 예상 최종(지급 완료면 실제, 아니면 예상·계획과 실제 중 큰 값), 통화별로 따로, 총 예산 대비 남음/초과', () => {
  const s = summarize([{ category: 'a', currency: 'KRW', plannedAmount: 100, expectedAmount: 120, actualAmount: null }, { category: 'a', currency: 'KRW', plannedAmount: 50, expectedAmount: null, actualAmount: 70, status: 'paid' }, { category: 'b', currency: 'USD', plannedAmount: 1000, expectedAmount: null, actualAmount: null }], [{ currency: 'KRW', amountMinor: 180 }]);
  const k = s.find(x => x.currency === 'KRW'), u = s.find(x => x.currency === 'USD');
  assert.deepEqual([k.planned, k.expected, k.actual, k.forecast], [150, 170, 70, 190]); assert.equal(k.remaining, -10); assert.equal(k.overTarget, true); assert.equal(u.target, null); assert.equal(u.remaining, null); assert.equal(u.forecast, 1000);
});

test('권한: 금액 권한이 없으면 예산 표를 읽지도 않는다', async () => {
  const seen = []; const env = makeEnv(fakeD1({ spy: sql => seen.push(sql) }));
  for (const fn of ['onRequestGet']) assert.equal((await call(Budget, fn, env, U.view)).status, 403);
  assert.equal((await call(Budget, 'onRequestPost', env, U.view, { body: line() })).status, 403);
  assert.equal((await call(Report, 'onRequestGet', env, U.view)).status, 403);
  assert.equal((await call(Budget, 'onRequestGet', env, null)).status, 401);
  assert.equal(seen.some(q => /budget_lines|budget_targets/.test(q)), false);
  assert.equal((await call(Budget, 'onRequestGet', env, U.fin)).status, 200); assert.equal((await call(Budget, 'onRequestPost', env, U.fin, { body: line() })).status, 201, '재정 담당은 금액 작성 가능');
  assert.equal((await call(Budget, 'onRequestGet', env, U.mem)).status, 200); assert.equal((await call(Budget, 'onRequestGet', env, U.admin)).status, 200);
});

test('줄 만들기·검사: 통화별 소수, 음수/형식 오류, 필수 항목', async () => {
  const env = mk(); const post = (o) => call(Budget, 'onRequestPost', env, U.mem, { body: line(o) });
  const ok = await post({ plannedAmount: '1,250,000', expectedAmount: '1,300,000' }); assert.equal(ok.status, 201);
  assert.deepEqual({ ...env.DB.sqlite.prepare('SELECT plannedAmount, expectedAmount, actualAmount FROM budget_lines WHERE id=?').get((await J(ok)).id) }, { plannedAmount: 1250000, expectedAmount: 1300000, actualAmount: null });
  const usd = await post({ currency: 'USD', plannedAmount: '800.50' }); assert.equal(env.DB.sqlite.prepare('SELECT plannedAmount FROM budget_lines WHERE id=?').get((await J(usd)).id).plannedAmount, 80050);
  for (const bad of [{ plannedAmount: '12.5' }, { currency: 'USD', plannedAmount: '1.234' }, { plannedAmount: '-5' }, { plannedAmount: 'x' }, { plannedAmount: '' }, { currency: 'EUR' }, { category: 'weird' }, { label: ' ' }, { campId: '' }, { campId: 'nope' }, { status: 'x' }, { paidAt: 'bad' }, { actualAmount: '-1' }]) assert.equal((await post(bad)).status, 400, JSON.stringify(bad));
  assert.equal((await call(Budget, 'onRequestPost', env, U.mem, { body: { kind: 'weird' } })).status, 400);
});

test('수정·삭제(복구 가능), 통화를 바꾸면 금액도 다시 받는다', async () => {
  const env = mk(); const patch = (id, body) => call(Budget, 'onRequestPatch', env, U.mem, { qs: `?id=${id}`, body });
  assert.equal((await patch('b02', { actualAmount: '4,350,000', status: 'paid', paidAt: '2026-11-05' })).status, 200);
  assert.deepEqual({ ...env.DB.sqlite.prepare('SELECT actualAmount,status,paidAt FROM budget_lines WHERE id=?').get('b02') }, { actualAmount: 4350000, status: 'paid', paidAt: '2026-11-05' });
  assert.equal((await patch('b02', { actualAmount: '' })).status, 200); assert.equal(env.DB.sqlite.prepare('SELECT actualAmount FROM budget_lines WHERE id=?').get('b02').actualAmount, null, '비우면 실제 지출 없음');
  assert.equal((await patch('b02', { currency: 'USD' })).status, 400, '통화만 바꾸면 거부(금액 해석이 달라짐)');
  assert.equal((await patch('b02', { currency: 'USD', plannedAmount: '3000.00', expectedAmount: '', actualAmount: '' })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT plannedAmount, currency FROM budget_lines WHERE id=?').get('b02').plannedAmount, 300000);
  assert.equal((await patch('nope', { label: 'x' })).status, 404);
  assert.equal((await call(Budget, 'onRequestDelete', env, U.view, { qs: '?id=b03' })).status, 403);
  assert.equal((await call(Budget, 'onRequestDelete', env, U.mem, { qs: '?id=b03' })).status, 200);
  assert.ok(!(await J(await call(Budget, 'onRequestGet', env, U.mem))).lines.some(l => l.id === 'b03')); assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM budget_lines WHERE id=? AND deletedAt IS NOT NULL').get('b03').n, 1);
});

test('목록 합계(캠프별·통화별)와 총 예산: 한 통화는 한 줄, 두 번 저장하면 갱신', async () => {
  const env = mk(); const g = async (qs = '') => J(await call(Budget, 'onRequestGet', env, U.mem, { qs }));
  const all = await g('?campId=camp-w27'); const krw = all.summary.find(x => x.currency === 'KRW'), usd = all.summary.find(x => x.currency === 'USD');
  assert.equal(krw.planned, 15150000); assert.equal(krw.forecast, 15420000, '계약금만 낸 항목은 잔금까지, 보험은 실제 초과분 반영'); assert.equal(krw.target, 15000000); assert.equal(krw.overTarget, true, '예상 최종이 총 예산을 넘으면 표시'); assert.equal(krw.remaining, -420000);
  assert.equal(usd.planned, 80000); assert.equal(usd.target, 200000); assert.equal(usd.remaining, 200000 - 85000);
  assert.equal(krw.byCategory[0].category, 'food', '지출이 큰 분류가 먼저');
  assert.ok(Array.isArray((await g()).perCamp) && (await g()).perCamp.length >= 2);
  assert.deepEqual((await g('?campId=camp-w27&currency=USD')).lines.map(l => l.id), ['b12']);
  assert.deepEqual((await g('?campId=camp-w27&q=티셔츠')).lines.map(l => l.id), ['b05']);
  const t = (o) => call(Budget, 'onRequestPost', env, U.mem, { body: { kind: 'target', campId: 'camp-w27', currency: 'KRW', amount: '20,000,000', ...o } });
  assert.equal((await t({})).status, 200); assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM budget_targets WHERE campId='camp-w27' AND currency='KRW' AND deletedAt IS NULL").get().n, 1);
  assert.equal((await t({ amount: 'x' })).status, 400); assert.equal((await t({ currency: 'EUR' })).status, 400); assert.equal((await t({ campId: 'nope' })).status, 400);
  assert.equal((await g('?campId=camp-w27')).summary.find(x => x.currency === 'KRW').overTarget, false);
});

test('지난 캠프 예산 복사: 계획만 복사하고 실제 지출·지급은 비움, 이미 있으면 확인 요구', async () => {
  const env = mk(); const cp = (body) => call(Budget, 'onRequestPost', env, U.mem, { body: { kind: 'copy', ...body } });
  assert.equal((await cp({ fromCampId: 'camp-w27', toCampId: 'camp-w27' })).status, 400); assert.equal((await cp({ fromCampId: 'nope', toCampId: 'camp-u26' })).status, 400);
  assert.equal((await cp({ fromCampId: 'camp-w27', toCampId: 'camp-u26' })).status, 409);
  const r = await cp({ fromCampId: 'camp-w27', toCampId: 'camp-p26' }); assert.equal(r.status, 201); assert.equal((await J(r)).copied, 12);
  const rows = env.DB.sqlite.prepare("SELECT * FROM budget_lines WHERE campId='camp-p26'").all();
  assert.ok(rows.length === 12 && rows.every(x => x.actualAmount == null && x.status === 'planned' && !x.paidAt)); assert.ok(rows.find(x => x.currency === 'USD'));
  assert.equal((await cp({ fromCampId: 'camp-w27', toCampId: 'camp-u26', append: true })).status, 201);
});

test('예상 리포트: 계획 초과 항목, 미지급 수, CSV(엑셀용 BOM, 수식 주입 방지, 통화별 소수)', async () => {
  const env = mk(); const rep = async (qs, who = U.mem) => call(Report, 'onRequestGet', env, who, { qs });
  const r = await J(await rep('?campId=camp-w27')); assert.ok(r.overLines.some(l => l.id === 'b08' && l.over === 20000)); assert.ok(r.unpaidCount >= 8); assert.equal(r.formatted.find(f => f.currency === 'USD').planned, '$800.00');
  await call(Budget, 'onRequestPatch', env, U.mem, { qs: '?id=b03', body: { label: '=HYPERLINK("http://evil","x")', vendor: '+cmd', notes: 'a,b "c"' } });
  const csvRes = await rep('?campId=camp-w27&format=csv'); assert.equal(csvRes.status, 200); assert.match(csvRes.headers.get('content-type'), /text\/csv/); assert.match(csvRes.headers.get('content-disposition'), /attachment/);
  const bytes = new Uint8Array(await csvRes.clone().arrayBuffer()); assert.deepEqual([...bytes.slice(0, 3)], [0xEF, 0xBB, 0xBF], '엑셀이 한글을 읽도록 BOM 포함');
  const csv = await csvRes.text(); assert.ok(csv.includes("'=HYPERLINK"), '수식으로 시작하는 칸은 막는다'); assert.ok(csv.includes("'+cmd")); assert.ok(csv.includes('"a,b ""c"""'));
  assert.ok(csv.includes(',USD,800.00,850.00,,850.00,'), 'USD 는 소수 2자리'); assert.ok(csv.includes(',KRW,3000000,3000000,1500000,3000000,'), '계약금만 낸 줄: 실제 150만, 예상 최종 300만');
  assert.equal((await rep('?format=csv', U.view)).status, 403);
});

test('홈 요약의 금액은 통화별로 나오고 금액 권한이 없으면 아예 없다', async () => {
  const env = mk(); const home = async (who) => J(await Home.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/home' }) }));
  const m = await home(U.mem); assert.deepEqual(m.budget.summary.map(x => x.currency).sort(), ['KRW', 'USD']); assert.equal('byCategory' in m.budget.summary[0], false);
  assert.equal('budget' in (await home(U.view)), false);
});
