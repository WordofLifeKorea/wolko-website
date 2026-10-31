/**
 * GET /api/portal/weather?campus=wolko|jeju — 포탈 첫 화면 맨 위에 보여 줄 오늘 날씨(평택 기본, 제주). 포탈에 로그인한 계정 누구나.
 * 응답: { campus, weather: { kind, isDay, temp, feels, hi, lo, rain, wind } | null }
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { loadWeather, weatherPlace } from '../../lib/weather.js';

const H = { 'Cache-Control': 'no-store' };

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: H });
  const campus = weatherPlace(new URL(request.url).searchParams.get('campus'));
  return Response.json({ campus, weather: await loadWeather(env, { campus }) }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
