import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('월코 캘린더: 캠프팀 달력과 같은 모양 — 떨어진 둥근 날짜 칸, 옅은 색 알약 일정, 범례는 달력 아래', () => {
  const src = readFileSync(new URL('../src/pages/portal/schedule/index.astro', import.meta.url), 'utf8');
  assert.match(src, /class="cal-bar" style="\$\{gridArea\};--ev:\$\{color\}"/);
  assert.match(src, /class="cal-timed" style="\$\{gridArea\};--ev:\$\{color\}"/);
  assert.match(src, /color-mix\(in srgb, var\(--ev, var\(--blue\)\) 14%, #fff\)/);
  assert.match(src, /\.cal-daynum-cell\.is-today \{ background:#eef5f8; border:2px solid var\(--blue\) !important; \}/);
  assert.ok(src.indexOf('id="calGrid"') < src.indexOf('id="calLegend"'), '범례는 달력 아래');
});
