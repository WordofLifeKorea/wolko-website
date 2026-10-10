import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');

test('pending-approval dot starts hidden and only shows with a real pending count', () => {
  assert.match(page, /class="hub-pending-badge hidden" id="pendingCount"/);
  assert.match(page, /if \(!res\.ok\) \{ badge\.textContent = ''; badge\.classList\.add\('hidden'\); return; \}/);
  assert.match(page, /badge\.classList\.toggle\('hidden', !pendingCount\)/);
});
