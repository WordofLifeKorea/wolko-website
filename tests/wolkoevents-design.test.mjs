import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const page = await readFile(new URL('../src/pages/portal/wolkoevents.astro', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/wolkoevents.css', import.meta.url), 'utf8');
const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function setup() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', dataset: {}, setAttribute() {}, addEventListener() {} });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { documentElement: {}, getElementById: element, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: { getItem: () => null },
  });
  vm.runInContext(script, context);
  return { context, element };
}

const entries = [
  { name: 'Older', phone: '01012345678', email: 'old@example.com', partySize: 2, notes: 'Thank you', createdAt: '2026-09-20T00:00:00Z' },
  { name: 'Newer', phone: '01087654321', email: 'new@example.com', partySize: 3, notes: '<script>alert(1)</script>', createdAt: '2026-09-21T00:00:00Z' },
];

test('event list summarizes guests and renders newest first with escaped notes', () => {
  const { context, element } = setup();
  vm.runInContext(`rsvpEntries = ${JSON.stringify(entries)}; renderRsvpData();`, context);
  assert.equal(element('rsvpGuestCount').textContent, '5');
  assert.equal(element('rsvpEntryCount').textContent, '2');
  const html = element('rsvpRegBody').innerHTML;
  assert.ok(html.indexOf('Newer') < html.indexOf('Older'));
  assert.match(html, /010-1234-5678/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('search filters rows without changing total attendance and supports empty results', () => {
  const { context, element } = setup();
  vm.runInContext(`rsvpEntries = ${JSON.stringify(entries)};`, context);
  element('rsvpSearch').value = 'thank';
  vm.runInContext('renderRsvpData()', context);
  assert.match(element('rsvpRegBody').innerHTML, /Older/);
  assert.doesNotMatch(element('rsvpRegBody').innerHTML, /Newer/);
  assert.equal(element('rsvpGuestCount').textContent, '5');
  element('rsvpSearch').value = 'no match';
  vm.runInContext('renderRsvpData()', context);
  assert.match(element('rsvpRegBody').innerHTML, /검색 결과가 없습니다/);
});

test('event design uses its own wrapping table and mobile cards without left accents', () => {
  assert.match(page, /wolkoevents\.css\?v=\d+/);
  assert.doesNotMatch(page, /staff-reg-table/);
  assert.match(css, /white-space: normal/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.events-table thead \{ display: none; \}/);
  assert.doesNotMatch(css, /border-left/);
});

test('초대장이 없는 행사(제주 캠퍼스데이)에서는 "초대장 보기" 링크가 숨고, hidden 이 CSS 에 덮이지 않는다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/wolkoevents.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/wolkoevents.css', import.meta.url), 'utf8');
  const jeju = page.split('\n').find(l => l.includes("id: 'jeju-campus-day'"));
  assert.ok(jeju && /invite:\s*''/.test(jeju), '제주 캠퍼스데이에는 초대장 주소가 비어 있다');
  assert.match(page, /invite\.hidden = !ev\.invite/);
  assert.match(css, /\.events-invitation\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});
