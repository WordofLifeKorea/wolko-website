/**
 * GET /api/car/cost-rates?date=YYYY-MM-DD → 그날(없으면 오늘) 개인용 운행 비용 계산에 쓰는 전국 평균 경유 가격 · 원달러 환율 · 차량별 연비 · km당 정비비.
 * 사용 일지 화면이 운행 거리를 넣는 대로 미리 계산해 보여 줄 때 쓴다. 저장할 때는 서버가 같은 값으로 다시 계산한다.
 */
import { fail, usageSession } from '../../lib/carUsage.js';
import { costRates } from '../../lib/carCost.js';

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  return Response.json(await costRates(env, new URL(request.url).searchParams.get('date')), { headers: { 'Cache-Control': 'no-store' } });
}
