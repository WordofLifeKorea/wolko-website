import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('shared control stylesheet defines the WOLKO sizing system', async () => {
  const css = await read('public/wolko-ui.css');

  assert.match(css, /--wl-control-height:\s*44px/);
  assert.match(css, /--wl-control-height-compact:\s*36px/);
  assert.match(css, /\.btn-edit-mode/);
  assert.match(css, /\.btn-print/);
  assert.match(css, /\.btn-csv/);
  assert.match(css, /\.season-select/);
  assert.match(css, /\[role="dialog"\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.crp-modal-close/);
});

test('public layout and every standalone app load the sizing system', async () => {
  const files = [
    'src/layouts/BaseLayout.astro',
    'src/pages/portal.astro',
    'src/pages/resource.astro',
    'src/pages/wolkoadmin.astro',
    'src/pages/crs/index.astro',
    'src/pages/campstaff/index.astro',
    'src/pages/car/index.astro',
    'src/pages/schedule/index.astro',
    'src/pages/team-edit/[slug].astro',
  ];

  for (const file of files) {
    const source = await read(file);
    assert.match(source, /\/wolko-ui\.css\?v=1/, `${file} must load wolko-ui.css`);
  }
});

test('portal mobile header actions stay visually compact', async () => {
  const [css, portal] = await Promise.all([
    read('public/hub.css'),
    read('src/pages/portal.astro'),
  ]);

  assert.match(css, /\.hub-sidebar-lang\s*\{[^}]*min-height:\s*36px\s*!important;/s);
  assert.match(css, /\.hub-lang-btn\s*\{[^}]*height:\s*30px;[^}]*min-height:\s*30px\s*!important;/s);
  assert.match(css, /\.hub-lang-toggle\s*\{[^}]*height:\s*36px;/s);
  assert.match(portal, /\/hub\.css\?v=15/);
});

test('portal mobile layout respects Safari safe areas and dynamic viewport', async () => {
  const [css, authCss, portal] = await Promise.all([
    read('public/hub.css'),
    read('public/wolko-auth.css'),
    read('src/pages/portal.astro'),
  ]);

  assert.match(portal, /viewport-fit=cover/);
  assert.match(css, /--hub-safe-top:\s*env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /\.hub-shell\s*\{[^}]*min-height:\s*100dvh;/s);
  assert.match(css, /\.hub-sidebar\s*\{[^}]*min-height:\s*calc\(50px \+ var\(--hub-safe-top\)\);/s);
  assert.match(css, /padding:\s*calc\(7px \+ var\(--hub-safe-top\)\)/);
  assert.match(css, /\.hub-wrap\s*\{[^}]*var\(--hub-safe-bottom\)/s);
  assert.match(authCss, /env\(safe-area-inset-top, 0px\)/);
});

test('contact navigation follows the selected language everywhere', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  const localizedContactLinks = layout.match(
    /<a href="\/contact"><span class="wl-ko">문의<\/span><span class="wl-en">Contact<\/span><\/a>/g,
  ) || [];

  assert.equal(localizedContactLinks.length, 3);
});
