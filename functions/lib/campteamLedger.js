/**
 * 회계 장부 공통 도우미. 금액은 항상 "최소 단위 정수"(원)이고 거래의 금액은 양수 — 방향은 kind(income/expense)로 나타낸다.
 * 포털은 돈을 움직이거나 승인하지 않는다. 여기에는 "일어난 일의 기록과 확인"만 있다.
 */
import { campSession, json, needLogin, needPerm, badRequest, noDb } from './campteamAuth.js';
import { parseAmount } from './campteamMoney.js';
import { isDate, text, uuid, nowIso } from './campteamDb.js';

export const KINDS = ['income', 'expense'];
export const CARRY_IN = '이월금', CARRY_DEBT = '이월 적자';

/** 로그인 + 금액 권한 확인. need: 'read'(조회) | 'write'(장부 수정) | 'admin'(기간 만들기·마감) */
export async function moneyGate(env, request, need) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  const p = s.perms, ok = need === 'read' ? p.moneyRead : need === 'write' ? p.moneyWrite : p.moneyAdmin;
  if (!ok) return { res: needPerm(need === 'read' ? '금액을 볼 권한이 없습니다.' : need === 'write' ? '장부는 캠프 재정 담당과 디렉터만 고칠 수 있습니다.' : '기간 만들기·마감은 캠프 재정 담당과 디렉터만 할 수 있습니다.') };
  return { s };
}
export const getPeriod = (env, id) => env.DB.prepare('SELECT * FROM ledger_periods WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
export const closedMsg = (p) => `「${p.name}」은 마감된 기간이라 고칠 수 없어요. 고치려면 먼저 이 기간을 다시 열어 주세요.`;

/** 항목 목록에 있는(사용 중인) 이름인지 */
export async function categoryOk(env, kind, name) {
  return !!(await env.DB.prepare('SELECT 1 AS ok FROM ledger_categories WHERE kind = ?1 AND name = ?2 AND active = 1').bind(kind, name).first());
}
export async function ensureCategory(env, kind, name, actor) {
  const row = await env.DB.prepare('SELECT id FROM ledger_categories WHERE kind = ?1 AND name = ?2').bind(kind, name).first();
  if (row) { await env.DB.prepare('UPDATE ledger_categories SET active = 1 WHERE id = ?1').bind(row.id).run(); return; }
  const max = (await env.DB.prepare('SELECT COALESCE(MAX(sortOrder),0) AS m FROM ledger_categories WHERE kind = ?1').bind(kind).first()).m;
  const now = nowIso();
  await env.DB.prepare('INSERT INTO ledger_categories (id,kind,name,sortOrder,active,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,1,?5,?5,?6)').bind(uuid(), kind, name, max + 10, now, actor).run();
}

/** 거래 입력 검사. base = 고치는 중인 기존 값. 돌려주는 값: { v } 또는 { error } */
export async function entryFields(env, b, base = {}, period) {
  const has = (k) => k in b;
  const kind = has('kind') ? b.kind : base.kind, entryDate = has('entryDate') ? b.entryDate : base.entryDate;
  if (!KINDS.includes(kind)) return { error: '구분(수입/지출)을 골라 주세요.' };
  if (!isDate(entryDate)) return { error: '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.' };
  if (period && (entryDate < period.startDate || entryDate > period.endDate)) return { error: `날짜가 이 기간(${period.startDate} ~ ${period.endDate}) 밖이에요. 기간을 확인해 주세요.` };
  let amount = base.amount;
  if (has('amount')) { amount = parseAmount(b.amount, 'KRW'); if (amount === null || Number.isNaN(amount) || amount <= 0) return { error: '금액은 0보다 큰 숫자로 입력해 주세요.' }; }
  if (!Number.isInteger(amount) || amount <= 0) return { error: '금액을 입력해 주세요.' };
  const category = has('category') ? text(b.category, 60) : base.category;
  if (!category) return { error: '항목을 골라 주세요.' };
  if ((has('category') || has('kind')) && (category !== base.category || kind !== base.kind) && !(await categoryOk(env, kind, category))) return { error: `「${category}」은(는) ${kind === 'income' ? '수입' : '지출'} 항목 목록에 없어요. 먼저 항목 목록에 추가해 주세요.` };
  let campId = has('campId') ? (b.campId || null) : base.campId ?? null;
  if (campId && !(await env.DB.prepare('SELECT 1 AS ok FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first())) return { error: '캠프를 찾을 수 없어요.' };
  return { v: { kind, entryDate, amount, category, description: has('description') ? text(b.description, 200) : base.description ?? '', note: has('note') ? text(b.note, 300) : base.note ?? '', campId } };
}

/** 한 기간의 합계 */
export async function periodTotals(env, periodId) {
  const r = await env.DB.prepare(`SELECT
      COALESCE(SUM(CASE WHEN kind='income' THEN amount END),0) AS income,
      COALESCE(SUM(CASE WHEN kind='expense' THEN amount END),0) AS expense,
      COUNT(*) AS n
    FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL`).bind(periodId).first();
  return { income: r.income, expense: r.expense, balance: r.income - r.expense, entries: r.n };
}

/** 이전 기간에서 남은 금액을 다음 기간의 "이월금" 줄로 만들거나(이미 있으면 갱신) 없앤다 */
export async function applyCarry(env, from, to, balance, actor) {
  const key = 'carry:' + from.id, now = nowIso();
  const old = await env.DB.prepare('SELECT id FROM ledger_entries WHERE periodId = ?1 AND externalKey = ?2 AND deletedAt IS NULL').bind(to.id, key).first();
  if (!balance) { if (old) await env.DB.prepare('UPDATE ledger_entries SET deletedAt = ?2 WHERE id = ?1').bind(old.id, now).run(); return null; }
  const kind = balance > 0 ? 'income' : 'expense', category = balance > 0 ? CARRY_IN : CARRY_DEBT;
  await ensureCategory(env, kind, category, actor);
  const desc = `${from.name} 이월`;
  if (old) { await env.DB.prepare('UPDATE ledger_entries SET kind=?2, amount=?3, category=?4, description=?5, entryDate=?6, updatedAt=?7, updatedBy=?8 WHERE id=?1').bind(old.id, kind, Math.abs(balance), category, desc, to.startDate, now, actor).run(); return old.id; }
  const id = uuid();
  await env.DB.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,note,source,externalKey,createdAt,updatedAt,createdBy)
    VALUES (?1,?2,?3,?4,?5,?6,?7,'','carry',?8,?9,?9,?10)`).bind(id, to.id, to.startDate, kind, Math.abs(balance), category, desc, key, now, actor).run();
  return id;
}

/** 여러 문장을 묶음으로 실행한다. (Cloudflare D1 은 요청 한 번에 보낼 수 있는 질의 수가 제한돼 있어서, 50개씩 한 번에 보낸다) */
export async function batchRun(env, stmts) {
  for (let i = 0; i < stmts.length; i += 50) {
    const chunk = stmts.slice(i, i + 50);
    if (typeof env.DB.batch === 'function') await env.DB.batch(chunk); else for (const st of chunk) await st.run();
  }
}

export { json, badRequest };
