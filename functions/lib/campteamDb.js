/** 캠프팀 포털 — 공통 DB 도우미 */
export const uuid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
/** 한국 날짜(YYYY-MM-DD). 서버 시간대와 상관없이 한국 기준 */
export function todayKST(d = new Date()) { return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10); }

export const OPEN_STATUS_SQL = "status NOT IN ('Completed','Not Applicable')";
export const TASK_STATUSES = ['Not Started', 'In Progress', 'Waiting for Confirmation', 'Delayed', 'Completed', 'Not Applicable'];
export const CAMP_STATUSES = ['planning', 'active', 'done', 'canceled'];

export const text = (v, max) => String(v ?? '').trim().slice(0, max);
export const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));

export async function audit(env, actor, action, entity, entityId, detail = '') {
  await env.DB.prepare('INSERT INTO audit_log (id, at, actor, action, entity, entityId, detail) VALUES (?1,?2,?3,?4,?5,?6,?7)')
    .bind(uuid(), nowIso(), actor, action, entity, entityId, String(detail).slice(0, 500)).run();
}

/** YYYY-MM-DD 에 날짜를 더한다(시간대 영향 없음). 잘못된 날짜면 null */
export function addDays(date, days) {
  if (!isDate(date) || !Number.isInteger(days)) return null;
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];

/** 태그 문자열 정리: "Camp Crew, 예산" → ",camp crew,예산," (쉼표로 감싸 두면 정확한 태그만 찾을 수 있다) */
export function normTags(v) {
  const list = [...new Set(String(v ?? '').split(/[,\n]/).map(t => t.trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 12);
  return list.length ? `,${list.join(',')},` : '';
}
export const tagList = (s) => String(s || '').split(',').filter(Boolean);
export const likeOf = (q) => `%${String(q).replace(/[%_\\]/g, m => '\\' + m)}%`;
