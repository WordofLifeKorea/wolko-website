import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('ministry hub presents all four ministries in both languages', async () => {
  const ministry = await read('src/pages/ministry/index.astro');

  assert.match(ministry, /<BaseLayout[\s\S]*activeNav="ministry"/);
  assert.match(ministry, /href="\/camp"/);
  assert.match(ministry, /href="\/wolbi-jeju"/);
  assert.match(ministry, /href="\/youth"/);
  assert.match(ministry, /href="\/jr-syme"/);
  assert.match(ministry, /캠프 사역/);
  assert.match(ministry, /Camp Ministry/);
  assert.match(ministry, /제주월비/);
  assert.match(ministry, /WOLBI Jeju/);
  assert.match(ministry, /청소년 사역/);
  assert.match(ministry, /Youth Ministry/);
  assert.match(ministry, /SYME 제자훈련/);
  assert.match(ministry, /SYME Discipleship/);
  assert.match(ministry, /@media \(max-width: 740px\)/);
  assert.match(ministry, /@media \(prefers-reduced-motion: reduce\)/);
});

test('public ministry entry points lead to the overview hub', async () => {
  const [layout, about, sitemap] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/pages/about/index.astro'),
    read('public/sitemap.xml'),
  ]);

  assert.match(layout, /<a href="\/ministry" data-direct-link class=\{`nav-link has-dropdown/);
  assert.match(layout, /class="mobile-parent-link" href="\/ministry"/);
  assert.equal((layout.match(/href="\/ministry"/g) || []).length, 2);
  assert.doesNotMatch(layout, /사역 한눈에 보기|Ministry Overview/);
  assert.match(about, /<a href="\/ministry" class="hero-cta">/);
  assert.match(sitemap, /<loc>https:\/\/wolko\.org\/ministry\/<\/loc>/);
});

test('about commitment cards use a corner glow instead of a side stripe', async () => {
  const about = await read('src/pages/about/index.astro');

  assert.doesNotMatch(about, /\.commit-card::before\s*\{[^}]*left:0;[^}]*height:100%/s);
  assert.match(about, /\.commit-card::before\s*\{[^}]*right:-64px;[^}]*radial-gradient/s);
  assert.match(about, /\.commit-icon\s*\{[^}]*linear-gradient/s);
});
