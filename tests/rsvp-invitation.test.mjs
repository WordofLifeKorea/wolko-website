import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('RSVP listing page links out to the dedicated invitation instead of a modal', async () => {
  const page = await read('src/pages/rsvp/index.astro');

  assert.match(page, /invite: '\/rsvp\/thanksgiving\/'/);
  assert.match(page, /href=\{`\$\{event\.invite\}#rsvp`\}/);
  assert.doesNotMatch(page, /rv-modal/);
  assert.doesNotMatch(page, /openModal\(/);
});

test('RSVP invitation renders as a mobile page with an inline form', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /class="inv"/);
  assert.match(page, /id="rsvp"/);
  assert.match(page, /id="invForm"/);
  assert.match(page, /viewport-fit=cover/);
  assert.doesNotMatch(page, /rv-modal/);
});

test('RSVP invitation includes the parking notice', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /길 건너편 공영 주차장/);
});

test('RSVP invitation balloons are sourced emoji, not hand-drawn paths', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /🎈/);
  assert.doesNotMatch(page, /M2 12 C 10 1, 30 1, 38 12/);
});

test('RSVP invitation supports parties of 10 or more', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /id="invPartyCustom"/);
  assert.match(page, /min="10" max="200"/);
});

test('RSVP listing uses native sharing with a copy fallback', async () => {
  const listing = await read('src/pages/rsvp/index.astro');

  assert.match(listing, /if \(navigator\.share\)/);
  assert.match(listing, /await navigator\.share\(\{/);
  assert.match(listing, /navigator\.clipboard\.writeText\(link\)/);
});

test('RSVP pages supply a Kakao-compatible social preview', async () => {
  const [layout, listing, invite, image] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/pages/rsvp/index.astro'),
    read('src/pages/rsvp/thanksgiving.astro'),
    readFile(new URL('public/images/rsvp-share.png', root)),
  ]);

  assert.match(layout, /ogImage\?: string/);
  assert.match(layout, /<meta property="og:image:width" content="1200">/);
  assert.match(listing, /ogImage="\/images\/rsvp-share\.png"/);
  assert.match(invite, /rsvp-share\.png/);
  assert.ok(image.length > 10_000);
});
