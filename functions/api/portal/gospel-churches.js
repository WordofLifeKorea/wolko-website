/**
 * GET /api/portal/gospel-churches  — 복음 통계 보고서의 "교회 행사" 칸에서 고를 수 있는 CRS 교회 목록 ([{ id, name }])
 * 포탈 로그인한 계정 누구나. CRS(Firebase) 에서 서버가 읽어 이름만 돌려주고, 10분 동안 KV 에 담아 둔다.
 * 설정이 없거나 읽지 못하면 빈 목록 + configured:false — 보고서에서는 교회 이름을 직접 적을 수 있다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { firebaseDatabaseToken } from '../../lib/firebaseCrsDatabase.js';
import { parseCrsChurches } from '../../lib/gospelStats.js';

const DATABASE = 'https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app';
const H = { 'Cache-Control': 'no-store' };
export const CHURCH_CACHE_KEY = 'gospel:crs-churches';
const CACHE_SECONDS = 600;

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: H });
  const cached = await env.CAMP_KV.get(CHURCH_CACHE_KEY, 'json');
  if (cached?.list) return Response.json({ churches: cached.list, configured: true }, { headers: H });
  if (!env.FIREBASE_CRS_SERVICE_ACCOUNT) return Response.json({ churches: [], configured: false }, { headers: H });
  try {
    const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
    const res = await fetch(`${DATABASE}/churches.json`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`CRS ${res.status}`);
    const list = parseCrsChurches(await res.json());
    await env.CAMP_KV.put(CHURCH_CACHE_KEY, JSON.stringify({ list }), { expirationTtl: CACHE_SECONDS });
    return Response.json({ churches: list, configured: true }, { headers: H });
  } catch (error) {
    console.error('gospel churches failed:', error.message);
    return Response.json({ churches: [], configured: false }, { headers: H });
  }
}
