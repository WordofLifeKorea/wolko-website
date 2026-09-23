import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('RSVP page renders as a mobile invitation with a persistent action bar', async () => {
  const page = await read('src/pages/rsvp/index.astro');

  assert.match(page, /class="rv-invitation"/);
  assert.match(page, /class="rv-letter"/);
  assert.match(page, /class="rv-mobile-actions"/);
  assert.match(page, /position:fixed;[^}]*bottom:0;[^}]*grid-template-columns:1fr 1\.45fr/s);
  assert.match(page, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(page, /languageOnlyNav=\{true\}/);
});

test('RSVP invitation uses native sharing with a copy fallback', async () => {
  const page = await read('src/pages/rsvp/index.astro');

  assert.match(page, /if \(navigator\.share\)/);
  assert.match(page, /await navigator\.share\(\{/);
  assert.match(page, /navigator\.clipboard\.writeText\(link\)/);
  assert.doesNotMatch(page, /openModal\(target\)/);
});

test('RSVP supplies a dedicated Kakao-compatible social preview', async () => {
  const [layout, page, image] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/pages/rsvp/index.astro'),
    readFile(new URL('public/images/rsvp-share.png', root)),
  ]);

  assert.match(layout, /ogImage\?: string/);
  assert.match(layout, /<meta property="og:image:width" content="1200">/);
  assert.match(page, /ogImage="\/images\/rsvp-share\.png"/);
  assert.ok(image.length > 10_000);
});
