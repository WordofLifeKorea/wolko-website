/** 금액 도우미: 통화별 소수 자리, 입력 해석, 표시. 저장은 항상 "최소 단위 정수". */
export const CURRENCIES = ['KRW', 'USD'];                       // 나중에 통화를 늘리려면 여기에 추가
export const DECIMALS = { KRW: 0, USD: 2 };
export const BUDGET_CATEGORIES = ['venue', 'food', 'transport', 'print', 'speaker', 'snacks', 'insurance', 'promo', 'supplies', 'scholarship', 'misc'];
export const MAX_MINOR = 9_000_000_000_000; // 안전한 정수 범위 안

/** "1,234,567" · "1234.5" · 1234 → 최소 단위 정수. 형식이 틀리면 NaN. 빈 값이면 null. */
export function parseAmount(input, currency) {
  if (input === null || input === undefined || String(input).trim() === '') return null;
  const dec = DECIMALS[currency]; if (dec === undefined) return NaN;
  const t = String(input).trim().replace(/[,\s₩$]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  const [whole, frac = ''] = t.split('.');
  if (frac.length > dec) { if (/[1-9]/.test(frac.slice(dec))) return NaN; }
  const minor = Number(whole + frac.slice(0, dec).padEnd(dec, '0'));
  return Number.isSafeInteger(minor) && Math.abs(minor) <= MAX_MINOR ? minor : NaN;
}
export function formatMinor(minor, currency) {
  const dec = DECIMALS[currency] ?? 0, n = Number(minor || 0), sign = n < 0 ? '-' : '', abs = Math.abs(n);
  const whole = Math.floor(abs / 10 ** dec), frac = dec ? String(abs % 10 ** dec).padStart(dec, '0') : '';
  const sym = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency + ' ';
  return `${sign}${sym}${whole.toLocaleString('en-US')}${dec ? '.' + frac : ''}`;
}

/**
 * 한 줄의 "예상 최종 금액":
 *  - 지급 완료(status=paid)이고 실제 금액이 있으면 → 실제 금액 (끝난 항목은 실제가 곧 최종)
 *  - 그 밖에는 → 예상 지출(없으면 예산 계획)과 지금까지의 실제 지출 중 큰 값 (계약금만 낸 경우 등 아직 더 나갈 수 있다)
 */
export function forecastOf(l) {
  const base = l.expectedAmount ?? l.plannedAmount ?? 0;
  if (l.status === 'paid' && l.actualAmount != null) return l.actualAmount;
  return Math.max(l.actualAmount ?? 0, base);
}

/** 줄 목록 → 통화별 합계 (예상 최종은 forecastOf 규칙) */
export function summarize(lines, targets = []) {
  const by = {};
  const slot = (c) => (by[c] ||= { currency: c, planned: 0, expected: 0, actual: 0, forecast: 0, lines: 0, target: null, byCategory: {} });
  for (const l of lines) {
    const s = slot(l.currency), exp = l.expectedAmount ?? l.plannedAmount, fin = forecastOf(l);
    s.planned += l.plannedAmount || 0; s.expected += exp || 0; s.actual += l.actualAmount || 0; s.forecast += fin || 0; s.lines++;
    const c = (s.byCategory[l.category || 'misc'] ||= { category: l.category || 'misc', planned: 0, forecast: 0, actual: 0 });
    c.planned += l.plannedAmount || 0; c.forecast += fin || 0; c.actual += l.actualAmount || 0;
  }
  for (const t of targets) { const s = slot(t.currency); s.target = t.amountMinor; }
  return Object.values(by).map(s => ({ ...s, byCategory: Object.values(s.byCategory).sort((a, b) => b.forecast - a.forecast),
    remaining: s.target == null ? null : s.target - s.forecast, overTarget: s.target != null && s.forecast > s.target, overPlan: s.forecast > s.planned }));
}
