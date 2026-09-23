import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('RSVP listing page links out to the dedicated invitation instead of a modal', async () => {
  const page = await read('src/pages/rsvp/index.astro');

  assert.match(page, /invite: '\/rsvp\/thanksgiving\/'/);
  assert.match(page, /href=\{event\.invite\}/);
  assert.doesNotMatch(page, /href=\{`\$\{event\.invite\}#rsvp`\}/);
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

test('RSVP listing keeps parking details in the invitation and sizes mobile actions equally', async () => {
  const listing = await read('src/pages/rsvp/index.astro');

  assert.doesNotMatch(listing, /rv-parking|주차장이 협소하여/);
  assert.match(listing, /@media \(max-width: 640px\)[\s\S]*\.rv-card-actions \{ display: grid; grid-template-columns: 1fr; \}/);
  assert.match(listing, /\.rv-card-actions > \.rv-rsvp-btn,[\s\S]*\.rv-card-actions > \.rv-share-btn \{ width: 100%; height: 48px;/);
});

test('RSVP card and cover use a quiet invitation line while details retain the address', async () => {
  const [listing, invite] = await Promise.all([
    read('src/pages/rsvp/index.astro'),
    read('src/pages/rsvp/thanksgiving.astro'),
  ]);

  assert.match(listing, /theme_ko: '함께한 한 해를 돌아보며 감사를 나누는 저녁'/);
  assert.match(listing, /\{event\.theme_ko\}/);
  assert.doesNotMatch(listing, /경기도 평택시 경기대로 1407/);
  assert.match(invite, /class="inv-cover-when[^\n]*\{event\.date\}<br>함께한 한 해를 돌아보며 감사를 나누는 저녁/);
  assert.match(invite, /<dd>\{event\.place\}<\/dd>/);
});

test('RSVP music toggle uses one unslashed note and handles its own first interaction', async () => {
  const invite = await read('src/pages/rsvp/thanksgiving.astro');

  const musicButton = invite.match(/<button type="button" class="inv-music"[\s\S]*?<\/button>/)?.[0];
  assert.ok(musicButton);
  assert.equal((musicButton.match(/<svg/g) ?? []).length, 1);
  assert.doesNotMatch(musicButton, /<line/);
  assert.match(invite, /musicBtn\.classList\.toggle\('is-playing', audible\)/);
  assert.match(invite, /musicBtn\.contains\(event\.target\)/);
  assert.match(invite, /musicBtn\.setAttribute\('aria-label', audible \? '배경음악 일시정지' : '배경음악 재생'\)/);
});

test('RSVP invitation leaves are sourced emoji, not hand-drawn paths', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /🍁|🍂|🍃/);
  assert.doesNotMatch(page, /M2 12 C 10 1, 30 1, 38 12/);
});

test('RSVP invitation supports parties of 10 or more', async () => {
  const page = await read('src/pages/rsvp/thanksgiving.astro');

  assert.match(page, /id="invPartyCustom"/);
  assert.match(page, /min="10" max="200"/);
});

test('RSVP invitation fireworks vary their burst shape and pause when motion is reduced', async () => {
  const [page, script] = await Promise.all([
    read('src/pages/rsvp/thanksgiving.astro'),
    read('public/rsvp-fireworks.js'),
  ]);

  assert.match(page, /<canvas class="inv-fireworks" id="invFireworks" aria-hidden="true"><\/canvas>/);
  assert.match(page, /<script src="\/rsvp-fireworks\.js\?v=3" defer><\/script>/);
  assert.doesNotMatch(page, /inv-fw-spark|fwSparkAngles/);
  assert.match(script, /\['peony', 'ring'\]/);
  assert.doesNotMatch(script, /'palm'|'willow'/);
  assert.match(script, /i \* Math\.PI \* 2 \/ count/);
  assert.match(script, /width \* 0\.32[\s\S]*width \* 0\.68/);
  assert.match(script, /const burstScale = Math\.min\(1, width \/ 520\)/);
  assert.doesNotMatch(script, /spark\.size \* 3/);
  assert.match(script, /spark\.trail\.forEach\(point => context\.lineTo/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /document\.hidden/);
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
