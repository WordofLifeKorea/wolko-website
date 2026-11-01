import assert from 'node:assert/strict';
import test from 'node:test';
import * as Tidy from '../functions/api/campteam/file-tidy.js';
import * as Files from '../functions/api/campteam/files.js';
import * as One from '../functions/api/campteam/file.js';
import * as Upload from '../functions/api/campteam/upload.js';
import { stemOf, fileLang, findDupes } from '../functions/lib/campteamTidy.js';
import { fakeD1, fakeR2, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const setup = (extra = {}) => makeEnv(fakeD1(), { CAMPTEAM_FILES: fakeR2(), ...extra });
const bytes = (t) => new TextEncoder().encode(t);
async function up(env, who, title, name, lang = '', cat = 'program', data = 'x') {
  const r = await Upload.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost:8788/api/campteam/upload?title=' + encodeURIComponent(title) + '&category=' + cat + '&lang=' + lang, body: bytes(data), headers: { 'X-File-Name': encodeURIComponent(name), 'Content-Length': String(bytes(data).length) } }) });
  return (await r.json()).id;
}
const get = async (env, who, qs = '') => (await Tidy.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/file-tidy' + qs }) })).json();
const post = async (env, who, body) => Tidy.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/file-tidy', body }) });

test('이름 뼈대: 언어·버전 표시와 확장자를 뺀다', () => {
  assert.equal(stemOf('Summer Schedule (Korean) final v2.pptx'), stemOf('summer schedule 한글 최종.pptx'.replace('한글 최종', '(Korean) v3')));
  assert.equal(stemOf('2025 일정표_한글_최종.docx'), '2025 일정표');
  assert.equal(fileLang({ title: '수련회 일정' }), 'ko'); assert.equal(fileLang({ title: 'Camp plan' }), 'en'); assert.equal(fileLang({ lang: 'both', title: 'x' }), '');
});

test('같은 이름 뼈대의 한국어·영어 자료는 확실한 짝 후보로 나오고, 묶으면 목록·상세에 짝이 보인다', async () => {
  const env = setup();
  const a = await up(env, U.mem, '2025 일정표 한글', 'a.docx', 'ko'), b = await up(env, U.mem, '2025 일정표 English', 'b.docx', 'en');
  const d = await get(env, U.mem);
  assert.equal(d.pairs.length, 1); assert.equal(d.pairs[0].sure, true); assert.deepEqual([d.pairs[0].a.id, d.pairs[0].b.id].sort(), [a, b].sort());
  assert.equal((await post(env, U.mem, { action: 'pair', a, b })).status, 200);
  assert.equal((await get(env, U.mem)).pairs.length, 0, '묶은 쌍은 다시 제안하지 않는다');
  const list = await (await Files.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost/api/campteam/files' }) })).json();
  const pa = list.items.find((x) => x.id === a), pb = list.items.find((x) => x.id === b); assert.ok(pa.pairId); assert.equal(pa.pairId, pb.pairId);
  const one = await (await One.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost/api/campteam/file?id=' + a }) })).json();
  assert.equal(one.partner.id, b);
  assert.equal((await post(env, U.mem, { action: 'unpair', id: a })).status, 200);
  assert.equal((await get(env, U.mem)).pairs.length, 1, '풀면 다시 후보');
});

test('AI 가 고른 짝: 목록에 없는 번호·다른 캠프·같은 언어는 버린다', async () => {
  const calls = []; const realFetch = globalThis.fetch;
  const env = setup({ ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' });
  const a = await up(env, U.mem, '여름 캠프 안내문', 'a.docx', 'ko'), b = await up(env, U.mem, 'Summer camp guide', 'b.docx', 'en');
  globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); const text = JSON.stringify([{ ko: a, en: b, reason: 'same' }, { ko: 'nope', en: b }]); return new Response(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`, { status: 200 }); };
  try {
    const d = await get(env, U.mem, '?ai=1');
    assert.equal(d.aiUsed, true); assert.equal(d.pairs.length, 1); assert.equal(d.pairs[0].sure, false);
    assert.ok(calls[0].messages[0].content.includes('Summer camp guide') && !calls[0].messages[0].content.includes('x'.repeat(5)), '제목만 보낸다');
  } finally { globalThis.fetch = realFetch; }
});

test('중복·최신본: 같은 이름이면 최근 것을 남기자고 제안하고, 확인 후 휴지통으로 보낸다. 권한 없으면 거절', async () => {
  const env = setup();
  const old = await up(env, U.mem, '일정표 final', 'same.docx', 'ko', 'program', 'aaa'); await new Promise((r) => setTimeout(r, 5));
  const neu = await up(env, U.mem, '일정표 v2', 'same.docx', 'ko', 'program', 'aaa');
  const d = await get(env, U.mem); assert.equal(d.dupes.length, 1); assert.equal(d.dupes[0].keep.id, neu); assert.equal(d.dupes[0].others[0].id, old); assert.equal(d.dupes[0].why, 'identical');
  assert.equal((await Tidy.onRequestGet({ env, request: await req(U.view, { url: 'http://localhost/api/campteam/file-tidy' }) })).status, 403);
  assert.equal((await (await post(env, U.mem, { action: 'trash', ids: [old] })).json()).trashed, 1);
  assert.equal((await get(env, U.mem)).dupes.length, 0);
});

test('금액 자료는 제안에 나오지 않는다', async () => {
  const env = setup();
  await up(env, U.fin, '예산표 한글', 'a.xlsx', 'ko', 'budget'); await up(env, U.fin, '예산표 English', 'b.xlsx', 'en', 'budget');
  const d = await get(env, U.fin); assert.equal(d.pairs.length, 0);
  assert.deepEqual(findDupes([{ id: 1, title: 'x', restricted: 1 }, { id: 2, title: 'x', restricted: 1 }]), []);
});
