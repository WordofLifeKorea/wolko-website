import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, CAMP_STATUSES, audit } from '../../lib/campteamDb.js';

/** 캠프 주제(TV 표시용), 정원, 기존 신청 시스템의 캠프 ID(신청 인원 숫자만 읽어 오는 용도) — 모두 선택 */
function extras(b, base = {}) {
  const has = k => k in b;
  const theme = has('theme') ? text(b.theme, 200) : base.theme ?? '';
  let capacity = has('capacity') ? (b.capacity === '' || b.capacity == null ? null : Number(b.capacity)) : base.capacity ?? null;
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) return { error: '정원은 1 이상의 정수로 입력해주세요.' };
  const registrationCampId = has('registrationCampId') ? text(b.registrationCampId, 60) : base.registrationCampId ?? '';
  if (registrationCampId && !/^[A-Za-z0-9_-]{1,60}$/.test(registrationCampId)) return { error: '신청 시스템 캠프 ID 는 영문·숫자·-·_ 만 쓸 수 있어요.' };
  return { theme, capacity, registrationCampId };
}

/** 캠프 유형(Unity Camp …)과 개별 행사(2027 Winter Camp …) 목록 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!['tasks', 'meetings', 'files', 'camps'].some((a) => canView(s.perms, a))) return needPerm('캠프 목록을 볼 권한이 없어요. 관리자에게 요청해 주세요.');
  const types = (await env.DB.prepare('SELECT id, nameKo, nameEn, description, sortOrder, isTest FROM camp_types WHERE deletedAt IS NULL ORDER BY sortOrder, nameKo').all()).results;
  const camps = (await env.DB.prepare(`SELECT c.id, c.typeId, c.nameKo, c.nameEn, c.startDate, c.endDate, c.status, c.location, c.notes, c.theme, c.capacity, c.registrationCampId, c.isTest,
      (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.status <> 'Not Applicable') AS taskTotal,
      (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.status = 'Completed') AS taskDone
    FROM camps c WHERE c.deletedAt IS NULL ORDER BY c.startDate IS NULL, c.startDate DESC, c.nameKo`).all()).results;
  return json({ types: types.map(t => ({ ...t, camps: camps.filter(c => c.typeId === t.id) })), perms: s.perms });
}

/** 만들기: { kind:'type', nameKo, nameEn, description }  또는  { kind:'camp', typeId, nameKo, nameEn, startDate, endDate, status, location, notes } */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'camps')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const id = uuid(), now = nowIso();
  const nameKo = text(b.nameKo, 80);
  if (!nameKo) return badRequest('이름을 입력해주세요.');
  if (b.kind === 'type') {
    await env.DB.prepare('INSERT INTO camp_types (id,nameKo,nameEn,description,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)')
      .bind(id, nameKo, text(b.nameEn, 80), text(b.description, 200), Number(b.sortOrder) || 99, now, s.email).run();
    await audit(env, s.email, 'create', 'camp_type', id, nameKo);
    return json({ id }, 201);
  }
  if (b.kind === 'camp') {
    const type = await env.DB.prepare('SELECT id FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.typeId || '')).first();
    if (!type) return badRequest('캠프 유형을 선택해주세요.');
    const start = b.startDate ? String(b.startDate) : null, end = b.endDate ? String(b.endDate) : null;
    if ((start && !isDate(start)) || (end && !isDate(end))) return badRequest('날짜 형식이 올바르지 않습니다.');
    if (start && end && end < start) return badRequest('종료일이 시작일보다 빠릅니다.');
    const status = CAMP_STATUSES.includes(b.status) ? b.status : 'planning';
    const ex = extras(b); if (ex.error) return badRequest(ex.error);
    if (ex.registrationCampId && !s.perms.moneyWrite) return needPerm('포털 캠프 연결은 디렉터·캠프 재정 담당·관리자만 설정할 수 있어요.');
    await env.DB.prepare(`INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,theme,capacity,registrationCampId,createdAt,updatedAt,createdBy)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?12,?13,?14,?10,?10,?11)`)
      .bind(id, type.id, nameKo, text(b.nameEn, 80), start, end, status, text(b.location, 120), text(b.notes, 1000), now, s.email, ex.theme, ex.capacity, ex.registrationCampId).run();
    await audit(env, s.email, 'create', 'camp', id, nameKo);
    return json({ id }, 201);
  }
  return badRequest('만들 종류(kind)가 올바르지 않습니다.');
}

/** 수정: ?id=...&kind=type|camp  (보낸 항목만 바뀐다) */
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'camps')) return needPerm('수정 권한이 없습니다.');
  const url = new URL(request.url), id = url.searchParams.get('id'), kind = url.searchParams.get('kind');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso();
  if (kind === 'type') {
    const row = await env.DB.prepare('SELECT * FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    const nameKo = 'nameKo' in b ? text(b.nameKo, 80) : row.nameKo;
    if (!nameKo) return badRequest('이름을 입력해주세요.');
    await env.DB.prepare('UPDATE camp_types SET nameKo=?2, nameEn=?3, description=?4, updatedAt=?5 WHERE id=?1')
      .bind(id, nameKo, 'nameEn' in b ? text(b.nameEn, 80) : row.nameEn, 'description' in b ? text(b.description, 200) : row.description, now).run();
    await audit(env, s.email, 'update', 'camp_type', id, nameKo);
    return json({ ok: true });
  }
  if (kind === 'camp') {
    const row = await env.DB.prepare('SELECT * FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    const nameKo = 'nameKo' in b ? text(b.nameKo, 80) : row.nameKo;
    if (!nameKo) return badRequest('이름을 입력해주세요.');
    const start = 'startDate' in b ? (b.startDate ? String(b.startDate) : null) : row.startDate;
    const end = 'endDate' in b ? (b.endDate ? String(b.endDate) : null) : row.endDate;
    if ((start && !isDate(start)) || (end && !isDate(end))) return badRequest('날짜 형식이 올바르지 않습니다.');
    if (start && end && end < start) return badRequest('종료일이 시작일보다 빠릅니다.');
    const status = 'status' in b ? (CAMP_STATUSES.includes(b.status) ? b.status : row.status) : row.status;
    const ex = extras(b, row); if (ex.error) return badRequest(ex.error);
    if (ex.registrationCampId !== (row.registrationCampId ?? '') && !s.perms.moneyWrite) return needPerm('포털 캠프 연결은 디렉터·캠프 재정 담당·관리자만 바꿀 수 있어요.');
    await env.DB.prepare('UPDATE camps SET nameKo=?2,nameEn=?3,startDate=?4,endDate=?5,status=?6,location=?7,notes=?8,theme=?10,capacity=?11,registrationCampId=?12,updatedAt=?9 WHERE id=?1')
      .bind(id, nameKo, 'nameEn' in b ? text(b.nameEn, 80) : row.nameEn, start, end, status,
        'location' in b ? text(b.location, 120) : row.location, 'notes' in b ? text(b.notes, 1000) : row.notes, now, ex.theme, ex.capacity, ex.registrationCampId).run();
    await audit(env, s.email, 'update', 'camp', id, nameKo);
    return json({ ok: true });
  }
  return badRequest('종류(kind)가 올바르지 않습니다.');
}

/** 삭제는 "삭제 표시"만 한다(복구 가능). ?id=...&kind=type|camp */
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'camps')) return needPerm('삭제 권한이 없습니다.');
  const url = new URL(request.url), id = url.searchParams.get('id'), kind = url.searchParams.get('kind');
  const table = kind === 'type' ? 'camp_types' : kind === 'camp' ? 'camps' : '';
  if (!table) return badRequest('종류(kind)가 올바르지 않습니다.');
  if (kind === 'type') {
    const used = await env.DB.prepare('SELECT 1 AS x FROM camps WHERE typeId = ?1 AND deletedAt IS NULL LIMIT 1').bind(id).first();
    if (used) return badRequest('이 유형에 속한 캠프가 있어서 삭제할 수 없습니다. 캠프를 먼저 정리해주세요.');
  }
  const res = await env.DB.prepare(`UPDATE ${table} SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL`).bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', table, id);
  return json({ ok: true });
}
