import assert from 'node:assert/strict';
import test from 'node:test';
import * as Files from '../functions/api/campteam/files.js';
import * as Folders from '../functions/api/campteam/folders.js';
import * as Upload from '../functions/api/campteam/upload.js';
import * as Search from '../functions/api/campteam/search.js';
import * as Names from '../functions/api/campteam/file-names.js';
import { linkKindFor } from '../functions/lib/campteamFiles.js';
import { tidyTitle, tidyFolder, suggestNames, parseNames } from '../functions/lib/campteamFileNames.js';
import { fakeD1, fakeR2, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const setup = (extra) => { const r2 = fakeR2(); return { r2, env: makeEnv(fakeD1(), { CAMPTEAM_FILES: r2, ...extra }) }; };
const bytes = (t) => new TextEncoder().encode(t);
const json = async (res) => res.json();
const call = async (mod, fn, env, who, { qs = '', body, method } = {}) => mod[fn]({ env, request: await req(who, { method, body, url: 'http://localhost:8788/api/campteam/x' + qs }) });
const upload = async (env, who, data, name, query) => Upload.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost:8788/api/campteam/upload' + query, body: data, headers: { 'X-File-Name': encodeURIComponent(name), 'Content-Length': String(data.length) } }) });
const list = async (env, who, qs = '') => json(await call(Files, 'onRequestGet', env, who, { qs }));
const folderList = async (env, who, qs = '') => (await json(await call(Folders, 'onRequestGet', env, who, { qs }))).folders;

async function folderWith(env, names, who = U.mem, name = '모멘텀 2025 자료', extra = '') {
  const f = await json(await call(Folders, 'onRequestPost', env, who, { method: 'POST', body: { name, nameEn: 'Momentum 2025 materials' } }));
  const ids = [];
  for (const n of names) { const r = await upload(env, who, bytes('x-' + n), n, `?title=${encodeURIComponent(n)}&folderId=${f.id}${extra}`); assert.equal(r.status, 201); ids.push((await json(r)).id); }
  return { folderId: f.id, ids };
}

test('Canva 링크를 알아본다 (canva.com / canva.link), 비슷한 가짜 주소는 일반 링크', () => {
  assert.equal(linkKindFor('https://www.canva.com/design/DAF123/view'), 'canva');
  assert.equal(linkKindFor('https://canva.link/abc123'), 'canva');
  assert.equal(linkKindFor('https://notcanva.com/design/1'), 'other');
  assert.equal(linkKindFor('https://canva.com.evil.example/x'), 'other');
});

test('폴더를 만들고 파일을 넣으면 폴더별로 보이고, 폴더 이름으로 검색하면 안의 파일이 모두 나온다', async () => {
  const { env } = setup();
  const { folderId, ids } = await folderWith(env, ['1주차 규칙.pdf', '2주차 게임.pdf', '3주차 평가.pdf']);
  await upload(env, U.mem, bytes('solo'), '따로.pdf', '?title=따로 올린 파일');
  const inFolder = await list(env, U.mem, `?folderId=${folderId}`);
  assert.equal(inFolder.total, 3); assert.ok(inFolder.items.every((i) => i.folderId === folderId && i.folderName === '모멘텀 2025 자료'));
  assert.equal((await list(env, U.mem, '?folderId=none')).items.filter((i) => ids.includes(i.id)).length, 0, '폴더 없는 자료 보기에는 폴더 파일이 없다');
  assert.equal((await list(env, U.mem)).total >= 4, true, '전체 보기에는 모두 나온다');
  const byFolderKo = await list(env, U.mem, '?q=' + encodeURIComponent('모멘텀'));
  assert.deepEqual(byFolderKo.items.map((i) => i.id).sort(), [...ids].sort(), '폴더 이름으로 찾으면 그때 올린 파일이 전부 나온다');
  assert.equal((await list(env, U.mem, '?q=Momentum')).total, 3, '영문 폴더 이름으로도 찾는다');
  const fl = await folderList(env, U.mem);
  assert.equal(fl.length, 1); assert.equal(fl[0].fileCount, 3);
});

test('통합 검색: 폴더 이름으로 찾으면 폴더 묶음과 파일이 함께 나온다', async () => {
  const { env } = setup();
  const { folderId } = await folderWith(env, ['a.pdf', 'b.pdf']);
  const r = await json(await call(Search, 'onRequestGet', env, U.mem, { qs: '?q=' + encodeURIComponent('모멘텀') }));
  assert.equal(r.groups.folders.length, 1); assert.equal(r.groups.folders[0].id, folderId); assert.equal(r.groups.folders[0].fileCount, 2);
  assert.equal(r.groups.files.length, 2);
});

test('폴더 이름 바꾸기 · 파일 하나 이름 고치기 · 폴더로 옮기기/빼기 · 폴더 삭제(파일은 남는다)', async () => {
  const { env } = setup();
  const { folderId, ids } = await folderWith(env, ['a.pdf', 'b.pdf']);
  assert.equal((await call(Folders, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${folderId}`, body: { name: '새 이름' } })).status, 200);
  assert.equal((await list(env, U.mem, '?q=' + encodeURIComponent('새 이름'))).total, 2);
  assert.equal((await call(Files, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${ids[0]}`, body: { title: '고친 이름' } })).status, 200);
  assert.equal((await list(env, U.mem, `?folderId=${folderId}`)).items.find((i) => i.id === ids[0]).title, '고친 이름', '폴더 안에서도 파일 이름을 따로 고친다');
  assert.equal((await call(Files, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${ids[0]}`, body: { folderId: '' } })).status, 200);
  assert.equal((await list(env, U.mem, `?folderId=${folderId}`)).total, 1, '폴더 밖으로 뺐다');
  assert.equal((await call(Files, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${ids[0]}`, body: { folderId: 'nope' } })).status, 400, '없는 폴더로는 못 옮긴다');
  assert.equal((await call(Folders, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?id=${folderId}` })).status, 200);
  assert.equal((await folderList(env, U.mem)).length, 0);
  assert.equal((await list(env, U.mem, '?folderId=none')).items.filter((i) => ids.includes(i.id)).length, 2, '폴더만 지워지고 파일은 남는다');
});

test('권한: 조회만 계정은 폴더를 만들 수 없고, 없는 폴더에는 올릴 수 없다', async () => {
  const { env } = setup();
  assert.equal((await call(Folders, 'onRequestPost', env, U.view, { method: 'POST', body: { name: 'x' } })).status, 403);
  assert.equal((await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '' } })).status, 400);
  assert.equal((await upload(env, U.mem, bytes('z'), 'z.pdf', '?folderId=nope')).status, 400);
  assert.equal((await call(Folders, 'onRequestGet', env, null)).status, 401);
});

test('금액(예산) 자료는 폴더 안에서도 권한 없는 사람에게 보이지 않고 개수에도 안 센다', async () => {
  const { env } = setup();
  const f = await json(await call(Folders, 'onRequestPost', env, U.fin, { method: 'POST', body: { name: '정산' } }));
  await upload(env, U.fin, bytes('p'), 'plan.pdf', `?title=일반&folderId=${f.id}&category=program`);
  await upload(env, U.fin, bytes('b'), 'budget.pdf', `?title=금액표&folderId=${f.id}&category=budget`);
  assert.equal((await folderList(env, U.fin)).find((d) => d.id === f.id).fileCount, 2);
  assert.equal((await folderList(env, U.view)).find((d) => d.id === f.id).fileCount, 1, '금액 권한이 없는 계정에게는 금액 자료가 개수에도 없다');
  assert.equal((await list(env, U.view, `?folderId=${f.id}`)).total, 1);
  assert.equal((await list(env, U.view, '?q=' + encodeURIComponent('정산'))).total, 1, '폴더 이름 검색에도 금액 자료는 안 나온다');
});

test('명단 밖 월코 팀원: 공개 파일이 있는 폴더만 보이고 안의 공개 파일만 나온다', async () => {
  const { env } = setup();
  const f = await json(await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '포스터 모음' } }));
  await json(await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '비공개 폴더' } }));
  await upload(env, U.mem, bytes('1'), 'a.png', `?title=공개 포스터&folderId=${f.id}&publicToAll=1`);
  await upload(env, U.mem, bytes('2'), 'b.png', `?title=내부 시안&folderId=${f.id}`);
  const seen = await folderList(env, U.out);
  assert.deepEqual(seen.map((d) => d.name), ['포스터 모음'], '볼 수 있는 파일이 없는 폴더는 숨긴다');
  assert.equal(seen[0].fileCount, 1);
  assert.deepEqual((await list(env, U.out, `?folderId=${f.id}`)).items.map((i) => i.title), ['공개 포스터']);
});

test('0023 이 아직 없는 DB 에서도 자료 목록·검색은 열린다 (폴더만 비어 보인다)', async () => {
  const { env } = setup();
  await upload(env, U.mem, bytes('x'), 'a.pdf', '?title=옛 자료');
  env.DB.sqlite.exec('DROP TABLE file_folders; DROP INDEX idx_files_folder; ALTER TABLE files DROP COLUMN folderId;');
  const l = await list(env, U.mem, '?q=' + encodeURIComponent('옛'));
  assert.equal(l.total, 1); assert.equal(l.items[0].folderId, null);
  assert.deepEqual(await folderList(env, U.mem), []);
  assert.equal((await json(await call(Search, 'onRequestGet', env, U.mem, { qs: '?q=' + encodeURIComponent('옛 자료') }))).groups.files.length, 1);
  assert.equal((await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '새 폴더' } })).status, 503, '폴더 만들기는 안내 문구와 함께 막힌다');
});

test('이름 정리: AI 없이도 확장자·밑줄만 정리하고, AI 가 있으면 이름 글자만 보낸다', async () => {
  assert.equal(tidyTitle('1주차_게임_규칙.pdf'), '1주차 게임 규칙'); assert.equal(tidyFolder('Momentum_2025__자료'), 'Momentum 2025 자료');
  const off = await suggestNames({}, { folderName: '모멘텀_자료', files: [{ name: 'a_b.pdf' }, { name: 'c.pptx' }] });
  assert.equal(off.ai, false); assert.deepEqual(off.titles, ['a b', 'c']); assert.equal(off.folder.name, '모멘텀 자료');

  let sent = '';
  const fetchImpl = async (_u, init) => { sent = init.body; const body = 'event: content_block_delta\ndata: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: JSON.stringify({ folder: { ko: '모멘텀 2025 자료', en: 'Momentum 2025 Materials' }, files: [{ i: 0, title: 'A B' }, { i: 1, title: 'C' }, { i: 9, title: '범위 밖' }] }) } }) + '\n\n';
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }); };
  const on = await suggestNames({ ANTHROPIC_API_KEY: 'k' }, { folderName: '모멘텀_자료', files: [{ name: 'a_b.pdf', dir: '1주차' }, { name: 'c.pptx' }], fetchImpl });
  assert.equal(on.ai, true); assert.deepEqual(on.titles, ['A B', 'C']); assert.deepEqual(on.folder, { name: '모멘텀 2025 자료', nameEn: 'Momentum 2025 Materials' });
  const msg = JSON.parse(sent).messages[0].content; assert.ok(msg.includes('a_b.pdf') && msg.includes('1주차'));
  assert.deepEqual(Object.keys(JSON.parse(msg).files[0]).sort(), ['dir', 'i', 'name'], '파일 내용은 보내지 않고 이름과 경로만 보낸다');

  const bad = await suggestNames({ ANTHROPIC_API_KEY: 'k' }, { folderName: 'x', files: [{ name: 'a.pdf' }], fetchImpl: async () => new Response('nope', { status: 500 }) });
  assert.equal(bad.ai, false); assert.deepEqual(bad.titles, ['a']);
  assert.equal(parseNames('not json', 2), null);
});

test('이름 정리 API: 로그인·작성 권한이 필요하고, 예산 분류는 AI 를 쓰지 않는다', async () => {
  const { env } = setup({ ANTHROPIC_API_KEY: 'k' });
  const files = [{ name: 'x_y.pdf' }];
  assert.equal((await call(Names, 'onRequestPost', env, null, { method: 'POST', body: { folderName: 'f', files } })).status, 401);
  assert.equal((await call(Names, 'onRequestPost', env, U.view, { method: 'POST', body: { folderName: 'f', files } })).status, 403);
  assert.equal((await call(Names, 'onRequestPost', env, U.mem, { method: 'POST', body: { folderName: 'f', files: [] } })).status, 400);
  const r = await json(await call(Names, 'onRequestPost', env, U.mem, { method: 'POST', body: { folderName: '금액_정리', category: 'budget', files } }));
  assert.equal(r.ai, false); assert.deepEqual(r.titles, ['x y']);
});
