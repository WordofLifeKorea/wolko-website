import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { PUBLIC_SQL } from '../../lib/campteamFiles.js';
import { MAX_DEPTH, MSG_DEPTH, MSG_NO_TREE, loadFolders, buildIndex, depthOf, descendantIds, noTreeColumns, SORT_SQL, SUBTREE_CTE } from '../../lib/campteamFolderTree.js';
import { checkRefs } from './files.js';

const missing = (e) => /file_folders|folderId/.test(String((e && e.message) || e)); // 0023 적용 전 DB

/**
 * 자료실 폴더 (트리: 폴더 안에 폴더, 최대 5단계). 폴더째 올린 자료를 묶어 보여 준다.
 *  GET    ?q=            폴더 목록 (parentId·depth·순서 포함, 보이는 파일 수 fileCount=직접, treeCount=하위 폴더 포함). 금액 자료·공개 범위는 파일 목록과 같은 규칙.
 *  POST   { name, nameEn?, campId?, typeId?, parentId? }   폴더 만들기 (parentId 가 있으면 그 폴더의 캠프·유형을 이어받는다)
 *  PATCH  ?id= { name?, nameEn? }                 이름 바꾸기
 *  DELETE ?id= &mode=lift(기본)|all                lift: 안의 파일·폴더를 한 단계 위로 옮기고 이 폴더만 지움 / all: 안의 것까지 모두 지움 (둘 다 휴지통에서 복구)
 * 옮기기·순서 바꾸기는 folder-tree.js
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료실'); if (dv) return dv; }
  const q = text(new URL(request.url).searchParams.get('q'), 80).toLowerCase();
  const vis = ['f.deletedAt IS NULL', 'f.folderId = d.id'];
  if (!s.perms.moneyRead) vis.push('f.restricted = 0');
  if (!s.campRole) vis.push(PUBLIC_SQL);
  const sql = (tree) => `SELECT d.id, d.name, d.nameEn, ${tree ? 'd.parentId, d.sortOrder,' : 'NULL AS parentId, NULL AS sortOrder,'} d.campId, d.typeId, d.createdBy, d.createdAt, c.nameKo AS campKo, c.nameEn AS campEn,
        (SELECT COUNT(*) FROM files f WHERE ${vis.join(' AND ')}) AS fileCount
      FROM file_folders d LEFT JOIN camps c ON c.id = d.campId WHERE d.deletedAt IS NULL ORDER BY ${tree ? SORT_SQL('d') : 'd.createdAt DESC'} LIMIT 2000`;
  let rows;
  try {
    try { rows = (await env.DB.prepare(sql(true)).all()).results; }
    catch (e) { if (!noTreeColumns(e)) throw e; rows = (await env.DB.prepare(sql(false)).all()).results; } // 0036 적용 전: 예전처럼 한 단계 폴더만
  } catch (e) { if (!missing(e)) throw e; return json({ folders: [] }); }
  const idx = buildIndex(rows), direct = new Map(rows.map((r) => [r.id, r.fileCount]));
  for (const r of rows) {
    r.depth = depthOf(idx, r.id);
    if (r.parentId && !idx.byId.has(r.parentId)) r.parentId = null; // 위 폴더가 사라졌으면 최상위로
    r.treeCount = r.fileCount + descendantIds(idx, r.id).reduce((n, id) => n + (direct.get(id) || 0), 0);
  }
  // 명단 밖 월코 팀원에게는 볼 수 있는 파일이 하나도 없는 폴더를 숨긴다 (안에 볼 수 있는 파일이 든 폴더의 윗 폴더는 남긴다)
  let out = s.campRole ? rows : rows.filter((r) => r.treeCount > 0);
  if (q) out = out.filter((r) => String(r.name || '').toLowerCase().includes(q) || String(r.nameEn || '').toLowerCase().includes(q));
  return json({ folders: out });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더를 만들 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const name = text(b.name, 120);
  if (!name) return badRequest('폴더 이름을 입력해주세요.');
  const parentId = String(b.parentId || '');
  let campId = b.campId || null, typeId = b.typeId || null;
  if (parentId) { // 하위 폴더: 위 폴더가 있어야 하고, 5단계를 넘으면 안 되고, 캠프·유형은 위 폴더를 따른다
    let idx; try { idx = buildIndex(await loadFolders(env)); } catch (e) { if (noTreeColumns(e) || missing(e)) return json({ error: MSG_NO_TREE, code: 'no_folder_tree' }, 503); throw e; }
    const parent = idx.byId.get(parentId);
    if (!parent) return badRequest('위 폴더를 찾을 수 없어요.');
    if (depthOf(idx, parentId) + 1 > MAX_DEPTH) return badRequest(MSG_DEPTH);
    campId = parent.campId || null; typeId = parent.typeId || null;
  } else { const ref = await checkRefs(env, b.campId, b.typeId); if (ref) return badRequest(ref); }
  const id = uuid(), now = nowIso();
  try {
    if (parentId) await env.DB.prepare('INSERT INTO file_folders (id,name,nameEn,campId,typeId,createdBy,createdAt,updatedAt,parentId) VALUES (?1,?2,?3,?4,?5,?6,?7,?7,?8)').bind(id, name, text(b.nameEn, 120), campId, typeId, s.email, now, parentId).run();
    else await env.DB.prepare('INSERT INTO file_folders (id,name,nameEn,campId,typeId,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?7)').bind(id, name, text(b.nameEn, 120), campId, typeId, s.email, now).run();
  } catch (e) { if (missing(e)) return json({ error: '폴더 기능을 쓰려면 관리자가 데이터베이스 업데이트(0023)를 먼저 적용해야 해요.', code: 'no_folders' }, 503); throw e; }
  await audit(env, s.email, 'create', 'file_folder', id, parentId ? `${name} (하위 폴더)` : name);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더를 고칠 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare('SELECT * FROM file_folders WHERE id = ?1 AND deletedAt IS NULL').bind(id || '').first().catch(() => null);
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const name = 'name' in b ? text(b.name, 120) : row.name;
  if (!name) return badRequest('폴더 이름을 입력해주세요.');
  await env.DB.prepare('UPDATE file_folders SET name = ?2, nameEn = ?3, updatedAt = ?4 WHERE id = ?1').bind(id, name, 'nameEn' in b ? text(b.nameEn, 120) : row.nameEn, nowIso()).run();
  await audit(env, s.email, 'update', 'file_folder', id, row.name === name ? name : `${row.name} → ${name}`);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더를 지울 권한이 없습니다.');
  const p = new URL(request.url).searchParams, id = p.get('id'), all = p.get('mode') === 'all';
  const row = await env.DB.prepare('SELECT id, name FROM file_folders WHERE id = ?1 AND deletedAt IS NULL').bind(id || '').first().catch(() => null);
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const now = nowIso();
  let parent = null;
  try { parent = (await env.DB.prepare('SELECT parentId FROM file_folders WHERE id = ?1').bind(id).first()).parentId || null; }
  catch (e) { // 0036 적용 전: 예전처럼 폴더만 지우고 파일은 「폴더 없음」으로 남긴다
    if (!noTreeColumns(e)) throw e;
    if (all) return json({ error: MSG_NO_TREE, code: 'no_folder_tree' }, 503);
    await env.DB.batch([
      env.DB.prepare('UPDATE files SET folderId = NULL WHERE folderId = ?1').bind(id),
      env.DB.prepare('UPDATE file_folders SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, now),
    ]);
    await audit(env, s.email, 'delete', 'file_folder', id, row.name);
    return json({ ok: true });
  }
  if (parent && !(await env.DB.prepare('SELECT 1 AS x FROM file_folders WHERE id = ?1 AND deletedAt IS NULL').bind(parent).first())) parent = null; // 위 폴더가 이미 지워졌으면 최상위로
  if (!all) { // (a) 안의 파일·폴더를 한 단계 위로 옮기고 이 폴더만 지운다
    const nf = (await env.DB.prepare('SELECT COUNT(*) AS n FROM file_folders WHERE parentId = ?1 AND deletedAt IS NULL').bind(id).first()).n;
    const nfile = (await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE folderId = ?1 AND deletedAt IS NULL').bind(id).first()).n;
    await env.DB.batch([
      env.DB.prepare('UPDATE file_folders SET parentId = ?2, sortOrder = NULL, updatedAt = ?3 WHERE parentId = ?1 AND deletedAt IS NULL').bind(id, parent, now),
      env.DB.prepare('UPDATE files SET folderId = ?2, sortOrder = NULL WHERE folderId = ?1 AND deletedAt IS NULL').bind(id, parent),
      env.DB.prepare('UPDATE file_folders SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, now),
    ]);
    await audit(env, s.email, 'delete', 'file_folder', id, `${row.name} · 안의 폴더 ${nf}개·파일 ${nfile}개는 한 단계 위로 옮김`);
    return json({ ok: true, mode: 'lift' });
  }
  // (b) 안의 파일과 폴더까지 모두 삭제 — 함께 지워진 것에는 deletedWith 로 이 폴더 번호를 달아 두어, 복구할 때 한꺼번에 되돌린다
  const cnt = async (sql) => (await env.DB.prepare(sql).bind(id).first());
  const nfile = (await cnt(`${SUBTREE_CTE} SELECT COUNT(*) AS n, COALESCE(SUM(restricted),0) AS r FROM files WHERE deletedAt IS NULL AND folderId IN (SELECT id FROM sub)`));
  if (nfile.r > 0 && !s.perms.moneyWrite) return needPerm('금액 자료가 들어 있어서 지울 수 없어요. 금액 자료는 예산·장부 권한이 있는 사람만 지울 수 있어요.');
  const nf = (await cnt(`${SUBTREE_CTE} SELECT COUNT(*) AS n FROM file_folders WHERE deletedAt IS NULL AND id <> ?1 AND id IN (SELECT id FROM sub)`)).n;
  await env.DB.batch([
    env.DB.prepare(`${SUBTREE_CTE} UPDATE files SET deletedAt = ?2, deletedWith = ?1, updatedAt = ?2 WHERE deletedAt IS NULL AND folderId IN (SELECT id FROM sub)`).bind(id, now),
    env.DB.prepare(`${SUBTREE_CTE} UPDATE file_folders SET deletedAt = ?2, deletedWith = ?1, updatedAt = ?2 WHERE deletedAt IS NULL AND id <> ?1 AND id IN (SELECT id FROM sub)`).bind(id, now),
    env.DB.prepare('UPDATE file_folders SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, now),
  ]);
  await audit(env, s.email, 'delete', 'file_folder', id, `${row.name} · 안의 폴더 ${nf}개·파일 ${nfile.n}개까지 모두 삭제`);
  return json({ ok: true, mode: 'all' });
}
