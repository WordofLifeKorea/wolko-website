import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit, TASK_PRIORITIES } from '../../lib/campteamDb.js';
import { isMissingColumn, withFallback, NOT_MIGRATED } from '../../lib/campteamPrepPeriod.js';

/** 「새 캠프를 만들면 이 체크리스트를 적용할지 물어보기」 스위치 값 → 0/1 */
const flag = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);

/** 체크리스트 템플릿 + 항목 목록 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'tasks', '체크리스트 템플릿'); if (dv) return dv; }
  // autoApply(0039)가 아직 없는 DB 에서도 목록은 열린다 — 그때는 모두 "묻지 않음"(0)
  const templates = (await withFallback(() => env.DB.prepare('SELECT id, nameKo, nameEn, typeId, description, isTest, autoApply FROM checklist_templates WHERE deletedAt IS NULL ORDER BY nameKo').all(),
    () => env.DB.prepare('SELECT id, nameKo, nameEn, typeId, description, isTest, 0 AS autoApply FROM checklist_templates WHERE deletedAt IS NULL ORDER BY nameKo').all())).results;
  const items = (await env.DB.prepare('SELECT id, templateId, title, offsetDays, ownerSuggestion, priority, notes, sortOrder, section, provisional FROM checklist_items WHERE deletedAt IS NULL ORDER BY sortOrder, createdAt').all()).results;
  return json({ templates: templates.map(t => ({ ...t, items: items.filter(i => i.templateId === t.id) })), perms: s.perms });
}

const intOrNull = v => (v === '' || v == null) ? null : (Number.isInteger(Number(v)) && Math.abs(Number(v)) <= 1000 ? Number(v) : NaN);

/** 만들기: {kind:'template', nameKo, nameEn, typeId?, description} | {kind:'item', templateId, title, offsetDays?, ownerSuggestion?, priority?, notes?} */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const id = uuid(), now = nowIso();
  if (b.kind === 'template') {
    const nameKo = text(b.nameKo, 80); if (!nameKo) return badRequest('이름을 입력해주세요.');
    if (b.typeId && !(await env.DB.prepare('SELECT 1 AS x FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.typeId)).first())) return badRequest('캠프 유형을 찾을 수 없습니다.');
    const auto = flag(b.autoApply); // 켠 경우에만 새 칸을 쓴다 (0039 전의 DB 에서도 평소 템플릿 만들기는 그대로 된다)
    try {
      await env.DB.prepare(`INSERT INTO checklist_templates (id,nameKo,nameEn,typeId,description,createdAt,updatedAt,createdBy${auto ? ',autoApply' : ''}) VALUES (?1,?2,?3,?4,?5,?6,?6,?7${auto ? ',1' : ''})`)
        .bind(id, nameKo, text(b.nameEn, 80), b.typeId || null, text(b.description, 300), now, s.email).run();
    } catch (e) { if (auto && isMissingColumn(e)) return badRequest(NOT_MIGRATED); throw e; }
    await audit(env, s.email, 'create', 'checklist_template', id, nameKo);
    return json({ id }, 201);
  }
  if (b.kind === 'item') {
    const tpl = await env.DB.prepare('SELECT id FROM checklist_templates WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.templateId || '')).first();
    if (!tpl) return badRequest('템플릿을 찾을 수 없습니다.');
    const title = text(b.title, 200); if (!title) return badRequest('항목 이름을 입력해주세요.');
    const offset = intOrNull(b.offsetDays); if (Number.isNaN(offset)) return badRequest('기준일(며칠 전/후)은 정수로 입력해주세요.');
    const priority = TASK_PRIORITIES.includes(b.priority) ? b.priority : 'Medium';
    const order = ((await env.DB.prepare('SELECT MAX(sortOrder) AS n FROM checklist_items WHERE templateId = ?1').bind(tpl.id).first()).n || 0) + 1;
    await env.DB.prepare('INSERT INTO checklist_items (id,templateId,title,offsetDays,ownerSuggestion,priority,notes,sortOrder,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?11,?9,?9,?10)')
      .bind(id, tpl.id, title, offset, text(b.ownerSuggestion, 100), priority, text(b.notes, 300), order, now, s.email, text(b.section, 80)).run();
    await audit(env, s.email, 'create', 'checklist_item', id, title);
    return json({ id }, 201);
  }
  return badRequest('kind 가 올바르지 않습니다.');
}

/** 수정: ?kind=template|item&id= */
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('수정 권한이 없습니다.');
  const url = new URL(request.url), id = url.searchParams.get('id'), kind = url.searchParams.get('kind');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso();
  if (kind === 'template') {
    const row = await env.DB.prepare('SELECT * FROM checklist_templates WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    const nameKo = 'nameKo' in b ? text(b.nameKo, 80) : row.nameKo; if (!nameKo) return badRequest('이름을 입력해주세요.');
    if ('autoApply' in b) { // 보냈을 때만 바꾼다 (0039 가 없으면 아무것도 바뀌기 전에 여기서 멈춘다)
      try { await env.DB.prepare('UPDATE checklist_templates SET autoApply=?2 WHERE id=?1').bind(id, flag(b.autoApply)).run(); }
      catch (e) { if (isMissingColumn(e)) return badRequest(NOT_MIGRATED); throw e; }
    }
    await env.DB.prepare('UPDATE checklist_templates SET nameKo=?2,nameEn=?3,description=?4,updatedAt=?5 WHERE id=?1')
      .bind(id, nameKo, 'nameEn' in b ? text(b.nameEn, 80) : row.nameEn, 'description' in b ? text(b.description, 300) : row.description, now).run();
    await audit(env, s.email, 'update', 'checklist_template', id, nameKo);
    return json({ ok: true });
  }
  if (kind === 'item') {
    const row = await env.DB.prepare('SELECT * FROM checklist_items WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    const title = 'title' in b ? text(b.title, 200) : row.title; if (!title) return badRequest('항목 이름을 입력해주세요.');
    const offset = 'offsetDays' in b ? intOrNull(b.offsetDays) : row.offsetDays; if (Number.isNaN(offset)) return badRequest('기준일(며칠 전/후)은 정수로 입력해주세요.');
    const priority = 'priority' in b ? (TASK_PRIORITIES.includes(b.priority) ? b.priority : row.priority) : row.priority;
    await env.DB.prepare('UPDATE checklist_items SET title=?2,offsetDays=?3,ownerSuggestion=?4,priority=?5,notes=?6,section=?8,provisional=?9,updatedAt=?7 WHERE id=?1')
      .bind(id, title, offset, 'ownerSuggestion' in b ? text(b.ownerSuggestion, 100) : row.ownerSuggestion, priority, 'notes' in b ? text(b.notes, 300) : row.notes, now, 'section' in b ? text(b.section, 80) : row.section, 'offsetDays' in b ? 0 : row.provisional).run();
    await audit(env, s.email, 'update', 'checklist_item', id, title);
    return json({ ok: true });
  }
  return badRequest('kind 가 올바르지 않습니다.');
}

export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('삭제 권한이 없습니다.');
  const url = new URL(request.url), id = url.searchParams.get('id'), kind = url.searchParams.get('kind');
  const table = kind === 'template' ? 'checklist_templates' : kind === 'item' ? 'checklist_items' : '';
  if (!table) return badRequest('kind 가 올바르지 않습니다.');
  const res = await env.DB.prepare(`UPDATE ${table} SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL`).bind(id, nowIso()).run();
  if (!res.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', table, id);
  return json({ ok: true });
}
