import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('staff application keeps its banner outside the scrolling form body', async () => {
  const page = await readFile(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');

  assert.match(page, /class="crp-modal-head crp-staff-modal-head"[\s\S]*class="crp-staff-modal-body"[\s\S]*id="staffFormWrap"/);
  assert.match(page, /#staffModal \.crp-modal-card \{[\s\S]*?overflow: hidden;/);
  assert.match(page, /#staffModal \.crp-staff-modal-body \{[\s\S]*?overflow-y: auto;/);
  assert.match(page, /#staffModal \.crp-modal-close \{[\s\S]*?position: absolute;/);
});
