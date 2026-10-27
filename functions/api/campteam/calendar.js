import { campSession, json, needLogin, noDb, canView } from '../../lib/campteamAuth.js';
import { isDate } from '../../lib/campteamDb.js';

/** 달력용 한 번에 보기: ?from=&to= — 팀 일정, 캠프 기간, 업무 마감, 회의 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const p = new URL(request.url).searchParams;
  if (!isDate(p.get('from')) || !isDate(p.get('to'))) return json({ error: 'from, to 날짜가 필요합니다.' }, 400);
  const from = p.get('from'), to = p.get('to'), db = env.DB;
  const [events, camps, tasks, meetings] = await Promise.all([
    db.prepare(`SELECT e.id, e.title, e.kind, e.startDate, e.endDate, e.startTime, e.endTime, e.isTest, c.nameKo AS campKo, c.nameEn AS campEn FROM events e LEFT JOIN camps c ON c.id = e.campId
      WHERE e.deletedAt IS NULL AND e.startDate <= ?2 AND COALESCE(e.endDate, e.startDate) >= ?1 ORDER BY e.startDate, e.startTime`).bind(from, to).all(),
    db.prepare(`SELECT id, nameKo, nameEn, startDate, endDate, status, isTest FROM camps WHERE deletedAt IS NULL AND status <> 'canceled' AND startDate IS NOT NULL AND startDate <= ?2 AND COALESCE(endDate, startDate) >= ?1`).bind(from, to).all(),
    db.prepare(`SELECT k.id, k.title, k.titleKo, k.titleEn, k.dueDate, k.status, k.priority, k.ownerName, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE k.deletedAt IS NULL AND k.inactive = 0 AND k.dueDate BETWEEN ?1 AND ?2 AND k.status <> 'Not Applicable' ORDER BY k.dueDate`).bind(from, to).all(),
    db.prepare(`SELECT id, title, meetDate, meetTime, isTest FROM meetings WHERE deletedAt IS NULL AND meetDate BETWEEN ?1 AND ?2 ORDER BY meetDate, meetTime`).bind(from, to).all(),
  ]);
  const V = (a, list) => (canView(s.perms, a) ? list : []);
  return json({ events: V('tasks', events.results), camps: V('camps', camps.results), tasks: V('tasks', tasks.results), meetings: V('meetings', meetings.results), perms: s.perms });
}
