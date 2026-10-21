import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit, normTags } from '../../lib/campteamDb.js';

const ROLES = ['minutes', 'transcript', 'notes', 'photo', 'audio', 'reference'];

/** 회의에 자료실 파일 연결: POST { meetingId, fileId, role }  /  해제: DELETE ?meetingId=&fileId=   (파일은 자료실에 한 번만 올린다) */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const m = await env.DB.prepare('SELECT id FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId || '')).first();
  if (!m) return badRequest('회의를 찾을 수 없습니다.');
  const f = await env.DB.prepare('SELECT id, restricted FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.fileId || '')).first();
  if (!f || (f.restricted && !s.perms.moneyRead)) return badRequest('파일을 찾을 수 없습니다.');
  const role = ROLES.includes(b.role) ? b.role : 'reference';
  await env.DB.prepare(`INSERT INTO meeting_files (id,meetingId,fileId,role,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6)
    ON CONFLICT(meetingId, fileId) DO UPDATE SET role = ?4, deletedAt = NULL`).bind(uuid(), m.id, f.id, role, nowIso(), s.email).run();
  await audit(env, s.email, 'link_file', 'meeting', m.id, f.id);
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('삭제 권한이 없습니다.');
  const p = new URL(request.url).searchParams;
  const res = await env.DB.prepare('UPDATE meeting_files SET deletedAt = ?3 WHERE meetingId = ?1 AND fileId = ?2 AND deletedAt IS NULL').bind(p.get('meetingId'), p.get('fileId'), nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'unlink_file', 'meeting', p.get('meetingId'), p.get('fileId'));
  return json({ ok: true });
}
