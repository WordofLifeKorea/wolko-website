import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, addDays, audit } from '../../lib/campteamDb.js';

/**
 * 캠프에 체크리스트 템플릿 적용.  { campId, templateId, preview?: true, owners?: { [itemId]: '확정한 담당자' } }
 *  - 마감일 = 캠프 시작일 + 기준일. 캠프 시작일이 없거나 기준일이 비어 있으면 마감일 없이 만든다(임의로 채우지 않음).
 *  - 담당자는 "제안"으로만 저장한다. 사람이 owners 로 확정한 항목만 담당자가 정해진다.
 *  - 같은 템플릿을 다시 적용해도 이미 만든 항목은 건너뛴다(중복 방지).
 *  - preview: true 면 아무것도 만들지 않고 만들어질 내용만 보여준다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const camp = await env.DB.prepare('SELECT id, startDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first();
  if (!camp) return badRequest('캠프를 찾을 수 없습니다.');
  const tpl = await env.DB.prepare('SELECT id, nameKo FROM checklist_templates WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.templateId || '')).first();
  if (!tpl) return badRequest('템플릿을 찾을 수 없습니다.');
  const items = (await env.DB.prepare('SELECT * FROM checklist_items WHERE templateId = ?1 AND deletedAt IS NULL ORDER BY sortOrder, createdAt').bind(tpl.id).all()).results;
  const existing = new Set((await env.DB.prepare(`SELECT sourceKey FROM tasks WHERE campId = ?1 AND deletedAt IS NULL AND sourceKey LIKE 'tpl:%'`).bind(camp.id).all()).results.map(r => r.sourceKey));
  const owners = b.owners && typeof b.owners === 'object' ? b.owners : {};
  const plan = items.map(i => {
    const sourceKey = `tpl:${tpl.id}:${i.id}`;
    return { itemId: i.id, title: i.title, priority: i.priority, offsetDays: i.offsetDays, dueDate: camp.startDate && i.offsetDays != null ? addDays(camp.startDate, i.offsetDays) : null,
      ownerSuggestion: i.ownerSuggestion, ownerName: text(owners[i.id], 100), notes: i.notes, section: i.section || '', provisional: !!i.provisional, sourceKey, skip: existing.has(sourceKey) };
  });
  const summary = { campHasDate: !!camp.startDate, toCreate: plan.filter(p => !p.skip).length, skipped: plan.filter(p => p.skip).length };
  if (b.preview) return json({ preview: true, summary, plan });
  const now = nowIso();
  for (const p of plan.filter(x => !x.skip)) {
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,'Not Started',?7,?8,?9,?12,?10,?10,?11)`)
      .bind(uuid(), camp.id, p.title, p.ownerName, p.ownerSuggestion, p.dueDate, p.priority, p.notes, p.sourceKey, now, s.email, p.section).run();
  }
  await audit(env, s.email, 'apply_template', 'camp', camp.id, `${tpl.nameKo}: +${summary.toCreate} skip ${summary.skipped}`);
  return json({ created: summary.toCreate, skipped: summary.skipped, summary }, 201);
}
