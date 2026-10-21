import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';

/** 팀 공지(TV 의 Team Announcements). 조회는 로그인한 모두, 작성·수정·삭제는 캠프팀 팀원 이상 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const rows = (await env.DB.prepare('SELECT id, message, messageEn, active, sortOrder, isTest FROM notices WHERE deletedAt IS NULL ORDER BY sortOrder, createdAt').all()).results;
  return json({ items: rows, perms: s.perms });
}
function clean(b, base = {}) {
  const has = k => k in b, message = has('message') ? text(b.message, 300) : base.message, messageEn = has('messageEn') ? text(b.messageEn, 300) : base.messageEn ?? '';
  if (!message && !messageEn) return { error: '공지 내용을 입력해주세요.' };
  return { v: { message: message || messageEn, messageEn, active: has('active') ? (b.active ? 1 : 0) : base.active ?? 1, sortOrder: has('sortOrder') && Number.isInteger(Number(b.sortOrder)) ? Number(b.sortOrder) : base.sortOrder ?? 0 } };
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b); if (error) return badRequest(error);
  const order = v.sortOrder || (((await env.DB.prepare('SELECT MAX(sortOrder) AS n FROM notices WHERE deletedAt IS NULL').first()).n || 0) + 1), id = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO notices (id,message,messageEn,active,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)').bind(id, v.message, v.messageEn, v.active, order, now, s.email).run();
  await audit(env, s.email, 'create', 'notice', id, v.message.slice(0, 60)); return json({ id }, 201);
}
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id'), row = await env.DB.prepare('SELECT * FROM notices WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b, row); if (error) return badRequest(error);
  await env.DB.prepare('UPDATE notices SET message=?2,messageEn=?3,active=?4,sortOrder=?5,updatedAt=?6 WHERE id=?1').bind(id, v.message, v.messageEn, v.active, v.sortOrder, nowIso()).run();
  await audit(env, s.email, 'update', 'notice', id); return json({ ok: true });
}
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('삭제 권한이 없습니다.');
  const r = await env.DB.prepare('UPDATE notices SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(new URL(request.url).searchParams.get('id'), nowIso()).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'notice', new URL(request.url).searchParams.get('id')); return json({ ok: true });
}
