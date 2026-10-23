import { moneyGate, getPeriod, closedMsg, json, badRequest } from '../../lib/campteamLedger.js';
import { parseAmount } from '../../lib/campteamMoney.js';
import { nowIso, audit } from '../../lib/campteamDb.js';

/** 기간 예산(엑셀의 "예산" 탭): 기간 안에서 항목별로 쓰기(받기)로 한 금액. 조회: 금액 조회 권한자 · 저장: 캠프 재정 담당·디렉터 */
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const period = await getPeriod(env, new URL(request.url).searchParams.get('periodId'));
  if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  return json({ items: (await env.DB.prepare('SELECT kind, category, amount FROM ledger_plan WHERE periodId = ?1 ORDER BY kind DESC, category').bind(period.id).all()).results });
}

/** { periodId, items:[{kind, category, amount}] } — 보낸 목록이 새 기간 예산 전체가 된다(0원·빈 칸은 빠진다) */
export async function onRequestPut({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const period = await getPeriod(env, b.periodId); if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (period.status === 'closed') return json({ error: closedMsg(period) }, 409);
  if (!Array.isArray(b.items) || b.items.length > 100) return badRequest('항목 목록이 올바르지 않습니다.');
  const rows = [], seen = new Set();
  for (const it of b.items) {
    if (!it || !['income', 'expense'].includes(it.kind)) return badRequest('수입/지출 구분이 올바르지 않습니다.');
    const amount = parseAmount(it.amount, 'KRW'); if (amount === null || amount === 0) continue;
    if (Number.isNaN(amount) || amount < 0) return badRequest(`「${it.category}」 금액이 올바르지 않아요.`);
    const exists = await env.DB.prepare('SELECT 1 AS x FROM ledger_categories WHERE kind = ?1 AND name = ?2').bind(it.kind, String(it.category || '')).first();
    if (!exists) return badRequest(`「${it.category}」은(는) 항목 목록에 없어요.`);
    const k = it.kind + '|' + it.category; if (seen.has(k)) return badRequest(`「${it.category}」이 두 번 들어 있어요.`); seen.add(k);
    rows.push({ kind: it.kind, category: it.category, amount });
  }
  const now = nowIso();
  await env.DB.prepare('DELETE FROM ledger_plan WHERE periodId = ?1').bind(period.id).run();
  for (const r of rows) await env.DB.prepare('INSERT INTO ledger_plan (periodId,kind,category,amount,updatedAt,updatedBy) VALUES (?1,?2,?3,?4,?5,?6)').bind(period.id, r.kind, r.category, r.amount, now, s.email).run();
  await audit(env, s.email, 'save', 'ledger_plan', period.id, `${rows.length}개 항목`);
  return json({ ok: true, count: rows.length });
}

/** 지난 기간의 기간 예산을 가져와 시작점으로 쓴다: { periodId, fromPeriodId } (비어 있는 기간에만) */
export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const to = await getPeriod(env, b.periodId), from = await getPeriod(env, b.fromPeriodId);
  if (!to || !from) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (to.status === 'closed') return json({ error: closedMsg(to) }, 409);
  if ((await env.DB.prepare('SELECT COUNT(*) AS n FROM ledger_plan WHERE periodId = ?1').bind(to.id).first()).n) return json({ error: '이 기간에는 이미 기간 예산이 있어요. 지우고 다시 가져오려면 먼저 비워 주세요.' }, 409);
  const now = nowIso();
  await env.DB.prepare('INSERT INTO ledger_plan (periodId,kind,category,amount,updatedAt,updatedBy) SELECT ?1, kind, category, amount, ?3, ?4 FROM ledger_plan WHERE periodId = ?2').bind(to.id, from.id, now, s.email).run();
  await audit(env, s.email, 'copy', 'ledger_plan', to.id, `← ${from.name}`);
  return json({ ok: true });
}
