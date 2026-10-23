import { moneyGate, getPeriod, json, badRequest } from '../../lib/campteamLedger.js';
import { parseAmount } from '../../lib/campteamMoney.js';
import { uuid, nowIso, text, isDate, audit } from '../../lib/campteamDb.js';

/**
 * 잔액 대조: 통장 실제 잔액(월코 재정 담당에게 받은 값)을 입력하면 그 날짜까지의 장부 잔액과 비교해 차이를 기록한다.
 * 포털은 은행에 접속하지 않는다 — 사람이 확인한 값을 적어 두는 기록일 뿐이다.
 *  GET  ?periodId=&asOf=   기록 목록 + (asOf 가 있으면) 그 날짜까지의 장부 잔액   — 금액 조회 권한자
 *  POST { periodId, asOfDate, bankBalance, note }                                   — 캠프 재정 담당·디렉터
 *  DELETE ?id=                                                                      — 캠프 재정 담당·디렉터(변경 기록에 남음)
 */
export async function ledgerBalanceAsOf(env, periodId, asOf) {
  const r = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN kind='income' THEN amount ELSE -amount END),0) AS bal FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL AND entryDate <= ?2`).bind(periodId, asOf).first();
  return r.bal;
}
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const p = new URL(request.url).searchParams, period = await getPeriod(env, p.get('periodId'));
  if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  const items = (await env.DB.prepare('SELECT id, asOfDate, bankBalance, ledgerBalance, diff, note, createdAt, createdBy FROM ledger_reconcile WHERE periodId = ?1 ORDER BY asOfDate DESC, createdAt DESC LIMIT 60').bind(period.id).all()).results;
  const asOf = p.get('asOf'), current = isDate(asOf) ? { asOfDate: asOf, ledgerBalance: await ledgerBalanceAsOf(env, period.id, asOf) } : null;
  return json({ items, current });
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const period = await getPeriod(env, b.periodId); if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (!isDate(b.asOfDate)) return badRequest('기준 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
  if (b.asOfDate < period.startDate || b.asOfDate > period.endDate) return badRequest(`기준 날짜가 이 기간(${period.startDate} ~ ${period.endDate}) 밖이에요.`);
  const bank = parseAmount(b.bankBalance, 'KRW'); if (bank === null || Number.isNaN(bank)) return badRequest('통장 잔액을 숫자로 입력해 주세요.');
  const ledger = await ledgerBalanceAsOf(env, period.id, b.asOfDate), id = uuid();
  await env.DB.prepare('INSERT INTO ledger_reconcile (id,periodId,asOfDate,bankBalance,ledgerBalance,diff,note,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)').bind(id, period.id, b.asOfDate, bank, ledger, bank - ledger, text(b.note, 300), nowIso(), s.email).run();
  await audit(env, s.email, 'create', 'ledger_reconcile', id, `${b.asOfDate} 차이 ${bank - ledger}`);
  return json({ id, ledgerBalance: ledger, diff: bank - ledger }, 201);
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM ledger_reconcile WHERE id = ?1').bind(String(id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  await env.DB.prepare('DELETE FROM ledger_reconcile WHERE id = ?1').bind(id).run();
  await audit(env, s.email, 'delete', 'ledger_reconcile', id, `${row.asOfDate} 차이 ${row.diff}`);
  return json({ ok: true });
}
