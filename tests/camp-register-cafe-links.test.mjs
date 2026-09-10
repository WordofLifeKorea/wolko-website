import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');

test('camp registration header links both official Naver cafes', () => {
  assert.match(page, /href="https:\/\/cafe\.naver\.com\/wolkojrcamp"/);
  assert.match(page, /href="https:\/\/cafe\.naver\.com\/wolcamp"/);
  assert.match(page, /월코 캠프 네이버 카페/);
  assert.match(page, /제주 캠프 네이버 카페/);
});

test('camp cafe links keep mobile-sized touch targets', () => {
  assert.match(page, /\.crp-reg-header-cafe-link\s*\{[^}]*min-height:\s*36px/s);
  assert.match(page, /@media \(max-width: 640px\)[\s\S]*\.crp-reg-header-cafe-link\s*\{[^}]*min-height:\s*44px/s);
});
