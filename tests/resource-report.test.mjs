import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/portal/resource.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/resource-report.css', import.meta.url), 'utf8');

test('리소스 리포트: 맨 위 단계별 현황 · 걸러 보기 · 움직임 스타일을 불러온다', () => {
  assert.match(page, /<link rel="stylesheet" href="\/resource-report\.css\?v=\d+">/);
  assert.match(page, /id="stageBreakdown"/);
  assert.match(page, /id="resourceFilters"/);
  assert.match(page, /class="hero-panel rr-hero rr-reveal"/);
});

test('리소스 리포트: 새 글은 한국어와 영어가 모두 있다', () => {
  for (const key of ['stageShort1', 'stageShort2', 'stageShort3', 'stagesTitle', 'stagesTotal', 'filterAll', 'filterLabel', 'filterEmpty']) {
    assert.equal((page.match(new RegExp(`\\b${key}:`, 'g')) || []).length, 2, key);
  }
});

test('리소스 리포트: 단계 수는 실제 자료에서 세고, 카드는 세 단계 막대를 그린다', () => {
  assert.match(page, /stageCounts\[Math\.min\(STAGE_COUNT, currentStageIndex\(item\.stagePercents\)\)\]\+\+/);
  assert.match(page, /class="rr-steps"/);
  assert.match(page, /function setResourceFilter/);
});

test('리소스 리포트: 움직임 줄이기 설정이면 멈춘 채 다 찬 모습', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*--rr-on: 1/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /border-left:\s*\d/, '왼쪽 색 줄은 쓰지 않는다');
});
