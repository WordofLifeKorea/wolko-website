import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('parent camp FAQ page is bilingual, hides unanswered questions and links to contact', async () => {
  const faq = await read('src/pages/camp/_faq.astro');
  assert.match(faq, /<BaseLayout[\s\S]*activeNav="ministry"/);
  assert.match(faq, /class="wl-ko"/);
  assert.match(faq, /class="wl-en"/);
  assert.match(faq, /href="\/contact[^"]*"/);
  // 답이 없는 질문(aKo: '')은 화면에 내보내지 않는다
  assert.match(faq, /filter\(q => q\.aKo && q\.aEn\)/);
  // 답마다 출처 주석이 붙어 있다
  const answers = faq.match(/aKo: '[^']+'/g) || [];
  const sources = faq.match(/\/\/ 출처:/g) || [];
  assert.ok(answers.length > 0);
  assert.equal(sources.length, answers.length);
});

test('the parent FAQ stays a draft until every answer is filled in', async () => {
  const camp = await read('src/pages/camp/index.astro');
  // 링크는 주석 안에만 있다 — 공개할 때 주석을 푼다
  assert.doesNotMatch(camp.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''), /href="\/camp\/faq"/);
});
