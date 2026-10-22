import { moneyGate, getPeriod, json, badRequest } from '../../lib/campteamLedger.js';
import { syncExpenses, place, loadRules, WITHDRAW_ACCOUNTS, ACCOUNTS, WITHDRAW_IDS } from '../../lib/campteamExpenseLink.js';
import { nowIso, text, audit } from '../../lib/campteamDb.js';

/**
 * 경비 리포트 연동함. 기존 경비 리포트는 읽기만 하고, 캠프 계좌에서 나간 항목을 장부의 지출로 반영한다.
 *  GET                                   설정(캠프 계좌·카테고리 매핑)과 연동함(반영됨/보류/제외) — 금액 조회 권한자
 *  POST { action:'sync' }                지금 가져오기 — 캠프 재정 담당·디렉터 (장부 화면을 열 때도 자동으로 호출된다)
 *  POST { action:'rules', withdraw:[id...], account:{카테고리: 장부 항목} }   설정 저장 — 캠프 재정 담당·디렉터
 *  POST { action:'link'|'merge'|'ignore'|'restore', reportId, rowIdx, ... }  보류 항목 처리
 */
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const rules = await loadRules(env), q = (state, lim) => env.DB.prepare(`SELECT reportId, rowIdx, state, reason, entryDate, amount, item, memo, project, title, submitter, account, withdraw, currency, origAmount, entryId, candidate, periodId, updatedAt FROM ledger_expense_rows WHERE state = ?1 ORDER BY entryDate DESC, reportId LIMIT ${lim}`).bind(state).all();
  const [pending, linked, ignored, cats, last] = await Promise.all([q('pending', 100), q('linked', 30), q('ignored', 30),
    env.DB.prepare("SELECT name FROM ledger_categories WHERE kind = 'expense' AND active = 1 ORDER BY sortOrder, name").all(), env.DB.prepare("SELECT checkedAt FROM ledger_expense_seen WHERE reportId = '_sync'").first()]);
  const cand = new Map();
  for (const r of pending.results) if (r.candidate) { const e = await env.DB.prepare('SELECT id, entryDate, amount, category, description FROM ledger_entries WHERE id = ?1').bind(r.candidate).first(); if (e) cand.set(r.candidate, e); }
  return json({
    connected: !!(env.CAMP_KV && typeof env.CAMP_KV.list === 'function'),
    rules: { withdraw: [...rules.withdraw], account: Object.fromEntries(rules.account) },
    withdrawOptions: WITHDRAW_ACCOUNTS.map((a) => ({ id: a.id, ko: a.ko, en: a.en, retired: !!a.retired })), accountOptions: ACCOUNTS, categories: cats.results.map((c) => c.name),
    pending: pending.results.map((r) => ({ ...r, candidateEntry: r.candidate ? cand.get(r.candidate) || null : null })), linked: linked.results, ignored: ignored.results, lastSync: last ? last.checkedAt : null,
  });
}

export async function onRequestPost({ env, request }) {
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const need = b.action === 'rules' ? 'admin' : 'write', { s, res } = await moneyGate(env, request, need); if (res) return res;
  const now = nowIso();
  if (b.action === 'autoSync') return json(await syncExpenses(env, s.email, { force: false })); // 장부 화면을 열 때 자동 호출 (2분 간격 제한, 연결이 없으면 available:false)
  if (b.action === 'sync') { const r = await syncExpenses(env, s.email, { force: true }); if (r.available === false) return json({ error: '경비 리포트 저장소에 연결되어 있지 않아요.' }, 503); await audit(env, s.email, 'sync', 'ledger_expense', 'sync', `반영 ${r.linked} · 보류 ${r.pending}`); return json(r); }
  if (b.action === 'rules') {
    const withdraw = Array.isArray(b.withdraw) ? [...new Set(b.withdraw.map(String))] : null, account = b.account && typeof b.account === 'object' ? b.account : {};
    if (!withdraw || withdraw.some((id) => !WITHDRAW_IDS.includes(id))) return badRequest('출금 계좌 목록이 올바르지 않아요.');
    const cats = new Set((await env.DB.prepare("SELECT name FROM ledger_categories WHERE kind = 'expense'").all()).results.map((c) => c.name));
    for (const [k, v] of Object.entries(account)) { if (!ACCOUNTS.includes(k)) return badRequest(`「${k}」은(는) 경비 카테고리가 아니에요.`); if (v && !cats.has(String(v))) return badRequest(`「${v}」은(는) 장부 지출 항목에 없어요. 항목 목록에 먼저 추가해 주세요.`); }
    await env.DB.prepare('DELETE FROM ledger_expense_rules').run();
    for (const id of withdraw) await env.DB.prepare("INSERT INTO ledger_expense_rules (kind,key,value,updatedAt,updatedBy) VALUES ('withdraw',?1,'1',?2,?3)").bind(id, now, s.email).run();
    for (const [k, v] of Object.entries(account)) if (v) await env.DB.prepare("INSERT INTO ledger_expense_rules (kind,key,value,updatedAt,updatedBy) VALUES ('account',?1,?2,?3,?4)").bind(k, String(v), now, s.email).run();
    // 분류 확인이 필요하다고 표시된 반영 건 중, 이제 매핑이 생긴 것은 항목을 맞춰 준다
    const open = (await env.DB.prepare(`SELECT r.reportId, r.rowIdx, r.account, r.entryId FROM ledger_expense_rows r JOIN ledger_entries e ON e.id = r.entryId AND e.needsReview = 1 AND e.deletedAt IS NULL WHERE r.state = 'linked'`).all()).results;
    let fixed = 0; for (const r of open) { const v = account[r.account]; if (v) { await env.DB.prepare('UPDATE ledger_entries SET category = ?2, needsReview = 0, updatedAt = ?3, updatedBy = ?4 WHERE id = ?1').bind(r.entryId, v, now, s.email).run(); fixed++; } }
    await audit(env, s.email, 'save', 'ledger_expense_rules', 'rules', `캠프 계좌 ${withdraw.length}개 · 매핑 ${Object.values(account).filter(Boolean).length}개`);
    return json({ ok: true, reclassified: fixed });
  }
  const row = await env.DB.prepare('SELECT * FROM ledger_expense_rows WHERE reportId = ?1 AND rowIdx = ?2').bind(String(b.reportId || ''), Number.isInteger(b.rowIdx) ? b.rowIdx : -1).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  if (b.action === 'ignore') { if (row.state === 'linked') return json({ error: '이미 장부에 반영된 항목이에요. 장부에서 그 거래를 지워 주세요.' }, 409); await env.DB.prepare("UPDATE ledger_expense_rows SET state='ignored', reason='', updatedAt=?3, updatedBy=?4 WHERE reportId=?1 AND rowIdx=?2").bind(row.reportId, row.rowIdx, now, s.email).run(); await audit(env, s.email, 'ignore', 'ledger_expense', `${row.reportId}:${row.rowIdx}`, `${row.item} ${row.amount}`); return json({ ok: true }); }
  if (b.action === 'restore') { if (row.state !== 'ignored') return json({ error: '제외한 항목만 되돌릴 수 있어요.' }, 409); await env.DB.prepare("UPDATE ledger_expense_rows SET state='pending', reason='', updatedAt=?3, updatedBy=?4 WHERE reportId=?1 AND rowIdx=?2").bind(row.reportId, row.rowIdx, now, s.email).run(); const back = await env.DB.prepare('SELECT * FROM ledger_expense_rows WHERE reportId = ?1 AND rowIdx = ?2').bind(row.reportId, row.rowIdx).first(); await place(env, back, await loadRules(env), s.email); return json({ ok: true }); } // 되돌리면 바로 다시 판단한다(기간이 있으면 반영, 없으면 보류 사유가 붙는다)
  if (row.state === 'linked') return json({ error: '이미 장부에 반영된 항목이에요.' }, 409);
  if (b.action === 'merge') {
    const e = await env.DB.prepare('SELECT id, periodId FROM ledger_entries WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.entryId || '')).first();
    if (!e) return badRequest('연결할 장부 줄을 찾을 수 없어요.');
    await env.DB.prepare("UPDATE ledger_expense_rows SET state='linked', reason='', entryId=?3, periodId=?4, updatedAt=?5, updatedBy=?6 WHERE reportId=?1 AND rowIdx=?2").bind(row.reportId, row.rowIdx, e.id, e.periodId, now, s.email).run();
    await audit(env, s.email, 'merge', 'ledger_expense', `${row.reportId}:${row.rowIdx}`, `→ ${e.id}`); return json({ ok: true });
  }
  if (b.action === 'link') {
    const cat = b.category ? text(b.category, 60) : null;
    if (cat && !(await env.DB.prepare("SELECT 1 AS x FROM ledger_categories WHERE kind='expense' AND name=?1 AND active=1").bind(cat).first())) return badRequest('장부 지출 항목에 없는 항목이에요.');
    const rules = await loadRules(env), result = await place(env, row, rules, s.email, { force: true, category: cat });
    if (result !== 'linked') { const again = await env.DB.prepare('SELECT reason FROM ledger_expense_rows WHERE reportId = ?1 AND rowIdx = ?2').bind(row.reportId, row.rowIdx).first(); return json({ error: again.reason === 'closed' ? '그 날짜의 기간이 마감되어 있어요. 기간을 다시 열어 주세요.' : '그 날짜(' + row.entryDate + ')를 포함하는 열린 기간이 없어요. 기간을 먼저 만들어 주세요.' }, 409); }
    await audit(env, s.email, 'link', 'ledger_expense', `${row.reportId}:${row.rowIdx}`, `${row.item} ${row.amount}`); return json({ ok: true });
  }
  return badRequest('알 수 없는 작업이에요.');
}
