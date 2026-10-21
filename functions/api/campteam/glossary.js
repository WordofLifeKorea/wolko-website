import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';

/** 용어집(번역하지 않을 고정 단어 목록). 조회는 로그인한 모두, 수정은 팀원 이상. AI 초안 작성 때 "이 단어는 바꾸지 말라"고 AI 에 전달된다. */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const rows = (await env.DB.prepare('SELECT id, termKo, termEn, keep, notes, isTest FROM glossary WHERE deletedAt IS NULL ORDER BY termEn COLLATE NOCASE, termKo').all()).results;
  return json({ items: rows, perms: s.perms });
}
function clean(b, base = {}) {
  const has = k => k in b, termKo = has('termKo') ? text(b.termKo, 80) : base.termKo ?? '', termEn = has('termEn') ? text(b.termEn, 80) : base.termEn ?? '';
  if (!termKo && !termEn) return { error: '용어를 입력해주세요.' };
  return { v: { termKo, termEn, keep: has('keep') ? (b.keep ? 1 : 0) : base.keep ?? 1, notes: has('notes') ? text(b.notes, 200) : base.notes ?? '' } };
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b); if (error) return badRequest(error);
  const id = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO glossary (id,termKo,termEn,keep,notes,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)').bind(id, v.termKo, v.termEn, v.keep, v.notes, now, s.email).run();
  await audit(env, s.email, 'create', 'glossary', id, v.termEn || v.termKo); return json({ id }, 201);
}
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id'), row = await env.DB.prepare('SELECT * FROM glossary WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b, row); if (error) return badRequest(error);
  await env.DB.prepare('UPDATE glossary SET termKo=?2,termEn=?3,keep=?4,notes=?5,updatedAt=?6 WHERE id=?1').bind(id, v.termKo, v.termEn, v.keep, v.notes, nowIso()).run();
  await audit(env, s.email, 'update', 'glossary', id); return json({ ok: true });
}
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const r = await env.DB.prepare('UPDATE glossary SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'glossary', id); return json({ ok: true });
}
