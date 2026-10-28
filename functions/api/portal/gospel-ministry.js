/**
 * GET /api/portal/gospel-ministry?month=YYYY-MM[&fresh=1]
 *   "지역교회 사역" 보고용 CRS 연동 숫자 — 위치별 연결 교회 A/B/C 수 + 그 달 리더십 훈련 인원.
 *   보고 담당자(마스터 포함)만. CRS 읽기 설정이 없으면 configured:false 와 0.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { firebaseDatabaseToken } from '../../lib/firebaseCrsDatabase.js';
import { isDesignated } from '../../lib/gospelReporters.js';
import { slimCrsChurches, ministryFromCrs } from '../../lib/crsMinistry.js';
import { MONTH_RE, currentMonthKst } from '../../lib/gospelStats.js';

const DATABASE = 'https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app';
const H = { 'Cache-Control': 'no-store' };
export const CRS_SLIM_KEY = 'gospel:crs-slim';
const CACHE_SECONDS = 120;

export async function loadSlimChurches(env, { fresh = false } = {}) {
  if (!fresh) { const cached = await env.CAMP_KV.get(CRS_SLIM_KEY, 'json'); if (cached?.list) return cached.list; }
  if (!env.FIREBASE_CRS_SERVICE_ACCOUNT) return null;
  const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
  const res = await fetch(`${DATABASE}/churches.json`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`CRS ${res.status}`);
  const list = slimCrsChurches(await res.json());
  await env.CAMP_KV.put(CRS_SLIM_KEY, JSON.stringify({ list }), { expirationTtl: CACHE_SECONDS });
  return list;
}

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: H });
  if (!(await isDesignated(env, session))) return Response.json({ error: '보고 담당자만 볼 수 있습니다.' }, { status: 403, headers: H });
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || currentMonthKst();
  if (!MONTH_RE.test(month)) return Response.json({ error: '달 형식이 올바르지 않습니다.' }, { status: 400, headers: H });
  try {
    const list = await loadSlimChurches(env, { fresh: url.searchParams.get('fresh') === '1' });
    if (!list) return Response.json({ configured: false, month, crs: ministryFromCrs([], month) }, { headers: H });
    return Response.json({ configured: true, month, crs: ministryFromCrs(list, month) }, { headers: H });
  } catch (error) {
    console.error('gospel ministry failed:', error.message);
    return Response.json({ configured: false, month, crs: ministryFromCrs([], month) }, { headers: H });
  }
}
