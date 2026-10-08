import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
const source = page.match(/  function latestVisitSummary\(church\) \{[\s\S]*?\n  \}/)[0];
const summary = runInNewContext(`${source}\nlatestVisitSummary`);

test('last visit uses the visit date, not the entry creation time', () => {
  assert.equal(summary({ visits: {
    recent: { date: '2026-10-08', visitor: 'Sam', recordedAt: 1 },
    old: { date: '2026-09-01', visitor: 'Alex', recordedAt: 2 },
    removed: null,
  } }), '2026-10-08 · Sam');
});

test('last visit includes legacy dates and handles missing records', () => {
  assert.equal(summary({ lastVisitDate: '2026-10-08', lastVisitVisitor: 'Kim' }), '2026-10-08 · Kim');
  assert.equal(summary({ visitDate: '2026-10-08' }), '2026-10-08');
  assert.equal(summary({}), '');
  assert.equal(summary({ lastVisitDate: '2026-10-08', lastVisitVisitor: 'Kim', visits: {
    old: { date: '2026-09-01', visitor: 'Alex' },
  } }), '2026-10-08 · Kim');
});

test('last visit is escaped and visible in the card header', () => {
  assert.match(page, /class="pastor-name"[^\n]*\n\s*<p class="last-visit-summary">\$\{t\('last_visit'\)\}: \$\{esc\(lastVisitDisplay \|\| t\('not_entered'\)\)\}/);
});
