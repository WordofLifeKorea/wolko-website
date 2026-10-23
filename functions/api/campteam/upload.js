import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { CATEGORIES, FILE_STATUSES, DEFAULT_MAX_UPLOAD_BYTES, restrictedFor, cleanFileName, kindFor, mimeFor, setFilePublic } from '../../lib/campteamFiles.js';
import { storageFor } from '../../lib/campteamStorage.js';
import { checkRefs } from './files.js';

/**
 * 파일 올리기. 파일 내용은 요청 본문 그대로(스트리밍), 정보는 주소의 ? 값과 헤더로 보낸다.
 *   헤더  X-File-Name: 인코딩된 파일 이름,  Content-Length: 필수
 *   새 파일:   ?title= &description= &campId= &typeId= &category= &topic= &status=
 *   새 버전:   ?fileId= &note=
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const storage = storageFor(env);
  if (!storage) return json({ error: '파일 보관소 설정이 필요해서 지금은 링크 등록만 할 수 있어요.', code: 'no_storage' }, 503);
  const max = Number(env.CAMPTEAM_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;
  const size = Number(request.headers.get('content-length'));
  if (!Number.isFinite(size) || size <= 0) return json({ error: '파일 크기를 알 수 없습니다.' }, 411);
  if (size > max) return json({ error: `파일이 너무 큽니다 (최대 ${Math.round(max / 1048576)}MB).`, code: 'too_large' }, 413);
  const p = new URL(request.url).searchParams;
  const fileName = cleanFileName(request.headers.get('x-file-name'));
  const mime = mimeFor(fileName), kind = kindFor(fileName), now = nowIso();

  let file, versionNo = 1, fileId = p.get('fileId');
  if (fileId) {
    file = await env.DB.prepare('SELECT * FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(fileId).first();
    if (!file || (file.restricted && !s.perms.moneyRead)) return json({ error: '찾을 수 없습니다.' }, 404);
    if (file.storage === 'link') return badRequest('외부 링크 문서에는 파일을 올릴 수 없습니다.');
    if (!canWriteFile(s.perms, file.restricted)) return needPerm('수정 권한이 없습니다.');
    versionNo = ((await env.DB.prepare('SELECT MAX(versionNo) AS n FROM file_versions WHERE fileId = ?1').bind(fileId).first()).n || 0) + 1;
  } else {
    const category = CATEGORIES.includes(p.get('category')) ? p.get('category') : 'etc';
    const restricted = restrictedFor(category) ? 1 : 0;
    if (!canWriteFile(s.perms, restricted)) return needPerm(restricted ? '금액 자료를 올릴 권한이 없습니다.' : '작성 권한이 없습니다.');
    const ref = await checkRefs(env, p.get('campId'), p.get('typeId')); if (ref) return badRequest(ref);
    fileId = uuid();
    const title = text(p.get('title'), 120) || fileName.replace(/\.[^.]+$/, '');
    const status = p.get('status');
    await env.DB.prepare(`INSERT INTO files (id,campId,typeId,title,description,kind,storage,uploadedBy,statusLabel,category,topic,restricted,createdAt,updatedAt,createdBy)
      VALUES (?1,?2,?3,?4,?5,?6,'nas',?7,?8,?9,?10,?11,?12,?12,?7)`)
      .bind(fileId, p.get('campId') || null, p.get('typeId') || null, title, text(p.get('description'), 500), kind, s.email,
        FILE_STATUSES.includes(status) ? status : '', category, text(p.get('topic'), 60), restricted, now).run();
    if (p.get('publicToAll') === '1' && !restricted) await setFilePublic(env, fileId, true, s.email);
    file = { id: fileId };
  }

  let key;
  try { key = await storage.put(fileName, request.body, { mime, size }); }
  catch (e) {
    if (versionNo === 1 && !p.get('fileId')) await env.DB.prepare('UPDATE files SET deletedAt = ?2 WHERE id = ?1').bind(fileId, nowIso()).run(); // 본문 저장 실패 → 빈 기록을 남기지 않는다
    return json({ error: '파일을 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.', code: 'storage_failed' }, 502);
  }
  const versionId = uuid();
  await env.DB.prepare(`INSERT INTO file_versions (id,fileId,versionNo,backend,storageKey,fileName,mime,sizeBytes,note,uploadedBy,createdAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`)
    .bind(versionId, fileId, versionNo, storage.backend, key, fileName, mime, size, text(p.get('note'), 200), s.email, now).run();
  await env.DB.prepare(`UPDATE files SET currentVersionId = ?2, kind = ?3, storage = 'nas', updatedAt = ?4 WHERE id = ?1`).bind(fileId, versionId, kind, now).run();
  await audit(env, s.email, versionNo > 1 ? 'new_version' : 'upload', 'file', fileId, `${fileName} v${versionNo}`);
  return json({ id: fileId, versionId, versionNo }, 201);
}
