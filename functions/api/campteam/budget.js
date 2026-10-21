import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, audit, likeOf } from '../../lib/campteamDb.js';
import { CURRENCIES, DECIMALS, BUDGET_CATEGORIES, parseAmount, summarize } from '../../lib/campteamMoney.js';

const STATUSES = ['planned', 'ordered', 'paid'];
const LINE = `SELECT b.id, b.campId, b.category, b.label, b.plannedAmount, b.expectedAmount, b.actualAmount, b.currency, b.vendor, b.paidAt, b.status, b.notes, b.isTest, c.nameKo AS campKo, c.nameEn AS campEn
  FROM budget_lines b LEFT JOIN camps c ON c.id = b.campId`;

/** 금액 권한이 없으면 예산 표는 읽지도 않는다 */
async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (write ? !s.perms.moneyWrite : !s.perms.moneyRead) return { res: needPerm('금액(예산) 권한이 필요합니다.') };
  return { s };
}

/** 목록·합계: ?campId= &category= &currency= &q= — 금액은 최소 단위 정수(KRW=원, USD=센트) */
export async function onRequestGet({ env, request }) {
  const { s, res } = await gate(env, request, false); if (res) return res;
  const p = new URL(request.url).searchParams, where = ['b.deletedAt IS NULL'], args = [];
  if (p.get('campId')) { where.push('b.campId = ?'); args.push(p.get('campId')); }
  if (BUDGET_CATEGORIES.includes(p.get('category'))) { where.push('b.category = ?'); args.push(p.get('category')); }
  if (CURRENCIES.includes(p.get('currency'))) { where.push('b.currency = ?'); args.push(p.get('currency')); }
  const q = text(p.get('q'), 60); if (q) { where.push(`(b.label LIKE ? ESCAPE '\\' OR b.vendor LIKE ? ESCAPE '\\' OR b.notes LIKE ? ESCAPE '\\')`); args.push(likeOf(q), likeOf(q), likeOf(q)); }
  const lines = (await env.DB.prepare(`${LINE} WHERE ${where.join(' AND ')} ORDER BY c.nameKo, b.category, b.createdAt LIMIT 1000`).bind(...args).all()).results;
  const targets = (await env.DB.prepare(`SELECT t.id, t.campId, t.currency, t.amountMinor, t.notes, t.isTest FROM budget_targets t WHERE t.deletedAt IS NULL ${p.get('campId') ? 'AND t.campId = ?' : ''}`).bind(...(p.get('campId') ? [p.get('campId')] : [])).all()).results;
  const out = { lines, targets, summary: summarize(lines, targets), currencies: CURRENCIES, decimals: DECIMALS, categories: BUDGET_CATEGORIES, perms: s.perms };
  if (!p.get('campId')) { // 캠프별 합계
    const ids = [...new Set(lines.map(l => l.campId))];
    out.perCamp = ids.map(id => { const ls = lines.filter(l => l.campId === id); return { campId: id, campKo: ls[0].campKo, campEn: ls[0].campEn, summary: summarize(ls, targets.filter(t => t.campId === id)) }; });
  }
  return json(out);
}

async function cleanLine(env, b, base = {}) {
  const has = k => k in b;
  const label = has('label') ? text(b.label, 120) : base.label; if (!label) return { error: '항목 이름을 입력해주세요.' };
  const currency = has('currency') ? b.currency : base.currency || 'KRW'; if (!CURRENCIES.includes(currency)) return { error: '통화가 올바르지 않습니다.' };
  const category = has('category') ? b.category : base.category || 'misc'; if (!BUDGET_CATEGORIES.includes(category)) return { error: '분류가 올바르지 않습니다.' };
  const camp = has('campId') ? b.campId : base.campId; if (!camp) return { error: '캠프를 선택해주세요.' };
  if (!(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(camp)).first())) return { error: '캠프를 찾을 수 없습니다.' };
  // 통화가 바뀌면 기존 금액을 새 통화 기준 최소 단위로 다시 해석할 수 없으므로 금액도 함께 보내야 한다
  const amt = (key, req) => { if (has(key)) { const v = parseAmount(b[key], currency); return v; } if (has('currency') && currency !== base.currency && base[key] != null) return NaN; return base[key] ?? (req ? 0 : null); };
  const planned = amt('plannedAmount', true), expected = amt('expectedAmount'), actual = amt('actualAmount');
  if ([planned, expected, actual].some(v => Number.isNaN(v))) return { error: `금액 형식이 올바르지 않습니다. (${currency}${DECIMALS[currency] ? ', 소수 ' + DECIMALS[currency] + '자리까지' : ', 소수점 없이'}) 통화를 바꿀 때는 금액도 다시 입력해주세요.` };
  if (planned == null || planned < 0 || (expected != null && expected < 0) || (actual != null && actual < 0)) return { error: '금액은 0 이상이어야 합니다.' };
  const paidAt = has('paidAt') ? (b.paidAt ? String(b.paidAt) : null) : base.paidAt ?? null; if (paidAt && !isDate(paidAt)) return { error: '지급일 형식이 올바르지 않습니다.' };
  const status = has('status') ? b.status : base.status || 'planned'; if (!STATUSES.includes(status)) return { error: '상태가 올바르지 않습니다.' };
  return { v: { campId: String(camp), category, label, currency, plannedAmount: planned, expectedAmount: expected ?? null, actualAmount: actual ?? null, paidAt, status,
    vendor: has('vendor') ? text(b.vendor, 80) : base.vendor ?? '', notes: has('notes') ? text(b.notes, 400) : base.notes ?? '' } };
}

/** 만들기: {kind:'line', ...} | {kind:'target', campId, currency, amount, notes} | {kind:'copy', fromCampId, toCampId, append?} */
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso();
  if (b.kind === 'line') {
    const { v, error } = await cleanLine(env, b); if (error) return badRequest(error);
    const id = uuid();
    await env.DB.prepare(`INSERT INTO budget_lines (id,campId,category,label,plannedAmount,expectedAmount,actualAmount,currency,vendor,paidAt,status,notes,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13,?14)`)
      .bind(id, v.campId, v.category, v.label, v.plannedAmount, v.expectedAmount, v.actualAmount, v.currency, v.vendor, v.paidAt, v.status, v.notes, now, s.email).run();
    await audit(env, s.email, 'create', 'budget_line', id, v.label); return json({ id }, 201);
  }
  if (b.kind === 'target') {
    if (!CURRENCIES.includes(b.currency)) return badRequest('통화가 올바르지 않습니다.');
    const amount = parseAmount(b.amount, b.currency); if (amount == null || Number.isNaN(amount) || amount < 0) return badRequest('총 예산 금액 형식이 올바르지 않습니다.');
    if (!(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first())) return badRequest('캠프를 찾을 수 없습니다.');
    const old = await env.DB.prepare('SELECT id FROM budget_targets WHERE campId = ?1 AND currency = ?2 AND deletedAt IS NULL').bind(b.campId, b.currency).first();
    if (old) { await env.DB.prepare('UPDATE budget_targets SET amountMinor=?2, notes=?3, updatedAt=?4 WHERE id=?1').bind(old.id, amount, text(b.notes, 200), now).run(); await audit(env, s.email, 'update', 'budget_target', old.id, b.currency); return json({ id: old.id }); }
    const id = uuid(); await env.DB.prepare('INSERT INTO budget_targets (id,campId,currency,amountMinor,notes,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)').bind(id, b.campId, b.currency, amount, text(b.notes, 200), now, s.email).run();
    await audit(env, s.email, 'create', 'budget_target', id, b.currency); return json({ id }, 201);
  }
  if (b.kind === 'copy') { // 지난 캠프의 항목과 예산 계획을 새 캠프로 복사 (실제 지출·지급 상태는 비움)
    const [from, to] = await Promise.all([b.fromCampId, b.toCampId].map(id => env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first()));
    if (!from || !to || from.id === to.id) return badRequest('복사할 캠프와 받을 캠프를 다르게 선택해주세요.');
    const has = await env.DB.prepare('SELECT 1 AS x FROM budget_lines WHERE campId = ?1 AND deletedAt IS NULL LIMIT 1').bind(to.id).first();
    if (has && !b.append) return json({ error: '받을 캠프에 이미 예산 항목이 있어요. 덧붙이려면 확인해주세요.', code: 'not_empty' }, 409);
    const src = (await env.DB.prepare('SELECT category,label,plannedAmount,currency,vendor,notes FROM budget_lines WHERE campId = ?1 AND deletedAt IS NULL').bind(from.id).all()).results;
    for (const l of src) await env.DB.prepare(`INSERT INTO budget_lines (id,campId,category,label,plannedAmount,currency,vendor,notes,status,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'planned',?9,?9,?10)`)
      .bind(uuid(), to.id, l.category, l.label, l.plannedAmount, l.currency, l.vendor, l.notes, now, s.email).run();
    await audit(env, s.email, 'copy_budget', 'camp', to.id, `from ${from.id}: ${src.length}`); return json({ copied: src.length }, 201);
  }
  return badRequest('kind 가 올바르지 않습니다.');
}

export async function onRequestPatch({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  const p = new URL(request.url).searchParams, id = p.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare('SELECT * FROM budget_lines WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const { v, error } = await cleanLine(env, b, row); if (error) return badRequest(error);
  await env.DB.prepare(`UPDATE budget_lines SET campId=?2,category=?3,label=?4,plannedAmount=?5,expectedAmount=?6,actualAmount=?7,currency=?8,vendor=?9,paidAt=?10,status=?11,notes=?12,updatedAt=?13 WHERE id=?1`)
    .bind(id, v.campId, v.category, v.label, v.plannedAmount, v.expectedAmount, v.actualAmount, v.currency, v.vendor, v.paidAt, v.status, v.notes, nowIso()).run();
  await audit(env, s.email, 'update', 'budget_line', id, v.label); return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  const p = new URL(request.url).searchParams, table = p.get('kind') === 'target' ? 'budget_targets' : 'budget_lines';
  const r = await env.DB.prepare(`UPDATE ${table} SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL`).bind(p.get('id'), nowIso()).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', table, p.get('id')); return json({ ok: true });
}
