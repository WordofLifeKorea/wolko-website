import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const src = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('홈 팝업: 5초마다 교체되고, 아래 점으로 넘기며, "다시 보지 않기"는 카드별이다', () => {
  assert.match(src, /<div class="wh-promo-overlay" id="homePromos" hidden>/);
  assert.match(src, /id="homePromoStage"/);
  assert.match(src, /id="homePromoDots"/);
  assert.match(src, /<div class="wh-promo-card" id="thanksgivingPromo">/);
  assert.match(src, /<div class="wh-promo-card" id="campusDayPromo" data-start=/);
  assert.match(src, /startsWith\('2026-jeju-campus-day'\)/);
  assert.match(src, /campusDayEntry\.data\.status === 'open'/);
  assert.match(src, /var ROTATE_MS = 5000;/);
  assert.match(src, /setInterval\(function \(\) \{ render\(current \+ 1\); \}, ROTATE_MS\)/);
  assert.match(src, /prefers-reduced-motion: reduce/);                               // 움직임 줄이기 설정이면 자동 교체 없음
  assert.match(src, /\['mouseenter', 'focusin', 'touchstart'\]/);                  // 읽는 동안은 멈춘다
  assert.match(src, /wolko-promo-jeju-campus-day-2026-hide/);
  assert.match(src, /wolko-promo-thanksgiving-2026-11-26-hide/);
  assert.match(src, /skip = start && todayKst >= start/);
  assert.match(src, /\.wh-promo-stage > \.wh-promo-card\.is-active \{ opacity: 1;/);
  assert.match(src, /\.wh-promo-dots :global\(button\) \{ width: 12px !important; height: 12px !important;/);   // 스크립트로 만든 점이라 전역 스타일로 지정해야 적용된다
  assert.match(src, /href=\{campusDay\.registration_url/);
});

test('모바일 스와이프는 좌우 방향을 구분하고 세로 스크롤과 짧은 터치는 무시한다', () => {
  const fn = src.match(/function swipeDirection\(start, end\) \{[\s\S]*?\n    \}/)[0];
  const direction = runInNewContext('(' + fn + ')');
  const start = { clientX: 200, clientY: 200 };
  assert.equal(direction(start, { clientX: 100, clientY: 210 }), 1);
  assert.equal(direction(start, { clientX: 300, clientY: 210 }), -1);
  assert.equal(direction(start, { clientX: 180, clientY: 200 }), 0);
  assert.equal(direction(start, { clientX: 100, clientY: 320 }), 0);
  assert.equal(direction(start, { clientX: 100, clientY: 300 }), 0);
  assert.match(src, /touch-action: pan-y pinch-zoom/);
  assert.match(src, /stage\.addEventListener\('touchcancel'/);
  assert.match(src, /e\.preventDefault\(\); e\.stopPropagation\(\)/);
});

test('스와이프 후 카드가 변경되고 5초 자동 넘김이 다시 시작된다', () => {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        dataset: {}, hidden: false, listeners: {},
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
        addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
        querySelector: () => element('row'),
      });
    }
    return elements.get(id);
  }
  const timeouts = [], intervals = new Map();
  let nextTimer = 0;
  const storage = { getItem: () => null, setItem() {} };
  const start = src.lastIndexOf('(function () {', src.indexOf("var overlay = document.getElementById('homePromos')"));
  const script = src.slice(start, src.indexOf('})();', start) + 5);
  runInNewContext(script, {
    document: { getElementById: element, body: { style: {} }, addEventListener() {} },
    window: { matchMedia: () => ({ matches: false }) }, localStorage: storage, sessionStorage: storage,
    setTimeout: fn => timeouts.push(fn), requestAnimationFrame: fn => fn(),
    setInterval: (fn, ms) => { const id = ++nextTimer; intervals.set(id, { fn, ms }); return id; },
    clearInterval: id => intervals.delete(id),
  });
  timeouts.shift()();
  const fire = (id, type, event) => element(id).listeners[type].forEach(fn => fn(event));
  const first = element('thanksgivingPromo'), second = element('campusDayPromo');
  assert.equal(first.classList.contains('is-active'), true);
  assert.equal([...intervals.values()][0].ms, 5000);
  fire('homePromoStage', 'touchstart', { touches: [{ clientX: 200, clientY: 100 }] });
  fire('row', 'touchstart', {});
  assert.equal(intervals.size, 0);
  fire('homePromoStage', 'touchend', { touches: [], changedTouches: [{ clientX: 80, clientY: 105 }] });
  fire('row', 'touchend', {});
  assert.equal(second.classList.contains('is-active'), true);
  assert.equal(intervals.size, 1);
  let prevented = false;
  fire('homePromoStage', 'click', { preventDefault: () => { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
  [...intervals.values()][0].fn();
  assert.equal(first.classList.contains('is-active'), true);
  fire('homePromoStage', 'touchstart', { touches: [{ clientX: 200, clientY: 100 }] });
  fire('row', 'touchstart', {});
  fire('homePromoStage', 'touchcancel', {});
  assert.equal(intervals.size, 1);
});
