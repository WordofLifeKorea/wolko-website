import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import * as Files from '../functions/api/campteam/files.js';
import * as Folders from '../functions/api/campteam/folders.js';
import * as Tree from '../functions/api/campteam/folder-tree.js';
import * as Trash from '../functions/api/campteam/trash.js';
import * as Upload from '../functions/api/campteam/upload.js';
import { MAX_DEPTH, buildIndex, depthOf, heightOf, descendantIds, checkMove } from '../functions/lib/campteamFolderTree.js';
import { fakeD1, fakeR2, makeEnv, req, root, U } from './helpers/campteam-fakes.mjs';

const setup = () => makeEnv(fakeD1(), { CAMPTEAM_FILES: fakeR2() });
const bytes = (t) => new TextEncoder().encode(t);
const json = async (res) => res.json();
const call = async (mod, fn, env, who, { qs = '', body, method } = {}) => mod[fn]({ env, request: await req(who, { method, body, url: 'http://localhost:8788/api/campteam/x' + qs }) });
const mk = async (env, who, name, parentId, extra = {}) => json(await call(Folders, 'onRequestPost', env, who, { method: 'POST', body: { name, parentId: parentId || undefined, ...extra } }));
const mkOk = async (env, name, parentId, extra) => { const r = await mk(env, U.mem, name, parentId, extra); assert.ok(r.id, JSON.stringify(r)); return r.id; };
const move = async (env, who, kind, id, parentId) => call(Tree, 'onRequestPost', env, who, { method: 'POST', body: { action: 'move', kind, id, parentId } });
const reorder = async (env, who, kind, parentId, ids) => call(Tree, 'onRequestPost', env, who, { method: 'POST', body: { action: 'reorder', kind, parentId, ids } });
const del = async (env, who, id, mode) => call(Folders, 'onRequestDelete', env, who, { method: 'DELETE', qs: `?id=${id}${mode ? '&mode=' + mode : ''}` });
const upload = async (env, who, name, query = '') => Upload.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost:8788/api/campteam/upload?title=' + encodeURIComponent(name) + query, body: bytes('x-' + name), headers: { 'X-File-Name': encodeURIComponent(name + '.pdf'), 'Content-Length': String(bytes('x-' + name).length) } }) });
const putFile = async (env, who, name, folderId, extra = '') => { const r = await upload(env, who, name, (folderId ? `&folderId=${folderId}` : '') + extra); assert.equal(r.status, 201, name); return (await json(r)).id; };
const folders = async (env, who = U.mem, qs = '') => (await json(await call(Folders, 'onRequestGet', env, who, { qs }))).folders;
const byId = (list, id) => list.find((f) => f.id === id);
const files = async (env, who = U.mem, qs = '') => json(await call(Files, 'onRequestGet', env, who, { qs }));
const trash = async (env, who, kind) => json(await call(Trash, 'onRequestGet', env, who, { qs: kind ? '?kind=' + kind : '' }));
const restore = async (env, who, kind, id) => call(Trash, 'onRequestPost', env, who, { method: 'POST', body: { kind, id } });
const audits = (env, entityId) => env.DB.sqlite.prepare('SELECT actor, action, entity, entityId, detail FROM audit_log WHERE entityId = ? ORDER BY at, rowid').all(entityId);
const row = (env, sql, ...a) => env.DB.sqlite.prepare(sql).get(...a);

test('순수 계산: 단계·높이·하위 폴더·옮겨도 되는지', () => {
  const idx = buildIndex([{ id: 'a', parentId: null }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }, { id: 'x', parentId: null }]);
  assert.equal(depthOf(idx, 'a'), 1); assert.equal(depthOf(idx, 'c'), 3);
  assert.equal(heightOf(idx, 'a'), 3); assert.equal(heightOf(idx, 'c'), 1);
  assert.deepEqual(descendantIds(idx, 'a').sort(), ['b', 'c']);
  assert.equal(checkMove(idx, 'a', ''), ''); assert.match(checkMove(idx, 'a', 'c'), /자기 자신이나/); assert.match(checkMove(idx, 'a', 'a'), /자기 자신이나/);
  assert.equal(checkMove(idx, 'c', 'x'), '');
  assert.equal(MAX_DEPTH, 5);
  const cyc = buildIndex([{ id: 'p', parentId: 'q' }, { id: 'q', parentId: 'p' }]); // 망가진 자료가 있어도 계산이 끝난다
  assert.ok(depthOf(cyc, 'p') <= 2); assert.ok(heightOf(cyc, 'p') <= 2);
});

test('깊이 제한: 5단계까지만 만들 수 있고 더 깊으면 친절한 한국어 오류', async () => {
  const env = setup();
  let parent = '';
  const ids = [];
  for (let i = 1; i <= 5; i++) { parent = await mkOk(env, `단계${i}`, parent); ids.push(parent); }
  const list = await folders(env);
  assert.deepEqual(ids.map((id) => byId(list, id).depth), [1, 2, 3, 4, 5]);
  const r = await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '여섯째', parentId: ids[4] } });
  assert.equal(r.status, 400); assert.match((await json(r)).error, /5단계까지만/);
  // 없는 위 폴더
  assert.equal((await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: 'x', parentId: 'nope' } })).status, 400);
  // 옮길 때: 아래 폴더가 달린 폴더(높이 2)를 4단계 폴더 밑(→ 5, 6단계)으로 옮기면 거절, 3단계 밑이면 가능
  const a = await mkOk(env, '가'), a2 = await mkOk(env, '가-1', a);
  const bad = await move(env, U.mem, 'folder', a, ids[3]); assert.equal(bad.status, 400); assert.match((await json(bad)).error, /5단계보다 깊어/);
  assert.equal((await move(env, U.mem, 'folder', a, ids[2])).status, 200);
  assert.equal(byId(await folders(env), a2).depth, 5);
  assert.equal((await move(env, U.mem, 'folder', a2, ids[4])).status, 400, '5단계 폴더 밑으로는 못 옮긴다');
});

test('순환 방지: 폴더를 자기 자신이나 자기 하위 폴더로 옮길 수 없다', async () => {
  const env = setup();
  const a = await mkOk(env, 'A'), b = await mkOk(env, 'B', a), c = await mkOk(env, 'C', b);
  for (const target of [a, b, c]) { const r = await move(env, U.mem, 'folder', a, target); assert.equal(r.status, 400, target); assert.match((await json(r)).error, /자기 자신이나/); }
  assert.equal(byId(await folders(env), a).parentId, null);
  assert.equal((await move(env, U.mem, 'folder', c, a)).status, 200, '아래에서 위로는 된다');
  assert.equal(byId(await folders(env), c).parentId, a);
  assert.equal((await move(env, U.mem, 'folder', 'nope', a)).status, 404);
});

test('하위 폴더는 위 폴더의 캠프·유형을 이어받고, 폴더를 옮기면 아래 전부에 새 위 폴더의 캠프·유형이 적용된다', async () => {
  const env = setup();
  const camps = env.DB.sqlite.prepare('SELECT id, typeId FROM camps ORDER BY id').all();
  const c1 = camps[0], c2 = camps.find((c) => c.typeId !== c1.typeId) || camps[1];
  assert.ok(c1 && c2);
  const p1 = await mkOk(env, '캠프1 폴더', '', { campId: c1.id });
  const p2 = await mkOk(env, '유형 폴더', '', { typeId: c2.typeId });
  const kid = await mkOk(env, '아이', p1, { campId: c2.id, typeId: c2.typeId }); // 직접 보낸 값은 무시하고 위 폴더를 따른다
  let list = await folders(env);
  assert.equal(byId(list, kid).campId, c1.id); assert.equal(byId(list, kid).typeId, null);
  const grand = await mkOk(env, '손자', kid);
  assert.equal(byId(await folders(env), grand).campId, c1.id);
  // 아이(와 손자)를 p2 밑으로 → 캠프 없음, 유형 = c2.typeId
  assert.equal((await move(env, U.mem, 'folder', kid, p2)).status, 200);
  list = await folders(env);
  for (const id of [kid, grand]) { assert.equal(byId(list, id).campId, null); assert.equal(byId(list, id).typeId, c2.typeId); }
  assert.equal(byId(list, p1).campId, c1.id, '다른 폴더는 그대로');
  // 맨 위로 옮기면 지금 값을 그대로 가진다
  assert.equal((await move(env, U.mem, 'folder', kid, '')).status, 200);
  assert.equal(byId(await folders(env), kid).typeId, c2.typeId); assert.equal(byId(await folders(env), kid).parentId, null);
  // 없는 캠프는 최상위 폴더를 만들 때만 확인한다
  assert.equal((await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: 'x', campId: 'nope' } })).status, 400);
});

test('파일과 폴더를 어느 폴더로든(위·아래·맨 위) 옮긴다 · 같은 자리면 변화 없음', async () => {
  const env = setup();
  const a = await mkOk(env, 'A'), b = await mkOk(env, 'B', a), z = await mkOk(env, 'Z');
  const f1 = await putFile(env, U.mem, '파일1', a), f2 = await putFile(env, U.mem, '파일2', '');
  assert.equal((await move(env, U.mem, 'file', f2, b)).status, 200);
  assert.equal((await files(env, U.mem, `?folderId=${b}`)).items.map((i) => i.id)[0], f2);
  assert.equal((await move(env, U.mem, 'file', f1, z)).status, 200);
  assert.equal((await files(env, U.mem, `?folderId=${a}`)).total, 0);
  assert.equal((await move(env, U.mem, 'file', f1, '')).status, 200);
  assert.equal((await files(env, U.mem, '?folderId=none')).items.some((i) => i.id === f1), true, '맨 위로');
  assert.equal((await move(env, U.mem, 'file', f1, 'nope')).status, 400, '없는 폴더');
  assert.equal((await move(env, U.mem, 'file', 'nope', a)).status, 404);
  const same = await json(await move(env, U.mem, 'file', f1, '')); assert.equal(same.same, true);
  assert.equal((await move(env, U.mem, 'folder', b, z)).status, 200); // 폴더 → 다른 폴더 밑
  assert.equal(byId(await folders(env), b).parentId, z);
  assert.equal((await move(env, U.mem, 'folder', z, b)).status, 400, '그 폴더 안으로 되돌려 넣을 수는 없다');
  assert.equal((await files(env, U.mem, `?folderId=${b}`)).items[0].folderId, b, '파일은 폴더 이동과 함께 따라간다');
  assert.equal((await call(Tree, 'onRequestPost', env, U.mem, { method: 'POST', body: { action: 'fly', kind: 'file' } })).status, 400);
  assert.equal((await call(Tree, 'onRequestPost', env, U.mem, { method: 'POST', body: { action: 'move', kind: 'zzz' } })).status, 400);
});

test('순서 바꾸기: 폴더·파일을 같은 폴더 안에서. 안 바꾼 것은 예전 순서(새것이 위)', async () => {
  const env = setup();
  const p = await mkOk(env, '부모');
  const k1 = await mkOk(env, '하나', p), k2 = await mkOk(env, '둘', p), k3 = await mkOk(env, '셋', p);
  let kids = (await folders(env)).filter((f) => f.parentId === p).map((f) => f.id);
  assert.equal(kids.length, 3);
  assert.deepEqual(kids, [k3, k2, k1].sort((x, y) => kids.indexOf(x) - kids.indexOf(y)), '순서를 안 정하면 새것이 위(같은 시각이면 id 순)');
  assert.equal((await reorder(env, U.mem, 'folder', p, [k2, k3, k1])).status, 200);
  assert.deepEqual((await folders(env)).filter((f) => f.parentId === p).map((f) => f.id), [k2, k3, k1]);
  assert.deepEqual((await folders(env)).filter((f) => f.parentId === p).map((f) => f.sortOrder), [1, 2, 3]);
  const f1 = await putFile(env, U.mem, '가', p), f2 = await putFile(env, U.mem, '나', p), f3 = await putFile(env, U.mem, '다', p);
  assert.equal((await reorder(env, U.mem, 'file', p, [f3, f1, f2])).status, 200);
  assert.deepEqual((await files(env, U.mem, `?folderId=${p}&sort=manual`)).items.map((i) => i.id), [f3, f1, f2]);
  const f4 = await putFile(env, U.mem, '라', p); // 새로 들어온 것은 맨 위
  assert.equal((await files(env, U.mem, `?folderId=${p}&sort=manual`)).items[0].id, f4);
  // 다른 폴더의 것·없는 것·중복·빈 목록은 거절
  const other = await mkOk(env, '다른');
  assert.equal((await reorder(env, U.mem, 'folder', other, [k1])).status, 400);
  assert.equal((await reorder(env, U.mem, 'file', other, [f1])).status, 400);
  assert.equal((await reorder(env, U.mem, 'file', p, [f1, f1])).status, 400);
  assert.equal((await reorder(env, U.mem, 'file', p, [])).status, 400);
  assert.equal((await reorder(env, U.mem, 'file', 'nope', [f1])).status, 400);
  // 최상위 폴더 순서
  const roots = (await folders(env)).filter((f) => !f.parentId).map((f) => f.id);
  const flipped = [...roots].reverse();
  assert.equal((await reorder(env, U.mem, 'folder', '', flipped)).status, 200);
  assert.deepEqual((await folders(env)).filter((f) => !f.parentId).map((f) => f.id), flipped);
  // 다른 정렬은 그대로(이름 순)
  assert.equal((await files(env, U.mem, `?folderId=${p}&sort=name`)).items[0].title, '가');
});

test('폴더 삭제 (a): 안의 파일·폴더를 한 단계 위로 옮기고 이 폴더만 지운다 → 휴지통에서 복구', async () => {
  const env = setup();
  const top = await mkOk(env, '위'), mid = await mkOk(env, '가운데', top), low = await mkOk(env, '아래', mid);
  const fMid = await putFile(env, U.mem, '가운데 파일', mid), fLow = await putFile(env, U.mem, '아래 파일', low);
  const r = await del(env, U.mem, mid); // 기본값 = 한 단계 위로
  assert.equal(r.status, 200); assert.equal((await json(r)).mode, 'lift');
  const list = await folders(env);
  assert.equal(byId(list, mid), undefined); assert.equal(byId(list, low).parentId, top, '안의 폴더는 한 단계 위로'); assert.equal(byId(list, low).depth, 2);
  assert.equal((await files(env, U.mem, `?folderId=${top}`)).items.find((i) => i.id === fMid).folderId, top, '파일도 한 단계 위로');
  assert.equal((await files(env, U.mem, `?folderId=${low}`)).items[0].id, fLow, '더 아래 것은 그대로');
  // 휴지통: 「폴더」 종류에 나온다
  assert.equal((await trash(env, U.mem)).counts.folders, 1);
  const t = await trash(env, U.mem, 'folders'); assert.equal(t.items.length, 1); assert.equal(t.items[0].label, '가운데'); assert.equal(t.items[0].deletedBy, U.mem);
  assert.equal((await restore(env, U.mem, 'folders', mid)).status, 200);
  assert.equal(byId(await folders(env), mid).parentId, top, '원래 위 폴더 밑으로 돌아온다(안의 것은 옮긴 그대로)');
  assert.equal((await files(env, U.mem, `?folderId=${mid}`)).total, 0);
  // 최상위 폴더에 (a): 안의 것은 맨 위(폴더 밖)로
  const f9 = await putFile(env, U.mem, '아홉', top);
  await del(env, U.mem, top);
  assert.equal((await files(env, U.mem, '?folderId=none')).items.some((i) => i.id === f9), true);
  assert.equal(byId(await folders(env), mid).parentId, null);
});

test('폴더 삭제 (b): 안의 파일과 폴더까지 모두 삭제 → 휴지통에는 폴더 하나, 복구하면 함께 돌아온다', async () => {
  const env = setup();
  const top = await mkOk(env, '위'), mid = await mkOk(env, '가운데', top), low = await mkOk(env, '아래', mid), side = await mkOk(env, '옆');
  const f1 = await putFile(env, U.mem, '가운데 파일', mid), f2 = await putFile(env, U.mem, '아래 파일', low), f3 = await putFile(env, U.mem, '옆 파일', side), f0 = await putFile(env, U.mem, '위 파일', top);
  const gone = await putFile(env, U.mem, '미리 지운 파일', mid);
  assert.equal((await call(Files, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?id=${gone}` })).status, 200);
  const r = await del(env, U.mem, mid, 'all'); assert.equal(r.status, 200); assert.equal((await json(r)).mode, 'all');
  const list = await folders(env);
  assert.deepEqual(list.map((f) => f.id).sort(), [side, top].sort());
  assert.equal((await files(env, U.mem)).items.filter((i) => [f1, f2].includes(i.id)).length, 0);
  assert.equal((await files(env, U.mem)).items.filter((i) => [f3, f0].includes(i.id)).length, 2, '다른 곳 파일은 그대로');
  // 휴지통: 폴더 1개(함께 지워진 하위 폴더·파일은 따로 나열하지 않는다)
  const tr = await trash(env, U.mem);
  assert.equal(tr.counts.folders, 1); assert.equal(tr.counts.files, 1, '미리 따로 지운 파일 하나만 파일 칸에');
  assert.deepEqual((await trash(env, U.mem, 'folders')).items.map((i) => i.id), [mid]);
  assert.deepEqual((await trash(env, U.mem, 'files')).items.map((i) => i.id), [gone]);
  assert.equal(row(env, 'SELECT deletedWith FROM file_folders WHERE id = ?', low).deletedWith, mid);
  // 복구: 폴더와 함께 지워진 하위 폴더·파일이 돌아오고, 미리 지운 파일은 여전히 휴지통
  assert.equal((await restore(env, U.mem, 'folders', mid)).status, 200);
  const back = await folders(env);
  assert.equal(byId(back, mid).parentId, top); assert.equal(byId(back, low).parentId, mid);
  assert.deepEqual((await files(env, U.mem, `?folderId=${mid}`)).items.map((i) => i.id), [f1], '폴더 안 파일도 함께 돌아온다(미리 따로 지운 파일은 아님)');
  assert.equal((await files(env, U.mem, `?folderId=${low}`)).items[0].id, f2);
  const midItems = (await files(env, U.mem, '?limit=200')).items.map((i) => i.id);
  assert.ok(midItems.includes(f1)); assert.ok(!midItems.includes(gone));
  assert.equal((await trash(env, U.mem)).counts.folders, 0);
  assert.equal(row(env, 'SELECT COUNT(*) AS n FROM file_folders WHERE deletedWith IS NOT NULL').n, 0);
  assert.equal(row(env, 'SELECT COUNT(*) AS n FROM files WHERE deletedWith IS NOT NULL').n, 0);
});

test('복구: 위 폴더가 지워졌거나 5단계를 넘게 되면 맨 위에 복구하고, 위 폴더가 있으면 그 캠프·유형을 아래에 다시 적용', async () => {
  const env = setup();
  const camp = env.DB.sqlite.prepare('SELECT id FROM camps ORDER BY id').get();
  const p = await mkOk(env, '부모'), c = await mkOk(env, '자식', p), g = await mkOk(env, '손자', c);
  await del(env, U.mem, c, 'all'); await del(env, U.mem, p, 'all');
  assert.equal((await restore(env, U.mem, 'folders', c)).status, 200);
  assert.equal(byId(await folders(env), c).parentId, null, '위 폴더가 아직 지워져 있으면 맨 위');
  assert.equal(byId(await folders(env), g).parentId, c);
  assert.equal((await restore(env, U.mem, 'folders', p)).status, 200);
  // 위 폴더가 그 사이에 깊이 옮겨져서 되살리면 5단계를 넘는 경우
  const chain = []; let par = ''; for (let i = 0; i < 4; i++) { par = await mkOk(env, `체인${i}`, par); chain.push(par); }
  const x = await mkOk(env, 'x', chain[3]); // 5단계
  const holder = await mkOk(env, '홀더'), y = await mkOk(env, 'y', holder), y2 = await mkOk(env, 'y2', y);
  await del(env, U.mem, y, 'all'); // y, y2 삭제
  assert.equal((await move(env, U.mem, 'folder', holder, chain[2])).status, 200); // 홀더가 4단계로 → y 는 5단계, y2 는 6단계가 되므로 거절되어야 하지만 y 가 지워져 있어 통과
  assert.equal((await restore(env, U.mem, 'folders', y)).status, 200);
  const l = await folders(env);
  assert.equal(byId(l, y).parentId, null, '되살리면 y(1)+y2(1)=높이 2, 홀더 4단계 + 2 > 5 라서 맨 위로');
  assert.equal(byId(l, y2).parentId, y);
  // 캠프 다시 적용: 위 폴더가 있으면 그 캠프·유형을 아래에
  const cp = await mkOk(env, '캠프폴더', '', { campId: camp.id }), ck = await mkOk(env, '캠프-아이', cp);
  await del(env, U.mem, ck, 'all');
  env.DB.sqlite.prepare('UPDATE file_folders SET campId = NULL WHERE id = ?').run(ck); // 그 사이 값이 어긋났다고 가정
  assert.equal((await restore(env, U.mem, 'folders', ck)).status, 200);
  assert.equal(byId(await folders(env), ck).campId, camp.id);
  assert.ok(x);
});

test('복구한 파일이 들어 있던 폴더가 아직 지워져 있으면 폴더 밖(맨 위)으로 돌아온다', async () => {
  const env = setup();
  const d = await mkOk(env, '폴더'), f = await putFile(env, U.mem, '파일', d);
  await call(Files, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?id=${f}` });
  await del(env, U.mem, d);
  assert.equal((await restore(env, U.mem, 'files', f)).status, 200);
  assert.equal(row(env, 'SELECT folderId FROM files WHERE id = ?', f).folderId, null);
  assert.equal((await files(env, U.mem, '?folderId=none')).items.some((i) => i.id === f), true);
});

test('권한: 자료실 수정 권한이 있는 캠프팀 팀원은 모두 가능, 조회만·명단 밖·로그인 안 함은 거절', async () => {
  const env = setup();
  const own = await mkOk(env, '내 폴더'), fid = await putFile(env, U.mem, '파일', '');
  // 다른 일반 팀원(디렉터)이 만들고·고치고·옮기고·지운다 (업로드한 사람이 아니어도)
  const made = await mk(env, U.dir, '디렉터 폴더'); assert.ok(made.id);
  assert.equal((await call(Folders, 'onRequestPatch', env, U.dir, { method: 'PATCH', qs: `?id=${own}`, body: { name: '새 이름' } })).status, 200);
  assert.equal((await move(env, U.dir, 'file', fid, own)).status, 200);
  assert.equal((await move(env, U.dir, 'folder', made.id, own)).status, 200);
  assert.equal((await reorder(env, U.dir, 'folder', own, [made.id])).status, 200);
  assert.equal((await del(env, U.dir, made.id)).status, 200);
  for (const who of [U.view, U.out]) {
    assert.equal((await call(Folders, 'onRequestPost', env, who, { method: 'POST', body: { name: 'x' } })).status, 403, who);
    assert.equal((await call(Folders, 'onRequestPatch', env, who, { method: 'PATCH', qs: `?id=${own}`, body: { name: 'x' } })).status, 403, who);
    assert.equal((await move(env, who, 'file', fid, '')).status, 403, who);
    assert.equal((await move(env, who, 'folder', own, '')).status, 403, who);
    assert.equal((await reorder(env, who, 'folder', '', [own])).status, 403, who);
    assert.equal((await del(env, who, own)).status, 403, who);
    assert.equal((await del(env, who, own, 'all')).status, 403, who);
  }
  assert.equal((await move(env, null, 'file', fid, '')).status, 401);
  assert.equal((await reorder(env, null, 'folder', '', [own])).status, 401);
  assert.equal((await del(env, null, own)).status, 401);
  assert.equal(byId(await folders(env), own).name, '새 이름');
  assert.equal(row(env, 'SELECT folderId FROM files WHERE id = ?', fid).folderId, own, '거절된 요청은 아무것도 바꾸지 않았다');
});

test('금액 자료: 안에 금액 자료가 든 폴더를 「모두 삭제」·복구는 금액 권한이 있는 사람만, 파일 옮기기도 마찬가지', async () => {
  const env = setup();
  const d = await mkOk(env, '정산'), plain = await putFile(env, U.fin, '일반', d, '&category=program'), money = await putFile(env, U.fin, '금액표', d, '&category=budget');
  const denied = await del(env, U.mem, d, 'all'); assert.equal(denied.status, 403); assert.match((await json(denied)).error, /금액 자료/);
  assert.equal(byId(await folders(env), d).name, '정산', '아무것도 지워지지 않았다');
  assert.equal((await move(env, U.mem, 'file', money, '')).status, 403, '금액 자료는 금액 수정 권한이 없으면 옮길 수 없다');
  assert.equal((await move(env, U.view, 'file', money, '')).status, 403, '(조회만 계정은 폴더·파일 옮기기 자체가 안 된다)');
  assert.equal((await del(env, U.mem, d)).status, 200, '「한 단계 위로 옮기고 폴더만 지우기」는 누구나');
  assert.equal(row(env, 'SELECT folderId FROM files WHERE id = ?', money).folderId, null);
  assert.ok(plain);
  const d2 = await mkOk(env, '정산2'); await putFile(env, U.fin, '금액표2', d2, '&category=budget');
  assert.equal((await del(env, U.fin, d2, 'all')).status, 200);
  assert.equal((await restore(env, U.fin, 'folders', d2)).status, 200);
  // U.mem 이 지운 폴더에 금액 자료가 들어 있었다면(권한이 바뀐 경우) 복구도 막는다
  const d3 = await mkOk(env, '정산3'); await putFile(env, U.fin, '금액표3', d3, '&category=budget');
  await del(env, U.fin, d3, 'all');
  env.DB.sqlite.prepare("INSERT INTO audit_log (id,at,actor,action,entity,entityId,detail) VALUES ('forged','2999-01-01',?,'delete','file_folder',?,'')").run(U.mem, d3);
  const r = await restore(env, U.mem, 'folders', d3); assert.equal(r.status, 403); assert.match((await json(r)).error, /금액 자료/);
});

test('휴지통 범위: 일반 팀원은 내가 지운 폴더만 보고 복구, 관리자는 전부', async () => {
  const env = setup();
  const a = await mkOk(env, '내가 지운'), b = await mkOk(env, '남이 지운');
  await del(env, U.mem, a, 'all'); await del(env, U.dir, b);
  assert.deepEqual((await trash(env, U.mem, 'folders')).items.map((i) => i.id), [a]);
  assert.equal((await restore(env, U.mem, 'folders', b)).status, 404);
  assert.deepEqual((await trash(env, U.admin, 'folders')).items.map((i) => i.id).sort(), [a, b].sort());
  assert.equal((await restore(env, U.admin, 'folders', b)).status, 200);
  assert.equal((await restore(env, U.mem, 'folders', a)).status, 200);
  assert.equal((await trash(env, U.view)).counts.folders, 0, '자료실 보기 권한만 있으면 목록은 열리지만 지운 것이 없다');
  assert.equal((await restore(env, U.view, 'folders', a)).status, 403, '조회만은 복구할 수 없다');
});

test('변경 기록: 만들기·이름·옮기기·순서·삭제·복구마다 누가 했는지 남는다', async () => {
  const env = setup();
  const a = await mkOk(env, '기록A'), b = await mkOk(env, '기록B', a), c = await mkOk(env, '기록C');
  await call(Folders, 'onRequestPatch', env, U.dir, { method: 'PATCH', qs: `?id=${a}`, body: { name: '기록A2' } });
  await move(env, U.dir, 'folder', c, a);
  const f = await putFile(env, U.mem, '기록파일', '');
  await move(env, U.dir, 'file', f, b);
  await reorder(env, U.dir, 'folder', a, [c, b]);
  await del(env, U.fin, b, 'all');
  await restore(env, U.admin, 'folders', b);
  const mine = (id) => audits(env, id).map((r) => `${r.actor}:${r.action}:${r.entity}`);
  assert.deepEqual(mine(a).slice(0, 2), [`${U.mem}:create:file_folder`, `${U.dir}:update:file_folder`]);
  assert.ok(audits(env, a)[1].detail.includes('기록A → 기록A2'));
  assert.ok(mine(c).includes(`${U.dir}:move:file_folder`)); assert.ok(audits(env, c).find((r) => r.action === 'move').detail.includes('→ 기록A2'));
  assert.ok(mine(f).includes(`${U.dir}:move:file`)); assert.ok(audits(env, f).find((r) => r.action === 'move').detail.includes('기록B'));
  assert.ok(mine(a).includes(`${U.dir}:reorder:file_folder`), '순서 바꾸기는 위 폴더 id 로 남는다');
  assert.deepEqual(mine(b).slice(-2), [`${U.fin}:delete:file_folder`, `${U.admin}:restore:file_folders`]);
  assert.ok(audits(env, b).find((r) => r.action === 'delete').detail.includes('모두 삭제'));
  assert.ok(audits(env, a).find((r) => r.detail.includes('(하위 폴더)')) === undefined, '하위 폴더 생성 기록은 그 폴더 자신의 id 로 남는다');
  assert.ok(audits(env, b)[0].detail.includes('(하위 폴더)'));
  await del(env, U.mem, c);
  assert.ok(audits(env, c).find((r) => r.action === 'delete').detail.includes('한 단계 위'));
});

test('기존 동작 그대로: 폴더 목록 필드·개수·정렬, 명단 밖 월코 팀원은 안에 공개 파일이 든 폴더(와 윗 폴더)만 본다', async () => {
  const env = setup();
  const p = await mkOk(env, '포스터 모음'), k = await mkOk(env, '안쪽', p), empty = await mkOk(env, '빈 폴더');
  await putFile(env, U.mem, '공개 포스터', k, '&publicToAll=1'); await putFile(env, U.mem, '내부', k);
  const all = await folders(env);
  assert.equal(byId(all, p).fileCount, 0); assert.equal(byId(all, p).treeCount, 2); assert.equal(byId(all, k).fileCount, 2);
  assert.ok(['id', 'name', 'nameEn', 'campId', 'typeId', 'createdBy', 'createdAt', 'fileCount', 'parentId', 'depth'].every((x) => x in byId(all, k)));
  const seen = await folders(env, U.out);
  assert.deepEqual(seen.map((d) => d.id).sort(), [p, k].sort(), '윗 폴더는 남고 빈 폴더는 숨긴다');
  assert.equal(byId(seen, k).fileCount, 1); assert.ok(!byId(seen, empty));
  assert.deepEqual((await folders(env, U.mem, '?q=' + encodeURIComponent('안쪽'))).map((d) => d.id), [k], '이름 검색');
  assert.equal(all.length, 3);
  // 파일 목록 기본 정렬(sort 없음)은 예전과 같다
  const f1 = await putFile(env, U.mem, '첫째', ''), f2 = await putFile(env, U.mem, '둘째', '');
  const list = (await files(env, U.mem, '?folderId=none&sort=newest')).items.map((i) => i.id);
  assert.ok(list.indexOf(f2) >= 0 && list.indexOf(f1) >= 0);
  assert.deepEqual((await files(env, U.mem, '?folderId=none&q=' + encodeURIComponent('째') + '&sort=name')).items.map((i) => i.title), ['둘째', '첫째'], '이름 순 정렬은 그대로');
  // 폴더 이름 바꾸기·옛 단일 폴더 삭제는 그대로
  assert.equal((await call(Folders, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${empty}`, body: { name: '새' } })).status, 200);
  assert.equal((await del(env, U.mem, empty)).status, 200);
  assert.equal((await del(env, U.mem, empty)).status, 404);
});

test('0036 마이그레이션: 더하기만 하고(DROP·DELETE·UPDATE 없음), 이미 있는 폴더·파일은 그대로 최상위로 남는다', () => {
  const dir = root + 'camp-team/db/', sql = readFileSync(dir + '0036_folder_tree.sql', 'utf8');
  const stmts = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((x) => x.trim()).filter(Boolean);
  assert.ok(stmts.length >= 6);
  for (const st of stmts) assert.match(st, /^(ALTER TABLE \w+ ADD COLUMN \w+ (TEXT|INTEGER)|CREATE INDEX IF NOT EXISTS \w+ ON \w+\(\w+\))$/, st);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|UPDATE|INSERT)\b/i);
  const db = new DatabaseSync(':memory:');
  for (const f of readdirSync(dir).filter((n) => /^\d{4}_.*\.sql$/.test(n) && !n.startsWith('0036')).sort()) db.exec(readFileSync(dir + f, 'utf8'));
  db.exec(`INSERT INTO file_folders (id,name,nameEn,createdBy,createdAt,updatedAt) VALUES ('old1','옛 폴더','Old','x@x','2026-01-01','2026-01-01');
    INSERT INTO files (id,title,kind,storage,uploadedBy,category,restricted,folderId,createdAt,updatedAt) VALUES ('of1','이름/에/경로.pdf','pdf','nas','x@x','etc',0,'old1','2026-01-01','2026-01-01');`);
  db.exec(sql);
  const f = db.prepare('SELECT * FROM file_folders WHERE id = ?').get('old1'), fl = db.prepare('SELECT * FROM files WHERE id = ?').get('of1');
  assert.equal(f.parentId, null); assert.equal(f.sortOrder, null); assert.equal(f.deletedWith, null); assert.equal(f.name, '옛 폴더');
  assert.equal(fl.folderId, 'old1'); assert.equal(fl.title, '이름/에/경로.pdf'); assert.equal(fl.sortOrder, null);
});

test('0036 이 아직 없는 DB: 폴더·파일 목록은 예전처럼 열리고, 트리 기능만 안내와 함께 막힌다', async () => {
  const env = setup();
  const d = await mkOk(env, '옛 폴더'), f = await putFile(env, U.mem, '옛 파일', d);
  env.DB.sqlite.exec('DROP INDEX idx_file_folders_parent; DROP INDEX idx_file_folders_deleted_with; DROP INDEX idx_files_deleted_with; ALTER TABLE file_folders DROP COLUMN parentId; ALTER TABLE file_folders DROP COLUMN sortOrder; ALTER TABLE file_folders DROP COLUMN deletedWith; ALTER TABLE files DROP COLUMN sortOrder; ALTER TABLE files DROP COLUMN deletedWith;');
  const l = await folders(env); assert.equal(l.length, 1); assert.equal(l[0].parentId, null); assert.equal(l[0].fileCount, 1);
  assert.equal((await files(env, U.mem, `?folderId=${d}&sort=manual`)).total, 1, '순서 열이 없어도 목록은 열린다');
  assert.equal((await mk(env, U.mem, '그냥 폴더')).id !== undefined, true, '최상위 폴더 만들기는 그대로');
  const sub = await call(Folders, 'onRequestPost', env, U.mem, { method: 'POST', body: { name: '하위', parentId: d } }); assert.equal(sub.status, 503); assert.match((await json(sub)).error, /0036/);
  assert.equal((await move(env, U.mem, 'file', f, '')).status, 503);
  assert.equal((await del(env, U.mem, d, 'all')).status, 503);
  assert.equal((await del(env, U.mem, d)).status, 200, '예전 방식 삭제는 된다');
  assert.equal((await trash(env, U.mem)).counts.folders, 1);
  assert.equal((await restore(env, U.mem, 'folders', d)).status, 200);
  assert.equal((await folders(env)).length, 2);
});

// ── 화면(files-tree.js)을 가짜 화면(DOM 흉내)에서 돌려 본다 ──
function loadTree(S, { can = true } = {}) {
  const calls = [], alerts = [], els = {}, handlers = {};
  const matches = (el, sel) => sel.split(',').some((x) => { const m = /^\[([\w-]+)\]$/.exec(x.trim()); return m && el.attrs && m[1] in el.attrs; });
  const mkEl = (attrs = {}, parent = null, rect = { top: 0, height: 100 }) => ({ attrs, parent, rect, hasAttribute(a) { return a in attrs; }, getAttribute(a) { return attrs[a]; }, getBoundingClientRect() { return rect; }, classList: { add() {}, remove() {} },
    closest(sel) { let e = this; while (e) { if (matches(e, sel)) return e; e = e.parent; } return null; } });
  const box = (name) => ({ addEventListener(t, fn) { (handlers[name + ':' + t] = handlers[name + ':' + t] || []).push(fn); }, contains: () => false });
  const store = { value: 'lift' };
  const doc = { documentElement: { classList: { add() {}, remove() {} } }, querySelectorAll: () => [], querySelector: (q) => (q.includes('ftMode') ? { value: store.value } : { onclick: null }),
    getElementById: (id) => (els[id] = els[id] || { id, innerHTML: '', open: false, onclick: null, showModal() { this.open = true; }, close() { this.open = false; }, focus() {}, textContent: '' }) };
  const CT = { dict: { ko: {}, en: {} }, addDict(d) { Object.assign(CT.dict.ko, d.ko); Object.assign(CT.dict.en, d.en); }, lang: () => 'ko', t: (k) => CT.dict.ko[k] ?? CT.dict.ko[k] ?? k, esc: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    api: async (url, o) => { calls.push({ url, method: (o && o.method) || 'GET', body: o && o.body ? JSON.parse(JSON.stringify(o.body)) : undefined }); return url.includes('/folders') && !o ? { folders: S.folders } : { ok: true }; } };
  CT.dict.ko.cancel = '취소'; CT.dict.ko.save = '저장'; CT.dict.ko.folderName = '폴더 이름'; CT.dict.ko.folderNameEn = '영문 이름';
  const win = { localStorage: { getItem: () => null, setItem() {} } };
  const sb = { CT, document: doc, window: win, localStorage: win.localStorage, alert: (m) => alerts.push(m), setTimeout: () => 0, JSON, Object, Array, Math, String };
  vm.runInNewContext(readFileSync(root + 'public/portal/campteam/files-tree.js', 'utf8'), sb);
  const T = win.CTTree; let renders = 0, reloads = 0;
  const rowOf = (f, o) => `<div class="file-row" data-drag="file:${f.id}">${f.title}${o.up ? '[up]' : ''}${o.down ? '[down]' : ''}</div>`;
  T.init({ S, label: (f) => f.name, can: () => can, fileRow: rowOf, reload: async () => { reloads++; }, render: () => { renders++; }, boxes: [box('tree'), box('list')] });
  const fire = (type, ev, name = 'tree') => (handlers[name + ':' + type] || []).forEach((fn) => fn(ev));
  return { T, S, calls, alerts, els, mkEl, fire, store, counts: () => ({ renders, reloads }), CT };
}
const folderRow = (id, name, parentId = null, extra = {}) => ({ id, name, nameEn: '', parentId, depth: 1, fileCount: 0, treeCount: 0, ...extra });
const sample = () => ({ folders: [folderRow('A', '가', null, { treeCount: 1 }), folderRow('B', '나', 'A'), folderRow('C', '다')], items: [{ id: 'f1', title: '파일1', folderId: 'A' }, { id: 'f2', title: '파일2', folderId: null }, { id: 'f3', title: '파일3', folderId: 'A' }], portalTotal: 3, filtered: false, focus: '' });
const plain = (x) => JSON.parse(JSON.stringify(x));
const clickOn = (env, attrs) => env.fire('click', { target: env.mkEl(attrs) });

test('화면: 폴더는 접힌 카드로 시작하고, 펼치면 하위 폴더·파일이 들여쓴 칸 안에 나온다 · 포털 카드는 끌 수 없다', () => {
  const env = loadTree(sample());
  let h = env.T.html();
  assert.match(h, /class="fcard[^"]*" draggable="true" data-drag="folder:A"/); assert.match(h, /data-drag="folder:C"/);
  assert.doesNotMatch(h, /data-drag="folder:B"/, '접혀 있으면 하위 폴더는 안 보인다');
  assert.match(h, /data-folder="portal"/); assert.doesNotMatch(h, /draggable="true" data-drag="portal/); assert.doesNotMatch(h, /ft-portal[^]*data-frename="portal"/);
  assert.match(h, /폴더 1개 · 파일 1개/, '폴더 카드에 하위 폴더·파일 수');
  clickOn(env, { 'data-toggle': 'A' }); assert.equal(env.counts().renders, 1);
  h = env.T.html();
  assert.match(h, /<div class="fnode" data-depth="2"><div class="fcard" draggable="true" data-drag="folder:B"/);
  assert.ok(h.indexOf('class="fkids"') < h.indexOf('folder:B') && h.indexOf('folder:B') < h.indexOf('파일1'), '하위 폴더가 먼저, 그 뒤에 파일');
  assert.match(h, /파일1\[down\]/); assert.match(h, /파일3\[up\]/);
  assert.match(h, /data-droproot="1"/); assert.match(h, /폴더 없는 자료/);
  clickOn(env, { 'data-openall': '0' }); assert.doesNotMatch(env.T.html(), /data-drag="folder:B"/);
});

test('화면: 5단계 폴더에는 「새 폴더」가 없고, 조회만 계정은 편집 버튼·끌기가 없다', () => {
  const S = sample(); S.folders = [folderRow('1', 'L1'), folderRow('2', 'L2', '1'), folderRow('3', 'L3', '2'), folderRow('4', 'L4', '3'), folderRow('5', 'L5', '4')]; S.items = [];
  const env = loadTree(S); env.T.html();
  clickOn(env, { 'data-openall': '1' });
  const h = env.T.html();
  for (const id of ['1', '2', '3', '4']) assert.match(h, new RegExp(`data-fnew="${id}"`));
  assert.doesNotMatch(h, /data-fnew="5"/); assert.match(h, /data-frename="5"/); assert.match(h, /data-depth="5"/);
  const ro = loadTree(sample(), { can: false }); const hh = ro.T.html();
  assert.doesNotMatch(hh, /draggable|data-drag="folder|data-fnew|data-frename|data-fdel|data-fmove|data-droproot/);
});

test('화면: 끌어다 놓기 — 폴더 안으로·폴더 밖으로·순서 바꾸기, 자기 안으로는 안 된다', async () => {
  const env = loadTree(sample()); env.T.html(); clickOn(env, { 'data-openall': '1' }); env.T.html();
  const card = (spec, rect) => env.mkEl({ 'data-drag': spec, draggable: 'true' }, null, rect || { top: 0, height: 100 });
  const dragOver = (src, tgt, y) => { const ev = { target: tgt, clientY: y, dataTransfer: {}, prevented: false, preventDefault() { this.prevented = true; } }; env.fire('dragstart', { target: src, dataTransfer: { setData() {} } }); env.fire('dragover', ev); return ev; };
  const drop = async (src, tgt, y) => { env.fire('dragstart', { target: src, dataTransfer: { setData() {} } }); env.fire('drop', { target: tgt, clientY: y, preventDefault() {} }); await new Promise((r) => setImmediate(r)); };
  // 파일을 폴더 C 카드 가운데에 → C 안으로 옮기기
  await drop(card('file:f2'), card('folder:C'), 50);
  assert.deepEqual(plain(env.calls.map((c) => [c.url, c.body])), [['/api/campteam/folder-tree', { action: 'move', kind: 'file', id: 'f2', parentId: 'C' }]]);
  // 폴더 B(A 안)를 폴더 밖(맨 위 칸)으로
  env.calls.length = 0; await drop(card('folder:B'), env.mkEl({ 'data-droproot': '1' }), 10);
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'move', kind: 'folder', id: 'B', parentId: '' }]);
  // 폴더 A 를 자기 하위 B 안으로 / B 의 가장자리로 → 허용 안 함
  env.calls.length = 0; assert.equal(dragOver(card('folder:A'), card('folder:B'), 50).prevented, false);
  await drop(card('folder:A'), card('folder:B'), 50); await drop(card('folder:A'), card('folder:B'), 5); assert.deepEqual(plain(env.calls), []);
  // 폴더 C 를 A 카드의 윗 가장자리에 → 같은 위치 안에서 C 가 A 앞으로(순서만)
  await drop(card('folder:C'), card('folder:A'), 5);
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'reorder', kind: 'folder', parentId: '', ids: ['C', 'A'] }]);
  // 파일 f3 을 f1 의 윗쪽에 → A 안에서 순서 바꾸기
  env.calls.length = 0; await drop(card('file:f3'), card('file:f1'), 20);
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'reorder', kind: 'file', parentId: 'A', ids: ['f3', 'f1'] }]);
  // 다른 폴더(A) 파일 위에 다른 폴더 파일 f2 를 → 먼저 A 로 옮기고 그 자리에 끼워 넣는다
  env.calls.length = 0; await drop(card('file:f2'), card('file:f1'), 80);
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'move', kind: 'file', id: 'f2', parentId: 'A' }, { action: 'reorder', kind: 'file', parentId: 'A', ids: ['f1', 'f2', 'f3'] }]);
  // 이미 그 안에 있는 파일을 같은 폴더 카드에 놓으면 아무 일도 안 한다
  env.calls.length = 0; await drop(card('file:f1'), card('folder:A'), 50); assert.deepEqual(plain(env.calls), []);
  // 폴더를 5단계 밖으로 만드는 곳 → 막는다
  const deep = sample(); deep.folders = [folderRow('1', '1'), folderRow('2', '2', '1'), folderRow('3', '3', '2'), folderRow('4', '4', '3'), folderRow('X', 'x'), folderRow('Y', 'y', 'X')]; deep.items = [];
  const e2 = loadTree(deep); e2.T.html();
  const ev = { target: e2.mkEl({ 'data-drag': 'folder:4' }), clientY: 50, dataTransfer: {}, preventDefault() { this.prevented = true; } };
  e2.fire('dragstart', { target: e2.mkEl({ 'data-drag': 'folder:X', draggable: 'true' }), dataTransfer: { setData() {} } }); e2.fire('dragover', ev);
  assert.ok(!ev.prevented, 'X(높이 2)를 4단계 폴더 안에 넣으면 6단계라 허용 안 함');
});

test('화면: 위로/아래로 버튼은 같은 폴더 안 이웃과 자리를 바꾼다', async () => {
  const env = loadTree(sample()); env.T.html();
  clickOn(env, { 'data-fup': 'folder:C' }); await new Promise((r) => setImmediate(r));
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'reorder', kind: 'folder', parentId: '', ids: ['C', 'A'] }]);
  env.calls.length = 0; clickOn(env, { 'data-fdown': 'file:f1' }); await new Promise((r) => setImmediate(r));
  assert.deepEqual(plain(env.calls.map((c) => c.body)), [{ action: 'reorder', kind: 'file', parentId: 'A', ids: ['f3', 'f1'] }]);
  env.calls.length = 0; clickOn(env, { 'data-fup': 'folder:A' }); await new Promise((r) => setImmediate(r)); assert.deepEqual(plain(env.calls), [], '맨 앞은 더 위로 못 간다');
});

test('화면: 삭제 창에는 두 가지 선택과 「복구할 수 있어요」 안내, 선택대로 서버를 부른다 · 새 폴더·이름 바꾸기 창', async () => {
  const env = loadTree(sample()); env.T.html();
  clickOn(env, { 'data-fdel': 'A' });
  const body = env.els.ftBody.innerHTML;
  assert.ok(env.els.ftDlg.open);
  assert.match(body, /「가」 폴더를 삭제할까요\?/); assert.match(body, /안의 파일과 폴더를 한 단계 위로 옮기고 이 폴더만 지우기/); assert.match(body, /안의 파일과 폴더까지 모두 삭제/);
  assert.match(body, /삭제해도 언제든지 휴지통에서 복구할 수 있어요\./); assert.match(body, /value="lift" checked/); assert.match(body, /폴더 1개, 파일 1개|안에 폴더 1개, 파일 1개/);
  env.store.value = 'all'; env.els.ftDelGo.onclick(); await new Promise((r) => setImmediate(r));
  assert.deepEqual(plain(env.calls.map((c) => [c.url, c.method])), [['/api/campteam/folders?id=A&mode=all', 'DELETE']]);
  env.calls.length = 0; clickOn(env, { 'data-fdel': 'C' }); env.store.value = 'lift'; env.els.ftDelGo.onclick(); await new Promise((r) => setImmediate(r));
  assert.deepEqual(plain(env.calls.map((c) => c.url)), ['/api/campteam/folders?id=C&mode=lift']);
  // 새 폴더(맨 위 / 폴더 안), 이름 바꾸기
  clickOn(env, { 'data-fnew': '' }); assert.match(env.els.ftBody.innerHTML, /새 폴더 만들기/);
  clickOn(env, { 'data-fnew': 'A' }); assert.match(env.els.ftBody.innerHTML, /「가」 안에 새 폴더/);
  clickOn(env, { 'data-frename': 'A' }); assert.match(env.els.ftBody.innerHTML, /폴더 이름 바꾸기/); assert.match(env.els.ftBody.innerHTML, /value="가"/);
  // 폴더로 이동 창: 자기 자신·하위는 못 고르고, 지금 위치도 못 고른다
  env.S.folders = [folderRow('A', '가'), folderRow('B', '나', 'A'), folderRow('C', '다')];
  clickOn(env, { 'data-fmove': 'folder:A' }); await new Promise((r) => setImmediate(r));
  const mv = env.els.ftBody.innerHTML;
  assert.match(mv, /「가」을\(를\) 어디로 옮길까요\?/);
  assert.match(mv, /data-to="" [^>]*disabled/, '지금 맨 위에 있으니 맨 위는 못 고름'); assert.match(mv, /data-to="A"[^>]*disabled/); assert.match(mv, /data-to="B"[^>]*disabled/); assert.doesNotMatch(mv, /data-to="C"[^>]*disabled/);
  clickOn(env, { 'data-fmovefile': 'f2' }); await new Promise((r) => setImmediate(r));
  assert.match(env.els.ftBody.innerHTML, /「파일2」을\(를\) 어디로/); assert.match(env.els.ftBody.innerHTML, /data-to="" [^>]*disabled/);
});

test('화면 코드: 정적 연결(파일·창·버전 번호·휴지통 「폴더」 탭)', () => {
  const js = readFileSync(root + 'public/portal/campteam/files.js', 'utf8'), tree = readFileSync(root + 'public/portal/campteam/files-tree.js', 'utf8'), tr = readFileSync(root + 'public/portal/campteam/trash.js', 'utf8');
  const astro = readFileSync(root + 'src/pages/portal/campteam/files.astro', 'utf8');
  for (const key of ['folderNew', 'folderMove', 'moveUp', 'moveDown', 'folderDelTitle', 'folderDelLift', 'folderDelAll', 'folderDelNote']) assert.match(tree, new RegExp(key + ':'), key);
  assert.match(tree, /삭제해도 언제든지 휴지통에서 복구할 수 있어요/); assert.match(tree, /You can always restore it from the Trash/);
  assert.match(tree, /\/api\/campteam\/folder-tree/); assert.match(js, /sort', 'manual'/); assert.match(js, /draggable="true"/);
  assert.match(tr, /folders: '폴더'/); assert.match(tr, /folders: 'Folders'/);
  assert.match(astro, /files-tree\.js\?v=\d+[^]*files\.js\?v=\d+/, 'files-tree.js 는 files.js 보다 먼저'); assert.match(astro, /id="ftDlg"/);
  assert.match(js, /fetchAllFiles/); assert.match(js, /CTTree\.init/);
});
