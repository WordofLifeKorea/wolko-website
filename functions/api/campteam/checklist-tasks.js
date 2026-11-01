import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { parseChecklistText } from '../../lib/campteamChecklist.js';

/**
 * 체크리스트 파일 → 업무. 파일 글(앞부분)을 읽어 「업무 N개 추가할까요?」 를 묻는 데 쓴다. AI 가 아니라 정해진 규칙(체크 표시·목록·표)으로 읽어서 지어내지 않는다.
 *  POST { text, preview:true }                         → { itemCount, looks, items:[{section,title,priority}] }  (looks = 체크리스트처럼 보이는지)
 *  POST { campId?, items:[{section,title,priority,ownerSuggestion}] } → { created, skipped }  (같은 캠프에 같은 이름 업무가 있으면 건너뜀 · 담당자·기한은 비워 둠)
 */
const CHECKISH = /^\s*(?:[☐□☑✓✔]|[-•*]\s*\[[ xX]?\]|[-•*]\s+\S)/;
export function looksLikeChecklist(raw, parsed) {
  const lines = String(raw || '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length || parsed.itemCount < 3) return false;
  const marked = lines.filter((l) => CHECKISH.test(l) || l.includes('\t')).length;
  return marked / lines.length >= 0.5;
}
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('업무를 만들 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.preview) {
    const raw = String(b.text || '').slice(0, 20000), parsed = parseChecklistText(raw);
    return json({ itemCount: parsed.itemCount, looks: looksLikeChecklist(raw, parsed), items: parsed.sections.flatMap((x) => x.items.map((i) => ({ section: x.name, title: i.title, priority: i.priority }))).slice(0, 200) });
  }
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 200).map((i) => ({ section: text(i.section, 80), title: text(i.title, 200), priority: ['High', 'Medium', 'Low'].includes(i.priority) ? i.priority : 'Medium', ownerSuggestion: text(i.ownerSuggestion, 100) })).filter((i) => i.title);
  if (!items.length) return badRequest('추가할 업무가 없어요.');
  let campId = null;
  if (b.campId) { const c = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId)).first(); if (!c) return badRequest('캠프를 찾지 못했어요.'); campId = c.id; }
  const have = new Set((await env.DB.prepare('SELECT title FROM tasks WHERE deletedAt IS NULL AND campId IS ?1').bind(campId).all()).results.map((r) => norm(r.title)));
  const now = nowIso(); let created = 0, skipped = 0;
  for (const i of items) {
    if (have.has(norm(i.title))) { skipped++; continue; } have.add(norm(i.title));
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,'',?4,NULL,'Not Started',?5,'',?6,?7,?8,?8,?9)`)
      .bind(uuid(), campId, i.title, i.ownerSuggestion, i.priority, `chk:${norm(i.title)}|${campId || ''}`, i.section, now, s.email).run();
    created++;
  }
  await audit(env, s.email, 'import_checklist', 'task', 'bulk', `+${created} skip ${skipped}`);
  return json({ created, skipped }, 201);
}
