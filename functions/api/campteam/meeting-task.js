import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, audit, TASK_PRIORITIES } from '../../lib/campteamDb.js';

/**
 * 안건/결정에서 업무 만들기: { meetingId, agendaItemId?, decisionId?, title, ownerName?, dueDate?, priority? }
 * 담당자·기한은 입력한 것만 넣고 비워 두면 비어 있는 채로 저장(임의로 채우지 않음).
 * 같은 안건/결정에서 같은 이름의 업무를 두 번 만들지 않는다 — 한·영 회의록이 같은 구역을 가리키므로 업무도 하나로 유지된다.
 * 이미 이 안건에서 만든 업무 목록(existing)을 함께 돌려준다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings') || !canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다. (회의와 업무를 모두 고칠 수 있어야 해요)');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const m = await env.DB.prepare('SELECT id, campId FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId || '')).first();
  if (!m) return badRequest('회의를 찾을 수 없습니다.');
  const title = text(b.title, 200); if (!title) return badRequest('업무 이름을 입력해주세요.');
  const due = b.dueDate ? String(b.dueDate) : null; if (due && !isDate(due)) return badRequest('기한 날짜 형식이 올바르지 않습니다.');
  const src = b.agendaItemId ? `agenda:${b.agendaItemId}` : b.decisionId ? `decision:${b.decisionId}` : `meeting:${m.id}`;
  const existing = (await env.DB.prepare('SELECT id, title FROM tasks WHERE sourceKey = ?1 AND deletedAt IS NULL').bind(`mt:${src}`).all()).results;
  const dup = existing.find(t => t.title.trim().toLowerCase() === title.toLowerCase());
  if (dup) return json({ id: dup.id, existing: true, tasks: existing });
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,dueDate,status,priority,notes,sourceKey,meetingId,agendaItemId,decisionId,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,'Not Started',?6,?7,?8,?9,?10,?11,?12,?12,?13)`)
    .bind(id, m.campId, title, text(b.ownerName, 100), due, TASK_PRIORITIES.includes(b.priority) ? b.priority : 'Medium', text(b.notes, 500), `mt:${src}`, m.id, b.agendaItemId || null, b.decisionId || null, now, s.email).run();
  await audit(env, s.email, 'create', 'task', id, `from ${src}`);
  return json({ id, existing: false, tasks: [...existing, { id, title }] }, 201);
}
