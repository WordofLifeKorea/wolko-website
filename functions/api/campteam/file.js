import { isFilePublic } from '../../lib/campteamFiles.js';
import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';

/** 파일 하나의 자세한 정보: 버전 이력과 연결된 캠프 포함 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료'); if (dv) return dv; }
  const id = new URL(request.url).searchParams.get('id');
  const f = await env.DB.prepare(`SELECT f.*, c.nameKo AS campKo, c.nameEn AS campEn, t.nameKo AS typeKo, t.nameEn AS typeEn
    FROM files f LEFT JOIN camps c ON c.id = f.campId LEFT JOIN camp_types t ON t.id = f.typeId WHERE f.id = ?1 AND f.deletedAt IS NULL`).bind(id).first();
  if (!f || (f.restricted && !s.perms.moneyRead) || (!s.campRole && !(await isFilePublic(env, f.id)))) return json({ error: '찾을 수 없습니다.' }, 404);
  f.isPublic = (await isFilePublic(env, f.id)) ? 1 : 0;
  const versions = (await env.DB.prepare(`SELECT id, versionNo, fileName, mime, sizeBytes, note, uploadedBy, createdAt, backend
    FROM file_versions WHERE fileId = ?1 AND deletedAt IS NULL ORDER BY versionNo DESC`).bind(id).all()).results;
  const links = (await env.DB.prepare(`SELECT l.campId, c.nameKo, c.nameEn FROM file_links l JOIN camps c ON c.id = l.campId
    WHERE l.fileId = ?1 AND l.deletedAt IS NULL AND c.deletedAt IS NULL ORDER BY c.nameKo`).bind(id).all()).results;
  return json({ file: f, versions, links, perms: s.perms });
}
