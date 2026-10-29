import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit, likeOf } from '../../lib/campteamDb.js';
import { PUBLIC_SQL } from '../../lib/campteamFiles.js';
import { checkRefs } from './files.js';

const missing = (e) => /file_folders|folderId/.test(String((e && e.message) || e)); // 0023 적용 전 DB

/**
 * 자료실 폴더 (한 단계). 폴더째 올린 자료를 묶어 보여 준다.
 *  GET    ?q=            폴더 목록 (보이는 파일 수 포함). 금액 자료·공개 범위는 파일 목록과 같은 규칙.
 *  POST   { name, nameEn?, campId?, typeId? }   폴더 만들기
 *  PATCH  ?id= { name?, nameEn? }                 이름 바꾸기
 *  DELETE ?id=                                    폴더만 지움 — 안의 파일은 「폴더 없음」으로 그대로 남는다
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료실'); if (dv) return dv; }
  const q = text(new URL(request.url).searchParams.get('q'), 80);
  const vis = ['f.deletedAt IS NULL', 'f.folderId = d.id'];
  if (!s.perms.moneyRead) vis.push('f.restricted = 0');
  if (!s.campRole) vis.push(PUBLIC_SQL);
  const where = ['d.deletedAt IS NULL'], args = [];
  if (q) { where.push(`(d.name LIKE ? ESCAPE '\\' OR d.nameEn LIKE ? ESCAPE '\\')`); const l = likeOf(q); args.push(l, l); }
  let rows;
  try {
    rows = (await env.DB.prepare(`SELECT d.id, d.name, d.nameEn, d.campId, d.typeId, d.createdBy, d.createdAt, c.nameKo AS campKo, c.nameEn AS campEn,
        (SELECT COUNT(*) FROM files f WHERE ${vis.join(' AND ')}) AS fileCount
      FROM file_folders d LEFT JOIN camps c ON c.id = d.campId WHERE ${where.join(' AND ')} ORDER BY d.createdAt DESC LIMIT 300`).bind(...args).all()).results;
  } catch (e) { if (!missing(e)) throw e; return json({ folders: [] }); }
  // 명단 밖 월코 팀원에게는 볼 수 있는 파일이 하나도 없는 폴더를 숨긴다
  return json({ folders: s.campRole ? rows : rows.filter((r) => r.fileCount > 0) });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더를 만들 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const name = text(b.name, 120);
  if (!name) return badRequest('폴더 이름을 입력해주세요.');
  const ref = await checkRefs(env, b.campId, b.typeId); if (ref) return badRequest(ref);
  const id = uuid(), now = nowIso();
  try {
    await env.DB.prepare('INSERT INTO file_folders (id,name,nameEn,campId,typeId,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?7)')
      .bind(id, name, text(b.nameEn, 120), b.campId || null, b.typeId || null, s.email, now).run();
  } catch (e) { if (missing(e)) return json({ error: '폴더 기능을 쓰려면 관리자가 데이터베이스 업데이트(0023)를 먼저 적용해야 해요.', code: 'no_folders' }, 503); throw e; }
  await audit(env, s.email, 'create', 'file_folder', id, name);
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
  await audit(env, s.email, 'update', 'file_folder', id, name);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('폴더를 지울 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT id, name FROM file_folders WHERE id = ?1 AND deletedAt IS NULL').bind(id || '').first().catch(() => null);
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('UPDATE files SET folderId = NULL WHERE folderId = ?1').bind(id),
    env.DB.prepare('UPDATE file_folders SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, now),
  ]);
  await audit(env, s.email, 'delete', 'file_folder', id, row.name);
  return json({ ok: true });
}
