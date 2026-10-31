import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const src = readFileSync(new URL('../public/expense-title.js', import.meta.url), 'utf8');
const ctx = { window: {}, Date, Math };
runInNewContext(src, ctx);
const { kstWeek, autoTitle, isAutoTitle } = ctx.window.ExpenseTitle;
const at = d => Date.parse(d + 'T12:00:00+09:00');

test('경비 리포트 제목: 몇째 주는 월요일 시작, 1일이 든 주가 1째 주', () => {
  assert.equal(kstWeek(at('2026-10-01')).week, 1);   // 목요일
  assert.equal(kstWeek(at('2026-10-04')).week, 1);   // 일요일까지 1째 주
  assert.equal(kstWeek(at('2026-10-05')).week, 2);   // 월요일부터 2째 주
  assert.equal(kstWeek(at('2026-10-31')).week, 5);
  assert.equal(kstWeek(at('2026-11-01')).week, 1);   // 일요일에 시작하는 달: 1일 하루만 1째 주
  assert.equal(kstWeek(at('2026-11-02')).week, 2);
  assert.equal(kstWeek(at('2026-11-30')).week, 6);   // 6째 주
  assert.equal(kstWeek(at('2027-02-28')).week, 4);   // 2027-02-01 월요일 → 딱 4주
  // 한국 시간 자정 직후도 그날로 센다
  assert.equal(kstWeek(Date.parse('2026-10-31T15:30:00Z')).d, 1);
});

test('경비 리포트 제목: 한국어 · 영어 형식과 자동 제목 알아보기', () => {
  assert.equal(autoTitle('ko', at('2026-10-31')), '2026년 10월 5째 주 리포트');
  assert.equal(autoTitle('en', at('2026-10-31')), 'Oct 2026 · Week 5 report');
  assert.ok(isAutoTitle('2026년 9월 3째 주 리포트') && isAutoTitle('Sep 2026 · Week 3 report'));
  assert.ok(!isAutoTitle('10월 리포트') && !isAutoTitle('October evangelism'));
  const page = readFileSync(new URL('../src/pages/portal/expense/index.astro', import.meta.url), 'utf8');
  assert.match(page, /expense-title\.js\?v=\d+/);
  assert.match(page, /form = freshTitle\(draft\)/);
  assert.match(page, /form\.projectAuto = false/);
});
