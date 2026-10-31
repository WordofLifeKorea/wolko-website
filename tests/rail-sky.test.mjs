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

test('이번 주 공지 카드도 같은 시간대 색 — 안쪽 공지 칸의 흰 글자가 하루 내내 4.5:1 이상', () => {
  const { noticeColor, props } = loadRailSky();
  assert.match(props['--ws-notice-bg'], /^rgb\(/);
  const lum = c => c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const over = (c, a) => c.map(v => v * (1 - a) + 255 * a); // 반투명 흰 칸을 얹은 색
  for (let h = 0; h < 24; h += 0.25) {
    const ms = Date.parse('2026-06-21T00:00:00+09:00') + h * 3600000;
    const rgb = noticeColor(ms).match(/\d+/g).map(Number);
    for (const a of [0.1, 0.16]) assert.ok(1.05 / (lum(over(rgb, a)) + 0.05) >= 4.5, `${h}시 · 칸 ${a}`);
  }
  const css = readFileSync(new URL('../public/wolko-site.css', import.meta.url), 'utf8');
  assert.match(css, /\.hub-dcard-notice \{ background: var\(--ws-notice-bg, var\(--ws-navy\)\) !important;/);
});

// 하늘 배너(hub-sky.js) 맨 앞의 "시간대 하늘 계산" 부분만 떼어 돌린다
function loadSkyTime(search = '') {
  const src = readFileSync(new URL('../public/hub-sky.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('(function () {\n  var NIGHT'), src.indexOf("(function () {\n  var sky = document.getElementById('hubSky')"));
  const ctx = { window: {}, Math, Date, location: { search }, decodeURIComponent };
  runInNewContext(block, ctx);
  return ctx.window.WolkoSkyTime;
}

test('하늘 배너: 해는 해 뜰 때 왼쪽 지평선에서 떠올라 한낮에 가장 높고, 해 질 때 오른쪽 지평선으로 가라앉으며 노을이 진다', () => {
  const T = loadSkyTime();
  const at = iso => T.skyAt(Date.parse(iso));
  const sun = T.sunTimes(Date.parse('2026-10-31T12:00:00+09:00'));
  const minute = m => new Date(Date.parse('2026-10-31T00:00:00+09:00') + m * 60000).toISOString();
  const noon = T.skyAt(Date.parse(minute((sun.rise + sun.set) / 2)));
  assert.ok(noon.lift > 0.99 && Math.abs(noon.sx - 0.5) < 0.01 && noon.warm === 0, '한낮: 가장 높이, 가운데, 흰 노랑');
  assert.equal(JSON.stringify([noon.a, noon.b]), '[[31,127,226],[116,198,248]]', '한낮은 원래 맑은 하늘색');
  const rise = T.skyAt(Date.parse(minute(sun.rise)));
  assert.ok(Math.abs(rise.lift) < 0.01 && rise.sx < 0.01 && rise.sunUp && rise.warm === 1, '해돋이: 왼쪽 지평선에 걸친 주황 해');
  const set = T.skyAt(Date.parse(minute(sun.set - 5)));
  assert.equal(JSON.stringify(set.b), '[255,142,90]', '해넘이 지평선은 주황');
  assert.ok(set.glow > 0.9 && set.glowRgb === '255, 140, 70', '해 질 녘 노을빛이 가장 진하다');
  assert.ok(!at('2026-10-31T18:30:00+09:00').sunUp, '해가 다 잠기면 해를 그리지 않는다');
  assert.equal(at('2026-10-31T23:00:00+09:00').night, 1, '밤에는 별이 다 보인다');
  assert.equal(at('2026-10-31T17:45:00+09:00').night, 0, '해 지고 바로는 아직 별이 없다');
  assert.ok(at('2026-06-21T19:00:00+09:00').sunUp && !at('2026-12-21T17:40:00+09:00').sunUp, '계절마다 해 지는 시각이 다르다');
});

test('하늘 배너 미리보기: ?sky=17:30 은 오늘 그 시각, ?sky=demo 는 하루를 1분에', () => {
  const T = loadSkyTime('?sky=17:30');
  const kst = new Date(T.nowMs() + 9 * 3600000);
  assert.equal(kst.getUTCHours() * 60 + kst.getUTCMinutes(), 17 * 60 + 30);
  assert.equal(loadSkyTime('?sky=demo').demo, true);
  assert.equal(loadSkyTime('').demo, false);
});

test('하늘 배너: 제주를 고르면 해 뜨고 지는 시각도 제주 기준', () => {
  const T = loadSkyTime(), ms = Date.parse('2026-10-31T12:00:00+09:00');
  const pt = T.sunTimes(ms); T.setPlace('jeju'); const jj = T.sunTimes(ms);
  assert.ok(Math.abs(pt.set - (17 * 60 + 37)) < 2 && Math.abs(jj.set - (17 * 60 + 45)) < 2, '10월 31일 해 지는 시각: 평택 5:37 · 제주 5:45');
  T.setPlace('wolko'); assert.equal(T.sunTimes(ms).set, pt.set);
  T.setPlace('unknown'); assert.equal(T.sunTimes(ms).set, pt.set, '모르는 곳이면 평택');
});
