import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReference, usfmPassages, lookupVerse, fetchKrv } from '../functions/lib/bibleLookup.js';

test('구절 주소 해석: 한글·영어·약어·장절 표기', () => {
  const cases = [
    ['시편 96:2-3', 19, 96, [2, 3], '시편 96:2-3'],
    ['시 96:2-3', 19, 96, [2, 3], '시편 96:2-3'],
    ['시편 96편 2-3절', 19, 96, [2, 3], '시편 96:2-3'],
    ['요한복음 3장 16절', 43, 3, [16], '요한복음 3:16'],
    ['John 3:16', 43, 3, [16], '요한복음 3:16'],
    ['디모데후서 2:22', 55, 2, [22], '디모데후서 2:22'],
    ['딤후 2:22', 55, 2, [22], '디모데후서 2:22'],
    ['1 John 1:9', 62, 1, [9], '요한일서 1:9'],
    ['요일 1:9', 62, 1, [9], '요한일서 1:9'],
    ['요한1서 1:9', 62, 1, [9], '요한일서 1:9'],
    ['Psalm 23:1,3', 19, 23, [1, 3], '시편 23:1,3'],
    ['유 3', 65, 1, [3], '유다서 1:3'],
    ['Song of Solomon 2:4', 22, 2, [4], '아가 2:4'],
    ['로마서 8:28 ', 45, 8, [28], '로마서 8:28'],
    ['요한계시록 21:3-4', 66, 21, [3, 4], '요한계시록 21:3-4'],
  ];
  for (const [input, bookId, chapter, verses, label] of cases) {
    const ref = parseReference(input);
    assert.equal(ref.bookId, bookId, input);
    assert.equal(ref.chapter, chapter, input);
    assert.deepEqual(ref.verses, verses, input);
    assert.equal(ref.label, label, input);
  }
  assert.deepEqual(usfmPassages(parseReference('시편 96:2-3')), ['PSA.96.2-PSA.96.3']);
  assert.deepEqual(usfmPassages(parseReference('Psalm 23:1,3')), ['PSA.23.1', 'PSA.23.3']);
  assert.equal(parseReference('시편 23').verses.length, 0, '장만 쓰면 그 장 전체');
});

test('알아볼 수 없는 주소는 한글 안내로 거절', () => {
  for (const bad of ['', '아무말 3:16', '시편', '시편 0:1', '시편 96:5-2', '시편 119:1-200']) assert.throws(() => parseReference(bad), /주소|번호|이름|범위|절|장/, bad);
});

function mockFetch(calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u.startsWith('https://bolls.life/get-verses/')) {
      const body = JSON.parse(init.body)[0];
      return Response.json([body.verses.map(v => ({ verse: v, text: `한글${body.chapter}:${v}` }))]);
    }
    if (u.startsWith('https://api.esv.org/')) return Response.json({ passages: ['  Sing to the LORD,\n bless his name. (ESV)\n'] });
    if (u.startsWith('https://rest.api.bible/')) return Response.json({ data: { content: 'NIV text' } });
    return new Response('no', { status: 404 });
  };
}
const kv = () => { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => m.set(k, v) }; };

test('개역한글은 실제 성경 API 에서, 영어는 ESV 우선(키가 있을 때)·없으면 NIV, AI 는 쓰지 않는다', async () => {
  const calls = [];
  const env = { CAMP_KV: kv(), ESV_API_KEY: 'esv-key', BIBLE_API_KEY: 'b', NIV_BIBLE_ID: 'niv' };
  const out = await lookupVerse(env, '시편 96:2-3', mockFetch(calls));
  assert.equal(out.ko, '한글96:2 한글96:3');
  assert.equal(out.en, 'Sing to the LORD, bless his name. (ESV)');
  assert.equal(out.enVersion, 'ESV');
  assert.equal(out.koVersion, '개역한글');
  assert.ok(!calls.some(c => /anthropic|claude/i.test(c.url)));
  const esvCall = calls.find(c => c.url.startsWith('https://api.esv.org/'));
  assert.match(esvCall.url, /q=Psalms\+96%3A2-3/);
  assert.match(esvCall.url, /include-verse-numbers=false/);
  assert.equal(esvCall.init.headers.Authorization, 'Token esv-key');
  // ESV 키가 없으면 NIV
  const niv = await lookupVerse({ CAMP_KV: kv(), BIBLE_API_KEY: 'b', NIV_BIBLE_ID: 'niv' }, 'John 3:16', mockFetch([]));
  assert.equal(niv.en, 'NIV text');
  assert.equal(niv.enVersion, 'NIV');
  // 영어 설정이 전혀 없어도 한글은 나온다
  const only = await lookupVerse({ CAMP_KV: kv() }, 'John 3:16', mockFetch([]));
  assert.equal(only.en, '');
  assert.equal(only.ko, '한글3:16');
});

test('개역한글 본문은 KV 에 보관해 같은 구절은 다시 부르지 않는다', async () => {
  const calls = [];
  const env = { CAMP_KV: kv() };
  const ref = parseReference('요한복음 3:16');
  await fetchKrv(env, ref, mockFetch(calls));
  await fetchKrv(env, ref, mockFetch(calls));
  assert.equal(calls.filter(c => c.url.includes('bolls.life')).length, 1);
});

test('성경 구절 본문은 AI 번역으로 보내지 않는다(편집기 저장 · 번역 API 양쪽)', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/team-visual/[slug].astro', import.meta.url), 'utf8');
  assert.match(page, /if \(b === 'verse'\) continue;/);
  const { onRequestPost } = await import('../functions/api/team/translate.js');
  // 토큰이 없으면 401 이라 구절 차단 확인을 위해 서명된 토큰을 만든다
  const secret = 'test-secret';
  const data = `wolko-team:someone:${Date.now() + 60000}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))), b => b.toString(16).padStart(2, '0')).join('');
  const token = btoa(`${data}:${sig}`);
  let aiCalled = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { aiCalled = true; return new Response('{}'); };
  try {
    const res = await onRequestPost({ env: { ADMIN_PASSWORD: secret, ANTHROPIC_API_KEY: 'x' }, request: new Request('https://t.co/api/team/translate', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ text: 'Sing to the LORD', from: 'en', context: 'verse' }) }) });
    assert.equal(res.status, 400);
  } finally { globalThis.fetch = realFetch; }
  assert.equal(aiCalled, false);
});
