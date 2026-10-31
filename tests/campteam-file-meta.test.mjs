import assert from 'node:assert/strict';
import test from 'node:test';
import * as Files from '../functions/api/campteam/files.js';
import * as Upload from '../functions/api/campteam/upload.js';
import * as Batches from '../functions/api/campteam/ai-batches.js';
import { cleanTags, cleanLang, cleanScripture, cleanBatchId } from '../functions/lib/campteamFileMeta.js';
import { parseFileSuggestion, buildFilePrompt } from '../functions/lib/campteamSuggest.js';
import { fakeD1, fakeR2, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const setup = () => makeEnv(fakeD1(), { CAMPTEAM_FILES: fakeR2() });
const bytes = (t) => new TextEncoder().encode(t);
async function up(env, who, query, name = 'a.pdf') { const d = bytes('data-' + name); return Upload.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost:8788/api/campteam/upload' + query, body: d, headers: { 'X-File-Name': encodeURIComponent(name), 'Content-Length': String(d.length) } }) }); }
const list = async (env, who, qs = '') => (await Files.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/files' + qs }) })).json();
const B = { get: async (env, who) => (await Batches.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/ai-batches' }) })).json(), undo: async (env, who, id) => Batches.onRequestPost({ env, request: await req(who, { method: 'POST', body: { undo: id }, url: 'http://localhost/api/campteam/ai-batches' }) }) };
const BID = 'batch-0001-aaaa';

test('태그·언어·본문·묶음 번호 정리: 중복·길이·잘못된 값은 걸러진다', () => {
  assert.equal(cleanTags('구원, 기도 , #Prayer,기도,,Prayer\n게임'), '구원,기도,Prayer,게임'); assert.equal(cleanTags(['a', 'A', 'b'.repeat(40)]).split(',').length, 2);
  assert.equal(cleanTags('1,2,3,4,5,6,7,8').split(',').length, 6, '최대 6개');
  assert.equal(cleanLang('both'), 'both'); assert.equal(cleanLang('fr'), ''); assert.equal(cleanScripture('  요한복음   3:16 '), '요한복음 3:16');
  assert.equal(cleanBatchId('batch-0001-aaaa'), 'batch-0001-aaaa'); assert.equal(cleanBatchId("x'; DROP"), ''); assert.equal(cleanBatchId('short'), '');
});

test('올릴 때 태그·언어·성경 본문·설교자가 저장되고, 목록·검색·태그 거르기·자주 쓴 태그에 나온다', async () => {
  const env = setup();
  const r = await up(env, U.mem, '?title=' + encodeURIComponent('요한복음 3장 메시지') + '&category=program&tags=' + encodeURIComponent('구원,복음') + '&lang=ko&scripture=' + encodeURIComponent('요한복음 3:16-21') + '&speaker=' + encodeURIComponent('홍길동') + '&batchId=' + BID);
  assert.equal(r.status, 201);
  const d = await list(env, U.mem), it = d.items.find((x) => x.title === '요한복음 3장 메시지');
  assert.equal(it.tags, '구원,복음'); assert.equal(it.lang, 'ko'); assert.equal(it.scripture, '요한복음 3:16-21'); assert.equal(it.speaker, '홍길동');
  assert.ok(d.tagStats.some((t) => t.tag === '구원' && t.n === 1));
  assert.equal((await list(env, U.mem, '?q=' + encodeURIComponent('3:16'))).items.length, 1, '성경 본문으로 찾기');
  assert.equal((await list(env, U.mem, '?q=' + encodeURIComponent('홍길동'))).items.length, 1, '설교자로 찾기');
  assert.equal((await list(env, U.mem, '?q=' + encodeURIComponent('복음'))).items.some((x) => x.id === it.id), true, '태그 글자로도 찾기');
  assert.deepEqual((await list(env, U.mem, '?tag=' + encodeURIComponent('구원'))).items.map((x) => x.id), [it.id], '태그 하나로 거르기');
  assert.equal((await list(env, U.mem, '?tag=' + encodeURIComponent('구'))).items.length, 0, '태그는 통째로 맞아야 한다');
});

test('수정으로 태그를 바꾸고 비울 수 있다 · 보내지 않은 칸은 그대로', async () => {
  const env = setup(); const id = (await (await up(env, U.mem, '?title=T&tags=a,b&scripture=X')).json()).id;
  const patch = async (b) => Files.onRequestPatch({ env, request: await req(U.mem, { method: 'PATCH', body: b, url: 'http://localhost/api/campteam/files?id=' + id }) });
  assert.equal((await patch({ tags: 'c' })).status, 200);
  let it = (await list(env, U.mem)).items.find((x) => x.id === id); assert.equal(it.tags, 'c'); assert.equal(it.scripture, 'X', '보내지 않은 칸은 그대로');
  await patch({ tags: '', scripture: '' }); it = (await list(env, U.mem)).items.find((x) => x.id === id); assert.equal(it.tags, ''); assert.equal(it.scripture, '');
});

test('한 번에 되돌리기: 내 묶음은 내가, 남의 묶음은 관리자만 · 자료는 휴지통으로 가고 파일 기록은 지워지지 않는다', async () => {
  const env = setup();
  for (const n of ['1.pdf', '2.pdf', '3.pdf']) assert.equal((await up(env, U.mem, '?title=' + n + '&batchId=' + BID, n)).status, 201);
  assert.equal((await up(env, U.mem, '?title=outside', 'o.pdf')).status, 201);
  let g = await B.get(env, U.mem); assert.equal(g.batches.length, 1); assert.equal(g.batches[0].count, 3);
  assert.equal((await B.get(env, U.admin)).batches.length, 1, '관리자는 모든 묶음을 본다'); assert.equal((await B.get(env, U.dir)).batches.length, 0, '다른 팀원은 남의 묶음을 보지 못한다');
  assert.equal((await B.undo(env, U.dir, BID)).status, 403, '남의 묶음은 되돌릴 수 없다');
  const r = await B.undo(env, U.mem, BID); assert.equal(r.status, 200); assert.equal((await r.json()).count, 3);
  assert.deepEqual((await list(env, U.mem)).items.filter((x) => /\.pdf$/.test(x.title)), [], '묶음의 자료는 목록에서 사라진다');
  assert.ok((await list(env, U.mem)).items.some((x) => x.title === 'outside'), '묶음 밖 자료는 그대로');
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM file_versions WHERE fileId IN (SELECT id FROM files WHERE aiBatchId = ?)').get(BID).n, 3, '파일 본문 기록은 남는다(휴지통에서 살릴 수 있다)');
  assert.equal((await (await B.undo(env, U.mem, BID)).json()).already, true, '두 번 눌러도 안전');
  assert.equal((await B.get(env, U.mem)).batches.length, 0);
  assert.equal((await B.undo(env, U.mem, 'nope')).status, 400);
});

test('남의 묶음 번호로 올려도 그 묶음에 들어가지 않는다', async () => {
  const env = setup(); await up(env, U.mem, '?title=mine&batchId=' + BID);
  await up(env, U.dir, '?title=intruder&batchId=' + BID);
  assert.equal(env.DB.sqlite.prepare("SELECT aiBatchId FROM files WHERE title = 'intruder'").get().aiBatchId, null);
  assert.equal(env.DB.sqlite.prepare('SELECT count FROM ai_batches WHERE id = ?').get(BID).count, 1);
});

test('0024 가 아직 없는 DB: 목록·올리기는 그대로 된다', async () => {
  const env = setup(); const sq = env.DB.sqlite;
  sq.exec('DROP INDEX IF EXISTS idx_files_batch; ALTER TABLE files DROP COLUMN tags; ALTER TABLE files DROP COLUMN scripture; ALTER TABLE files DROP COLUMN speaker; ALTER TABLE files DROP COLUMN aiBatchId; DROP TABLE ai_batches;');
  assert.equal((await up(env, U.mem, '?title=ok&tags=a&batchId=' + BID)).status, 201, '태그 칸이 없어도 올리기는 된다');
  const d = await list(env, U.mem, '?q=ok'); assert.equal(d.items.length, 1); assert.equal(d.items[0].tags, ''); assert.deepEqual(d.tagStats, []);
  assert.deepEqual((await B.get(env, U.mem)).batches, []);
});

test('AI 추천: 태그·언어·성경 본문·설교자도 제안하고(글에 있을 때만), 기존 태그를 먼저 고르게 한다', () => {
  const s = parseFileSuggestion(JSON.stringify({ titles: [{ ko: '제목', en: 'T' }], tags: ['구원', '복음', '구원', '', 'x'.repeat(50)], lang: 'both', scripture: '요한복음 3:16', speaker: '홍길동' }), []);
  assert.equal(s.tags, '구원,복음,' + 'x'.repeat(24)); assert.equal(s.lang, 'both'); assert.equal(s.scripture, '요한복음 3:16'); assert.equal(s.speaker, '홍길동');
  const none = parseFileSuggestion(JSON.stringify({ titles: [{ ko: 'a', en: '' }], lang: 'xx' }), []); assert.equal(none.tags, ''); assert.equal(none.lang, ''); assert.equal(none.scripture, '');
  const p = buildFilePrompt({ name: 'a.docx', kind: 'none', tags: ['구원', '기도'] });
  assert.ok(p.system.includes('구원, 기도') && p.system.includes('Never guess'), '기존 태그 목록과 「지어내지 말라」 규칙');
});
