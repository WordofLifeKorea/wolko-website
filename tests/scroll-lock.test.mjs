import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.astro')) out.push(p);
  }
  return out;
}
const root = new URL('..', import.meta.url).pathname;

test('모든 전체 페이지(레이아웃 포함)가 모달 스크롤 잠금 스크립트를 불러온다', () => {
  const pages = walk(join(root, 'src')).filter(p => /<html/i.test(readFileSync(p, 'utf8')));
  assert.ok(pages.length >= 14);
  for (const p of pages) assert.match(readFileSync(p, 'utf8'), /wolko-scroll-lock\.js/, p);
});

test('스크롤 잠금은 화면 전체를 덮는 모달류 fixed 요소가 보일 때 html/body 에 잠금 클래스를 건다', () => {
  const js = readFileSync(join(root, 'public/wolko-scroll-lock.js'), 'utf8');
  assert.match(js, /wl-scroll-locked/);
  assert.match(js, /position !== 'fixed'/);
  assert.match(js, /overflow:hidden !important/);
});

test('감사의 밤 팝업 닫기 버튼은 정원으로 고정된다', () => {
  const src = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');
  assert.match(src, /:root:root \.wh-promo-close \{[^}]*width: 34px !important; height: 34px !important;[^}]*aspect-ratio: 1 \/ 1/s);
});
