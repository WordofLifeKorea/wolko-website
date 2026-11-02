/**
 * 캠프 시작일이 바뀌면, 템플릿으로 만든 업무의 기한을 새 시작일에 맞춰 함께 옮긴다.
 *  - 대상: 그 캠프의 업무 중 기준일(offsetDays)이 있고, 사람이 기한을 직접 고친 적 없고(dueEdited=0), 삭제·완료되지 않은 것
 *  - 새 기한 = 새 시작일 + 기준일.  감사 기록은 한 번만 남기고, 옮기기 전·후 날짜를 모두 적어 둬서 사람이 되돌릴 수 있다.
 *  - 새 시작일이 비었거나 그대로면 아무것도 하지 않는다.
 */
import { addDays, uuid, nowIso } from './campteamDb.js';

export async function moveTemplateDueDates(env, campId, oldStart, newStart, actor) {
  if (!env.DB || !campId || !newStart || newStart === oldStart) return { moved: 0 };
  let rows;
  try {
    rows = (await env.DB.prepare(`SELECT id, title, dueDate, offsetDays FROM tasks WHERE campId = ?1 AND offsetDays IS NOT NULL AND dueEdited = 0 AND deletedAt IS NULL AND status != 'Completed' ORDER BY createdAt, id`).bind(campId).all()).results;
  } catch { return { moved: 0 }; } // 0038 이 아직 적용되지 않은 DB: 예전처럼 아무것도 옮기지 않는다
  const now = nowIso(), changes = [];
  for (const r of rows) {
    const due = addDays(newStart, Number(r.offsetDays));
    if (!due || due === r.dueDate) continue;
    await env.DB.prepare('UPDATE tasks SET dueDate = ?2, updatedAt = ?3 WHERE id = ?1').bind(r.id, due, now).run();
    changes.push(`${r.id} ${r.dueDate || '-'}→${due}`);
  }
  // 되돌릴 수 있게 업무마다 전·후 날짜를 모두 적는다 (공용 audit() 는 500자까지만 남겨서, 여기서는 직접 넉넉하게 기록)
  if (changes.length) await env.DB.prepare('INSERT INTO audit_log (id, at, actor, action, entity, entityId, detail) VALUES (?1,?2,?3,?4,?5,?6,?7)')
    .bind(uuid(), now, actor || '', 'move_due', 'camp', campId, `캠프 시작일 ${oldStart || '-'}→${newStart}, 기한 ${changes.length}개 이동 (업무번호 이전→이후): ${changes.join(', ')}`.slice(0, 8000)).run();
  return { moved: changes.length };
}
