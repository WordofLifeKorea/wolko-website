import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { MSG_NO_TREE, loadFolders, buildIndex, checkMove, noTreeColumns, SUBTREE_CTE } from '../../lib/campteamFolderTree.js';

/**
 * 자료실 폴더 트리: 파일·폴더 옮기기, 같은 폴더 안 순서 바꾸기.
 * 권한은 폴더 만들기·고치기와 같다(자료실 「수정」 권한이 있는 캠프팀 팀원). 금액 자료(파일)만 예산·장부 수정 권한이 더 필요하다.
 *  POST { action:'move', kind:'folder'|'file', id, parentId }   parentId '' = 맨 위(폴더 밖). 폴더를 옮기면 새 위 폴더의 캠프·유형이 그 아래 폴더 전부에 적용된다.
 *  POST { action:'reorder', kind:'folder'|'file', parentId, ids:[…] }   ids 의 순서대로 순서 번호(1, 2, 3…)를 매긴다. 모두 같은 폴더 안에 있어야 한다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더나 파일을 옮길 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const kind = b.kind === 'file' ? 'file' : b.kind === 'folder' ? 'folder' : '';
  if (!kind) return badRequest('옮길 대상이 올바르지 않습니다.');
  try {
    if (b.action === 'move') return await move(env, s, kind, String(b.id || ''), String(b.parentId || ''));
    if (b.action === 'reorder') return await reorder(env, s, kind, String(b.parentId || ''), Array.isArray(b.ids) ? b.ids.map(String) : []);
  } catch (e) {
    if (noTreeColumns(e) || /file_folders|folderId/.test(String((e && e.message) || e))) return json({ error: MSG_NO_TREE, code: 'no_folder_tree' }, 503);
    throw e;
  }
  return badRequest('요청이 올바르지 않습니다.');
}

const label = (idx, id) => (id && idx.byId.get(id) ? idx.byId.get(id).name : '맨 위');

async function move(env, s, kind, id, parentId) {
  const idx = buildIndex(await loadFolders(env)), now = nowIso();
  if (parentId && !idx.byId.has(parentId)) return badRequest('옮길 폴더를 찾을 수 없어요.');
  if (kind === 'folder') {
    const row = idx.byId.get(id);
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    if ((row.parentId || '') === parentId) return json({ ok: true, same: true });
    const err = checkMove(idx, id, parentId); if (err) return badRequest(err);
    const stmts = [];
    if (parentId) { // 새 위 폴더의 캠프·유형을 이 폴더와 그 아래 전부에 적용
      const par = idx.byId.get(parentId);
      stmts.push(env.DB.prepare(`${SUBTREE_CTE} UPDATE file_folders SET campId = ?2, typeId = ?3, updatedAt = ?4 WHERE id IN (SELECT id FROM sub)`).bind(id, par.campId || null, par.typeId || null, now));
    }
    stmts.push(env.DB.prepare('UPDATE file_folders SET parentId = ?2, sortOrder = NULL, updatedAt = ?3 WHERE id = ?1').bind(id, parentId || null, now));
    await env.DB.batch(stmts);
    await audit(env, s.email, 'move', 'file_folder', id, `${row.name}: ${label(idx, row.parentId)} → ${label(idx, parentId)}`);
    return json({ ok: true });
  }
  const row = await env.DB.prepare('SELECT id, title, folderId, restricted FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row || (row.restricted && !s.perms.moneyRead)) return json({ error: '찾을 수 없습니다.' }, 404);
  if (!canWriteFile(s.perms, row.restricted)) return needPerm('금액 자료는 예산·장부 수정 권한이 있는 사람만 옮길 수 있어요.');
  if ((row.folderId || '') === parentId) return json({ ok: true, same: true });
  await env.DB.prepare('UPDATE files SET folderId = ?2, sortOrder = NULL WHERE id = ?1').bind(id, parentId || null).run();
  await audit(env, s.email, 'move', 'file', id, `${row.title}: ${label(idx, row.folderId)} → ${label(idx, parentId)}`);
  return json({ ok: true });
}

async function reorder(env, s, kind, parentId, ids) {
  if (!ids.length || ids.length > 500 || new Set(ids).size !== ids.length) return badRequest('순서를 바꿀 목록이 올바르지 않아요.');
  const idx = buildIndex(await loadFolders(env));
  if (parentId && !idx.byId.has(parentId)) return badRequest('폴더를 찾을 수 없어요.');
  const stmts = [];
  if (kind === 'folder') {
    for (const id of ids) {
      const row = idx.byId.get(id);
      if (!row || (row.parentId && idx.byId.has(row.parentId) ? row.parentId : '') !== parentId) return badRequest('같은 폴더 안에 있는 것만 순서를 바꿀 수 있어요.');
      stmts.push(env.DB.prepare('UPDATE file_folders SET sortOrder = ?2 WHERE id = ?1').bind(id, stmts.length + 1));
    }
  } else {
    for (const id of ids) {
      const row = await env.DB.prepare('SELECT id, folderId, restricted FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
      if (!row || (row.restricted && !s.perms.moneyRead) || (row.folderId || '') !== parentId) return badRequest('같은 폴더 안에 있는 것만 순서를 바꿀 수 있어요.');
      if (!canWriteFile(s.perms, row.restricted)) return needPerm('금액 자료는 예산·장부 수정 권한이 있는 사람만 옮길 수 있어요.');
      stmts.push(env.DB.prepare('UPDATE files SET sortOrder = ?2 WHERE id = ?1').bind(id, stmts.length + 1));
    }
  }
  await env.DB.batch(stmts);
  await audit(env, s.email, 'reorder', kind === 'folder' ? 'file_folder' : 'file', parentId || 'root', `${label(idx, parentId)} 안의 ${kind === 'folder' ? '폴더' : '파일'} ${ids.length}개 순서 바꿈`);
  return json({ ok: true });
}
