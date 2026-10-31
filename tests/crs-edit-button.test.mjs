import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');

test('CRS 정보 수정: 삭제 안내 문구는 t(키, 이름)으로 만든다 — t() 결과(글자)를 다시 함수로 부르면 수정 창이 안 열린다', () => {
  assert.doesNotMatch(src, /t\('[a-z_]+'\)\(/, 't(...)(...) 모양이 없어야 한다');
  assert.match(src, /t\('del_type', church\.churchName \|\| ''\)/);
});

test('CRS 정보 수정: 단추는 문서에 한 번 건 위임 클릭으로 지금 보는 교회의 수정 창을 연다(상세를 다시 그려도 동작)', () => {
  assert.match(src, /e\.target\.closest\('#detailEditBtn'\)[^\n]*viewingChurch\) return;\s*openEditModal\(viewingChurch\);/);
  assert.doesNotMatch(src, /getElementById\('detailEditBtn'\)\.addEventListener/);
  assert.match(src, /id="detailEditBtn"/);
});
