import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/wolko-lang-sync.js', import.meta.url), 'utf8');

// stored = 기기에 남은 값(localStorage), visit = 같은 창에서 이어지는 방문의 값(sessionStorage)
function run({ languages, stored = {}, visit = {} }) {
  const data = new Map(Object.entries(stored));
  const sess = new Map(Object.entries(visit));
  class Storage {
    constructor(map) { this.map = map; }
    getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
    setItem(k, v) { this.map.set(k, String(v)); }
    removeItem(k) { this.map.delete(k); }
  }
  const local = new Storage(data);
  const session = new Storage(sess);
  const document = { documentElement: { setAttribute() {} } };
  const window = { localStorage: local, sessionStorage: session };
  vm.runInNewContext(source, { window, Storage, navigator: { languages, language: languages[0] }, document });
  return { local, data, sess };
}

test('with no saved choice the device language decides', () => {
  assert.equal(run({ languages: ['ko-KR', 'en-US'] }).data.get('wolko-lang'), 'ko');
  assert.equal(run({ languages: ['en-US'] }).data.get('wolko-lang'), 'en');
  assert.equal(run({ languages: ['ja-JP', 'ko'] }).data.get('wolkoCarLang'), 'en', '첫 번째 언어 기준');
  const all = run({ languages: ['en-GB'] }).data;
  for (const k of ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang']) assert.equal(all.get(k), 'en');
});

test('a choice made on any page is followed on every page during the same visit', () => {
  const { local, data, sess } = run({ languages: ['ko-KR'] });
  local.setItem('wolkoCarLang', 'en'); // 차량 페이지에서 EN 선택
  for (const k of ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang']) assert.equal(data.get(k), 'en');
  assert.equal(sess.get('wolko-lang-choice'), 'en');
  assert.equal(data.has('wolko-lang-choice'), false, '선택은 기기에 영구 저장하지 않는다');
  // 같은 창의 다음 페이지(스크립트 재실행)는 선택을 따른다
  const next = run({ languages: ['ko-KR'], stored: Object.fromEntries(data), visit: Object.fromEntries(sess) });
  assert.equal(next.data.get('wolko-lang'), 'en');
  next.local.setItem('wolko-lang', 'ko');
  assert.equal(next.data.get('wolkoAdminLang'), 'ko');
});

test('a new visit (new tab, email link) goes back to the device language', () => {
  const { local, data } = run({ languages: ['ko-KR'] });
  local.setItem('wolko-lang', 'en');
  const fresh = run({ languages: ['ko-KR'], stored: Object.fromEntries(data) });
  for (const k of ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang']) assert.equal(fresh.data.get(k), 'ko');
});

test('an old permanent English choice no longer forces English on a Korean phone', () => {
  const { data } = run({ languages: ['ko-KR'], stored: { wolkoAdminLang: 'en', 'wolko-lang': 'en', 'wolko-lang-choice': 'en' } });
  assert.equal(data.get('wolko-lang'), 'ko');
  assert.equal(data.get('wolkoAdminLang'), 'ko');
  assert.equal(data.has('wolko-lang-choice'), false);
});

test('the public site layout and the camp-resources page share the same language', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  assert.match(layout, /<script is:inline src="\/wolko-lang-sync\.js\?v=\d+"><\/script>/);
  const { local, data } = run({ languages: ['en-US'] });
  local.setItem('wolko_camp_resources_lang', 'ko');
  assert.equal(data.get('wolko-lang'), 'ko', '공개 페이지에서 고른 언어가 포탈에도 이어진다');
});
