import { campSession, json, needLogin, badRequest, noDb, denyView, canView } from '../../lib/campteamAuth.js';
import { todayKST } from '../../lib/campteamDb.js';
import { summarize } from '../../lib/campteamMoney.js';

/**
 * 캠프별 운영 공간 — 한 행사(?id=)나 한 유형(?typeId=)에 연결된 일정·업무·회의·결정·파일·예산을 한 번에 모아 준다.
 * 금액은 금액 권한이 있을 때만 읽는다. 금액 자료 파일은 권한이 없으면 목록/개수에서 빠진다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'camps', '캠프별 공간'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, db = env.DB, today = todayKST();
  const campId = p.get('id'), typeId = p.get('typeId');
  if (!campId && !typeId) return badRequest('id 또는 typeId 가 필요합니다.');
  let camp = null, type = null, campIds = [];
  if (campId) {
    camp = await db.prepare(`SELECT c.*, t.nameKo AS typeKo, t.nameEn AS typeEn FROM camps c JOIN camp_types t ON t.id = c.typeId WHERE c.id = ?1 AND c.deletedAt IS NULL`).bind(campId).first();
    if (!camp) return json({ error: '찾을 수 없습니다.' }, 404);
    if (!s.campRole) { camp.notes = ''; camp.registrationCampId = null; } // 명단 밖: 내부 메모·연결 정보는 가린다
    campIds = [camp.id]; type = { id: camp.typeId, nameKo: camp.typeKo, nameEn: camp.typeEn };
  } else {
    type = await db.prepare('SELECT id, nameKo, nameEn, description FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(typeId).first();
    if (!type) return json({ error: '찾을 수 없습니다.' }, 404);
    campIds = (await db.prepare('SELECT id FROM camps WHERE typeId = ?1 AND deletedAt IS NULL').bind(typeId).all()).results.map(r => r.id);
  }
  const inList = campIds.length ? campIds.map(() => '?').join(',') : `''`, args = campIds;
  const restrict = (s.perms.moneyRead ? '' : 'AND f.restricted = 0') + (s.campRole ? '' : ' AND f.id IN (SELECT fileId FROM file_public)'); // 명단 밖은 공개 파일만
  const [events, tasks, taskStats, meetings, decisions, files, fileCount, nextAgenda, camps] = await Promise.all([
    db.prepare(`SELECT id, title, kind, startDate, endDate, startTime FROM events WHERE deletedAt IS NULL AND campId IN (${inList}) AND COALESCE(endDate, startDate) >= ? ORDER BY startDate LIMIT 8`).bind(...args, today).all(),
    db.prepare(`SELECT id, title, titleKo, titleEn, ownerName, ownerSuggestion, dueDate, status, priority, section FROM tasks WHERE deletedAt IS NULL AND inactive = 0 AND campId IN (${inList}) AND status NOT IN ('Completed','Not Applicable') ORDER BY (dueDate IS NULL), dueDate, CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END LIMIT 10`).bind(...args).all(),
    db.prepare(`SELECT SUM(CASE WHEN status NOT IN ('Completed','Not Applicable') THEN 1 ELSE 0 END) AS open, SUM(CASE WHEN status NOT IN ('Completed','Not Applicable') AND dueDate IS NOT NULL AND dueDate < ? THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN status NOT IN ('Completed','Not Applicable') AND TRIM(ownerName) = '' THEN 1 ELSE 0 END) AS noOwner, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status <> 'Not Applicable' THEN 1 ELSE 0 END) AS total,
        (SELECT COUNT(*) FROM tasks WHERE deletedAt IS NULL AND inactive = 1 AND campId IN (${inList})) AS inactive
      FROM tasks WHERE deletedAt IS NULL AND inactive = 0 AND campId IN (${inList})`).bind(today, ...args, ...args).first(),
    db.prepare(`SELECT id, meetDate, title, titleEn, status FROM meetings WHERE deletedAt IS NULL AND campId IN (${inList}) ORDER BY meetDate DESC LIMIT 6`).bind(...args).all(),
    db.prepare(`SELECT id, meetingId, kind, textKo, textEn, decidedDate FROM decisions WHERE deletedAt IS NULL AND state = 'active' AND kind IN ('direction','final','changed') AND campId IN (${inList}) ORDER BY decidedDate DESC LIMIT 6`).bind(...args).all(),
    db.prepare(`SELECT f.id, f.title, f.kind, f.category, f.statusLabel, f.createdAt, f.restricted FROM files f WHERE f.deletedAt IS NULL ${restrict} AND (f.campId IN (${inList}) ${typeId ? 'OR f.typeId = ?' : ''} OR EXISTS (SELECT 1 FROM file_links l WHERE l.fileId = f.id AND l.deletedAt IS NULL AND l.campId IN (${inList}))) ORDER BY f.createdAt DESC LIMIT 6`).bind(...args, ...(typeId ? [typeId] : []), ...args).all(),
    db.prepare(`SELECT COUNT(*) AS n FROM files f WHERE f.deletedAt IS NULL ${restrict} AND (f.campId IN (${inList}) ${typeId ? 'OR f.typeId = ?' : ''} OR EXISTS (SELECT 1 FROM file_links l WHERE l.fileId = f.id AND l.deletedAt IS NULL AND l.campId IN (${inList})))`).bind(...args, ...(typeId ? [typeId] : []), ...args).first(),
    db.prepare(`SELECT a.id, a.topic, a.titleEn, a.meetingId FROM agenda_items a WHERE a.deletedAt IS NULL AND a.nextMeeting = 1 AND a.status <> 'decided' AND a.campId IN (${inList}) LIMIT 6`).bind(...args).all(),
    typeId ? db.prepare(`SELECT id, nameKo, nameEn, startDate, endDate, status FROM camps WHERE typeId = ?1 AND deletedAt IS NULL ORDER BY startDate IS NULL, startDate DESC`).bind(typeId).all() : Promise.resolve({ results: [] }),
  ]);
  // 항목별 권한: 캠프별 공간을 볼 수 있어도, 업무·회의·자료 영역을 볼 수 없으면 그 내용은 내려주지 않는다 (숫자도 0으로)
  const T = canView(s.perms, 'tasks'), M = canView(s.perms, 'meetings'), F = canView(s.perms, 'files');
  const out = { camp, type, camps: camps.results, stats: T ? { open: taskStats.open || 0, overdue: taskStats.overdue || 0, noOwner: taskStats.noOwner || 0, completed: taskStats.completed || 0, total: taskStats.total || 0, inactive: taskStats.inactive || 0, files: F ? fileCount.n : 0 } : { open: 0, overdue: 0, noOwner: 0, completed: 0, total: 0, files: F ? fileCount.n : 0 },
    events: T ? events.results : [], tasks: T ? tasks.results : [], meetings: M ? meetings.results : [], decisions: M ? decisions.results : [], files: F ? files.results : [], nextAgenda: M ? nextAgenda.results : [], perms: s.perms,
    visible: { tasks: T, meetings: M, files: F } };
  if (s.perms.moneyRead && campIds.length) {
    const lines = (await db.prepare(`SELECT category, plannedAmount, expectedAmount, actualAmount, currency, status FROM budget_lines WHERE deletedAt IS NULL AND campId IN (${inList})`).bind(...args).all()).results;
    const targets = (await db.prepare(`SELECT currency, amountMinor FROM budget_targets WHERE deletedAt IS NULL AND campId IN (${inList})`).bind(...args).all()).results;
    out.budget = summarize(lines, targets).map(({ byCategory, ...x }) => x);
  }
  return json(out);
}
