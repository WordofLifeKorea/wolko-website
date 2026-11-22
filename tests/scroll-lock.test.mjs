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

test('모든 전체 페이지(레이아웃 포함)가 뒤로가기로 모달을 닫는 스크립트를 한 번씩 불러온다', () => {
  const pages = walk(join(root, 'src')).filter(p => /<html/i.test(readFileSync(p, 'utf8')));
  assert.ok(pages.length >= 14);
  for (const p of pages) {
    const n = (readFileSync(p, 'utf8').match(/wolko-back-close\.js/g) || []).length;
    assert.equal(n, 1, p);
  }
});

test('뒤로가기 모달 닫기: 스크립트 핵심 동작과 페이지별 연결이 남아 있다', () => {
  const js = readFileSync(join(root, 'public/wolko-back-close.js'), 'utf8');
  assert.match(js, /history\.pushState\(\{ wlm:/);
  assert.match(js, /stopImmediatePropagation/);
  assert.match(js, /r\.left < window\.innerWidth/);          // 화면 밖으로 밀어 둔 패널은 열린 창이 아니다
  assert.match(js, /scrollRestoration/);                        // 기록을 치울 때 스크롤이 튀지 않는다
  assert.match(js, /ct-confirm/);                               // 캠프팀 확인창은 campteam.js 가 다룬다
  assert.match(js, /force-pw/);                                 // 강제 비밀번호 변경 창은 건드리지 않는다
  const exp = readFileSync(join(root, 'src/pages/portal/expense/index.astro'), 'utf8');
  assert.match(exp, /WolkoBack\.step\(el,/);
  assert.match(exp, /data-wl-modal/);
  const cr = readFileSync(join(root, 'src/pages/camp-register/index.astro'), 'utf8');
  assert.match(cr, /WolkoBack\.step\(modal,/);
  const res = readFileSync(join(root, 'src/pages/portal/resource.astro'), 'utf8');
  assert.match(res, /id="editorOverlay"[^>]*data-wl-back="own"/);
  assert.match(res, /id="viewerOverlay"[^>]*data-wl-back="own"/);
  const ct = readFileSync(join(root, 'public/portal/campteam/campteam.js'), 'utf8');
  assert.match(ct, /x\._ctOk && !x\.classList\.contains\('ct-confirm'\)/);
  const crs = readFileSync(join(root, 'src/pages/portal/crs/index.astro'), 'utf8');
  assert.doesNotMatch(crs, /\.\.\.\(history\.state \|\| \{\}\)/);
});
