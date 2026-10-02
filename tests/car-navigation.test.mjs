import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('vehicle log replaces reservation links without deleting the old page', async () => {
  const [portal, rail, car, log] = await Promise.all([
    read('src/pages/portal.astro'),
    read('public/wolko-rail.js'),
    read('src/pages/car/index.astro'),
    read('src/pages/car-log/index.astro'),
  ]);

  assert.match(portal, /href: '\/car-log'[^\n]*icon: 'car'/);
  assert.match(rail, /href: '\/car-log'[^\n]*label: '차량 사용 일지'/);
  assert.doesNotMatch(portal, /href: '\/car'/);
  assert.doesNotMatch(rail, /href: '\/car'/);
  assert.match(car, /<title>차량 스케줄 — WOLKO<\/title>/);
  assert.match(log, /id="usageForm"/);
  assert.match(log, /capture="environment"/);
  assert.match(log, /car-qr-silver-van\.svg/);
  assert.match(log, /car-qr-santa-fe\.svg/);
});
