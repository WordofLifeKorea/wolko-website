import { campSession, json, needLogin, needPerm, noDb } from '../../lib/campteamAuth.js';
import { summarize, formatMinor, forecastOf, DECIMALS } from '../../lib/campteamMoney.js';

const csvCell = (v) => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const major = (minor, cur) => (minor == null ? '' : (Number(minor) / 10 ** (DECIMALS[cur] ?? 0)).toFixed(DECIMALS[cur] ?? 0));

/**
 * 예상 리포트: ?campId= [&format=csv]
 *  통화별로 예산 계획 / 예상 지출 / 실제 지출 / 예상 최종(실제→예상→계획 순) / 총 예산 대비 남은 금액, 계획보다 많이 쓴 항목, 아직 지급 안 된 항목.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.moneyRead) return needPerm('금액(예산) 권한이 필요합니다.');
  const p = new URL(request.url).searchParams, campId = p.get('campId');
  const lines = (await env.DB.prepare(`SELECT b.*, c.nameKo AS campKo, c.nameEn AS campEn FROM budget_lines b LEFT JOIN camps c ON c.id = b.campId WHERE b.deletedAt IS NULL ${campId ? 'AND b.campId = ?1' : ''} ORDER BY c.nameKo, b.category, b.createdAt`).bind(...(campId ? [campId] : [])).all()).results;
  const targets = (await env.DB.prepare(`SELECT * FROM budget_targets WHERE deletedAt IS NULL ${campId ? 'AND campId = ?1' : ''}`).bind(...(campId ? [campId] : [])).all()).results;
  if (p.get('format') === 'csv') {
    const head = ['Camp', 'Category', 'Item', 'Currency', 'Planned', 'Expected', 'Actual', 'Forecast', 'Vendor', 'Status', 'Paid date', 'Notes'];
    const rows = lines.map(l => { const fin = forecastOf(l);
      return [l.campEn || l.campKo || '', l.category, l.label, l.currency, major(l.plannedAmount, l.currency), major(l.expectedAmount, l.currency), major(l.actualAmount, l.currency), major(fin, l.currency), l.vendor, l.status, l.paidAt || '', l.notes]; });
    const body = '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="camp-budget${campId ? '-' + campId.slice(0, 8) : ''}.csv"`, 'Cache-Control': 'no-store' } });
  }
  const summary = summarize(lines, targets);
  const overLines = lines.filter(l => l.actualAmount != null && l.actualAmount > (l.expectedAmount ?? l.plannedAmount));
  const unpaid = lines.filter(l => l.status !== 'paid' && l.actualAmount == null);
  return json({ summary, overLines: overLines.map(l => ({ id: l.id, label: l.label, currency: l.currency, planned: l.plannedAmount, actual: l.actualAmount, over: l.actualAmount - (l.expectedAmount ?? l.plannedAmount) })),
    unpaidCount: unpaid.length, lineCount: lines.length, formatted: summary.map(x => ({ currency: x.currency, planned: formatMinor(x.planned, x.currency), forecast: formatMinor(x.forecast, x.currency), actual: formatMinor(x.actual, x.currency), remaining: x.remaining == null ? null : formatMinor(x.remaining, x.currency) })) });
}
