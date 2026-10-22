/**
 * 예산 계산기의 계산 핵심. 화면(실시간 계산)·서버(저장 검사)·테스트가 같은 코드를 쓴다.
 *
 * model = {
 *   vars:   { campers, staff, days, nights },                 // 인원·일정
 *   income: [Row...], expense: [Row...],
 *   contingencyPct: 0~50,                                       // 예비비(지출의 몇 %)
 *   includeOpening: boolean                                     // 이전 기간에서 넘어온 이월금도 더할지
 * }
 * Row = { label, category, kind: 'fixed' | 'unit', amount, unit, basis, qty, mult }
 *   fixed: amount                         (예: 강사비 400,000)
 *   unit : unit × 수량(basis) × mult      (예: 식비 = 1끼 10,000원 × 전체 인원×일수 × 하루 3끼)
 */
export const BASES = ['qty', 'campers', 'campersPct', 'staff', 'all', 'camperDays', 'staffDays', 'allDays', 'camperNights', 'staffNights', 'allNights'];
export const KINDS = ['fixed', 'unit'];
export const LIMITS = { rows: 60, label: 60, category: 60, max: 1e10 };

const num = (v, lo = -LIMITS.max, hi = LIMITS.max) => { const n = Number(String(v ?? '').replace(/[,\s₩원]/g, '')); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
const int = (v, lo, hi) => Math.round(num(v, lo, hi));

export function emptyModel() {
  return { vars: { campers: 0, staff: 0, days: 1, nights: 0 }, income: [], expense: [], contingencyPct: 0, includeOpening: false };
}
export const newRow = (kind = 'fixed') => ({ label: '', category: '', kind, amount: 0, unit: 0, basis: 'qty', qty: 0, mult: 1 });

/** 받은 값을 검사·정리한다. { model } 또는 { error } */
export function sanitizeModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: '계산 내용 형식이 올바르지 않아요.' };
  const v = input.vars || {};
  const out = { vars: { campers: int(v.campers, 0, 5000), staff: int(v.staff, 0, 1000), days: int(v.days, 0, 60), nights: int(v.nights, 0, 60) }, income: [], expense: [], contingencyPct: Math.round(num(input.contingencyPct, 0, 50) * 10) / 10, includeOpening: !!input.includeOpening };
  for (const side of ['income', 'expense']) {
    const list = input[side];
    if (list != null && !Array.isArray(list)) return { error: '항목 목록 형식이 올바르지 않아요.' };
    if ((list || []).length > LIMITS.rows) return { error: `${side === 'income' ? '수입' : '지출'} 항목은 ${LIMITS.rows}개까지예요.` };
    for (const r of list || []) {
      if (!r || typeof r !== 'object') return { error: '항목 형식이 올바르지 않아요.' };
      out[side].push({
        label: String(r.label ?? '').trim().slice(0, LIMITS.label), category: String(r.category ?? '').trim().slice(0, LIMITS.category),
        kind: KINDS.includes(r.kind) ? r.kind : 'fixed', amount: Math.round(num(r.amount)), unit: Math.round(num(r.unit)),
        basis: BASES.includes(r.basis) ? r.basis : 'qty', qty: num(r.qty, 0, 1e7), mult: num(r.mult, 0, 1e4),
      });
    }
  }
  return { model: out };
}

/** 수량 기준 → 숫자 */
export function qtyOf(row, vars) {
  const c = vars.campers || 0, s = vars.staff || 0, d = vars.days || 0, n = vars.nights || 0, all = c + s;
  switch (row.basis) {
    case 'campers': return c; case 'campersPct': return c * (row.qty || 0) / 100; case 'staff': return s; case 'all': return all;
    case 'camperDays': return c * d; case 'staffDays': return s * d; case 'allDays': return all * d;
    case 'camperNights': return c * n; case 'staffNights': return s * n; case 'allNights': return all * n;
    default: return row.qty || 0;
  }
}
export function rowAmount(row, vars) {
  if (row.kind === 'unit') return Math.round((row.unit || 0) * qtyOf(row, vars) * (row.mult == null ? 1 : row.mult));
  return Math.round(row.amount || 0);
}

/** 계산. ctx.opening: 이전 기간에서 넘어온 이월금(원) — includeOpening 일 때만 더한다 */
export function evaluate(model, ctx = {}) {
  const vars = model.vars, rows = (list) => list.map((r) => ({ label: r.label, category: r.category, amount: rowAmount(r, vars) }));
  const inc = rows(model.income), exp = rows(model.expense), sum = (l) => l.reduce((n, r) => n + r.amount, 0);
  const income = sum(inc), expense = sum(exp), contingency = Math.round(expense * (model.contingencyPct || 0) / 100);
  const opening = model.includeOpening ? Math.round(ctx.opening || 0) : 0, net = income + opening - expense - contingency;
  const byCategory = (l) => { const m = {}; for (const r of l) { const k = r.category || r.label || '(미분류)'; m[k] = (m[k] || 0) + r.amount; } return m; };
  const campers = vars.campers || 0, feeIncome = model.income.filter(isFeeRow).reduce((n, r) => n + rowAmount(r, vars), 0);
  return { income, expense, contingency, opening, net, incomeRows: inc, expenseRows: exp, byCategory: { income: byCategory(inc), expense: byCategory(exp) },
    costPerCamper: campers ? Math.round((expense + contingency) / campers) : null, feePerCamper: campers ? Math.round(feeIncome / campers) : null };
}
/** 캠프비(참가비) 줄: 단가 × 캠퍼 수 기준(또는 캠퍼×일수 등)인 수입 */
const CAMPER_LINKED = /^(campers|campersPct|camperDays|camperNights)$/;
export const isFeeRow = (r) => r.kind === 'unit' && (CAMPER_LINKED.test(r.basis) || (r.basis === 'qty' && /캠프비|참가비|등록/.test(r.label + r.category)));

/**
 * 손익분기: 
 *  - campers: 캠프비 등 나머지는 그대로 두고 캠퍼 수가 몇 명이어야 남는 금액이 0 이상이 되는지(0~maxCampers 중 처음으로)
 *  - feeScale: 캠프비 줄의 단가를 같은 비율로 올려야 0 이 되는 배율과, 그 단가
 */
export function breakEven(model, ctx = {}, maxCampers = 2000) {
  const base = evaluate(model, ctx), out = { net: base.net, campers: null, camperLinked: false, feeScale: null, fees: [] };
  // 캠프비 수입이 캠퍼 수에 따라 늘어나는 줄이 있을 때만 "몇 명이어야 하는지"를 계산한다
  out.camperLinked = model.income.some((r) => r.kind === 'unit' && CAMPER_LINKED.test(r.basis) && r.unit > 0);
  if (out.camperLinked) for (let n = 0; n <= maxCampers; n++) { const m = { ...model, vars: { ...model.vars, campers: n } }; if (evaluate(m, ctx).net >= 0) { out.campers = n; break; } }
  const feeRows = model.income.filter((r) => isFeeRow(r) && r.unit > 0), B = feeRows.reduce((n, r) => n + rowAmount(r, model.vars), 0);
  if (B > 0) { const A = base.net - B, t = -A / B; out.feeScale = t; out.fees = feeRows.map((r) => ({ label: r.label, unit: r.unit, needed: Math.max(0, Math.ceil(r.unit * t)), neededRounded: Math.max(0, Math.ceil(r.unit * t / 1000) * 1000) })); }
  return out;
}

/** 계산 결과를 기간 예산 형식으로: [{ kind, category, amount }] (분류가 비어 있는 줄은 제외) */
export function toPlan(model, ctx = {}) {
  const e = evaluate(model, ctx), out = [];
  for (const kind of ['expense', 'income']) for (const [category, amount] of Object.entries(e.byCategory[kind])) if (category && category !== '(미분류)' && amount > 0) out.push({ kind, category, amount });
  return out;
}

/** 새 계산을 시작할 때 쓰는 뼈대(금액은 모두 0 — 빈칸을 채워 가면 된다). 항목 이름은 엑셀의 「목록」 탭과 같다 */
export function template() {
  const m = emptyModel(); m.vars = { campers: 0, staff: 0, days: 3, nights: 2 };
  const R = (o) => ({ ...newRow(o.kind || 'unit'), ...o });
  m.income = [R({ label: '캠프비 (얼리버드, 캠퍼 중 비율 %)', category: '캠프비', basis: 'campersPct' }), R({ label: '캠프비 (일반, 캠퍼 중 비율 %)', category: '캠프비', basis: 'campersPct' }), R({ label: '후원금', category: '후원금', kind: 'fixed' })];
  m.expense = [R({ label: '식비 (1끼 단가 × 인원 × 일수 × 끼니)', category: '식비', basis: 'allDays', mult: 3 }), R({ label: '간식비', category: '간식비', basis: 'allDays' }), R({ label: '숙박시설비 (1박 단가)', category: '숙박시설비', basis: 'allNights' }),
    R({ label: '프로그램활동비', category: '프로그램활동비', kind: 'fixed' }), R({ label: '영어활동비', category: '영어활동비', kind: 'fixed' }), R({ label: '물품구입비', category: '물품구입비', kind: 'fixed' }), R({ label: '스텝관리비', category: '스텝관리비', kind: 'fixed' }), R({ label: '강사비', category: '강사비', kind: 'fixed' })];
  m.contingencyPct = 5;
  return m;
}

if (typeof globalThis !== 'undefined') globalThis.CampCalc = { BASES, KINDS, LIMITS, emptyModel, newRow, sanitizeModel, qtyOf, rowAmount, evaluate, breakEven, toPlan, isFeeRow, template };
