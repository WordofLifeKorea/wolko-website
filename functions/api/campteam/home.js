import { campSession, json, needLogin, noDb, canView } from '../../lib/campteamAuth.js';
import { todayKST, OPEN_STATUS_SQL } from '../../lib/campteamDb.js';
import { summarize } from '../../lib/campteamMoney.js';
import { periodTotals } from '../../lib/campteamLedger.js';
import { loadOwnerKeys, isMine } from '../../lib/campteamOwners.js';

/** 캠프팀 홈에 필요한 요약을 한 번에 돌려준다. 금액(budget)은 권한이 있을 때만 DB에서 읽는다. */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const today = todayKST();
  const db = env.DB, ownerKeys = await loadOwnerKeys(env, s.email);
  // 업무 표(별칭 k)의 열만 쓰도록 접두어를 붙인다 — camps 표에도 status 열이 있어서 접두어가 없으면 모호해진다
  const open = `k.deletedAt IS NULL AND k.status NOT IN ('Completed','Not Applicable')`;

  const [stats, camps, deadlines, attention, agenda, meetings, files, notices, myTasks, campChoices, overdue, decisions, statusRows] = await Promise.all([
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
    // 최근 올리거나 새 버전이 올라온 파일. 금액 자료는 금액 권한이 있을 때만
    db.prepare(`SELECT id, title, kind, uploadedBy, statusLabel, createdAt, updatedAt, isTest FROM files WHERE deletedAt IS NULL ${s.perms.moneyRead ? '' : 'AND restricted = 0'} ${s.campRole ? '' : 'AND id IN (SELECT fileId FROM file_public)'} ORDER BY COALESCE(updatedAt, createdAt) DESC LIMIT 8`).all(),
    db.prepare(`SELECT id, message, messageEn, isTest FROM notices WHERE deletedAt IS NULL AND active = 1 ORDER BY sortOrder, createdAt LIMIT 8`).all(),
    // 내 담당 업무: 담당자 이메일이 내 이메일이거나, 이름이 내 이름·별칭과 같은 업무 (아래에서 걸러낸다)
    db.prepare(`SELECT k.id, k.title, k.dueDate, k.status, k.priority, k.ownerName, k.ownerEmail, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE ${open} AND (k.ownerEmail <> '' OR k.ownerName <> '') ORDER BY k.dueDate IS NULL, k.dueDate LIMIT 3000`).all(),
    // D-day 위젯에서 고를 캠프 목록 (날짜가 있는 진행 예정 캠프)
    db.prepare(`SELECT id, nameKo, nameEn, startDate, endDate, status FROM camps WHERE deletedAt IS NULL AND status IN ('planning','active') ORDER BY startDate IS NULL, startDate, nameKo LIMIT 30`).all(),
    // 마감 지난 업무 (진행 중인 것만, 오래된 순)
    db.prepare(`SELECT k.id, k.title, k.ownerName, k.dueDate, k.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM tasks k LEFT JOIN camps c ON c.id = k.campId
      WHERE ${open} AND k.dueDate IS NOT NULL AND k.dueDate < ?1 ORDER BY k.dueDate LIMIT 8`).bind(today).all(),
    // 최근 결정 (지금 유효한 방향 합의·최종 결정만)
    db.prepare(`SELECT d.id, d.kind, d.textKo, d.textEn, d.decidedDate, d.isTest, c.nameKo AS campKo, c.nameEn AS campEn
      FROM decisions d LEFT JOIN camps c ON c.id = d.campId
      WHERE d.deletedAt IS NULL AND d.state = 'active' AND d.kind IN ('direction','final') ORDER BY d.decidedDate IS NULL, d.decidedDate DESC, d.createdAt DESC LIMIT 6`).all(),
    db.prepare(`SELECT status, COUNT(*) AS n FROM tasks WHERE deletedAt IS NULL GROUP BY status`).all(),
  ]);

  // 금액: 권한이 없으면 이 표는 아예 읽지 않는다 (응답에도 budget 키가 없다)
  let budget;
  if (s.perms.moneyRead) {
    const lines = (await db.prepare(`SELECT category, plannedAmount, expectedAmount, actualAmount, currency, status FROM budget_lines WHERE deletedAt IS NULL`).all()).results;
    const targets = (await db.prepare(`SELECT campId, currency, amountMinor FROM budget_targets WHERE deletedAt IS NULL`).all()).results;
    budget = { summary: summarize(lines).map(({ byCategory, ...x }) => x), lines: lines.length, targets: targets.length };
  }

  // 장부 현황: 오늘이 속한 열린 기간(없으면 가장 가까운 열린 기간). 금액 조회 권한이 있을 때만 읽는다.
  let ledger;
  if (s.perms.moneyRead) {
    const per = await db.prepare(`SELECT id, name, startDate, endDate FROM ledger_periods WHERE deletedAt IS NULL AND status = 'open' ORDER BY (startDate <= ?1 AND endDate >= ?1) DESC, startDate DESC LIMIT 1`).bind(today).first();
    if (per) {
      const t = await periodTotals(env, per.id);
      const pend = await db.prepare(`SELECT COUNT(*) AS n FROM ledger_expense_rows WHERE state = 'pending'`).first();
      const rec = await db.prepare('SELECT asOfDate, diff FROM ledger_reconcile WHERE periodId = ?1 ORDER BY asOfDate DESC, createdAt DESC LIMIT 1').bind(per.id).first();
      ledger = { periodId: per.id, name: per.name, income: t.income, expense: t.expense, balance: t.balance, pendingExpense: pend.n, lastReconcile: rec || null };
    }
  }

  // 항목별 권한: 볼 수 없는 영역의 위젯 자료는 비워서 내려준다 (자료 자체를 응답에 싣지 않는다)
  const V = (a, list) => (canView(s.perms, a) ? list : []);
  const T = canView(s.perms, 'tasks');
  const body = {
    user: { email: s.email, campRole: s.campRole, perms: s.perms },
    today,
    stats: T ? { open: stats?.open || 0, overdue: stats?.overdue || 0, noOwner: stats?.noOwner || 0, completed: stats?.completed || 0, total: stats?.total || 0 } : { open: 0, overdue: 0, noOwner: 0, completed: 0, total: 0 },
    camps: V('camps', T ? camps.results : camps.results.map((c) => ({ ...c, taskTotal: null, taskDone: null }))), deadlines: V('tasks', deadlines.results), attention: V('tasks', attention.results),
    agenda: V('meetings', agenda.results), meetings: V('meetings', meetings.results), files: V('files', files.results),
    notices: s.campRole ? V('camps', notices.results) : [], myTasks: V('tasks', myTasks.results.filter((x) => isMine(x, s.email, ownerKeys)).slice(0, 8).map(({ ownerName, ownerEmail, ...rest }) => rest)), campChoices: V('camps', campChoices.results),
    overdue: V('tasks', overdue.results), decisions: V('meetings', decisions.results), statusCounts: V('tasks', statusRows.results),
  };
  if (budget) body.budget = budget;
  if (ledger) body.ledger = ledger;
  return json(body);
}
