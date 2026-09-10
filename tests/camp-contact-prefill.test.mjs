import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const camp = await readFile(new URL('src/pages/camp/index.astro', root), 'utf8');
const contact = await readFile(new URL('src/pages/contact/index.astro', root), 'utf8');

test('inland camp cards open the camp inquiry form while Jeju keeps its cafe link', () => {
  const inlandLinks = camp.match(/href="\/contact\?type=camp&amp;camp=inland#contact-form"/g) || [];
  assert.equal(inlandLinks.length, 4);
  assert.match(camp, /href="\/contact\?type=camp&amp;camp=inland#contact-form" class="cta-card"/);
  assert.match(camp, /href="\/contact\?type=camp&amp;camp=inland#contact-form" class="btn-contact"/);
  assert.match(camp, /href="https:\/\/cafe\.naver\.com\/wolcamp"/);
});

test('contact form anchor and query preset use the selected value for submission', () => {
  assert.match(contact, /id="contact-form"/);
  assert.match(contact, /scroll-margin-top:\s*100px/);
  assert.match(contact, /new URLSearchParams\(window\.location\.search\)\.get\('type'\)/);
  assert.match(contact, /typeSelect\.value = requestedType/);
  assert.match(contact, /<select id="ct-type-select" name="type">/);
  assert.match(contact, /var type\s+= document\.getElementById\('ct-type-select'\)\.value/);
  assert.doesNotMatch(contact, /id="ct-type-val"/);
  assert.match(contact, /<option value="camp">캠프 신청 \/ Camp Registration<\/option>/);
});
