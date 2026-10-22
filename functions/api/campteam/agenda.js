import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit, normTags } from '../../lib/campteamDb.js';

const KINDS = ['summary', 'context', 'discussion', 'other'], STATUSES = ['pending', 'discussed', 'decided'];

/** 다음 회의 안건 모음: ?next=1 [&campId=] — 아직 결정되지 않은, "다음 회의에서 논의" 로 표시된 모든 안건 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', '회의 구역'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, where = [`a.deletedAt IS NULL`, `a.nextMeeting = 1`, `a.status <> 'decided'`, `(m.id IS NULL OR m.deletedAt IS NULL)`], args = [];
  if (p.get('campId') === 'none') where.push('a.campId IS NULL'); else if (p.get('campId')) { where.push('a.campId = ?'); args.push(p.get('campId')); }
  const rows = (await env.DB.prepare(`SELECT a.id, a.meetingId, a.campId, a.topic, a.titleEn, a.bodyKo, a.bodyEn, a.status, a.note, a.tags, a.isTest, m.meetDate, m.title AS meetingTitle, m.titleEn AS meetingTitleEn, c.nameKo AS campKo, c.nameEn AS campEn
    FROM agenda_items a LEFT JOIN meetings m ON m.id = a.meetingId LEFT JOIN camps c ON c.id = COALESCE(a.campId, m.campId)
    WHERE ${where.join(' AND ')} ORDER BY m.meetDate DESC, a.sortOrder LIMIT 200`).bind(...args).all()).results;
  return json({ items: rows, perms: s.perms });
}

function clean(b, base = {}) {
  const has = k => k in b, f = (k, n) => has(k) ? text(b[k], n) : base[k] ?? '';
  const topic = f('topic', 200), titleEn = f('titleEn', 200);
  if (!topic && !titleEn) return { error: '제목을 입력해주세요.' };
  const kind = has('kind') ? b.kind : base.kind || 'discussion'; if (!KINDS.includes(kind)) return { error: '구역 종류가 올바르지 않습니다.' };
  const status = has('status') ? b.status : base.status || 'pending'; if (!STATUSES.includes(status)) return { error: '상태가 올바르지 않습니다.' };
  return { v: { topic: topic || titleEn, titleEn, bodyKo: f('bodyKo', 8000), bodyEn: f('bodyEn', 8000), note: f('note', 400), kind, status,
    nextMeeting: has('nextMeeting') ? (b.nextMeeting ? 1 : 0) : base.nextMeeting ?? 0, tags: has('tags') ? normTags(b.tags) : base.tags ?? '', sectionNo: has('sectionNo') ? (Number.isInteger(Number(b.sectionNo)) ? Number(b.sectionNo) : null) : base.sectionNo ?? null } };
}

/** 구역(또는 다음 회의 안건) 만들기: { meetingId?, campId?, topic, titleEn, bodyKo, bodyEn, kind, nextMeeting, tags, status, note } */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b); if (error) return badRequest(error);
  let campId = b.campId || null;
  if (b.meetingId) {
    const m = await env.DB.prepare('SELECT id, campId FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId)).first();
    if (!m) return badRequest('회의를 찾을 수 없습니다.'); campId = campId || m.campId;
  } else if (!v.nextMeeting) return badRequest('회의를 선택해주세요.');
  if (campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first())) return badRequest('캠프를 찾을 수 없습니다.');
  const order = ((await env.DB.prepare('SELECT MAX(sortOrder) AS n FROM agenda_items WHERE meetingId IS ?1').bind(b.meetingId || null).first()).n || 0) + 1;
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,sectionNo,status,nextMeeting,note,tags,sortOrder,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15,?16)`)
    .bind(id, b.meetingId || null, campId, v.topic, v.titleEn, v.bodyKo, v.bodyEn, v.kind, v.sectionNo, v.status, v.nextMeeting, v.note, v.tags, order, now, s.email).run();
  await audit(env, s.email, 'create', 'agenda_item', id, v.topic);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM agenda_items WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = clean(b, row); if (error) return badRequest(error);
  await env.DB.prepare(`UPDATE agenda_items SET topic=?2,titleEn=?3,bodyKo=?4,bodyEn=?5,kind=?6,sectionNo=?7,status=?8,nextMeeting=?9,note=?10,tags=?11,sortOrder=?12,updatedAt=?13 WHERE id=?1`)
    .bind(id, v.topic, v.titleEn, v.bodyKo, v.bodyEn, v.kind, v.sectionNo, v.status, v.nextMeeting, v.note, v.tags, 'sortOrder' in b && Number.isInteger(Number(b.sortOrder)) ? Number(b.sortOrder) : row.sortOrder, nowIso()).run();
  await audit(env, s.email, 'update', 'agenda_item', id, v.topic);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const res = await env.DB.prepare('UPDATE agenda_items SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'agenda_item', id);
  return json({ ok: true });
}
