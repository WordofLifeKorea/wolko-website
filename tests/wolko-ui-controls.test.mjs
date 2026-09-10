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

test('contact navigation follows the selected language everywhere', async () => {
  const layout = await read('src/layouts/BaseLayout.astro');
  const localizedContactLinks = layout.match(
    /<a href="\/contact"><span class="wl-ko">문의<\/span><span class="wl-en">Contact<\/span><\/a>/g,
  ) || [];

  assert.equal(localizedContactLinks.length, 3);
});
