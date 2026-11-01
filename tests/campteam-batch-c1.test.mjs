import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { root } from './helpers/campteam-fakes.mjs';

const read = (f) => readFileSync(root + f, 'utf8');
const page = (n) => read('src/pages/portal/campteam/' + n + '.astro');

test('루미: 탭을 바꾸면 대화창을 다시 그려서 번역 안내문이 남지 않는다', () => {
  const js = read('public/portal/campteam/assistant.js');
  assert.match(js, /st\.mode = b\.dataset\.amode; save\(\); render\(\); input\.focus\(\);/, '탭 바꿀 때 render()');
  assert.match(js, /\(st\.mode === 'tr' \? '<div class="asst-note">'/, '안내문은 번역 탭에서만 그린다');
});

test('루미: 닫혀 있을 때 입력칸 높이가 0px로 굳지 않고, 예시 글은 한 줄이다', () => {
  const js = read('public/portal/campteam/assistant.js'), css = read('public/portal/campteam/assistant.css');
  assert.match(js, /function fit\(\) \{ input\.style\.height = 'auto'; if \(!input\.scrollHeight\) \{ input\.style\.height = ''; return; \}/, '높이를 못 잴 땐 기본 높이');
  assert.match(js, /paintStatic\(\); panel\.hidden = !st\.open; if \(st\.open\) fit\(\);/, '열릴 때 다시 맞춘다');
  assert.match(css, /\.asst-form textarea::placeholder\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/);
  for (const m of js.matchAll(/asstPh(?:Find|Do|Tr)?: '([^']*)'/g)) assert.ok(m[1].length <= (/[가-힣]/.test(m[1]) ? 22 : 28), `예시 글이 길다: ${m[1]}`);
});

test('홈: 창 폭이 바뀌면 넓은/좁은 화면 모양을 다시 그리고, 마우스로도 쪽을 넘길 수 있다', () => {
  const js = read('public/portal/campteam/home.js'), css = read('public/portal/campteam/campteam.css');
  assert.ok(js.includes('renderedWide = isWide') && js.includes("window.addEventListener('resize'") && js.includes('renderedWide !== wide()'), '폭이 바뀌면 render()');
  assert.ok(js.includes('data-pgd="-1"') && js.includes('data-pgd="1"') && js.includes('bar.onclick'), '화살표로 쪽 넘기기');
  assert.match(css, /\.pgr \.pgb\{/);
});

test('업무·회의록·보관함·자료·자료실 위쪽 메뉴는 밑줄 탭이다', () => {
  for (const n of ['tasks', 'meetings']) assert.ok(page(n).includes('<div class="tabs utabs" id="tabs">'), n);
  assert.ok(page('trash').includes('class="tabs utabs" id="trTabs"'));
  assert.ok(page('library').includes('class="tabs utabs" id="libTabs"'));
  assert.ok(page('files').includes('class="tabs utabs viewbar" id="viewBar"'));
  const css = read('public/portal/campteam/campteam.css');
  assert.match(css, /\.tabs\.utabs\{display:flex;flex-wrap:nowrap;[^}]*border-bottom:1px solid var\(--border\)/);
  assert.match(css, /\.tabs\.utabs \.tab\.on\{background:none;color:var\(--blue\);font-weight:800;border-bottom-color:var\(--blue\)\}/);
});
