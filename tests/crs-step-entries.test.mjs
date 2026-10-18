import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('CRS step-entry delete button works from the module script (no inline onclick to a module-scoped function)', () => {
  const page = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
  assert.match(page, /<script type="module">/);
  assert.doesNotMatch(page, /onclick="removeStepEntry\(/, '모듈 스크립트 함수는 인라인 onclick 에서 보이지 않는다');
  assert.match(page, /data-remove-entry="\$\{idx\}"/);
  assert.match(page, /getElementById\('stepEntriesList'\)\.addEventListener\('click'/);
  assert.match(page, /async function removeStepEntry\(idx\)/);
});
