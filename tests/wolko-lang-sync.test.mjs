import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/wolko-lang-sync.js', import.meta.url), 'utf8');

function run({ languages, stored = {} }) {
  const data = new Map(Object.entries(stored));
  class Storage {
    getItem(k) { return data.has(k) ? data.get(k) : null; }
    setItem(k, v) { data.set(k, String(v)); }
  }
  const local = new Storage();
  const document = { documentElement: { setAttribute() {} } };
  const window = { localStorage: local };
  vm.runInNewContext(source, { window, Storage, navigator: { languages, language: languages[0] }, document });
  return { local, data };
}

test('with no saved choice the device language decides', () => {
  assert.equal(run({ languages: ['ko-KR', 'en-US'] }).data.get('wolko-lang'), 'ko');
  assert.equal(run({ languages: ['en-US'] }).data.get('wolko-lang'), 'en');
  assert.equal(run({ languages: ['ja-JP', 'ko'] }).data.get('wolkoCarLang'), 'en', '첫 번째 언어 기준');
  const all = run({ languages: ['en-GB'] }).data;
  for (const k of ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang']) assert.equal(all.get(k), 'en');
});

test('a choice made on any page is followed on every page', () => {
  const { local, data } = run({ languages: ['ko-KR'] });
  local.setItem('wolkoCarLang', 'en'); // 차량 페이지에서 EN 선택
  for (const k of ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang']) assert.equal(data.get(k), 'en');
  assert.equal(data.get('wolko-lang-choice'), 'en');
  // 다음 페이지(스크립트 재실행)도 기기 언어가 아니라 선택을 따른다
  const next = run({ languages: ['ko-KR'], stored: Object.fromEntries(data) });
  assert.equal(next.data.get('wolko-lang'), 'en');
  next.local.setItem('wolko-lang', 'ko');
  assert.equal(next.data.get('wolkoAdminLang'), 'ko');
});

test('an old English choice stored by only one page becomes the shared choice', () => {
  const { data } = run({ languages: ['ko-KR'], stored: { wolkoAdminLang: 'en' } });
  assert.equal(data.get('wolko-lang'), 'en');
  assert.equal(data.get('wolko-lang-choice'), 'en');
});

test('the public site layout and the camp-resources page share the same language', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  assert.match(layout, /<script is:inline src="\/wolko-lang-sync\.js\?v=\d+"><\/script>/);
  const { local, data } = run({ languages: ['en-US'] });
  local.setItem('wolko_camp_resources_lang', 'ko');
  assert.equal(data.get('wolko-lang'), 'ko', '공개 페이지에서 고른 언어가 포탈에도 이어진다');
});
