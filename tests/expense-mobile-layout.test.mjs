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

test('mobile amount sits below the category at the lower right and receipts have spacing', () => {
  const mobile = css.slice(css.indexOf('/* Mobile report cards:'));
  assert.match(mobile, /tr::before[^}]*grid-column: 1 \/ -1; grid-row: 2;/);
  assert.match(mobile, /td:nth-child\(4\)[^}]*grid-column: 1 \/ -1; grid-row: 5;/);
  assert.match(mobile, /td:nth-child\(2\)[^}]*grid-row: 3;/);
  assert.match(mobile, /td:nth-child\(3\)[^}]*padding-top: 10px; border-top:/);
  assert.match(mobile, /gap: 10px 12px/);
  assert.match(mobile, /border: 0 !important/);
});

test('desktop and accounting detail item amounts align at the bottom', () => {
  assert.match(css, /td\.r \{ vertical-align: bottom; \}/);
  const start = src.indexOf('function detailHtml(');
  const detail = src.slice(start, start + 4000);
  assert.ok(detail.indexOf('class="ex-d-amt"') > detail.indexOf('codeFlow(r, i,'));
  assert.match(css, /\.ex-d-item > \.ex-d-amt \{\s*grid-column: 2 \/ -1; grid-row: auto;/);
});

test('editable accounting fields open native selects directly and show the amount only in the withdrawal row', () => {
  const flow = src.slice(src.indexOf('const codeFlow ='), src.indexOf('// 보기 화면: 영수증은'));
  const render = runInNewContext(flow + '\ncodeFlow;', {
    APPROVAL_ACCOUNTS: ['Missionary Account (8025)'],
    WITHDRAW: [{ id: 'personal', ko: '개인 사역계좌', en: 'Personal Ministry' }], WITHDRAW_ALL: [],
    lang: 'ko', esc: String, t: key => key, krw: n => `KRW ${n}`, isFx: () => false,
  });
  const html = render({ account: 'Missionary Account (8025)', withdrawAccount: 'personal', amountKrw: 31850 }, 0);
  assert.equal((html.match(/<select /g) || []).length, 2);
  assert.match(html, /data-recat-i="0"/);
  assert.match(html, /data-wd-i="0"/);
  assert.doesNotMatch(html, /hidden|code-change|ex-cf-toggle/);
  assert.equal((html.match(/KRW 31850/g) || []).length, 1);
  assert.ok(html.indexOf('ex-inline-amount') > html.indexOf('data-wd-i'));
});

test('report containers and long text fit the viewport without hiding content', () => {
  assert.match(css, /\.ex-report-head > div \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.ex-card \{ overflow-wrap: anywhere; \}/);
  assert.match(css, /:root:root \{ --wl-page-x: 12px; --wl-card-pad: 14px; \}/);
  assert.match(css, /minmax\(min\(210px, 100%\), 1fr\)/);
});

test('note position stays fixed regardless of the amount length', () => {
  assert.match(css, /\.ex-inline-amount \{ flex: 0 0 128px; width: 128px;/);
  assert.match(css, /\.ex-code-inline \.ex-cf-row \.ex-cf-actions \{ gap: 24px; \}/);
});
