import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('홈 팝업: 감사의 밤 다음에 제주 캠퍼스 데이가 이어서 뜨고, 각각 따로 "다시 보지 않기"를 기억한다', () => {
  assert.match(src, /id="thanksgivingPromo"/);
  assert.match(src, /id="campusDayPromo"/);
  assert.match(src, /startsWith\('2026-jeju-campus-day'\)/);
  assert.match(src, /campusDayEntry\.data\.status === 'open'/);                       // 접수가 열려 있을 때만
  assert.match(src, /wolko-promo-jeju-campus-day-2026-hide/);
  assert.match(src, /wolko-promo-thanksgiving-2026-11-26-hide/);
  assert.match(src, /if \(start && todayKst >= start\) return null;/);                // 시작하면 숨김
  assert.match(src, /function next\(\) \{ var p = queue\.shift\(\); if \(p\) p\.open\(next\); \}/);   // 하나 닫으면 다음 팝업
  assert.match(src, /href=\{campusDay\.registration_url/);
});
