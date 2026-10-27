/**
 * 예산 계산기의 계산 핵심. 화면(실시간 계산)·서버(저장 검사)·테스트가 같은 코드를 쓴다.
 *
 * model = {
 *   vars:   { campers, staff, days, nights },                 // 인원·일정
 *   income: [Row...], expense: [Row...],
 *   contingencyPct: 0~50,                                       // 예비비(지출의 몇 %)
 *   includeOpening: boolean                                     // 이전 기간에서 넘어온 이월금도 더할지
 * }
 * Row = { label, category, kind, amount, unit, who, qty, per, mult }
 *   kind  'fixed'  : 고정 금액 (amount)                                   예) 강사비 400,000원
 *         'unit'   : 1인 단가(unit) × 인원 × (일수 또는 숙박수) × 하루 횟수  예) 식비 = 10,000원 × 전체 인원 × 4일 × 하루 3끼
 *   who   'direct' : 인원을 직접 입력(qty명)  | 'campers' 캠퍼 전체 | 'staff' 스태프 전체 | 'all' 전체(캠퍼+스태프)
 *   per   'none'   : 한 번만(인원 × 단가)     | 'days' 일수만큼 반복(+ mult = 하루 횟수) | 'nights' 숙박 수만큼 반복
 *         'meals'  : 끼니 수만큼 반복 — meal 로 어떤 끼니인지 고른다('main' 아침+점심+저녁 | breakfast | lunch | dinner | snack)
 *
 * 끼니(일정): vars.startMeal(첫날 처음 주는 끼니)·vars.endMeal(마지막 날 마지막으로 주는 끼니)·일수로 날짜별 끼니 표(mealPlan)를 자동으로 만든다.
 *   예) 2박 3일, 첫날 점심부터 마지막 날 점심까지 → 첫날 점심·저녁 / 둘째 날 3끼 / 마지막 날 아침·점심 = 7끼.
 *   vars.edits = { "2l": 0, "3d": 1 } 처럼 (날짜+끼니글자 b·l·d·s) 칸을 사람이 따로 고친 것은 자동 계산보다 우선한다.
 * 계산식은 화면의 줄마다 그대로 보여 준다: parts(row, vars) → { unit, people, times, mult, total }
 */
export const WHO = ['direct', 'campers', 'staff', 'all'];
export const PER = ['none', 'days', 'nights', 'meals'];
export const MEAL_START = ['breakfast', 'lunch', 'dinner'];
export const MEAL_SET = ['main', 'breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_KEY = { breakfast: 'b', lunch: 'l', dinner: 'd', snack: 's' };
export const KINDS = ['fixed', 'unit'];
export const LIMITS = { rows: 60, label: 60, category: 60, max: 1e10 };

const num = (v, lo = -LIMITS.max, hi = LIMITS.max) => { const n = Number(String(v ?? '').replace(/[,\s₩원명]/g, '')); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
const int = (v, lo, hi) => Math.round(num(v, lo, hi));

export function emptyModel() {
  return { vars: { campers: 0, staff: 0, days: 1, nights: 0, startMeal: 'lunch', endMeal: 'lunch', edits: {} }, income: [], expense: [], contingencyPct: 0, includeOpening: false };
}
export const newRow = (kind = 'fixed') => ({ label: '', category: '', kind, amount: 0, unit: 0, who: 'direct', qty: 0, per: 'none', mult: 1, meal: 'main' });

/** 예전 저장 형식(basis 한 칸에 인원·일수 기준을 섞어 둔 것)을 새 형식으로 바꾼다 */
const LEGACY = { qty: ['direct', 'none'], campers: ['campers', 'none'], staff: ['staff', 'none'], all: ['all', 'none'], camperDays: ['campers', 'days'], staffDays: ['staff', 'days'], allDays: ['all', 'days'], camperNights: ['campers', 'nights'], staffNights: ['staff', 'nights'], allNights: ['all', 'nights'] };
function modernize(r, vars) {
  if (r.who || !r.basis) return r;
  if (r.basis === 'campersPct') return { ...r, who: 'direct', per: 'none', qty: Math.round((vars.campers || 0) * num(r.qty, 0, 100) / 100) };
  const m = LEGACY[r.basis]; return m ? { ...r, who: m[0], per: m[1] } : r;
}

/** 받은 값을 검사·정리한다. { model } 또는 { error } */
export function sanitizeModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: '계산 내용 형식이 올바르지 않아요.' };
  const v = input.vars || {};
  const edits = {};
  if (v.edits && typeof v.edits === 'object' && !Array.isArray(v.edits)) for (const [k, val] of Object.entries(v.edits).slice(0, 400)) if (/^\d{1,2}[blds]$/.test(k) && (val === 0 || val === 1 || val === '0' || val === '1' || val === true || val === false)) edits[k] = Number(val);
  const out = { vars: { campers: int(v.campers, 0, 5000), staff: int(v.staff, 0, 1000), days: int(v.days, 0, 60), nights: int(v.nights, 0, 60), startMeal: MEAL_START.includes(v.startMeal) ? v.startMeal : 'lunch', endMeal: MEAL_START.includes(v.endMeal) ? v.endMeal : 'lunch', edits }, income: [], expense: [], contingencyPct: Math.round(num(input.contingencyPct, 0, 50) * 10) / 10, includeOpening: !!input.includeOpening };
  for (const side of ['income', 'expense']) {
    const list = input[side];
    if (list != null && !Array.isArray(list)) return { error: '항목 목록 형식이 올바르지 않아요.' };
    if ((list || []).length > LIMITS.rows) return { error: `${side === 'income' ? '수입' : '지출'} 항목은 ${LIMITS.rows}개까지예요.` };
    for (const raw of list || []) {
      if (!raw || typeof raw !== 'object') return { error: '항목 형식이 올바르지 않아요.' };
      const r = modernize(raw, out.vars), mult = num(r.mult, 0, 1e3);
      out[side].push({
        label: String(r.label ?? '').trim().slice(0, LIMITS.label), category: String(r.category ?? '').trim().slice(0, LIMITS.category),
        kind: KINDS.includes(r.kind) ? r.kind : 'fixed', amount: Math.round(num(r.amount)), unit: Math.round(num(r.unit)),
        who: WHO.includes(r.who) ? r.who : 'direct', qty: Math.round(num(r.qty, 0, 1e6)), per: PER.includes(r.per) ? r.per : 'none', meal: MEAL_SET.includes(r.meal) ? r.meal : 'main', mult: r.mult == null || r.mult === '' ? 1 : mult,
      });
    }
  }
  return { model: out };
}

/** 계산에 쓰는 인원수 */
export function peopleOf(row, vars) {
  const c = vars.campers || 0, s = vars.staff || 0;
  switch (row.who) { case 'campers': return c; case 'staff': return s; case 'all': return c + s; default: return row.qty || 0; }
}
/**
 * 날짜별 끼니 표: [{ day, b, l, d, s }] (1 = 그 끼니를 준다). 자동 계산 + 사람이 고친 칸(vars.edits).
 * 첫날은 startMeal 이전 끼니를, 마지막 날은 endMeal 이후 끼니를 주지 않는다. 간식은 자동으로 매일 1번.
 */
export function mealPlan(vars) {
  const days = Math.max(0, Math.min(60, vars.days || 0)), order = { breakfast: 0, lunch: 1, dinner: 2 }, start = order[vars.startMeal] ?? 1, end = order[vars.endMeal] ?? 1, edits = vars.edits || {}, out = [];
  for (let day = 1; day <= days; day++) {
    const row = { day };
    for (const m of MEAL_START) { const k = MEAL_KEY[m], auto = (day > 1 || order[m] >= start) && (day < days || order[m] <= end) ? 1 : 0; row[k] = edits[day + k] != null ? edits[day + k] : auto; }
    row.s = edits[day + 's'] != null ? edits[day + 's'] : 1; out.push(row);
  }
  return out;
}
/** 끼니 수: { breakfast, lunch, dinner, snack, main(아침+점심+저녁) } */
export function mealCounts(vars) {
  const c = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, main: 0 };
  for (const r of mealPlan(vars)) { c.breakfast += r.b; c.lunch += r.l; c.dinner += r.d; c.snack += r.s; }
  c.main = c.breakfast + c.lunch + c.dinner; return c;
}
/** 반복 횟수: 일수·숙박 수·끼니 수 (한 번만이면 1) */
export function timesOf(row, vars) { return row.per === 'days' ? vars.days || 0 : row.per === 'nights' ? vars.nights || 0 : row.per === 'meals' ? mealCounts(vars)[MEAL_SET.includes(row.meal) ? row.meal : 'main'] : 1; }
/** 하루 횟수(끼니 등)는 "일수만큼 반복"일 때만 쓴다 */
export const multOf = (row) => (row.per === 'days' ? (row.mult == null ? 1 : row.mult) : 1);

/** 한 줄의 계산식 조각과 결과 */
export function parts(row, vars) {
  if (row.kind !== 'unit') return { fixed: true, total: Math.round(row.amount || 0) };
  const people = peopleOf(row, vars), times = timesOf(row, vars), mult = multOf(row);
  return { fixed: false, unit: row.unit || 0, people, times, mult, per: row.per, meal: row.per === 'meals' ? (MEAL_SET.includes(row.meal) ? row.meal : 'main') : null, total: Math.round((row.unit || 0) * people * times * mult) };
}
export const rowAmount = (row, vars) => parts(row, vars).total;

/** 캠프비(참가비) 줄: 1인 단가 × 인원(한 번만) 형태의 수입 중 이름이 캠프비·참가비·등록이거나 캠퍼 전체 인원에 곱하는 것 */
export const isFeeRow = (r) => r.kind === 'unit' && r.per === 'none' && (r.who === 'campers' || /캠프비|참가비|등록/.test((r.label || '') + (r.category || '')));
/** 캠프비 줄에 직접 입력한 인원의 합 (얼리버드 + 일반 등) — 캠퍼 수와 맞는지 확인하는 데 쓴다 */
export function feeHeadcount(model) { const rows = model.income.filter((r) => isFeeRow(r) && r.who === 'direct'); return { rows: rows.length, total: rows.reduce((n, r) => n + (r.qty || 0), 0) }; }

/** 계산. ctx.opening: 이전 기간에서 넘어온 이월금(원) — includeOpening 일 때만 더한다 */
export function evaluate(model, ctx = {}) {
  const vars = model.vars, rows = (list) => list.map((r) => ({ label: r.label, category: r.category, amount: rowAmount(r, vars) }));
  const inc = rows(model.income), exp = rows(model.expense), sum = (l) => l.reduce((n, r) => n + r.amount, 0);
  const income = sum(inc), expense = sum(exp), contingency = Math.round(expense * (model.contingencyPct || 0) / 100);
  const opening = model.includeOpening ? Math.round(ctx.opening || 0) : 0, net = income + opening - expense - contingency;
  const byCategory = (l) => { const m = {}; for (const r of l) { const k = r.category || r.label || '(미분류)'; m[k] = (m[k] || 0) + r.amount; } return m; };
  const campers = vars.campers || 0, feeIncome = model.income.filter(isFeeRow).reduce((n, r) => n + rowAmount(r, vars), 0);
  return { income, expense, contingency, opening, net, incomeRows: inc, expenseRows: exp, byCategory: { income: byCategory(inc), expense: byCategory(exp) },
    costPerCamper: campers ? Math.round((expense + contingency) / campers) : null, feePerCamper: campers ? Math.round(feeIncome / campers) : null, feeIncome };
}

/**
 * 손익분기:
 *  - avgNeeded : 남는 금액이 0이 되려면 캠퍼 1인당 평균 캠프비가 얼마여야 하는지 (지금 평균 avgNow 와 비교)
 *  - feeScale/fees : 캠프비 단가를 같은 비율로 올려야 0이 되는 배율과 그 단가
 *  - campers : 캠프비가 "캠퍼 전체 인원"에 곱해지는 줄이 있을 때만, 캠퍼가 몇 명 이상이어야 남는 금액이 0 이상이 되는지
 */
export function breakEven(model, ctx = {}, maxCampers = 2000) {
  const base = evaluate(model, ctx), vars = model.vars, campers = vars.campers || 0;
  const out = { net: base.net, avgNeeded: null, avgNow: null, campers: null, camperLinked: false, feeScale: null, fees: [] };
  const feeRows = model.income.filter((r) => isFeeRow(r) && r.unit > 0), B = feeRows.reduce((n, r) => n + rowAmount(r, vars), 0), others = base.income - base.feeIncome;
  if (campers > 0) { out.avgNow = Math.round(base.feeIncome / campers); out.avgNeeded = Math.max(0, Math.ceil((base.expense + base.contingency - others - base.opening) / campers)); }
  out.camperLinked = model.income.some((r) => r.kind === 'unit' && r.per === 'none' && r.who === 'campers' && r.unit > 0);
  if (out.camperLinked) for (let n = 0; n <= maxCampers; n++) { const m = { ...model, vars: { ...vars, campers: n } }; if (evaluate(m, ctx).net >= 0) { out.campers = n; break; } }
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
  m.income = [R({ label: '캠프비 (얼리버드)', category: '캠프비' }), R({ label: '캠프비 (일반)', category: '캠프비' }), R({ label: '후원금', category: '후원금', kind: 'fixed' })];
  m.expense = [R({ label: '식비 (1끼 단가)', category: '식비', who: 'all', per: 'meals', meal: 'main' }), R({ label: '간식비 (1회 단가)', category: '간식비', who: 'all', per: 'meals', meal: 'snack' }), R({ label: '숙박시설비', category: '숙박시설비', who: 'all', per: 'nights' }),
    R({ label: '프로그램활동비', category: '프로그램활동비', kind: 'fixed' }), R({ label: '영어활동비', category: '영어활동비', kind: 'fixed' }), R({ label: '물품구입비', category: '물품구입비', kind: 'fixed' }), R({ label: '스텝관리비', category: '스텝관리비', kind: 'fixed' }), R({ label: '강사비', category: '강사비', kind: 'fixed' })];
  m.contingencyPct = 5;
  return m;
}

if (typeof globalThis !== 'undefined') globalThis.CampCalc = { WHO, PER, MEAL_START, MEAL_SET, mealPlan, mealCounts, KINDS, LIMITS, emptyModel, newRow, sanitizeModel, peopleOf, timesOf, multOf, parts, rowAmount, evaluate, breakEven, feeHeadcount, toPlan, isFeeRow, template };
