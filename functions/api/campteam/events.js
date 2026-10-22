import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, audit } from '../../lib/campteamDb.js';

const KINDS = ['team', 'camp', 'out'];
const isTime = v => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v));

/** 팀 일정 목록: ?from=YYYY-MM-DD&to=YYYY-MM-DD (겹치는 일정 모두) */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'tasks', '일정'); if (dv) return dv; }
  const p = new URL(request.url).searchParams;
  const from = isDate(p.get('from')) ? p.get('from') : '0000-01-01', to = isDate(p.get('to')) ? p.get('to') : '9999-12-31';
  const rows = (await env.DB.prepare(`SELECT e.id, e.campId, e.title, e.kind, e.startDate, e.endDate, e.startTime, e.endTime, e.location, e.notes, e.isTest, c.nameKo AS campKo, c.nameEn AS campEn
    FROM events e LEFT JOIN camps c ON c.id = e.campId
    WHERE e.deletedAt IS NULL AND e.startDate <= ?2 AND COALESCE(e.endDate, e.startDate) >= ?1 ORDER BY e.startDate, e.startTime`).bind(from, to).all()).results;
  return json({ items: rows, perms: s.perms });
}

function clean(b, base = {}) {
  const has = k => k in b;
  const title = has('title') ? text(b.title, 120) : base.title;
  if (!title) return { error: '일정 이름을 입력해주세요.' };
  const startDate = has('startDate') ? String(b.startDate || '') : base.startDate;
  if (!isDate(startDate)) return { error: '시작 날짜를 입력해주세요.' };
  const endDate = has('endDate') ? (b.endDate ? String(b.endDate) : null) : base.endDate ?? null;
  if (endDate && (!isDate(endDate) || endDate < startDate)) return { error: '종료일이 올바르지 않습니다.' };
  const startTime = has('startTime') ? String(b.startTime || '') : base.startTime ?? '', endTime = has('endTime') ? String(b.endTime || '') : base.endTime ?? '';
  if (!isTime(startTime) || !isTime(endTime)) return { error: '시간 형식(HH:MM)이 올바르지 않습니다.' };
  const kind = has('kind') ? b.kind : base.kind || 'team';
  if (!KINDS.includes(kind)) return { error: '일정 종류가 올바르지 않습니다.' };
  return { v: { title, startDate, endDate, startTime, endTime, kind, campId: has('campId') ? (b.campId || null) : base.campId ?? null,
    location: has('location') ? text(b.location, 120) : base.location ?? '', notes: has('notes') ? text(b.notes, 500) : base.notes ?? '' } };
}
async function campOk(env, campId) { return !campId || !!(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first()); }

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b); if (error) return badRequest(error);
  if (!(await campOk(env, v.campId))) return badRequest('캠프를 찾을 수 없습니다.');
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO events (id,campId,title,kind,startDate,endDate,startTime,endTime,location,notes,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11,?12)`)
    .bind(id, v.campId, v.title, v.kind, v.startDate, v.endDate, v.startTime, v.endTime, v.location, v.notes, now, s.email).run();
  await audit(env, s.email, 'create', 'event', id, v.title);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM events WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b, row); if (error) return badRequest(error);
  if (!(await campOk(env, v.campId))) return badRequest('캠프를 찾을 수 없습니다.');
  await env.DB.prepare(`UPDATE events SET campId=?2,title=?3,kind=?4,startDate=?5,endDate=?6,startTime=?7,endTime=?8,location=?9,notes=?10,updatedAt=?11 WHERE id=?1`)
    .bind(id, v.campId, v.title, v.kind, v.startDate, v.endDate, v.startTime, v.endTime, v.location, v.notes, nowIso()).run();
  await audit(env, s.email, 'update', 'event', id, v.title);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const res = await env.DB.prepare('UPDATE events SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'event', id);
  return json({ ok: true });
}
