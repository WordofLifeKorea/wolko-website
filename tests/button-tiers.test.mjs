import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(new URL('../public/wolko-buttons.css', import.meta.url), 'utf8');

test('단추 3단계: 36/14 · 32/13 · 28/12, 모서리 8px', () => {
  assert.match(css, /--wb-1-h: 36px; --wb-1-fs: 14px;/);
  assert.match(css, /--wb-2-h: 32px; --wb-2-fs: 13px;/);
  assert.match(css, /--wb-3-h: 28px; --wb-3-fs: 12px;/);
  assert.match(css, /--wb-radius: 8px;/);
  assert.equal((css.match(/:root:root:root :is\(/g) || []).length, 4, '단계마다 한 묶음 + 입력칸 한 묶음');
  assert.match(css, /select, \.ip-cc, \.ct-dd-btn, \.staff-ms-btn\n\):not\([^)]*\) \{\n  box-sizing: border-box;\n  height: var\(--wb-1-h\) !important;/, '입력칸은 주요 단추와 같은 높이');
});

test('단추 3단계: 포탈(캠프팀 제외)과 홈페이지 공통 틀이 모두 불러온다', () => {
  const root = new URL('../src/pages/portal/', import.meta.url).pathname;
  const pages = ['src/pages/portal.astro', 'src/layouts/BaseLayout.astro', 'src/pages/rsvp/thanksgiving.astro', 'src/pages/team-edit/[slug].astro'];
  for (const name of readdirSync(root)) {
    if (name === 'campteam') continue;
    const p = join(root, name);
    pages.push(statSync(p).isDirectory() ? join(p, 'index.astro') : p);
  }
  for (const p of pages) {
    const src = readFileSync(p.startsWith('/') ? p : new URL('../' + p, import.meta.url), 'utf8');
    const i = src.indexOf('wolko-buttons.css'), head = src.indexOf('</head>');
    assert.ok(i > 0 && i < head, p + ' 의 <head> 안에서 불러와야 한다');
  }
});
