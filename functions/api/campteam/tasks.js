import { resolveOwnerEmail, ownerTokens, ownerPieces } from '../../lib/campteamOwners.js';
import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, todayKST, audit, TASK_STATUSES, TASK_PRIORITIES } from '../../lib/campteamDb.js';

const CLOSED = `('Completed','Not Applicable')`;
const SELECT = `SELECT k.id, k.campId, k.title, k.ownerName, k.ownerEmail, k.ownerSuggestion, k.dueDate, k.status, k.priority, k.notes, k.sourceKey, k.section, k.inactive, k.meetingId, k.createdAt, k.updatedAt, k.isTest,
    c.nameKo AS campKo, c.nameEn AS campEn
  FROM tasks k LEFT JOIN camps c ON c.id = k.campId`;
const SORTS = {
  due: `(k.dueDate IS NULL), k.dueDate, k.createdAt`, priority: `CASE k.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, (k.dueDate IS NULL), k.dueDate`,
  newest: `k.createdAt DESC`, title: `k.title COLLATE NOCASE`,
};

/** 목록·필터: ?campId= (none=캠프 없음) &status= &priority= &owner=(사람·팀 이름 한 개 — "Mina / Joon" 같은 공동 담당 업무도 각자 이름으로 걸러진다) &flag=open|overdue|noowner|nodue|inactive &q= &sort=due|priority|newest|title */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'tasks', '업무'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, today = todayKST();
  const where = ['k.deletedAt IS NULL'], args = [];
  const campId = p.get('campId');
  if (campId === 'none') where.push('k.campId IS NULL'); else if (campId) { where.push('k.campId = ?'); args.push(campId); }
  if (p.get('id')) { where.push('k.id = ?'); args.push(String(p.get('id'))); }
  if (TASK_STATUSES.includes(p.get('status'))) { where.push('k.status = ?'); args.push(p.get('status')); }
  if (TASK_PRIORITIES.includes(p.get('priority'))) { where.push('k.priority = ?'); args.push(p.get('priority')); }
  const owner = text(p.get('owner'), 60), ownerKey = owner.toLowerCase();
  const flag = p.get('flag');
  // 비활성 업무는 "전체"와 "비활성" 목록에서만 보이고, 진행 중·마감 지남 등 집계에서는 빠진다
  if (flag === 'inactive') where.push('k.inactive = 1');
  else if (flag === 'open') where.push(`k.inactive = 0 AND k.status NOT IN ${CLOSED}`);
  else if (flag === 'overdue') { where.push(`k.inactive = 0 AND k.status NOT IN ${CLOSED} AND k.dueDate IS NOT NULL AND k.dueDate < ?`); args.push(today); }
  else if (flag === 'noowner') where.push(`k.inactive = 0 AND k.status NOT IN ${CLOSED} AND TRIM(k.ownerName) = ''`);
  else if (flag === 'nodue') where.push(`k.inactive = 0 AND k.status NOT IN ${CLOSED} AND k.dueDate IS NULL`);
  const q = text(p.get('q'), 80);
  if (q) { const like = `%${q.replace(/[%_\\]/g, m => '\\' + m)}%`; where.push(`(k.title LIKE ? ESCAPE '\\' OR k.ownerName LIKE ? ESCAPE '\\' OR k.notes LIKE ? ESCAPE '\\')`); args.push(like, like, like); }
  let rows = (await env.DB.prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${SORTS[p.get('sort')] || SORTS.due} LIMIT ${owner ? 5000 : 500}`).bind(...args).all()).results;
  if (owner) rows = rows.filter(r => ownerTokens(r.ownerName).includes(ownerKey)).slice(0, 500);
  const counts = await env.DB.prepare(`SELECT
      SUM(CASE WHEN inactive = 0 AND status NOT IN ${CLOSED} THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN inactive = 0 AND status NOT IN ${CLOSED} AND dueDate IS NOT NULL AND dueDate < ?1 THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN inactive = 0 AND status NOT IN ${CLOSED} AND TRIM(ownerName) = '' THEN 1 ELSE 0 END) AS noOwner,
      SUM(CASE WHEN inactive = 0 AND status NOT IN ${CLOSED} AND dueDate IS NULL THEN 1 ELSE 0 END) AS noDue,
      SUM(CASE WHEN inactive = 1 THEN 1 ELSE 0 END) AS inactive
    FROM tasks WHERE deletedAt IS NULL`).bind(today).first();
  // 담당자 목록: 공동 담당("A / B")은 풀어서 사람·팀 이름만 한 번씩
  const ownerSet = new Map();
  for (const r of (await env.DB.prepare(`SELECT DISTINCT ownerName FROM tasks WHERE deletedAt IS NULL AND TRIM(ownerName) <> ''`).all()).results) for (const n of ownerPieces(r.ownerName)) if (!ownerSet.has(n.toLowerCase())) ownerSet.set(n.toLowerCase(), n);
  const owners = [...ownerSet.values()].sort((a, b) => a.localeCompare(b));
  return json({ items: rows, today, owners, counts: { open: counts.open || 0, overdue: counts.overdue || 0, noOwner: counts.noOwner || 0, noDue: counts.noDue || 0, inactive: counts.inactive || 0 }, perms: s.perms });
}

/** 입력 검사. 담당자·기한이 비어 있는 것은 허용하고 임의로 채우지 않는다. */
async function clean(env, b, base = {}) {
  const has = k => k in b;
  const title = has('title') ? text(b.title, 200) : base.title;
  if (!title) return { error: '업무 이름을 입력해주세요.' };
  const dueDate = has('dueDate') ? (b.dueDate ? String(b.dueDate) : null) : base.dueDate ?? null;
  if (dueDate && !isDate(dueDate)) return { error: '기한 날짜 형식이 올바르지 않습니다.' };
  const status = has('status') ? b.status : base.status || 'Not Started';
  if (!TASK_STATUSES.includes(status)) return { error: '상태가 올바르지 않습니다.' };
  const priority = has('priority') ? b.priority : base.priority || 'Medium';
  if (!TASK_PRIORITIES.includes(priority)) return { error: '우선순위가 올바르지 않습니다.' };
  const campId = has('campId') ? (b.campId || null) : base.campId ?? null;
  if (campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first())) return { error: '캠프를 찾을 수 없습니다.' };
  // 담당자: 이름만 적었거나 바꾼 경우, 팀 명단의 이름·별칭과 정확히 한 사람이 맞으면 이메일을 자동으로 채운다(이전 담당자의 이메일은 지운다)
  const ownerName = has('ownerName') ? text(b.ownerName, 60) : base.ownerName ?? '';
  let ownerEmail = has('ownerEmail') ? text(b.ownerEmail, 120) : base.ownerEmail ?? '';
  if (has('ownerName') && !has('ownerEmail') && ownerName !== (base.ownerName ?? '')) ownerEmail = '';
  if (ownerName && !ownerEmail) ownerEmail = await resolveOwnerEmail(env, ownerName);
  if (!ownerName && has('ownerName') && !has('ownerEmail')) ownerEmail = '';
  return { v: {
    title, dueDate, status, priority, campId,
    ownerName,
    ownerEmail,
    notes: has('notes') ? text(b.notes, 1000) : base.notes ?? '',
    inactive: has('inactive') ? (b.inactive ? 1 : 0) : base.inactive ? 1 : 0,
  } };
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = await clean(env, b); if (error) return badRequest(error);
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerEmail,dueDate,status,priority,notes,createdAt,updatedAt,createdBy,inactive) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10,?11,?12)`)
    .bind(id, v.campId, v.title, v.ownerName, v.ownerEmail, v.dueDate, v.status, v.priority, v.notes, now, s.email, v.inactive).run();
  await audit(env, s.email, 'create', 'task', id, v.title);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = await clean(env, b, row); if (error) return badRequest(error);
  await env.DB.prepare(`UPDATE tasks SET campId=?2,title=?3,ownerName=?4,ownerEmail=?5,dueDate=?6,status=?7,priority=?8,notes=?9,updatedAt=?10,inactive=?11 WHERE id=?1`)
    .bind(id, v.campId, v.title, v.ownerName, v.ownerEmail, v.dueDate, v.status, v.priority, v.notes, nowIso(), v.inactive).run();
  await audit(env, s.email, 'update', 'task', id, `${row.status}→${v.status} ${v.title}${(row.inactive ? 1 : 0) !== v.inactive ? (v.inactive ? ' [비활성]' : ' [활성]') : ''}`);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const res = await env.DB.prepare('UPDATE tasks SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'task', id);
  return json({ ok: true });
}
