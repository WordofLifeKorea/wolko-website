import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';
import { todayKST, OPEN_STATUS_SQL } from '../../lib/campteamDb.js';
import { summarize } from '../../lib/campteamMoney.js';

/** 캠프팀 홈에 필요한 요약을 한 번에 돌려준다. 금액(budget)은 권한이 있을 때만 DB에서 읽는다. */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const today = todayKST();
  const db = env.DB;
  // 업무 표(별칭 k)의 열만 쓰도록 접두어를 붙인다 — camps 표에도 status 열이 있어서 접두어가 없으면 모호해진다
  const open = `k.deletedAt IS NULL AND k.status NOT IN ('Completed','Not Applicable')`;

  const [stats, camps, deadlines, attention, agenda, meetings, files, notices, myTasks, campChoices] = await Promise.all([
    db.prepare(`SELECT
        SUM(CASE WHEN ${OPEN_STATUS_SQL} THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN ${OPEN_STATUS_SQL} AND dueDate IS NOT NULL AND dueDate < ?1 THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN ${OPEN_STATUS_SQL} AND TRIM(ownerName) = '' THEN 1 ELSE 0 END) AS noOwner,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status <> 'Not Applicable' THEN 1 ELSE 0 END) AS total
      FROM tasks WHERE deletedAt IS NULL`).bind(today).first(),
    db.prepare(`SELECT c.id, c.nameKo, c.nameEn, c.startDate, c.endDate, c.status, c.isTest,
        t.nameKo AS typeKo, t.nameEn AS typeEn,
        (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.status <> 'Not Applicable') AS taskTotal,
        (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.status = 'Completed') AS taskDone
      FROM camps c JOIN camp_types t ON t.id = c.typeId
      WHERE c.deletedAt IS NULL AND c.status IN ('planning','active')
      ORDER BY c.startDate IS NULL, c.startDate, c.nameKo LIMIT 8`).all(),
    db.prepare(`SELECT k.id, k.title, k.ownerName, k.dueDate, k.status, k.priority, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE ${open} AND k.dueDate IS NOT NULL ORDER BY k.dueDate LIMIT 6`).all(),
    db.prepare(`SELECT k.id, k.title, k.ownerName, k.dueDate, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE ${open} AND (TRIM(k.ownerName) = '' OR (k.dueDate IS NOT NULL AND k.dueDate < ?1))
      ORDER BY (TRIM(k.ownerName) = '') DESC, k.dueDate LIMIT 6`).bind(today).all(),
    db.prepare(`SELECT a.id, a.topic, a.status, a.note, a.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM agenda_items a LEFT JOIN camps c ON c.id = a.campId
      WHERE a.deletedAt IS NULL AND a.nextMeeting = 1 AND a.status <> 'decided' ORDER BY a.sortOrder LIMIT 6`).all(),
    db.prepare(`SELECT id, meetDate, meetTime, title, purpose, isTest FROM meetings WHERE deletedAt IS NULL ORDER BY meetDate DESC LIMIT 3`).all(),
    db.prepare(`SELECT id, title, kind, uploadedBy, statusLabel, createdAt, isTest FROM files WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT 4`).all(),
    db.prepare(`SELECT id, message, messageEn, isTest FROM notices WHERE deletedAt IS NULL AND active = 1 ORDER BY sortOrder, createdAt LIMIT 8`).all(),
    // 내 담당 업무: 담당자 "이메일"이 내 이메일과 같은 업무만 (이름으로 추측하지 않는다)
    db.prepare(`SELECT k.id, k.title, k.dueDate, k.status, k.priority, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE ${open} AND k.ownerEmail <> '' AND LOWER(k.ownerEmail) = ?1 ORDER BY k.dueDate IS NULL, k.dueDate LIMIT 8`).bind(s.email.toLowerCase()).all(),
    // D-day 위젯에서 고를 캠프 목록 (날짜가 있는 진행 예정 캠프)
    db.prepare(`SELECT id, nameKo, nameEn, startDate, endDate, status FROM camps WHERE deletedAt IS NULL AND status IN ('planning','active') ORDER BY startDate IS NULL, startDate, nameKo LIMIT 30`).all(),
  ]);

  // 금액: 권한이 없으면 이 표는 아예 읽지 않는다 (응답에도 budget 키가 없다)
  let budget;
  if (s.perms.moneyRead) {
    const lines = (await db.prepare(`SELECT category, plannedAmount, expectedAmount, actualAmount, currency, status FROM budget_lines WHERE deletedAt IS NULL`).all()).results;
    const targets = (await db.prepare(`SELECT campId, currency, amountMinor FROM budget_targets WHERE deletedAt IS NULL`).all()).results;
    budget = { summary: summarize(lines).map(({ byCategory, ...x }) => x), lines: lines.length, targets: targets.length };
  }

  const body = {
    user: { email: s.email, campRole: s.campRole, perms: s.perms },
    today,
    stats: {
      open: stats?.open || 0, overdue: stats?.overdue || 0, noOwner: stats?.noOwner || 0,
      completed: stats?.completed || 0, total: stats?.total || 0,
    },
    camps: camps.results, deadlines: deadlines.results, attention: attention.results,
    agenda: agenda.results, meetings: meetings.results, files: files.results,
    notices: notices.results, myTasks: myTasks.results, campChoices: campChoices.results,
  };
  if (budget) body.budget = budget;
  return json(body);
}
