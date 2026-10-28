import { moneyGate, getPeriod, periodTotals, json } from '../../lib/campteamLedger.js';
import { todayKST } from '../../lib/campteamDb.js';
import { ledgerBalanceAsOf } from './ledger-reconcile.js';

/** 한 기간의 요약: 수입·지출·잔액, 항목별 "예산 대비 실제", 월별 흐름 (금액 조회 권한자) */
export async function onRequestGet({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'read'); if (res) return res;
  const period = await getPeriod(env, new URL(request.url).searchParams.get('periodId'));
  if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  return json(await summarize(env, period, s));
}

export async function summarize(env, period, s) {
  const [totals, cats, actual, plan, monthly, carry, review, recon] = await Promise.all([
    periodTotals(env, period.id),
    env.DB.prepare('SELECT kind, name, active, sortOrder FROM ledger_categories ORDER BY kind DESC, sortOrder, name').all(),
    env.DB.prepare(`SELECT kind, category, SUM(amount) AS amount, COUNT(*) AS n FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL GROUP BY kind, category`).bind(period.id).all(),
    env.DB.prepare('SELECT kind, category, amount FROM ledger_plan WHERE periodId = ?1').bind(period.id).all(),
    env.DB.prepare(`SELECT substr(entryDate,1,7) AS month, kind, SUM(amount) AS amount FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL AND source <> 'carry' GROUP BY month, kind ORDER BY month`).bind(period.id).all(),
    env.DB.prepare(`SELECT kind, amount FROM ledger_entries WHERE periodId = ?1 AND source = 'carry' AND deletedAt IS NULL`).bind(period.id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL AND needsReview = 1`).bind(period.id).first(),
    env.DB.prepare('SELECT asOfDate, bankBalance, ledgerBalance, diff, createdAt FROM ledger_reconcile WHERE periodId = ?1 ORDER BY asOfDate DESC, createdAt DESC LIMIT 1').bind(period.id).first(),
  ]);
  // 통장 잔액처럼 "오늘까지"의 잔액: 오늘이 기간 안이면 오늘, 기간 전이면 기간 끝(전체), 기간이 지났으면 기간 끝
  const today = todayKST(), asOf = today >= period.startDate && today <= period.endDate ? today : period.endDate, balanceAsOf = await ledgerBalanceAsOf(env, period.id, asOf);
  const act = new Map(actual.results.map((r) => [r.kind + '|' + r.category, r])), pl = new Map(plan.results.map((r) => [r.kind + '|' + r.category, r.amount]));
  const known = new Set(), byCategory = [];
  const push = (kind, category, active) => {
    const k = kind + '|' + category; if (known.has(k)) return; known.add(k);
    const a = act.get(k)?.amount || 0, p = pl.get(k) ?? 0;
    if (!active && !a && !p) return;                                  // 쓰지 않는 항목은 숨긴다
    byCategory.push({ kind, category, active: !!active, plan: p, actual: a, entries: act.get(k)?.n || 0, diff: kind === 'expense' ? p - a : a - p }); // 지출: 남은 예산, 수입: 목표 대비 초과
  };
  for (const c of cats.results) push(c.kind, c.name, c.active);
  for (const r of actual.results) push(r.kind, r.category, 0);
  for (const r of plan.results) push(r.kind, r.category, 0);
  const planIncome = plan.results.filter((r) => r.kind === 'income').reduce((n, r) => n + r.amount, 0), planExpense = plan.results.filter((r) => r.kind === 'expense').reduce((n, r) => n + r.amount, 0);
  const months = {}; for (const m of monthly.results) (months[m.month] ||= { month: m.month, income: 0, expense: 0 })[m.kind] = m.amount;
  return {
    period: { id: period.id, name: period.name, status: period.status, startDate: period.startDate, endDate: period.endDate, closingBalance: period.closingBalance, carryPeriodId: period.carryPeriodId, note: period.note },
    totals, asOf, balanceAsOf, plan: { income: planIncome, expense: planExpense, expectedBalance: planIncome - planExpense },
    opening: carry ? { kind: carry.kind, amount: carry.amount } : null,
    byCategory, monthly: Object.values(months), needsReview: review.n, lastReconcile: recon || null,
    canEdit: !!(s && s.perms.ledgerWrite) && period.status === 'open', canAdmin: !!(s && s.perms.ledgerAdmin),
  };
}
