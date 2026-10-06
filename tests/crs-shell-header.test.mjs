import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('CRS 의 임시 셸 헤더는 공용 헤더 CSS(!important)보다 우선해서 항상 숨겨진다 (헤더가 두 줄로 겹치지 않게)', () => {
  const src = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
  assert.match(src, /:root:root:root #crsShellHeader \{ display:none !important; \}/);
});
