import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { CATEGORIES, FILE_STATUSES, restrictedFor, validExternalUrl, linkKindFor, kindForLink, PUBLIC_SQL, setFilePublic, isFilePublic } from '../../lib/campteamFiles.js';

const SORTS = {
  newest: 'f.createdAt DESC', oldest: 'f.createdAt ASC', updated: 'f.updatedAt DESC', name: 'f.title COLLATE NOCASE ASC',
};
const SELECT = `SELECT f.id, f.campId, f.typeId, f.title, f.description, f.category, f.topic, f.kind, f.storage, f.linkKind, f.externalUrl,
    f.uploadedBy, f.statusLabel, f.restricted, f.createdAt, f.updatedAt, f.isTest,
    (SELECT COUNT(*) FROM file_public pb WHERE pb.fileId = f.id) AS isPublic,
    c.nameKo AS campKo, c.nameEn AS campEn, t.nameKo AS typeKo, t.nameEn AS typeEn,
    v.id AS versionId, v.versionNo, v.fileName, v.sizeBytes, v.mime,
    (SELECT COUNT(*) FROM file_versions x WHERE x.fileId = f.id AND x.deletedAt IS NULL) AS versionCount,
    (SELECT GROUP_CONCAT(l.campId) FROM file_links l WHERE l.fileId = f.id AND l.deletedAt IS NULL) AS linkedCampIds
  FROM files f
  LEFT JOIN camps c ON c.id = f.campId
  LEFT JOIN camp_types t ON t.id = f.typeId
  LEFT JOIN file_versions v ON v.id = f.currentVersionId`;

/** 목록 · 검색 · 필터 · 정렬: ?q= &campId=(없으면 전체, none=공통) &typeId= &category= &status= &kind= &sort= &limit= &offset= */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료실'); if (dv) return dv; }
  const p = new URL(request.url).searchParams;
  const where = ['f.deletedAt IS NULL'], args = [];
  if (!s.perms.moneyRead) where.push('f.restricted = 0'); // 금액 자료는 권한이 없으면 목록에도 나오지 않는다
  if (!s.campRole) where.push(PUBLIC_SQL);               // 캠프팀 명단 밖의 월코 팀원은 "월코 팀 전체 공개" 파일만
  const q = text(p.get('q'), 80);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, m => '\\' + m)}%`;
    where.push(`(f.title LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.topic LIKE ? ESCAPE '\\' OR v.fileName LIKE ? ESCAPE '\\')`);
    args.push(like, like, like, like);
  }
  const campId = p.get('campId');
  if (campId === 'none') where.push(`(f.campId IS NULL AND NOT EXISTS (SELECT 1 FROM file_links l WHERE l.fileId = f.id AND l.deletedAt IS NULL))`);
  else if (campId) { where.push(`(f.campId = ? OR EXISTS (SELECT 1 FROM file_links l WHERE l.fileId = f.id AND l.campId = ? AND l.deletedAt IS NULL))`); args.push(campId, campId); }
  const typeId = p.get('typeId');
  if (typeId) {
    where.push(`(f.typeId = ? OR c.typeId = ? OR EXISTS (SELECT 1 FROM file_links l JOIN camps lc ON lc.id = l.campId WHERE l.fileId = f.id AND l.deletedAt IS NULL AND lc.typeId = ?))`);
    args.push(typeId, typeId, typeId);
  }
  if (CATEGORIES.includes(p.get('category'))) { where.push('f.category = ?'); args.push(p.get('category')); }
  if (FILE_STATUSES.includes(p.get('status')) && p.get('status')) { where.push('f.statusLabel = ?'); args.push(p.get('status')); }
  const kind = p.get('kind');
  if (kind === 'link') where.push(`f.storage = 'link'`);
  else if (kind) { where.push('f.kind = ?'); args.push(text(kind, 10)); }
  const order = SORTS[p.get('sort')] || SORTS.newest;
  const limit = Math.min(Math.max(parseInt(p.get('limit'), 10) || 100, 1), 200), offset = Math.max(parseInt(p.get('offset'), 10) || 0, 0);
  const clause = where.join(' AND ');
  const run = (sel) => env.DB.prepare(`${sel} WHERE ${clause} ORDER BY ${order}, f.id LIMIT ? OFFSET ?`).bind(...args, limit, offset).all();
  let rows;
  try { rows = (await run(SELECT)).results; }
  catch (e) { if (!/file_public/.test(String(e && e.message))) throw e; rows = (await run(SELECT.replace('(SELECT COUNT(*) FROM file_public pb WHERE pb.fileId = f.id) AS isPublic', '0 AS isPublic'))).results; } // 0018 적용 전에도 목록은 열린다
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM files f LEFT JOIN camps c ON c.id = f.campId LEFT JOIN file_versions v ON v.id = f.currentVersionId WHERE ${clause}`).bind(...args).first()).n;
  return json({
    items: rows.map(r => ({ ...r, linkedCampIds: r.linkedCampIds ? r.linkedCampIds.split(',') : [] })),
    total, perms: s.perms,
  });
}

/** 외부 문서 링크 등록: { title, description, externalUrl, campId?, typeId?, category, topic, status } */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const category = CATEGORIES.includes(b.category) ? b.category : 'etc';
  const restricted = restrictedFor(category) ? 1 : 0;
  if (!canWriteFile(s.perms, restricted)) return needPerm(restricted ? '금액 자료를 등록할 권한이 없습니다.' : '작성 권한이 없습니다.');
  const title = text(b.title, 120);
  if (!title) return badRequest('제목을 입력해주세요.');
  const url = validExternalUrl(b.externalUrl);
  if (!url) return badRequest('https:// 로 시작하는 올바른 링크를 입력해주세요.');
  const ref = await checkRefs(env, b.campId, b.typeId); if (ref) return badRequest(ref);
  const id = uuid(), now = nowIso(), linkKind = linkKindFor(url);
  await env.DB.prepare(`INSERT INTO files (id,campId,typeId,title,description,kind,storage,externalUrl,uploadedBy,statusLabel,category,topic,restricted,linkKind,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,?6,'link',?7,?8,?9,?10,?11,?12,?13,?14,?14,?8)`)
    .bind(id, b.campId || null, b.typeId || null, title, text(b.description, 500), kindForLink(linkKind), url, s.email,
      FILE_STATUSES.includes(b.status) ? b.status : '', category, text(b.topic, 60), restricted, linkKind, now).run();
  if ('publicToAll' in b && !restricted) await setFilePublic(env, id, !!b.publicToAll, s.email);
  await audit(env, s.email, 'create', 'file', id, `link:${title}`);
  return json({ id }, 201);
}

/** 정보 수정: ?id=  { title, description, category, topic, status, campId, typeId, externalUrl, addCampId, removeCampId, currentVersionId } */
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare('SELECT * FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row || (row.restricted && !s.perms.moneyRead)) return json({ error: '찾을 수 없습니다.' }, 404);
  const category = 'category' in b ? (CATEGORIES.includes(b.category) ? b.category : row.category) : row.category;
  const restricted = restrictedFor(category) ? 1 : 0;
  if (!canWriteFile(s.perms, row.restricted) || !canWriteFile(s.perms, restricted)) return needPerm('수정 권한이 없습니다.');
  const now = nowIso();
  const title = 'title' in b ? text(b.title, 120) : row.title;
  if (!title) return badRequest('제목을 입력해주세요.');
  let url = row.externalUrl, linkKind = row.linkKind;
  if (row.storage === 'link' && 'externalUrl' in b) {
    url = validExternalUrl(b.externalUrl);
    if (!url) return badRequest('https:// 로 시작하는 올바른 링크를 입력해주세요.');
    linkKind = linkKindFor(url);
  }
  const campId = 'campId' in b ? (b.campId || null) : row.campId, typeId = 'typeId' in b ? (b.typeId || null) : row.typeId;
  const ref = await checkRefs(env, campId, typeId); if (ref) return badRequest(ref);
  let versionId = row.currentVersionId;
  if (b.currentVersionId) { // 이전 버전으로 되돌리기(이전 버전도 그대로 남는다)
    const v = await env.DB.prepare('SELECT id FROM file_versions WHERE id = ?1 AND fileId = ?2 AND deletedAt IS NULL').bind(String(b.currentVersionId), id).first();
    if (!v) return badRequest('해당 버전을 찾을 수 없습니다.');
    versionId = v.id;
  }
  await env.DB.prepare(`UPDATE files SET title=?2, description=?3, category=?4, topic=?5, statusLabel=?6, campId=?7, typeId=?8, externalUrl=?9, linkKind=?10, restricted=?11, currentVersionId=?12, updatedAt=?13 WHERE id=?1`)
    .bind(id, title, 'description' in b ? text(b.description, 500) : row.description, category, 'topic' in b ? text(b.topic, 60) : row.topic,
      'status' in b ? (FILE_STATUSES.includes(b.status) ? b.status : row.statusLabel) : row.statusLabel, campId, typeId, url, linkKind, restricted, versionId, now).run();
  if (b.addCampId) {
    const camp = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.addCampId)).first();
    if (!camp) return badRequest('연결할 캠프를 찾을 수 없습니다.');
    await env.DB.prepare(`INSERT INTO file_links (id,fileId,campId,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5)
      ON CONFLICT(fileId, campId) DO UPDATE SET deletedAt = NULL`).bind(uuid(), id, camp.id, now, s.email).run();
  }
  if (b.removeCampId) await env.DB.prepare('UPDATE file_links SET deletedAt = ?3 WHERE fileId = ?1 AND campId = ?2 AND deletedAt IS NULL').bind(id, String(b.removeCampId), now).run();
  if ('publicToAll' in b) await setFilePublic(env, id, !!b.publicToAll && !restricted, s.email);
  else if (restricted) await setFilePublic(env, id, false, s.email); // 금액 자료로 바뀌면 공개를 거둔다
  await audit(env, s.email, 'update', 'file', id, title);
  return json({ ok: true });
}

/** 삭제 표시(복구 가능) */
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT restricted FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row || (row.restricted && !s.perms.moneyRead)) return json({ error: '찾을 수 없습니다.' }, 404);
  if (!canWriteFile(s.perms, row.restricted)) return needPerm('삭제 권한이 없습니다.');
  await env.DB.prepare('UPDATE files SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, nowIso()).run();
  await audit(env, s.email, 'delete', 'file', id);
  return json({ ok: true });
}

export async function checkRefs(env, campId, typeId) {
  if (campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first())) return '캠프를 찾을 수 없습니다.';
  if (typeId && !(await env.DB.prepare('SELECT 1 AS x FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(String(typeId)).first())) return '캠프 유형을 찾을 수 없습니다.';
  return '';
}
