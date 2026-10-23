import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { parseChecklistText, suggestOffset } from '../../lib/campteamChecklist.js';

/**
 * 체크리스트 붙여넣어 가져오기 → 새 템플릿 만들기.
 * { text, nameKo, nameEn?, typeId?, suggestOffsets?: boolean, preview?: boolean }
 *  - suggestOffsets 를 켜면 구역 이름으로 "캠프 시작 며칠 전" 을 임시로 정하고 "임시" 로 표시한다(사람이 확인 전). 끄면 기준일은 비워 둔다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const raw = String(b.text || ''); if (raw.length > 200000) return badRequest('내용이 너무 깁니다.');
  const parsed = parseChecklistText(raw);
  if (!parsed.itemCount) return badRequest('항목을 찾지 못했어요. Word 표를 그대로 복사해서 붙여넣어 주세요.');
  if (parsed.itemCount > 500) return badRequest('한 번에 500개까지만 가져올 수 있어요.');
  const items = [];
  for (const sec of parsed.sections) for (const it of sec.items) {
    const off = b.suggestOffsets ? suggestOffset(sec.name) : null;
    items.push({ section: sec.name.slice(0, 80), title: it.title, ownerSuggestion: it.ownerSuggestion, priority: it.priority, offsetDays: off, provisional: off == null ? 0 : 1 });
  }
  const summary = { sections: parsed.sections.filter(x => x.items.length).map(x => ({ name: x.name, count: x.items.length })), itemCount: items.length, withOwner: items.filter(i => i.ownerSuggestion).length, withOffset: items.filter(i => i.offsetDays != null).length };
  if (b.preview) return json({ preview: true, summary, items });
  const nameKo = text(b.nameKo, 80); if (!nameKo) return badRequest('템플릿 이름을 입력해주세요.');
  if (b.typeId && !(await env.DB.prepare('SELECT 1 AS x FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.typeId)).first())) return badRequest('캠프 유형을 찾을 수 없습니다.');
  const tplId = uuid(), now = nowIso();
  await env.DB.prepare('INSERT INTO checklist_templates (id,nameKo,nameEn,typeId,description,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)')
    .bind(tplId, nameKo, text(b.nameEn, 80), b.typeId || null, '붙여넣기로 가져옴', now, s.email).run();
  let order = 0;
  for (const it of items) {
    await env.DB.prepare('INSERT INTO checklist_items (id,templateId,title,offsetDays,ownerSuggestion,priority,notes,sortOrder,section,provisional,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11,?12)')
      .bind(uuid(), tplId, it.title, it.offsetDays, it.ownerSuggestion, it.priority, '', ++order, it.section, it.provisional, now, s.email).run();
  }
  await audit(env, s.email, 'import_template', 'checklist_template', tplId, `${nameKo}: ${items.length} items`);
  return json({ id: tplId, summary }, 201);
}
