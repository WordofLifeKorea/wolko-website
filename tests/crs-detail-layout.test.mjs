import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');

test('CRS detail panel is laid out before relationship cards render', () => {
  assert.match(source, /\.detail-panel \{[^}]*display:none;[^}]*flex:1 1 0%/s);
  assert.match(source, /\.app-body\.split \.detail-panel \{[^}]*display:flex/s);
  assert.doesNotMatch(source, /\.detail-panel \{[^}]*max-width:0/s);
  assert.match(source, /detailPanel'\)\.getBoundingClientRect\(\);\s*renderDetailBody\(church\)/);
});

test('relationship cards keep content-sized rows on desktop and mobile', () => {
  assert.match(source, /\.steps-list \{[^}]*grid-auto-rows:max-content;[^}]*align-content:start/s);
  assert.match(source, /\.step-item \{[^}]*height:auto;[^}]*align-self:start/s);
  assert.match(source, /@media\(max-width:768px\)[\s\S]*\.steps-list \{[^}]*grid-auto-rows:max-content;[^}]*align-content:start/);
});
