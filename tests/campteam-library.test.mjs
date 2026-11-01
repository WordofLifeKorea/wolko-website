import assert from 'node:assert/strict';
import test from 'node:test';
import * as Lib from '../functions/api/campteam/library.js';
import * as Trash from '../functions/api/campteam/trash.js';
import { cleanItem, cleanExtra } from '../functions/lib/campteamLibrary.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const call = async (fn, env, who, opts = {}) => { const r = await fn({ env, request: await req(who, { url: 'http://localhost/api/campteam/library' + (opts.qs || ''), method: opts.method, body: opts.body }) }); return { status: r.status, body: await r.json() }; };
const get = (env, who, qs = '') => call(Lib.onRequestGet, env, who, { qs });
const post = (env, who, body) => call(Lib.onRequestPost, env, who, { method: 'POST', body });

test('항목 정리: 종류별 칸만 받고, 가사 같은 긴 글·잘못된 링크는 걸러진다', () => {
  assert.deepEqual(cleanExtra('venue', { address: ' 서울  어딘가 ', website: 'javascript:alert(1)', hack: 'x', visitNotes: 'a\r\nb' }), { address: '서울 어딘가', visitNotes: 'a\nb' });
  assert.equal(cleanItem({ kind: 'nope', title: 'x' }).error, '종류가 올바르지 않습니다.'); assert.equal(cleanItem({ kind: 'game', title: '  ' }).error, '제목을 입력해주세요.');
  const r = cleanItem({ kind: 'sermon', title: '요한복음 3장', tags: '구원, prayer', lang: 'ko', itemDate: '2026-13', scripture: '요 3:16' }).v;
  assert.equal(r.itemDate, null);
  assert.ok(r.tags.includes('구원/salvation') && r.tags.includes('기도/prayer'));
});

test('보관함: 만들고 · 탭(종류)·검색·태그로 찾고 · 고치고 · 지우면 휴지통에서 되살린다', async () => {
  const env = makeEnv(fakeD1());
  const a = await post(env, U.mem, { kind: 'sermon', title: '요한복음 3장 메시지', tags: '구원', scripture: '요한복음 3:16', speaker: '홍길동', itemDate: '2026-10-04', lang: 'ko' }); assert.equal(a.status, 201);
  const v = await post(env, U.mem, { kind: 'venue', title: '가상 수련원', extra: { address: '가상시 1번지', contactName: '김담당', cost: '1박 3만원', visitNotes: '식당이 넓다' } }); assert.equal(v.status, 201);
  await post(env, U.mem, { kind: 'game', title: '이어달리기', extra: { players: '20명', rules: '두 팀으로 나눈다' } });
  const sermons = await get(env, U.mem, '?kind=sermon'); assert.equal(sermons.body.items.length, 1); assert.equal(sermons.body.counts.sermon, 1); assert.equal(sermons.body.counts.venue, 1);
  assert.equal((await get(env, U.mem, '?q=' + encodeURIComponent('3:16'))).body.items.length, 1); assert.equal((await get(env, U.mem, '?q=' + encodeURIComponent('식당'))).body.items[0].kind, 'venue', '종류별 칸 글자로도 찾는다');
  assert.equal((await get(env, U.mem, '?tag=' + encodeURIComponent('구원/salvation'))).body.items.length, 1); assert.equal((await get(env, U.mem, '?q=salvation')).body.items.length, 1, '영어로도');
  assert.equal(sermons.body.tagStats[0].tag, '구원/salvation');
  const id = a.body.id, r = await call(Lib.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { summary: '메모' } });
  assert.equal(r.status, 200); const one = (await get(env, U.mem, '?id=' + id)).body.items[0]; assert.equal(one.summary, '메모'); assert.equal(one.speaker, '홍길동', '안 보낸 칸은 그대로');
  assert.equal((await call(Lib.onRequestDelete, env, U.mem, { method: 'DELETE', qs: '?id=' + id })).status, 200);
  assert.equal((await get(env, U.mem, '?kind=sermon')).body.items.length, 0);
  const t = await (await Trash.onRequestGet({ env, request: await req(U.admin, { url: 'http://localhost/api/campteam/trash?kind=library' }) })).json(); assert.equal(t.items.length, 1);
  assert.equal((await (await Trash.onRequestPost({ env, request: await req(U.admin, { method: 'POST', url: 'http://localhost/api/campteam/trash', body: { kind: 'library', id } }) })).status), 200);
  assert.equal((await get(env, U.mem, '?kind=sermon')).body.items.length, 1);
});

test('보관함: 권한과 연결 확인 — 명단 밖·보기만 계정, 없는 캠프·금액 파일 연결', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await get(env, U.out)).status, 403);
  assert.equal((await get(env, U.view)).status, 200); assert.equal((await post(env, U.view, { kind: 'game', title: 'x' })).status, 403);
  assert.equal((await post(env, U.mem, { kind: 'game', title: 'x', campId: 'nope' })).status, 400);
  assert.equal((await post(env, U.mem, { kind: 'game', title: 'x', fileId: 'nope' })).status, 400);
  const fid = 'f-money'; await env.DB.prepare(`INSERT INTO files (id,title,category,restricted,createdAt,updatedAt,uploadedBy) VALUES (?1,'예산표','budget',1,'x','x','a')`).bind(fid).run().catch(() => {});
  assert.equal((await post(env, U.mem, { kind: 'game', title: 'x', fileId: fid })).status, 400, '금액 파일은 연결하지 않는다');
});

test('자료실 파일에서 가져오기: 메타를 옮기고 같은 파일은 건너뛴다', async () => {
  const env = makeEnv(fakeD1());
  const fid = 'f-sermon-1'; await env.DB.prepare(`INSERT INTO files (id,title,category,restricted,tags,lang,scripture,speaker,createdAt,updatedAt,uploadedBy) VALUES (?1,'은혜 메시지','program',0,'은혜/grace','ko','롬 5:8','홍길동','x','x','a')`).bind(fid).run();
  const r = await post(env, U.mem, { kind: 'sermon', fromFiles: [fid, 'nope'] }); assert.equal(r.status, 201); assert.deepEqual([r.body.created, r.body.skipped], [1, 1]);
  const it = (await get(env, U.mem, '?kind=sermon')).body.items[0]; assert.equal(it.title, '은혜 메시지'); assert.equal(it.scripture, '롬 5:8'); assert.equal(it.speaker, '홍길동'); assert.equal(it.fileId, fid); assert.equal(it.tags, '은혜/grace');
  assert.equal((await post(env, U.mem, { kind: 'sermon', fromFiles: [fid] })).body.skipped, 1);
});
