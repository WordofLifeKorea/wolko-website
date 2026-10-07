import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

// 왼쪽 레일을 쓰는 포탈 도구 페이지 (CRS는 자체 2단 앱 레이아웃이라 제외)
const TOOL_PAGES = [
  'src/pages/schedule/index.astro',
  'src/pages/wolkoevents.astro',
  'src/pages/resource.astro',
  'src/pages/expense/index.astro',
  'src/pages/car-drive/index.astro',
  'src/pages/car-log/index.astro',
  'src/pages/car/index.astro',
  'src/pages/kitchen/index.astro',
  'src/pages/wolkoadmin.astro',
  'src/pages/campstaff/index.astro',
];

test('every portal tool page loads the shared layout, control and header stylesheets', async () => {
  for (const file of TOOL_PAGES) {
    const source = await read(file);
    assert.match(source, /\/wolko-layout\.css\?v=\d+/, `${file} must load wolko-layout.css`);
    assert.match(source, /\/wolko-ui\.css\?v=\d+/, `${file} must load wolko-ui.css`);
    assert.match(source, /\/wolko-rail\.css\?v=\d+/, `${file} must load wolko-rail.css`);
    assert.match(source, /\/wolko-header\.css\?v=\d+/, `${file} must load wolko-header.css`);
    assert.ok(
      source.indexOf('/wolko-layout.css') > source.indexOf('/wolko-rail.css'),
      `${file}: wolko-layout.css must come after the page-level shared styles`,
    );
  }
});

test('shared layout tokens define one page width, padding, card and field size', async () => {
  const css = await read('public/wolko-layout.css');
  assert.match(css, /--wl-page-max:\s*1280px/);
  assert.match(css, /--wl-page-x:\s*28px/);
  assert.match(css, /--wl-card-radius:\s*18px/);
  assert.match(css, /--wl-btn-gap:\s*10px/);
  for (const wrap of ['.sc-wrap', '.adm-wrap', '.events-wrap', '.portal-main', '.ex-wrap', '.log-wrap', '.car-wrap', 'main.page']) {
    assert.ok(css.includes(wrap), `${wrap} must use the shared page container`);
  }
  assert.match(css, /max-width:\s*var\(--wl-page-max\)\s*!important/);
});

test('page titles are not repeated under the header: no eyebrow labels, no duplicate title blocks', async () => {
  for (const file of ['src/pages/expense/index.astro', 'src/pages/schedule/index.astro', 'src/pages/car/index.astro', 'src/pages/wolkoadmin.astro']) {
    const source = await read(file);
    assert.ok(!source.includes('wl-page-head') && !source.includes('sc-title-row') && !source.includes('car-title-row'), `${file} must not repeat the header title`);
  }
  for (const file of TOOL_PAGES) {
    const source = await read(file);
    assert.ok(!/class="(wl-eyebrow|events-eyebrow|log-kicker)"/.test(source), `${file} must not show an eyebrow label`);
  }
});

test('vehicle pages start with the same four-tab menu followed by a one-line lead', async () => {
  for (const file of ['src/pages/car-drive/index.astro', 'src/pages/car-log/index.astro']) {
    const source = await read(file);
    assert.ok(!source.includes('class="log-intro"'), `${file}: no duplicated title block`);
    assert.ok(source.indexOf('class="car-view-tabs') < source.indexOf('class="wl-lead"'), `${file}: tabs first, lead line after`);
  }
  const css = await read('public/wolko-layout.css');
  assert.match(css, /\.car-view-tabs\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\) !important/s);
});

test('every portal page loads the language sync before anything else reads the saved language', async () => {
  for (const file of [...TOOL_PAGES, 'src/pages/portal.astro', 'src/pages/crs/index.astro']) {
    const source = await read(file);
    assert.match(source, /<script is:inline src="\/wolko-lang-sync\.js\?v=\d+"><\/script>/, `${file} must load wolko-lang-sync.js synchronously`);
  }
});

test('the shared header adds one logout button to every tool page that lacks one', async () => {
  const js = await read('public/wolko-rail.js');
  assert.match(js, /function mountLogout\(\)/);
  assert.match(js, /btn-logout wl-logout/);
  assert.match(js, /mountLogout\(\);/);
});

test('one header spec: 60px bar, brand left, controls right at 36px with 10px gaps, single row on phones', async () => {
  const css = await read('public/wolko-header.css');
  assert.match(css, /--wl-head-h:\s*60px/);
  assert.match(css, /--wl-head-ctl:\s*36px/);
  assert.match(css, /body > header > :first-child[^{]*\{[^}]*margin-right: auto !important/s);
  assert.match(css, /flex-direction: row !important/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*--wl-head-h:\s*56px/);
  assert.match(css, /@media \(max-width: 480px\)/);
  // 두 가지 언어 토글 구현이 같은 크기를 쓴다
  assert.match(css, /\.wl-lang-toggle, body > header \.adm-lang-switch/);
  const rail = await read('public/wolko-rail.js');
  assert.match(rail, /mountLogout/);
});

test('the resource page header no longer carries a duplicate portal button', async () => {
  const source = await read('src/pages/resource.astro');
  assert.ok(!source.includes('class="back-link"'));
});

test('내 정보 창의 닫기 버튼은 모바일에서도 정원으로 고정된다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/wolko-rail.css', import.meta.url), 'utf8');
  assert.match(css, /\.wl-prof-close \{[^}]*width: 36px !important; height: 36px !important; min-width: 0 !important; min-height: 0 !important;[^}]*aspect-ratio: 1 \/ 1/);
});

test('공용 왼쪽 메뉴 · 머리글 스크립트/스타일은 모든 페이지가 같은 버전을 불러온다 (옛 버전이 캐시에 남아 새 메뉴가 안 보이는 일 방지)', async () => {
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const files = [];
  const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.astro')) files.push(p); } };
  walk(new URL('../src', import.meta.url).pathname);
  const seen = {};
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(wolko-(?:rail\.js|rail\.css|header\.css|layout\.css|ui\.css))\?v=(\d+)/g)) (seen[m[1]] ||= new Set()).add(m[2]);
  }
  for (const [name, versions] of Object.entries(seen)) assert.equal(versions.size, 1, `${name} 버전이 페이지마다 다름: ${[...versions].join(', ')}`);
});

test('왼쪽 메뉴 아이콘 색은 메뉴마다 달라서 겹치지 않고, 포탈 첫 화면과 같은 색을 쓴다', async () => {
  const { readFileSync } = await import('node:fs');
  const grab = (file, re) => Object.fromEntries([...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(re)].map(m => [m[1], m[2].toLowerCase()]));
  const rail = grab('../public/wolko-rail.js', /href: '(\/[a-z-]+)', color: '(#[0-9a-fA-F]{6})'/g);
  const home = grab('../src/pages/portal.astro', /href: '(\/[a-z-]+)', color: '(#[0-9a-fA-F]{6})'/g);
  assert.equal(Object.keys(rail).length, 11);
  assert.equal(new Set(Object.values(rail)).size, 11, '색이 겹친다');
  assert.deepEqual(home, rail);
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  for (const [href, c] of Object.entries(rail)) assert.ok(lum(c) > 0.12, `${href} ${c} 가 어두운 메뉴 배경에서 잘 안 보인다`);
});
