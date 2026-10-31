import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// wolko-rail.js 맨 앞의 "시간대별 메뉴 색" 부분만 떼어 가짜 문서 위에서 돌린다
function loadRailSky() {
  const src = readFileSync(new URL('../public/wolko-rail.js', import.meta.url), 'utf8');
  const block = src.slice(0, src.indexOf('(function () {\n  var GROUPS ='));
  const props = {};
  const ctx = {
    window: {}, Math, Date,
    document: { documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } }, addEventListener() {}, hidden: false },
    setInterval() {},
  };
  runInNewContext(block, ctx);
  return { ...ctx.window.WolkoRailSky, props };
}

test('왼쪽 메뉴 색은 평택의 해 뜨고 지는 시각을 따라 바뀐다', () => {
  const { railColor, sunTimesKst, props } = loadRailSky();
  assert.match(props['--ws-rail-bg'], /^rgb\(/, '불러오자마자 색을 넣는다');
  const at = iso => railColor(Date.parse(iso));
  assert.equal(at('2026-10-31T23:00:00+09:00'), 'rgb(11, 36, 48)', '밤은 원래 남색');
  assert.equal(at('2026-10-31T03:00:00+09:00'), 'rgb(11, 36, 48)');
  assert.equal(at('2026-10-31T13:00:00+09:00'), 'rgb(30, 122, 176)', '한낮은 밝은 하늘색');
  const sun = sunTimesKst(Date.parse('2026-10-31T12:00:00+09:00'), 36.99, 127.09);
  assert.ok(Math.abs(sun.rise - (6 * 60 + 56)) < 10 && Math.abs(sun.set - (17 * 60 + 37)) < 10, '평택 10월 31일 일출 6:56 · 일몰 17:37 근처');
  const minute = m => new Date(Date.parse('2026-10-31T00:00:00+09:00') + m * 60000).toISOString();
  assert.equal(at(minute(Math.round(sun.set - 10))), 'rgb(91, 48, 80)', '해 질 녘은 자두빛');
  assert.equal(at(minute(Math.round(sun.rise - 15))), 'rgb(52, 49, 94)', '새벽은 남보라');
  assert.equal(at(minute(Math.round(sun.rise + 45))), 'rgb(34, 124, 160)', '아침은 맑은 청록빛 파랑');
  // 여름에는 저녁 7시에도 아직 낮이다
  assert.equal(at('2026-06-21T18:00:00+09:00'), 'rgb(30, 122, 176)');
  // 겨울(동지)에는 저녁 5시 반이면 이미 해가 진 뒤라 낮 색이 아니다
  assert.notEqual(at('2026-12-21T17:30:00+09:00'), 'rgb(30, 122, 176)');
});

test('메뉴 색은 평평한 한 가지 색이고, 스크립트가 없으면 원래 남색', () => {
  const css = readFileSync(new URL('../public/wolko-site.css', import.meta.url), 'utf8');
  assert.match(css, /\.wolko-rail, \.wolko-drawer \{\s*background: var\(--ws-rail-bg, var\(--ws-navy\)\) !important;\s*background-image: none !important;/);
  assert.match(css, /\.hub-sidebar \{ background: var\(--ws-rail-bg, var\(--ws-navy\)\) !important; background-image: none !important;/);
});

test('가장 밝은 아침·낮 색도 흰 글자와 대비 4.5:1 이상', () => {
  const lum = c => c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const src = readFileSync(new URL('../public/wolko-rail.js', import.meta.url), 'utf8');
  for (const name of ['NIGHT', 'DAWN', 'MORNING', 'DAY', 'SUNSET', 'TWILIGHT']) {
    const rgb = JSON.parse(src.match(new RegExp(name + ' = (\\[[^\\]]+\\])'))[1]);
    assert.ok(1.05 / (lum(rgb) + 0.05) >= 4.5, name);
  }
});
