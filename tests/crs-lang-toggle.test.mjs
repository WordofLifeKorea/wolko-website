import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
const shell = src.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function run(saved) {
  const classes = new Set();
  const store = new Map(saved ? [['wolko-lang', saved]] : []);
  const btns = ['ko', 'en'].map(l => ({ dataset: { lang: l }, active: l === 'ko', classList: { toggle(_, on) { this.owner.active = on; } }, addEventListener() {} }));
  btns.forEach(b => { b.classList.owner = b; });
  const document = {
    documentElement: { lang: 'ko' },
    body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) } },
    getElementById: () => ({ querySelectorAll: () => btns }),
  };
  const window = {};
  vm.runInNewContext(shell, { window, document, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
  return { window, document, classes, store };
}

test('CRS 언어 토글은 body 클래스·<html lang>·저장값을 함께 바꾼다 (레일 메뉴가 한글로 남지 않게)', () => {
  const { window, document, classes, store } = run();
  window.setLang('en');
  assert.ok(classes.has('lang-en'));
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(store.get('wolko-lang'), 'en');
  window.setLang('ko');
  assert.ok(!classes.has('lang-en'));
  assert.equal(document.documentElement.lang, 'ko');
});

test('CRS 는 저장된 EN 선택을 열 때 <html lang>까지 복원한다', () => {
  const { document, classes } = run('en');
  assert.ok(classes.has('lang-en'));
  assert.equal(document.documentElement.lang, 'en');
});

test('CRS 교회 상세: 관계 등급(grade)과 달별 리더십 훈련(leaderTraining)을 교회 기록에 저장한다 — 복음 통계 서버가 같은 이름을 읽는다', async () => {
  const { slimCrsChurches } = await import('../functions/lib/crsMinistry.js');
  assert.match(src, /id="hqGrades"/);
  assert.match(src, /update\(ref\(db, `churches\/\$\{church\.id\}`\), \{ grade: next \|\| null \}\)/);
  assert.match(src, /update\(ref\(db, `churches\/\$\{church\.id\}\/leaderTraining`\), \{ \[month\]: next > 0 \? next : null \}\)/);
  // 서버가 CRS 에서 읽는 필드 이름이 화면이 저장하는 이름과 같다
  const slim = slimCrsChurches({ x: { region: '경기도', grade: 'B', leaderTraining: { '2026-10': 4 } } });
  assert.deepEqual(slim, [{ location: 'mainland', grade: 'B', leaders: { '2026-10': 4 } }]);
});
