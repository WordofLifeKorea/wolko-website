import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');

test('camp registration still links both official Naver cafes from the camp cards', () => {
  assert.match(page, /href="https:\/\/cafe\.naver\.com\/wolkojrcamp"/);
  assert.match(page, /href="https:\/\/cafe\.naver\.com\/wolcamp"/);
  assert.match(page, /월코 캠프 네이버 카페/);
  assert.match(page, /제주 캠프 네이버 카페/);
});

test('camp registration header no longer carries the cafe banner', () => {
  assert.doesNotMatch(page, /crp-reg-header-aside/);
  assert.doesNotMatch(page, /네이버 카페에서도/);
});
