/**
 * GET /api/expense/car-costs?month=YYYY-MM → 그 달 차량 운행비 모아보기 (경비 리포트 '전체 리포트' 맨 위 고정 카드)
 *   { month, months, today, closeDate, closed, personal, ministry, pending }
 *
 * 차량 사용 일지의 운행 비용(기름값 + 정비비)을 운행 날짜의 달로 모은다. 달은 마지막 날에 마감된다.
 *  - 청구된 금액(개인용): 기록한 사람이 내야 할 금액 — 사람별
 *  - 처리해야 할 금액(사역용): 비용 처리 계좌로 정산할 금액 — 계좌별('본인 개인 계좌'는 사람마다 따로)
 * 거리 없이 남은 예전 기록은 차량 사용 일지 목록과 같은 방법(앞뒤 계기판 숫자)으로 계산한 금액을 쓴다.
 * 관리자(승인 권한)와 회계 담당자만 볼 수 있다.
 */
import { CORS, err, expenseSession } from '../../lib/expenses.js';
import { CHARGE_ACCOUNTS, listEntries } from '../../lib/carUsage.js';
import { todayKst, tripDateOf, withGapCharges } from '../../lib/carCost.js';

const MONTH_RE = /^\d{4}-\d{2}$/;
const lastDay = month => { const [y, m] = month.split('-').map(Number); return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; };

export function summarizeCarCosts(entries, month) {
  const inMonth = entries.filter(e => tripDateOf(e).slice(0, 7) === month);
  const personal = new Map(), ministry = new Map();
  let pending = 0;
  const add = (map, key, base, e) => {
    if (!map.has(key)) map.set(key, { ...base, amount: 0, count: 0, km: 0 });
    const row = map.get(key);
    row.amount += e.cost.totalKrw; row.count += 1; row.km += Number(e.tripKm ?? e.autoKm?.km) || 0;
  };
  inMonth.forEach(e => {
    if (!e.cost) { pending += 1; return; }
    if (e.useType === 'personal') return add(personal, e.userEmail, { email: e.userEmail, name: e.userName }, e);
    const acct = CHARGE_ACCOUNTS.find(a => a.id === e.chargeAccount);
    // 본인 개인 계좌는 사람마다 다른 계좌라 따로 모은다 · 계좌를 고르지 않은 예전 기록은 '계좌 미지정'
    const key = !acct ? 'none' : acct.id === 'personal' ? `personal:${e.userEmail}` : acct.id;
    add(ministry, key, { id: acct?.id || 'none', ko: acct?.ko || '계좌 미지정', en: acct?.en || 'No account chosen', ...(acct?.id === 'personal' ? { holder: e.userName } : {}) }, e);
  });
  const pack = map => {
    const rows = [...map.values()].map(r => ({ ...r, km: Math.round(r.km * 10) / 10 })).sort((a, b) => b.amount - a.amount);
    return { total: rows.reduce((s, r) => s + r.amount, 0), count: rows.reduce((s, r) => s + r.count, 0), rows };
  };
  return { personal: pack(personal), ministry: pack(ministry), pending };
}

export async function onRequestGet({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  if (!session.isApprover && !session.isAccountant) return err('관리자와 회계 담당자만 볼 수 있습니다.', 403);
  const today = todayKst();
  const asked = new URL(request.url).searchParams.get('month') || '';
  const month = MONTH_RE.test(asked) ? asked : today.slice(0, 7);
  const all = await listEntries(env);
  const entries = await withGapCharges(env, all, all.filter(e => tripDateOf(e).slice(0, 7) === month));
  const months = [...new Set([today.slice(0, 7), ...all.map(e => tripDateOf(e).slice(0, 7))])].sort().reverse();
  const closeDate = lastDay(month);
  return Response.json({ month, months, today, closeDate, closed: today > closeDate, ...summarizeCarCosts(entries, month) }, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
