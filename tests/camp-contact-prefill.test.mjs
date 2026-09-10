import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const camp = await readFile(new URL('src/pages/camp/index.astro', root), 'utf8');
const contact = await readFile(new URL('src/pages/contact/index.astro', root), 'utf8');

test('camp inquiry actions open the preselected form while info cards keep cafe links', () => {
  const inlandLinks = camp.match(/href="\/contact\?type=camp&amp;camp=inland#contact-form"/g) || [];
  assert.equal(inlandLinks.length, 2);
  assert.match(camp, /href="\/contact\?type=camp&amp;camp=inland#contact-form" class="cta-card"/);
  assert.match(camp, /href="\/contact\?type=camp&amp;camp=inland#contact-form" class="btn-contact"/);
  assert.match(camp, /href="https:\/\/cafe\.naver\.com\/wolcamp"/);
});

test('program cards replace links with accessible animated eligibility hints', () => {
  assert.doesNotMatch(camp, /class="prog-link"/);
  assert.match(camp, /초6–중3/);
  assert.match(camp, /만 11–15세/);
  assert.match(camp, /고1–고3/);
  assert.match(camp, /만 15–18세/);
  assert.match(camp, /교회 단위 참여/);
  assert.match(camp, /tabindex="0" aria-describedby="english-camp-hint"/);
  assert.match(camp, /\.prog-card:hover \.prog-hint,[\s\S]*\.prog-card:focus \.prog-hint/);
  assert.match(camp, /@media \(hover: none\)[\s\S]*\.prog-hint \{ opacity: 1; transform: none; \}/);
  assert.match(camp, /@media \(prefers-reduced-motion: reduce\)/);
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

test('response guidance uses a balanced card highlight instead of a side stripe', () => {
  assert.match(contact, /class="ct-form-note-icon" aria-hidden="true">i<\/span>/);
  assert.match(contact, /\.ct-form-note\s*\{[^}]*border:1px solid/s);
  assert.doesNotMatch(contact, /\.ct-form-note\s*\{[^}]*border-left:/s);
});
