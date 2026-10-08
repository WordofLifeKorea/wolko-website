import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('vehicle menu is the last WOLKO tool; reservations, maintenance and usage log are its three tabs', async () => {
  const [portal, rail, car, log, carCss] = await Promise.all([
    read('src/pages/portal.astro'),
    read('public/wolko-rail.js'),
    read('src/pages/car/index.astro'),
    read('src/pages/car-log/index.astro'),
    read('public/car.css'),
  ]);

  assert.match(portal, /href: '\/car-drive'[^\n]*icon: 'car'/);
  assert.match(rail, /href: '\/car-drive'[^\n]*label: '차량'/);
  assert.doesNotMatch(portal, /href: '\/car'[,\s]/);
  assert.doesNotMatch(rail, /href: '\/car'[,\s]/);
  assert.ok(portal.indexOf("href: '/resource'") < portal.indexOf("href: '/car-drive'"));
  assert.ok(rail.indexOf("href: '/expense'") < rail.indexOf("href: '/car-drive'"));
  assert.match(car, /id="viewTabReservations"/);
  assert.match(car, /id="viewTabMaintenance"/);
  assert.match(car, /href="\/car-log\/"/);
  assert.match(log, /href="\/car\/\?view=maintenance"/);
  assert.match(log, /class="car-header"/);
  assert.match(car, /<title>차량 스케줄 — WOLKO<\/title>/);
  assert.match(car, /\/car\.css\?v=\d+/);
  assert.match(log, /id="usageForm"/);
  assert.match(log, /capture="environment"/);
  assert.match(log, /car-qr-silver-van\.svg/);
  assert.match(log, /car-qr-santa-fe\.svg/);
});

test('예약현황: 좌우 이전/다음 달 미리보기는 없고, 달력 옆(넓은 화면)·아래(좁은 화면)에 선택한 날의 세부 예약이 보인다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/car/index.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/car.css', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /miniPrev|miniNext|renderMiniMonth|jumpMiniMonth/);
  assert.doesNotMatch(css, /\.cal-mini/);
  assert.match(page, /<div class="car-day-panel">[\s\S]*id="agendaContainer"/, '세부 예약은 달력 옆 패널 안에 있다');
  assert.match(css, /#reservationsView\.res-layout:not\(\.hidden\) \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(300px, 380px\)/);
  assert.match(css, /@media \(max-width: 1100px\) \{\s*#reservationsView\.res-layout:not\(\.hidden\) \{ grid-template-columns: minmax\(0, 1fr\); \}/, '좁은 화면에서는 달력 아래로');
  assert.match(css, /\.cal-daynum-cell \{ min-height: 96px !important; \}/, '달력 세로 길이를 줄인다');
});
