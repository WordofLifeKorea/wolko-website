/**
 * POST /api/hub/verify-magic
 * body: { token }
 *
 * 이메일 로그인 2단계 — 이메일로 받은 매직링크 토큰을 실제 세션 토큰으로 교환.
 * 1회용(같은 토큰 재사용 불가)이며, admin/master는 허브 세션과 함께
 * 관리자/차량 스케줄/스케줄 플래너 SSO 토큰까지 한 번에 발급한다.
 * counselor는 허브 세션만 발급(관리자 도구 접근 권한 없음).
 */
import {
  parseMagicLinkToken, claimMagicLinkOnce, createHubSessionToken, signToken,
} from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const token = String(body.token || '').trim();
  if (!token) {
    return Response.json({ error: '토큰이 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const parsed = await parseMagicLinkToken(env.ADMIN_PASSWORD, token);
    if (!parsed) {
      return Response.json({ error: '링크가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.' }, { status: 401, headers: CORS });
    }

    const canUse = await claimMagicLinkOnce(env, token);
    if (!canUse) {
      return Response.json({ error: '이미 사용된 링크입니다. 다시 로그인해 주세요.' }, { status: 401, headers: CORS });
    }

    const { email, role } = parsed;
    const hubToken = await createHubSessionToken(env.ADMIN_PASSWORD, email, role);

    const result = { hubToken, email, role };
    if (role === 'admin' || role === 'master') {
      const expires = Date.now() + 24 * 60 * 60 * 1000;
      const [adminToken, carToken, schedulePlannerToken] = await Promise.all([
        signToken(env.ADMIN_PASSWORD, `wolko-admin:${expires}`),
        signToken(env.ADMIN_PASSWORD, `wolko-car:${expires}`),
        signToken(env.ADMIN_PASSWORD, `wolko-schedule-planner:admin:${expires}`),
      ]);
      result.adminToken = adminToken;
      result.carToken = carToken;
      result.schedulePlannerToken = schedulePlannerToken;
    }

    return Response.json(result, { headers: CORS });
  } catch (error) {
    console.error('hub verify-magic error:', error);
    return Response.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
