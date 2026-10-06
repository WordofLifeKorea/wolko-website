import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('공용 상단바는 설치형 앱의 상태바(safe-area) 높이만큼 위쪽을 비운다', () => {
  const css = readFileSync(new URL('../public/wolko-header.css', import.meta.url), 'utf8');
  assert.match(css, /padding-top: env\(safe-area-inset-top, 0px\) !important/);
  assert.match(css, /height: calc\(var\(--wl-head-h\) \+ env\(safe-area-inset-top, 0px\)\) !important/);
});
