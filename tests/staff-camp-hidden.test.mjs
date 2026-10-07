import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(root + p, 'utf8');

test('캠프 스태프 지원 목록에서 제주 캠퍼스데이와 모멘텀 캠프는 표시하지 않는다', () => {
  for (const id of ['2026-jeju-campus-day', '2026-jeju-momentum-1', '2026-jeju-momentum-2']) {
    assert.equal(JSON.parse(read(`src/content/camp_schedules/${id}.json`)).staff_application_hidden, true, id);
  }
  // 다른 캠프는 그대로 지원 목록에 나온다
  for (const id of ['2026-jeju-english', '2026-inland-english-junior', '2026-inland-union']) {
    assert.notEqual(JSON.parse(read(`src/content/camp_schedules/${id}.json`)).staff_application_hidden, true, id);
  }
  assert.match(read('src/content/config.ts'), /staff_application_hidden: z\.boolean\(\)\.optional\(\)/);
  assert.match(read('src/pages/camp-register/index.astro'), /\.filter\(\(s\) => !s\.data\.staff_application_hidden\)\.map/);
});
