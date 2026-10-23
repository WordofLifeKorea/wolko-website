import { moneyGate, getPeriod, closedMsg, ensureCategory, batchRun, json, badRequest } from '../../lib/campteamLedger.js';
import { normalizeRows, diffRows, MAX_ROWS } from '../../lib/campteamLedgerImport.js';
import { parseAmount } from '../../lib/campteamMoney.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';

/**
 * 엑셀 가져오기. 파일은 브라우저에서 읽어서 줄 목록으로 보내므로, 서버는 줄만 받는다.
 *  POST { action:'preview', periodId, rows, categories?, plan? }   저장하지 않고 "무엇이 바뀌는지" 계산
 *  POST { action:'apply', periodId, fileName?, rows, categories?, plan?, options }   확인한 것만 반영
 *  POST { action:'markExported', periodId }   엑셀로 내려받은 시점 표시 (그 뒤 엑셀과 포털이 같은 상태)
 *  GET  ?periodId=   최근 가져오기 기록
 * 권한: 캠프 재정 담당·디렉터. 마감된 기간에는 가져올 수 없다.
 */
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const id = new URL(request.url).searchParams.get('periodId');
  const rows = (await env.DB.prepare('SELECT id, fileName, summary, createdAt, createdBy FROM ledger_imports WHERE periodId = ?1 ORDER BY createdAt DESC LIMIT 20').bind(String(id || '')).all()).results;
  return json({ items: rows.map((r) => ({ ...r, summary: safe(r.summary) })) });
}
const safe = (t) => { try { return JSON.parse(t); } catch { return {}; } };

async function existingEntries(env, periodId) {
  return (await env.DB.prepare(`SELECT id, entryDate, kind, amount, category, description, note, source, srcRow, editedLocal FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL ORDER BY entryDate, createdAt, id`).bind(periodId).all()).results;
}
async function analyze(env, period, b) {
  if (!Array.isArray(b.rows) || b.rows.length > MAX_ROWS) return { error: `한 번에 ${MAX_ROWS}줄까지 가져올 수 있어요.` };
  const { ok, skipped } = normalizeRows(b.rows, period);
  const existing = await existingEntries(env, period.id);
  const d = diffRows(ok, existing);
  const cats = (await env.DB.prepare('SELECT kind, name, active FROM ledger_categories').all()).results;
  const has = new Map(cats.map((c) => [c.kind + '|' + c.name, c]));
  const carry = await env.DB.prepare(`SELECT 1 AS x FROM ledger_entries WHERE periodId = ?1 AND source = 'carry' AND deletedAt IS NULL`).bind(period.id).first();
  const newCats = new Map(), flag = (u) => {
    const f = {};
    const c = has.get(u.kind + '|' + u.category); if (!c || !c.active) { f.newCategory = true; newCats.set(u.kind + '|' + u.category, { kind: u.kind, name: u.category, reactivate: !!c }); }
    if (carry && u.kind === 'income' && u.category === '이월금' && !u.id) f.carryDup = true;   // 이전 기간에서 자동으로 넘어온 이월금이 이미 있다
    if (u.dateGuessed) f.dateGuessed = true;
    return { ...u, flags: f };
  };
  const added = d.added.map(flag);
  const changed = d.changed.map((c) => ({ ...c, row: flag(c.row) }));
  // 목록 탭: 장부에 없는 항목 추가
  const catsAdd = []; for (const kind of ['income', 'expense']) for (const nm of Array.isArray(b.categories?.[kind]) ? b.categories[kind] : []) { const name = text(nm, 40); const c = has.get(kind + '|' + name); if (name && (!c || !c.active) && !newCats.has(kind + '|' + name) && !catsAdd.some((x) => x.kind === kind && x.name === name)) catsAdd.push({ kind, name, reactivate: !!c }); }
  // 예산 탭
  const plan = { changes: [], invalid: [] };
  if (Array.isArray(b.plan)) {
    const cur = new Map((await env.DB.prepare('SELECT kind, category, amount FROM ledger_plan WHERE periodId = ?1').bind(period.id).all()).results.map((r) => [r.kind + '|' + r.category, r.amount]));
    const seen = new Set();
    for (const p of b.plan.slice(0, 200)) {
      const kind = p.kind === 'income' ? 'income' : 'expense', category = text(p.category, 60), amount = parseAmount(p.amount, 'KRW');
      if (!category || amount === null || Number.isNaN(amount) || amount < 0) { plan.invalid.push({ category: category || '(빈 칸)', reason: '금액이 올바르지 않아요' }); continue; }
      if (seen.has(kind + '|' + category)) continue; seen.add(kind + '|' + category);
      const from = cur.get(kind + '|' + category) ?? null;
      if ((from ?? 0) !== amount) plan.changes.push({ kind, category, from, to: amount, newCategory: !has.get(kind + '|' + category) });
    }
  }
  const unknown = [...newCats.values()];
  return {
    ok, skipped, added, changed, missing: d.missing, idMissing: d.idMissing, unchanged: d.unchanged,
    newCategories: unknown, catsAdd, plan,
    summary: { rows: b.rows.length, unchanged: d.unchanged.length, added: added.length, changed: changed.length, conflicts: changed.filter((c) => c.conflict).length, missing: d.missing.length, skipped: skipped.length, idMissing: d.idMissing.length, newCategories: unknown.length, catsAdd: catsAdd.length, planChanges: plan.changes.length, carryDup: added.filter((a) => a.flags.carryDup).length },
  };
}

export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const period = await getPeriod(env, b.periodId); if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (b.action === 'markExported') {
    await env.DB.prepare('UPDATE ledger_entries SET editedLocal = 0 WHERE periodId = ?1').bind(period.id).run();
    await audit(env, s.email, 'export', 'ledger_period', period.id, period.name);
    return json({ ok: true });
  }
  if (period.status === 'closed') return json({ error: closedMsg(period) }, 409);
  if (b.action !== 'preview' && b.action !== 'apply') return badRequest('알 수 없는 작업이에요.');
  const a = await analyze(env, period, b); if (a.error) return badRequest(a.error);
  if (b.action === 'preview') {
    const strip = ({ ok, skipped, ...rest }) => ({ ...rest, skipped: skipped.slice(0, 200), ok: undefined });
    return json({ period: { id: period.id, name: period.name }, ...strip(a), unchanged: a.unchanged.length, idMissing: a.idMissing.slice(0, 100) });
  }

  // ── 반영 ──
  const o = b.options || {}, resolve = o.resolve || {}, removeIds = new Set(Array.isArray(o.removeIds) ? o.removeIds : []), skipRows = new Set(Array.isArray(o.skipRows) ? o.skipRows : []);
  const now = nowIso(), importId = uuid(), stmts = [], count = { added: 0, changed: 0, removed: 0, unchanged: a.unchanged.length, skipped: a.skipped.length, categories: 0, plan: 0, keptPortal: 0 };
  // 항목 목록에 새 항목 추가(허용했을 때만)
  const addCats = o.addCategories !== false;
  const usable = (u) => !u.flags.newCategory || addCats;
  if (addCats) { for (const c of [...a.newCategories, ...a.catsAdd]) { await ensureCategory(env, c.kind, c.name, s.email); count.categories++; } }
  const ins = env.DB.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,note,source,srcRow,importId,createdAt,updatedAt,createdBy,updatedBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'excel',?9,?10,?11,?11,?12,?12)`);
  if (o.add !== false) for (const u of a.added) {
    if (skipRows.has(u.row) || !usable(u) || (u.flags.carryDup && !o.allowCarryDup)) { count.skipped++; continue; }
    stmts.push(ins.bind(uuid(), period.id, u.entryDate, u.kind, u.amount, u.category, u.description, u.note, u.row, importId, now, s.email)); count.added++;
  }
  const upd = env.DB.prepare(`UPDATE ledger_entries SET entryDate=?2, kind=?3, amount=?4, category=?5, description=?6, note=?7, srcRow=CASE WHEN source='excel' THEN ?8 ELSE srcRow END, editedLocal=0, needsReview=0, importId=?9, updatedAt=?10, updatedBy=?11 WHERE id=?1`);
  const updSoft = env.DB.prepare(`UPDATE ledger_entries SET category=?2, description=?3, note=?4, editedLocal=0, needsReview=0, importId=?5, updatedAt=?6, updatedBy=?7 WHERE id=?1`);
  if (o.change !== false) for (const c of a.changed) {
    if (c.conflict && resolve[c.id] !== 'excel') { count.keptPortal++; continue; }          // 포털에서 직접 고친 줄은 기본적으로 포털 값을 지킨다
    if (skipRows.has(c.row.row) || !usable(c.row)) continue;
    const u = c.row;
    if (c.source === 'expense') stmts.push(updSoft.bind(c.id, u.category, u.description, u.note, importId, now, s.email));   // 경비 리포트 줄은 금액·날짜를 바꾸지 않는다
    else stmts.push(upd.bind(c.id, u.entryDate, u.kind, u.amount, u.category, u.description, u.note, u.row, importId, now, s.email));
    count.changed++;
  }
  // 그대로인 줄: 줄 번호만 맞춰 둔다(다음에 같은 줄을 더 잘 찾도록)
  const rowUpd = env.DB.prepare(`UPDATE ledger_entries SET srcRow = ?2 WHERE id = ?1`);
  for (const un of a.unchanged) if (un.source === 'excel' && un.srcRow !== un.row.row) stmts.push(rowUpd.bind(un.id, un.row.row));
  const del = env.DB.prepare('UPDATE ledger_entries SET deletedAt = ?2, updatedBy = ?3 WHERE id = ?1 AND source = \'excel\'');
  for (const m of a.missing) if (removeIds.has(m.id)) { stmts.push(del.bind(m.id, now, s.email)); count.removed++; }
  // 기간 예산(합치기: 파일에 있는 항목만 바꾼다)
  if (o.planMode === 'merge' && a.plan.changes.length) {
    const up = env.DB.prepare(`INSERT INTO ledger_plan (periodId,kind,category,amount,updatedAt,updatedBy) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(periodId,kind,category) DO UPDATE SET amount=?4, updatedAt=?5, updatedBy=?6`);
    for (const p of a.plan.changes) { if (p.newCategory && !addCats) continue; if (p.newCategory) await ensureCategory(env, p.kind, p.category, s.email); stmts.push(up.bind(period.id, p.kind, p.category, p.to, now, s.email)); count.plan++; }
  }
  await batchRun(env, stmts);
  await env.DB.prepare('INSERT INTO ledger_imports (id,periodId,fileName,summary,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6)').bind(importId, period.id, text(b.fileName, 120), JSON.stringify(count), now, s.email).run();
  await audit(env, s.email, 'import', 'ledger_period', period.id, `${text(b.fileName, 80)} +${count.added} ~${count.changed} -${count.removed}`);
  return json({ ok: true, importId, result: count });
}
