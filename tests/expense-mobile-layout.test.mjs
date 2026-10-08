import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const src = readFileSync(new URL('../src/pages/expense/index.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/expense.css', import.meta.url), 'utf8');

test('read-only category shows code first and does not duplicate the submitted withdrawal account', () => {
  const start = src.indexOf('const subText =');
  const end = src.indexOf('const catKey =', start);
  const render = runInNewContext(src.slice(start, end) + '\ncatView;', {
    esc: s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
    srcShow: s => s, wdName: () => '개인 사역계좌',
    t: (key, arg) => key === 'wdShort' ? `출금: ${arg}` : key,
  });
  const html = render({ account: 'Missionary Account (8025)', source: '개인 사역계좌', withdrawAccount: 'personal' });
  assert.match(html, /8025 \| Missionary Account/);
  assert.equal(html.match(/개인 사역계좌/g).length, 1);
  assert.match(render({ account: 'Other/Unknown' }), /Other\/Unknown/);
  assert.match(render({ source: '월코' }), /월코/);
});

test('mobile date and amount share one divider and receipts have spacing before the category', () => {
  const mobile = css.slice(css.indexOf('/* Mobile report cards:'));
  assert.match(mobile, /tr::before[^}]*grid-column: 1 \/ -1; grid-row: 2;/);
  assert.match(mobile, /td:nth-child\(4\)[^}]*grid-row: 1;/);
  assert.match(mobile, /td:nth-child\(2\)[^}]*grid-row: 3;/);
  assert.match(mobile, /td:nth-child\(3\)[^}]*padding-top: 10px; border-top:/);
  assert.match(mobile, /gap: 10px 12px/);
  assert.match(mobile, /border: 0 !important/);
});

test('report containers and long text fit the viewport without hiding content', () => {
  assert.match(css, /\.ex-report-head > div \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.ex-card \{ overflow-wrap: anywhere; \}/);
  assert.match(css, /:root:root \{ --wl-page-x: 12px; --wl-card-pad: 14px; \}/);
  assert.match(css, /minmax\(min\(210px, 100%\), 1fr\)/);
});
