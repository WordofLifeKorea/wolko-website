// 복음 도달 목표 카드(public/gospel-goals.js)를 실제로 그려 본다 — 서버가 아니라 화면이 쓰는 계산(달성률 · 합계 목표)을 확인
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { reachGoalsPayload } from '../functions/lib/gospelGoals.js';

const window = {};
vm.runInNewContext(readFileSync(new URL('../public/gospel-goals.js', import.meta.url), 'utf8'), { window });
const reach = reachGoalsPayload();
const draw = ctx => { const el = { hidden: true, innerHTML: '' }; window.GospelGoals.render(el, { reach, lang: 'ko', ...ctx }); return el; };
const pcts = html => [...html.matchAll(/class="gg-pct">([\d.]+)%</g)].map(m => Number(m[1]));
const totals = n => ({ evangelism: n, campAttendance: 0, eeAttendance: 0, literature: 0, social: 0 });

test('전체 탭은 원 하나 — 평택 · 제주 목표를 더한 목표로 본다 (2027년 74,000)', () => {
  const el = draw({ year: '2027', tab: 'all', summary: { all: totals(37000), mainland: totals(30000), jeju: totals(7000) } });
  assert.equal(el.hidden, false);
  assert.deepEqual(pcts(el.innerHTML), [50]);
  assert.match(el.innerHTML, /37,000 \/ 74,000명/);
  assert.match(el.innerHTML, /현재 50%/, '표의 합계 칸에 현재 달성률');
});

test('평택 · 제주 탭은 그 지역 원 하나와 그 지역 목표', () => {
  const summary = { all: totals(37000), mainland: totals(21000), jeju: totals(16000) };
  assert.deepEqual(pcts(draw({ year: '2027', tab: 'mainland', summary }).innerHTML), [50]);
  assert.deepEqual(pcts(draw({ year: '2027', tab: 'jeju', summary }).innerHTML), [50]);
});

test('목표가 없는 해 · 0% · 1% 미만 · 목표 초과', () => {
  const jeju2026 = draw({ year: '2026', tab: 'jeju', summary: { jeju: totals(500) } }).innerHTML;
  assert.deepEqual(pcts(jeju2026), [], '2026년 제주는 목표가 없어 원을 그리지 않는다');
  assert.match(jeju2026, /목표는 정하지 않았어요/);
  const zero = draw({ year: '2028', tab: 'all', summary: { all: totals(0) } }).innerHTML;
  assert.deepEqual(pcts(zero), [0]);
  assert.doesNotMatch(zero, /gg-arc/, '0%면 진행 호를 그리지 않는다(점 하나가 찍히지 않게)');
  assert.deepEqual(pcts(draw({ year: '2026', tab: 'mainland', summary: { mainland: totals(150) } }).innerHTML), [0.5]);
  assert.match(draw({ year: '2026', tab: 'mainland', summary: { mainland: totals(31000) } }).innerHTML, /목표보다 1,000명 더/);
});

test('불러오는 중 · 불러오지 못함 · 2026년 안내', () => {
  assert.match(draw({ year: '2027', tab: 'all', summary: null }).innerHTML, /불러오는 중/);
  assert.match(draw({ year: '2027', tab: 'all', summary: null, failed: true }).innerHTML, /불러오지 못했어요/);
  assert.match(draw({ year: '2026', tab: 'all', summary: { all: totals(1) } }).innerHTML, /gg-note/);
  assert.doesNotMatch(draw({ year: '2027', tab: 'all', summary: { all: totals(1) } }).innerHTML, /gg-note/);
});
