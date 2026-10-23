import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

const MAX = 400000;

/** 전사 텍스트: ?id= 본문 보기 / ?meetingId= 목록. (전사는 다른 프로그램으로 하고, 텍스트만 붙여넣어 보관한다) */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', '회의 원문'); if (dv) return dv; }
  const p = new URL(request.url).searchParams;
  if (p.get('id')) {
    const row = await env.DB.prepare('SELECT id, meetingId, kind, lang, body, createdAt, createdBy FROM meeting_texts WHERE id = ?1 AND deletedAt IS NULL').bind(p.get('id')).first();
    return row ? json({ text: row }) : json({ error: '찾을 수 없습니다.' }, 404);
  }
  const rows = (await env.DB.prepare('SELECT id, kind, lang, LENGTH(body) AS chars, createdAt, createdBy FROM meeting_texts WHERE meetingId = ?1 AND deletedAt IS NULL ORDER BY createdAt').bind(p.get('meetingId')).all()).results;
  return json({ items: rows });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const m = await env.DB.prepare('SELECT id FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId || '')).first();
  if (!m) return badRequest('회의를 찾을 수 없습니다.');
  const body = String(b.body || '').trim(); if (!body) return badRequest('내용이 비어 있어요.'); if (body.length > MAX) return badRequest('내용이 너무 깁니다(최대 40만 자).');
  const id = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO meeting_texts (id,meetingId,kind,lang,body,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)')
    .bind(id, m.id, b.kind === 'notes' ? 'notes' : 'transcript', ['ko', 'en'].includes(b.lang) ? b.lang : '', body, now, s.email).run();
  await audit(env, s.email, 'add_text', 'meeting', m.id, `${body.length} chars`);
  return json({ id }, 201);
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('삭제 권한이 없습니다.');
  const res = await env.DB.prepare('UPDATE meeting_texts SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(new URL(request.url).searchParams.get('id'), nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  return json({ ok: true });
}
