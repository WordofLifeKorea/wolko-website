/**
 * 경비 리포트 → 캠프팀 장부 연동 (읽기 전용 연결).
 *
 * 기존 경비 리포트(CAMP_KV 의 expense:report:*)는 읽기만 한다. 수정·삭제·계좌번호·영수증은 건드리지도 읽지도 않는다.
 * "송금 처리 완료"(processed)된 리포트의 항목 중, 승인자가 확정한 출금 계좌가 "캠프 계좌"로 지정된 항목만 장부의 지출로 반영한다.
 *  - 캠프 계좌가 무엇인지, 경비 카테고리를 어떤 장부 항목으로 볼지는 캠프팀 설정(ledger_expense_rules)이 정한다.
 *  - 같은 항목은 한 번만 반영된다(ledger_expense_rows 의 (reportId, rowIdx)).
 *  - 장부에 같은 금액·비슷한 날짜의 거래가 이미 있으면 자동으로 넣지 않고 "연동함"에서 사람이 고른다(이중 계산 방지).
 *  - 반영할 기간(열린 기간)이 없거나 마감되었으면 연동함에 보류로 남는다.
 */
import { WITHDRAW_ACCOUNTS, ACCOUNTS } from '../../src/lib/expense-config.js';
import { uuid, nowIso, text } from './campteamDb.js';
import { ensureCategory } from './campteamLedger.js';

export const REPORT_PREFIX = 'expense:report:';
export const WITHDRAW_IDS = WITHDRAW_ACCOUNTS.map((a) => a.id);
export { WITHDRAW_ACCOUNTS, ACCOUNTS };
const MAX_GETS = 40, MAX_ROWS = 25, THROTTLE_MS = 120000, DUP_DAYS = 7;
export const kstDate = (iso) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10);

export async function loadRules(env) {
  const rows = (await env.DB.prepare('SELECT kind, key, value FROM ledger_expense_rules').all()).results;
  return { withdraw: new Set(rows.filter((r) => r.kind === 'withdraw' && r.value === '1').map((r) => r.key)), account: new Map(rows.filter((r) => r.kind === 'account' && r.value).map((r) => [r.key, r.value])) };
}
const periodOn = (env, date) => env.DB.prepare('SELECT * FROM ledger_periods WHERE deletedAt IS NULL AND startDate <= ?1 AND endDate >= ?1 ORDER BY startDate DESC LIMIT 1').bind(date).first();

/** 한 항목을 장부에 넣을 수 있는지 판단해 넣거나 보류로 둔다. row = ledger_expense_rows 의 한 줄 */
async function place(env, row, rules, actor, { force = false, category = null } = {}) {
  const key = `exp:${row.reportId}:${row.rowIdx}`, now = nowIso(), period = await periodOn(env, row.entryDate);
  const setState = (state, reason, extra = {}) => env.DB.prepare('UPDATE ledger_expense_rows SET state=?3, reason=?4, entryId=?5, periodId=?6, candidate=?7, updatedAt=?8, updatedBy=?9 WHERE reportId=?1 AND rowIdx=?2')
    .bind(row.reportId, row.rowIdx, state, reason, extra.entryId ?? null, period ? period.id : null, extra.candidate ?? null, now, actor).run();
  if (!period) { await setState('pending', 'noPeriod'); return 'pending'; }
  if (period.status === 'closed') { await setState('pending', 'closed'); return 'pending'; }
  if (!force) {
    const dup = await env.DB.prepare(`SELECT id FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL AND kind = 'expense' AND source <> 'expense' AND amount = ?2 AND ABS(julianday(entryDate) - julianday(?3)) <= ?4 LIMIT 1`).bind(period.id, row.amount, row.entryDate, DUP_DAYS).first();
    if (dup) { await setState('pending', 'dup', { candidate: dup.id }); return 'pending'; }
  }
  let cat = category || rules.account.get(row.account) || '', review = 0;
  if (!cat) { cat = '기타'; review = 1; }
  await ensureCategory(env, 'expense', cat, actor);
  const note = text(`경비 리포트 · ${row.title || row.project || ''}${row.submitter ? ' (' + row.submitter + ')' : ''} · ${String(row.reportId).slice(-6)}${row.currency && row.currency !== 'KRW' ? ' · ' + row.currency + ' ' + row.origAmount : ''}`, 300);
  const id = uuid();
  await env.DB.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,note,source,externalKey,needsReview,createdAt,updatedAt,createdBy,updatedBy) VALUES (?1,?2,?3,'expense',?4,?5,?6,?7,'expense',?8,?9,?10,?10,?11,?11)`)
    .bind(id, period.id, row.entryDate, row.amount, cat, text(row.item, 200), note, key, review, now, actor).run();
  await setState('linked', '', { entryId: id });
  return 'linked';
}

/** 새로 송금 완료된 경비 리포트를 읽어 캠프 계좌 항목을 장부에 반영한다. force=true 면 간격 제한 없이 바로 실행 */
export async function syncExpenses(env, actor, { force = false } = {}) {
  const kv = env.CAMP_KV;
  if (!kv || typeof kv.list !== 'function') return { available: false };
  const rules = await loadRules(env);
  if (!rules.withdraw.size) return { available: true, configured: false, scanned: 0, linked: 0, pending: 0 };
  const last = await env.DB.prepare("SELECT status FROM ledger_expense_seen WHERE reportId = '_sync'").first();
  if (!force && last && Date.now() - Date.parse(last.status) < THROTTLE_MS) return { available: true, configured: true, throttled: true, scanned: 0, linked: 0, pending: 0 };
  const cutoffRow = await env.DB.prepare('SELECT MIN(startDate) AS d FROM ledger_periods WHERE deletedAt IS NULL').first(), cutoff = cutoffRow && cutoffRow.d;
  const out = { available: true, configured: true, scanned: 0, linked: 0, pending: 0, more: false };
  const now = nowIso();
  if (!cutoff) { await env.DB.prepare("INSERT INTO ledger_expense_seen (reportId,status,checkedAt) VALUES ('_sync',?1,?1) ON CONFLICT(reportId) DO UPDATE SET status=?1, checkedAt=?1").bind(now).run(); return out; }

  // 1) 이미 판단이 끝난 리포트(송금 완료·반려)는 다시 읽지 않는다
  const seen = new Set((await env.DB.prepare('SELECT reportId FROM ledger_expense_seen').all()).results.map((r) => r.reportId));
  const keys = []; let cursor;
  do { const r = await kv.list({ prefix: REPORT_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 }); keys.push(...r.keys.map((k) => k.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  const todo = keys.filter((k) => !seen.has(k.slice(REPORT_PREFIX.length)));
  if (todo.length > MAX_GETS) out.more = true;
  let rowBudget = MAX_ROWS;
  for (const k of todo.slice(0, MAX_GETS)) {
    if (rowBudget <= 0) { out.more = true; break; }
    let rep; try { rep = await kv.get(k, 'json'); } catch { continue; }
    if (!rep || !Array.isArray(rep.rows)) continue;
    out.scanned++;
    if (rep.status !== 'processed' && rep.status !== 'rejected') continue;              // 아직 진행 중인 리포트는 다음에 다시 본다
    const processed = rep.status === 'processed', entryDate = processed ? kstDate(rep.processedAt || rep.reviewedAt || rep.submittedAt || now) : null;
    if (processed && entryDate >= cutoff) {
      for (let i = 0; i < rep.rows.length; i++) {
        const r = rep.rows[i]; if (!r || !rules.withdraw.has(r.withdrawAccount)) continue;
        const amount = Math.round(Number(r.amountKrw)); if (!Number.isFinite(amount) || amount <= 0) continue;
        const rid = String(rep.id || k.slice(REPORT_PREFIX.length));
        await env.DB.prepare(`INSERT OR IGNORE INTO ledger_expense_rows (reportId,rowIdx,state,reason,entryDate,amount,item,memo,project,title,submitter,account,withdraw,currency,origAmount,createdAt,updatedAt,updatedBy)
          VALUES (?1,?2,'pending','',?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14,?15)`)
          .bind(rid, i, entryDate, amount, text(r.item, 120), text(r.memo, 300), text(r.project || rep.project, 160), text(rep.description, 200), text(rep.submitterName, 60), text(r.account, 120), text(r.withdrawAccount, 40), r.currency || 'KRW', r.currency && r.currency !== 'KRW' ? Number(r.amount) : null, now, actor).run();
        const row = await env.DB.prepare('SELECT * FROM ledger_expense_rows WHERE reportId = ?1 AND rowIdx = ?2').bind(rid, i).first();
        if (row.state === 'pending' && !row.reason) { const res = await place(env, row, rules, actor); if (res === 'linked') out.linked++; else out.pending++; rowBudget--; }
      }
    }
    await env.DB.prepare('INSERT OR REPLACE INTO ledger_expense_seen (reportId,status,checkedAt) VALUES (?1,?2,?3)').bind(String(rep.id || k.slice(REPORT_PREFIX.length)), rep.status, now).run();
  }
  // 2) 기간이 없거나 마감돼서 보류였던 항목을 다시 시도 (기간을 만들었거나 다시 열었을 수 있다)
  const waiting = (await env.DB.prepare(`SELECT * FROM ledger_expense_rows WHERE state = 'pending' AND reason IN ('noPeriod','closed') LIMIT ?1`).bind(MAX_ROWS).all()).results;
  for (const row of waiting) { const res = await place(env, row, rules, actor); if (res === 'linked') out.linked++; }
  if (!out.more) await env.DB.prepare("INSERT INTO ledger_expense_seen (reportId,status,checkedAt) VALUES ('_sync',?1,?1) ON CONFLICT(reportId) DO UPDATE SET status=?1, checkedAt=?1").bind(now).run();
  return out;
}
export { place };
