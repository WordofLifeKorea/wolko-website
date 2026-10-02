import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('vehicle calendar is reachable from the portal and shared tool rail', async () => {
  const [portal, rail, car] = await Promise.all([
    read('src/pages/portal.astro'),
    read('public/wolko-rail.js'),
    read('src/pages/car/index.astro'),
  ]);

  assert.match(portal, /href: '\/car'[^\n]*icon: 'car'/);
  assert.match(rail, /href: '\/car'[^\n]*label: '차량 캘린더'/);
  assert.match(car, /<title>차량 스케줄 — WOLKO<\/title>/);
});
