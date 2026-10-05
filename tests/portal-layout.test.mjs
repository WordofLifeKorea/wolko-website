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

test('every tool page opens with the same eyebrow, title and description block', async () => {
  const expectations = {
    'src/pages/schedule/index.astro': 'class="wl-eyebrow"',
    'src/pages/wolkoevents.astro': 'events-eyebrow',
    'src/pages/expense/index.astro': 'class="wl-eyebrow"',
    'src/pages/car-drive/index.astro': 'log-kicker',
    'src/pages/car-log/index.astro': 'log-kicker',
    'src/pages/car/index.astro': 'class="wl-eyebrow"',
    'src/pages/wolkoadmin.astro': 'class="wl-eyebrow"',
    'src/pages/campstaff/index.astro': 'class="wl-eyebrow"',
  };
  for (const [file, marker] of Object.entries(expectations)) {
    assert.ok((await read(file)).includes(marker), `${file} must show an eyebrow label`);
  }
});

test('vehicle pages show the title block first and the same four-tab menu below it', async () => {
  for (const file of ['src/pages/car-drive/index.astro', 'src/pages/car-log/index.astro']) {
    const source = await read(file);
    assert.ok(source.indexOf('class="log-intro"') < source.indexOf('class="car-view-tabs'), `${file}: title block comes before the tab menu`);
  }
  const css = await read('public/wolko-layout.css');
  assert.match(css, /\.car-view-tabs\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\) !important/s);
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
