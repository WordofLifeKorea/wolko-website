import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');

test('캠프 신청 페이지: 바로가기 줄이 월코 캠프 · 제주 캠프 · 평택 스태프 · 제주 스태프 문의 구역으로 이어진다', () => {
  for (const id of ['camps-wolko', 'camps-jeju', 'staff-recruit', 'staff-jeju']) {
    assert.match(page, new RegExp(`class="crp-jump-pill" href="#${id}"`), id);
    assert.match(page, new RegExp(`id="${id}"[^>]*data-jump-target`), id);
  }
  assert.match(page, /\.crp-jump \{\s*position: sticky;/, '폰에서는 머리글 아래에 붙어 따라온다');
});

test('캠프 카드: 신청 기간 · 장학금 · 안내 글은 \'자세히 보기\' 안에 — 폰에서는 접고 컴퓨터에서는 펼친다', () => {
  assert.equal((page.match(/<details class="crp-more" open data-crp-more>/g) || []).length, 2, '내륙 · 제주 카드 둘 다');
  assert.match(page, /d\.open = !phone\.matches;/);
  const card = page.slice(page.indexOf('<details class="crp-more"'), page.indexOf('</details>'));
  assert.match(card, /신청 기간/); assert.match(card, /SCHOLARSHIPS\.map/); assert.match(card, /crp-reg-notes/);
});
