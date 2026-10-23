import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, audit, normTags, likeOf } from '../../lib/campteamDb.js';

const SELECT = `SELECT m.id, m.campId, m.meetDate, m.meetTime, m.title, m.titleEn, m.purpose, m.purposeEn, m.attendees, m.recordNote, m.sourcesNote, m.summaryKo, m.summaryEn, m.status, m.isTest,
    c.nameKo AS campKo, c.nameEn AS campEn,
    (SELECT COUNT(*) FROM agenda_items a WHERE a.meetingId = m.id AND a.deletedAt IS NULL AND a.nextMeeting = 0) AS sectionCount,
    (SELECT COUNT(*) FROM agenda_items a WHERE a.meetingId = m.id AND a.deletedAt IS NULL AND a.nextMeeting = 1) AS nextCount,
    (SELECT COUNT(*) FROM decisions d WHERE d.meetingId = m.id AND d.deletedAt IS NULL) AS decisionCount,
    (SELECT COUNT(*) FROM tasks k WHERE k.meetingId = m.id AND k.deletedAt IS NULL) AS taskCount,
    (SELECT COUNT(*) FROM meeting_files f WHERE f.meetingId = m.id AND f.deletedAt IS NULL) AS fileCount
  FROM meetings m LEFT JOIN camps c ON c.id = m.campId`;

/** 목록: ?from= &to= &campId=(none=캠프 없음) &q= &tag= &status= */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', '회의록'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, where = ['m.deletedAt IS NULL'], args = [];
  if (isDate(p.get('from'))) { where.push('m.meetDate >= ?'); args.push(p.get('from')); }
  if (isDate(p.get('to'))) { where.push('m.meetDate <= ?'); args.push(p.get('to')); }
  const campId = p.get('campId');
  if (campId === 'none') where.push('m.campId IS NULL'); else if (campId) { where.push('m.campId = ?'); args.push(campId); }
  if (['draft', 'final'].includes(p.get('status'))) { where.push('m.status = ?'); args.push(p.get('status')); }
  const tag = text(p.get('tag'), 40).toLowerCase();
  if (tag) { where.push(`(EXISTS (SELECT 1 FROM agenda_items a WHERE a.meetingId = m.id AND a.deletedAt IS NULL AND a.tags LIKE ?) OR EXISTS (SELECT 1 FROM decisions d WHERE d.meetingId = m.id AND d.deletedAt IS NULL AND d.tags LIKE ?))`); args.push(`%,${tag},%`, `%,${tag},%`); }
  const q = text(p.get('q'), 80);
  if (q) {
    const l = likeOf(q);
    where.push(`(m.title LIKE ? ESCAPE '\\' OR m.titleEn LIKE ? ESCAPE '\\' OR m.purpose LIKE ? ESCAPE '\\' OR m.purposeEn LIKE ? ESCAPE '\\' OR m.summaryKo LIKE ? ESCAPE '\\' OR m.summaryEn LIKE ? ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM agenda_items a WHERE a.meetingId = m.id AND a.deletedAt IS NULL AND (a.topic LIKE ? ESCAPE '\\' OR a.titleEn LIKE ? ESCAPE '\\' OR a.bodyKo LIKE ? ESCAPE '\\' OR a.bodyEn LIKE ? ESCAPE '\\'))
      OR EXISTS (SELECT 1 FROM decisions d WHERE d.meetingId = m.id AND d.deletedAt IS NULL AND (d.textKo LIKE ? ESCAPE '\\' OR d.textEn LIKE ? ESCAPE '\\')))`);
    for (let i = 0; i < 12; i++) args.push(l);
  }
  const rows = (await env.DB.prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY m.meetDate DESC, m.meetTime DESC, m.createdAt DESC LIMIT 300`).bind(...args).all()).results;
  return json({ items: rows, perms: s.perms });
}

function clean(b, base = {}) {
  const has = k => k in b;
  const title = has('title') ? text(b.title, 160) : base.title, titleEn = has('titleEn') ? text(b.titleEn, 160) : base.titleEn ?? '';
  if (!title && !titleEn) return { error: '회의 제목을 입력해주세요.' };
  const meetDate = has('meetDate') ? String(b.meetDate || '') : base.meetDate;
  if (!isDate(meetDate)) return { error: '회의 날짜를 입력해주세요.' };
  const meetTime = has('meetTime') ? String(b.meetTime || '') : base.meetTime ?? '';
  if (meetTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(meetTime)) return { error: '시간 형식(HH:MM)이 올바르지 않습니다.' };
  const status = has('status') ? b.status : base.status || 'final';
  if (!['draft', 'final'].includes(status)) return { error: '상태가 올바르지 않습니다.' };
  const f = (k, n) => has(k) ? text(b[k], n) : base[k] ?? '';
  return { v: { title: title || titleEn, titleEn, meetDate, meetTime, status, campId: has('campId') ? (b.campId || null) : base.campId ?? null,
    purpose: f('purpose', 400), purposeEn: f('purposeEn', 400), attendees: f('attendees', 300), recordNote: f('recordNote', 200), sourcesNote: f('sourcesNote', 400), summaryKo: f('summaryKo', 4000), summaryEn: f('summaryEn', 4000) } };
}
const campOk = async (env, id) => !id || !!(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(id)).first());

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b); if (error) return badRequest(error);
  if (!(await campOk(env, v.campId))) return badRequest('캠프를 찾을 수 없습니다.');
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO meetings (id,campId,meetDate,meetTime,title,titleEn,purpose,purposeEn,attendees,recordNote,sourcesNote,summaryKo,summaryEn,status,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15,?16)`)
    .bind(id, v.campId, v.meetDate, v.meetTime, v.title, v.titleEn, v.purpose, v.purposeEn, v.attendees, v.recordNote, v.sourcesNote, v.summaryKo, v.summaryEn, v.status, now, s.email).run();
  await audit(env, s.email, 'create', 'meeting', id, v.title);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b, row); if (error) return badRequest(error);
  if (!(await campOk(env, v.campId))) return badRequest('캠프를 찾을 수 없습니다.');
  await env.DB.prepare(`UPDATE meetings SET campId=?2,meetDate=?3,meetTime=?4,title=?5,titleEn=?6,purpose=?7,purposeEn=?8,attendees=?9,recordNote=?10,sourcesNote=?11,summaryKo=?12,summaryEn=?13,status=?14,updatedAt=?15 WHERE id=?1`)
    .bind(id, v.campId, v.meetDate, v.meetTime, v.title, v.titleEn, v.purpose, v.purposeEn, v.attendees, v.recordNote, v.sourcesNote, v.summaryKo, v.summaryEn, v.status, nowIso()).run();
  await audit(env, s.email, 'update', 'meeting', id, v.title);
  return json({ ok: true });
}

/** 삭제 표시(복구 가능). 회의의 구역·결정·연결은 그대로 두고 회의만 숨긴다. */
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const res = await env.DB.prepare('UPDATE meetings SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'meeting', id);
  return json({ ok: true });
}
