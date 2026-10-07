import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('홈 팝업: 감사의 밤 · 제주 캠퍼스 데이가 한 팝업 안에서 3초마다 교체되고, 아래 점으로 넘기며, "다시 보지 않기"는 카드별이다', () => {
  assert.match(src, /<div class="wh-promo-overlay" id="homePromos" hidden>/);
  assert.match(src, /id="homePromoStage"/);
  assert.match(src, /id="homePromoDots"/);
  assert.match(src, /<div class="wh-promo-card" id="thanksgivingPromo">/);
  assert.match(src, /<div class="wh-promo-card" id="campusDayPromo" data-start=/);
  assert.match(src, /startsWith\('2026-jeju-campus-day'\)/);
  assert.match(src, /campusDayEntry\.data\.status === 'open'/);
  assert.match(src, /var ROTATE_MS = 3000;/);
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
