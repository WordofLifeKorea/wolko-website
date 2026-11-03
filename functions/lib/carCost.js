/**
 * 개인용 운행 비용 = 기름값(운행 km ÷ 연비 × 그날 전국 평균 경유 가격) + 정비비(km당 20원). 그날 원·달러 환율로 달러 금액도 함께 계산한다.
 * 경유 가격: 오피넷 무료 API 인증키(환경변수 OPINET_API_KEY)로 최근 7일 전국 평균을 받아 날짜별로 KV에 쌓아 둔다.
 *   고른 날짜 값이 있으면 그 값, 없으면 쌓인 값 중 가장 가까운 날(앞날 우선) 값, 그것도 없으면 아래 기본값을 쓴다.
 * 환율: ECB 기준 일별 환율(frankfurter.dev — 키 불필요, 경비 화면과 같은 곳). 주말 · 휴일은 직전 영업일, 미래 날짜는 최신 값.
 * 화면(public/car-log.js)도 미리 보기를 위해 같은 식으로 계산한다 — 식을 바꾸면 두 곳을 함께 고친다.
 */
export const MAINTENANCE_PER_KM = 20;
// 차량별 연비(km/L, 경유) — 실제 연비를 알면 여기만 고치면 된다
export const KM_PER_LITER = { 'silver-van': 11, 'santa-fe': 12 };
const DEFAULT_KM_PER_LITER = 11;
// 오피넷 값을 아직 한 번도 받지 못했을 때 쓰는 전국 평균 경유 가격(2026-10-26 기준)
const DIESEL_FALLBACK = { dieselKrw: 1842, dieselDate: '2026-10-26', dieselSource: 'default' };
const DIESEL_DAY = 'car:cost:diesel:';   // + YYYY-MM-DD → 그날 전국 평균 경유 가격(만료 없음)
const RATES_DAY = 'car:cost:rates:';     // + YYYY-MM-DD → 그날 계산 기준값 캐시
const MAX_SPLIT = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 한국 시간 오늘 YYYY-MM-DD */
export const todayKst = (now = Date.now()) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
/** 받을 수 있는 운행 날짜: 2020년 이후 ~ 내일까지. 아니면 오늘 */
export const cleanTripDate = v => {
  const d = String(v || '');
  const tomorrow = todayKst(Date.now() + 86400_000);
  return DATE_RE.test(d) && d >= '2020-01-01' && d <= tomorrow && Number.isFinite(Date.parse(d)) ? d : todayKst();
};

// 오피넷 최근 7일 전국 평균(전날 판매가 기준) → 날짜별로 쌓는다
async function refreshDiesel(env) {
  if (!env.OPINET_API_KEY) return;
  const res = await fetch(`https://www.opinet.co.kr/api/avgRecentPrice.do?out=json&prodcd=D047&code=${encodeURIComponent(env.OPINET_API_KEY)}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return;
  const body = await res.json().catch(() => null);
  const rows = (body?.RESULT?.OIL || []).filter(o => !o.PRODCD || o.PRODCD === 'D047');   // D047 = 자동차용경유
  await Promise.all(rows.map(o => {
    const d = String(o.DATE || o.TRADE_DT || ''), price = Number(o.PRICE);
    if (!/^\d{8}$/.test(d) || !(price > 500 && price < 5000)) return null;
    return env.CAMP_KV.put(`${DIESEL_DAY}${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`, String(Math.round(price * 100) / 100));
  }));
}

async function dieselFor(env, date) {
  const exact = Number(await env.CAMP_KV.get(DIESEL_DAY + date));
  if (exact > 0) return { dieselKrw: exact, dieselDate: date, dieselSource: 'opinet' };
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: DIESEL_DAY, limit: 1000, ...(cursor ? { cursor } : {}) });
    keys.push(...page.keys.map(k => k.name.slice(DIESEL_DAY.length)).filter(d => DATE_RE.test(d)));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  keys.sort();
  const near = keys.filter(d => d <= date).pop() || keys.find(d => d > date);
  const price = near ? Number(await env.CAMP_KV.get(DIESEL_DAY + near)) : 0;
  return price > 0 ? { dieselKrw: price, dieselDate: near, dieselSource: 'nearest' } : { ...DIESEL_FALLBACK };
}

async function usdFor(date) {
  const path = date >= todayKst() ? 'latest' : date;
  const res = await fetch(`https://api.frankfurter.dev/v1/${path}?base=USD&symbols=KRW`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const rate = Number(body?.rates?.KRW);
  return rate > 0 ? { usdKrw: Math.round(rate * 100) / 100, fxDate: body.date || '' } : null;
}

/** 그날(YYYY-MM-DD, 없으면 오늘) 쓸 경유 가격 · 환율 (+ 연비 · 정비비) */
export async function costRates(env, date) {
  const day = cleanTripDate(date);
  const cacheKey = RATES_DAY + day;
  const cached = await env.CAMP_KV.get(cacheKey, 'json');
  if (cached) return cached;
  // 최근 7일 안의 날짜는 오피넷에 그날 값이 있다 — 아직 쌓이지 않았으면 먼저 받아 둔다
  const recent = day >= todayKst(Date.now() - 8 * 86400_000);
  if (recent && !(Number(await env.CAMP_KV.get(DIESEL_DAY + day)) > 0)) await refreshDiesel(env).catch(() => {});
  const [diesel, fx] = await Promise.all([dieselFor(env, day), usdFor(day).catch(() => null)]);
  const rates = {
    date: day, ...diesel,
    usdKrw: fx?.usdKrw ?? null, fxDate: fx?.fxDate ?? '',
    maintenancePerKm: MAINTENANCE_PER_KM, kmPerLiter: KM_PER_LITER, defaultKmPerLiter: DEFAULT_KM_PER_LITER,
  };
  // 지난 날짜의 정확한 값은 오래 두고, 오늘 · 근사값 · 조회 실패는 1시간 뒤 다시 확인한다
  const settled = day < todayKst() && diesel.dieselSource === 'opinet' && fx;
  await env.CAMP_KV.put(cacheKey, JSON.stringify(rates), { expirationTtl: settled ? 90 * 86400 : 3600 });
  return rates;
}

export const round100 = krw => Math.round(krw / 100) * 100;

/** 운행 한 건의 개인 사용 비용. rates 는 costRates() 결과 또는 저장된 기록의 cost(같은 이름의 값을 담고 있다). */
export function personalCost(rates, vehicleId, tripKm, splitCount = 1) {
  const km = Math.max(0, Number(tripKm) || 0);
  const kmPerLiter = rates.kmPerLiter?.[vehicleId] ?? (KM_PER_LITER[vehicleId] || DEFAULT_KM_PER_LITER);
  const maintenancePerKm = rates.maintenancePerKm ?? MAINTENANCE_PER_KM;
  const fuelKrw = Math.round(km / kmPerLiter * rates.dieselKrw);
  const maintKrw = Math.round(km * maintenancePerKm);
  // 합계와 1인당 금액은 10원 자리에서 반올림해 100원 단위로 낸다(1인당은 반올림 전 합계를 나눠서)
  const exactKrw = fuelKrw + maintKrw;
  const totalKrw = round100(exactKrw);
  const people = Math.min(MAX_SPLIT, Math.max(1, Math.floor(Number(splitCount) || 1)));
  const perPersonKrw = round100(exactKrw / people);
  const usd = krw => (rates.usdKrw > 0 ? Math.round(krw / rates.usdKrw * 100) / 100 : null);
  return {
    dieselKrw: rates.dieselKrw, dieselDate: rates.dieselDate, dieselSource: rates.dieselSource,
    usdKrw: rates.usdKrw, fxDate: rates.fxDate, kmPerLiter, maintenancePerKm,
    fuelKrw, maintKrw, totalKrw, totalUsd: usd(totalKrw),
    splitCount: people, perPersonKrw, perPersonUsd: usd(perPersonKrw),
  };
}

/** 거리 · 차량을 고쳤을 때 다시 계산 — 경유 가격 · 환율은 기록 당시 값을 그대로 쓰고, 연비는 (바뀐) 차량 것을 쓴다 */
export const recalcCost = (entry) => personalCost({ ...entry.cost, kmPerLiter: undefined }, entry.vehicleId, entry.tripKm, entry.cost.splitCount);

export const cleanSplitNote = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 120);
export const cleanSplitCount = v => Math.min(MAX_SPLIT, Math.max(1, Math.floor(Number(v) || 1)));

/* ───────── 운행 거리를 비운 개인용 기록: 앞뒤 기록의 계기판 숫자로 빠진 거리를 계산해 청구 ─────────
 * 같은 차량의 기록을 운행 시각 순으로 늘어놓고, 빈 기록 앞에서 가장 가까운 '끝 계기판' 숫자(시작점)와
 * 뒤에서 가장 가까운 '시작 계기판' 숫자(끝점)를 찾는다. 빈 기록 자신의 운행 전 · 후 계기판이 있으면 그 값을 먼저 쓴다.
 * 빠진 거리 = 끝점 − 시작점 − 그 사이 다른 기록에 적힌 운행 거리. 그 사이 빈 기록이 여럿이면 똑같이 나눈다.
 * 저장하지 않고 목록을 읽을 때마다 계산하므로, 다음 기록이 올라오거나 계기판 숫자를 고치면 바로 반영된다. */
const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const hasKm = e => num(e.tripKm) !== null;
const endOf = e => num(e.odometerAfter) ?? num(e.mileageAfter) ?? (num(e.odometerBefore) !== null && hasKm(e) ? num(e.odometerBefore) + num(e.tripKm) : null);
const startOf = e => num(e.odometerBefore) ?? (hasKm(e) && (num(e.odometerAfter) ?? num(e.mileageAfter)) !== null ? (num(e.odometerAfter) ?? num(e.mileageAfter)) - num(e.tripKm) : null);
const timeOf = e => Date.parse(e.photoTakenAt || e.recordedAt) || 0;
export const tripDateOf = e => e.tripDate || todayKst(Date.parse(e.photoTakenAt || e.recordedAt) || Date.now());

/** 차량 한 대의 기록(아무 순서)에서 빈 기록마다 { km, from, to, shared } 또는 { pending: true } 를 돌려준다 (id → 결과) */
export function gapKmByEntry(entries) {
  const list = [...entries].sort((a, b) => timeOf(a) - timeOf(b) || Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const out = new Map();
  list.forEach((e, i) => {
    if (hasKm(e)) return;
    let from = num(e.odometerBefore), lo = i;
    if (from === null) for (let j = i - 1; j >= 0; j--) { const v = endOf(list[j]); if (v !== null) { from = v; lo = j + 1; break; } }
    let to = endOf(e), hi = i;
    if (to === null) for (let k = i + 1; k < list.length; k++) { const v = startOf(list[k]); if (v !== null) { to = v; hi = k - 1; break; } }
    if (from === null || to === null) { out.set(e.id, { pending: true }); return; }
    const span = list.slice(lo, hi + 1);
    const accounted = span.filter(hasKm).reduce((s, x) => s + num(x.tripKm), 0);
    const blanks = span.filter(x => !hasKm(x)).length || 1;
    const gap = to - from - accounted;
    out.set(e.id, gap >= 0 ? { km: Math.round(gap / blanks * 10) / 10, from, to, shared: blanks } : { pending: true });
  });
  return out;
}

/** 목록에 실어 보낼 기록에 빈 개인용 기록의 자동 거리(autoKm)와 그 비용(cost)을 붙인다 — 계산은 같은 차량의 전체 기록으로 */
export async function withGapCharges(env, entries, shown = entries) {
  const byVehicle = new Map();
  entries.forEach(e => { if (!byVehicle.has(e.vehicleId)) byVehicle.set(e.vehicleId, []); byVehicle.get(e.vehicleId).push(e); });
  const gaps = new Map();
  byVehicle.forEach(list => gapKmByEntry(list).forEach((v, id) => gaps.set(id, v)));
  return Promise.all(shown.map(async e => {
    if (e.useType !== 'personal' || hasKm(e) || !gaps.has(e.id)) return e;
    const autoKm = gaps.get(e.id);
    if (autoKm.pending) return { ...e, autoKm };
    const rates = await costRates(env, tripDateOf(e)).catch(() => null);
    return { ...e, autoKm, ...(rates ? { cost: personalCost(rates, e.vehicleId, autoKm.km, e.splitCount || 1) } : {}) };
  }));
}
