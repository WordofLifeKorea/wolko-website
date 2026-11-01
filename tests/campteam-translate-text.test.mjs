import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../functions/api/campteam/translate.js';
import { detectTarget, buildTextPrompt, cleanKind, cleanOutput } from '../functions/lib/campteamTranslateText.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const ai = (env) => ({ ...env, ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' });
const post = async (env, who, body) => T.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/translate', body }) });
async function withFetch(reply, fn) { const real = globalThis.fetch, calls = []; globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ content: [{ type: 'text', text: reply }] }), { status: 200 }); }; try { return await fn(calls); } finally { globalThis.fetch = real; } }

test('방향 자동 감지 · 종류 정리 · 프롬프트에 용어집이 들어간다', () => {
  assert.equal(detectTarget('안녕하세요 여러분', ''), 'en'); assert.equal(detectTarget('Hello everyone', ''), 'ko'); assert.equal(detectTarget('Hello 안', 'ko'), 'ko');
  assert.equal(cleanKind('sermon'), 'sermon'); assert.equal(cleanKind('x'), 'general');
  const p = buildTextPrompt({ kind: 'sermon', to: 'en', glossary: [{ termKo: '수련회', termEn: 'Retreat', keep: 0 }, { termKo: '월코', termEn: 'WOLKO', keep: 1 }] });
  assert.ok(p.includes('수련회 → Retreat') && p.includes('월코 = WOLKO') && p.includes('Scripture') && p.includes('DATA'));
  assert.equal(cleanOutput('```\nHi\n```'), 'Hi');
});

test('번역: 팀원만, 한도·길이 확인, 글은 저장하지 않고 기록만 남긴다', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch('Hello, team.', async (calls) => {
    const r = await post(env, U.mem, { text: '안녕하세요, 팀 여러분.', kind: 'notice' }); const d = await r.json();
    assert.equal(r.status, 200); assert.equal(d.text, 'Hello, team.'); assert.equal(d.to, 'en');
    assert.ok(calls[0].messages[0].content.includes('안녕하세요'));
    const log = await env.DB.prepare("SELECT detail FROM audit_log WHERE action = 'translate_text'").first();
    assert.ok(log && !log.detail.includes('안녕'), '글 내용은 기록하지 않는다');
  });
  assert.equal((await post(env, U.out, { text: 'hi' })).status, 403);
  assert.equal((await post(env, U.mem, { text: '' })).status, 400);
  assert.equal((await post(env, U.mem, { text: 'a'.repeat(8001) })).status, 413);
  assert.equal((await post({ ...env, ANTHROPIC_API_KEY: '' }, U.mem, { text: 'hi' })).status, 503);
});

test('번역: 하루 40번 한도', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch('ok', async () => {
    for (let i = 0; i < 40; i++) assert.equal((await post(env, U.mem, { text: 'hello ' + i })).status, 200);
    assert.equal((await post(env, U.mem, { text: 'hello' })).status, 429);
  });
});
