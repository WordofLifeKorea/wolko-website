import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { planCsvImport } from '../../lib/campteamCsv.js';

/**
 * 기존 Google Sheet 의 업무를 포털로 한 번 가져오기 (시트를 CSV 로 내려받아 붙여넣는 방식 — Google 에는 접속하지 않는다).
 * { csv, preview?: true, inactive?: true(비활성 상태로 가져오기) }  — 같은 캠프에 같은 이름의 업무가 이미 있으면 건너뛴다. 담당자·기한은 시트에 적힌 그대로만 넣는다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'tasks')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const csv = String(b.csv || ''); if (csv.length > 400000) return badRequest('내용이 너무 길어요.');
  const camps = (await env.DB.prepare('SELECT id, typeId, nameKo, nameEn, status FROM camps WHERE deletedAt IS NULL').all()).results;
  const types = (await env.DB.prepare('SELECT id, nameKo, nameEn FROM camp_types WHERE deletedAt IS NULL').all()).results;
  const existing = (await env.DB.prepare('SELECT campId, title FROM tasks WHERE deletedAt IS NULL').all()).results;
  const plan = planCsvImport(csv, { camps, types, existing });
  if (plan.error) return badRequest(plan.error);
  const summary = { total: plan.rows.length, toCreate: plan.rows.filter(r => !r.skip).length, skipped: plan.rows.filter(r => r.skip).length, unmatchedCamps: plan.unmatched };
  if (b.preview) return json({ preview: true, summary, rows: plan.rows });
  const now = nowIso(), inactive = b.inactive ? 1 : 0;
  for (const r of plan.rows.filter(x => !x.skip)) {
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,createdAt,updatedAt,createdBy,inactive) VALUES (?1,?2,?3,?4,?12,?5,?6,?7,?8,?9,?10,?10,?11,?13)`)
      .bind(uuid(), r.campId, r.title, r.ownerName, r.dueDate, r.status, r.priority, r.notes, r.sourceKey, now, s.email, r.ownerSuggestion || '', inactive).run();
  }
  await audit(env, s.email, 'import_csv', 'task', 'bulk', `+${summary.toCreate} skip ${summary.skipped}${inactive ? ' inactive' : ''}`);
  return json({ created: summary.toCreate, skipped: summary.skipped, summary }, 201);
}
