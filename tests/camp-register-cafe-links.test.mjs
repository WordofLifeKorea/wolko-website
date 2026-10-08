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

test('staff application modal opens from the #staff-apply anchor', () => {
  assert.match(page, /location\.hash !== '#staff-apply'/);
  assert.match(page, /addEventListener\('hashchange', openStaffFromHash\)/);
});

test('staff recruitment banner has a scroll anchor that clears the fixed header', () => {
  assert.match(page, /id="staff-recruit"/);
  assert.match(page, /#staff-recruit \{ scroll-margin-top: 120px; \}/);
  assert.match(page, /location\.hash !== '#staff-recruit'/);
});
