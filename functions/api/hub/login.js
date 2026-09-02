/**
 * POST /api/hub/login
 *
 * 허브(/hub) 로그인. ADMIN_PASSWORD를 검증하고, 허브 자체 토큰뿐 아니라
 * 같은 ADMIN_PASSWORD를 쓰는 관리자/차량 스케줄/스케줄 플래너 토큰까지
 * 한 번에 발급한다 — 허브에서 한 번만 로그인하면 이 세 도구는 각자
 * 로그인 화면을 다시 안 거치고 바로 쓸 수 있도록(싱글사인온) 하기 위함.
 *
 * 각 토큰은 해당 도구의 기존 로그인 엔드포인트(예: /api/car/login,
 * /api/admin/login, /api/schedule-planner/auth)가 발급하는 것과
 * 정확히 같은 데이터 형식으로 서명해야 그 도구의 verifyToken을 통과한다.
 * (캠프 진행 페이지는 상담사 개별 계정이 필요해서 여기서 발급하지 않음 —
 *  기존처럼 그 페이지에서 직접 로그인해야 함)
 */

import { signToken } from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
const PASSWORD_RE = /^[\x21-\x7E]+$/;
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24시간, 각 도구 자체 로그인과 동일
// 비밀번호 로그인은 이메일 승인 체계와 별개인 레거시/예비 경로 —
// wolkorea1@gmail.com이 계속 이 경로를 쓸 예정이라 master 권한으로 발급.
const PASSWORD_LOGIN_EMAIL = 'wolkorea1@gmail.com';

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.ADMIN_PASSWORD) {
    return Response.json(
      { error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' },
      { status: 500, headers: CORS }
    );
  }

  try {
    const { password } = await request.json();
    if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
      return Response.json(
        { error: '비밀번호는 영문, 숫자, 특수문자만 사용할 수 있습니다.' },
        { status: 400, headers: CORS }
      );
    }
    if (password !== env.ADMIN_PASSWORD) {
      return Response.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: CORS }
      );
    }

    const expires = Date.now() + TOKEN_LIFETIME_MS;
    const [hubToken, adminToken, carToken, schedulePlannerToken] = await Promise.all([
      signToken(env.ADMIN_PASSWORD, `wolko-hub:${PASSWORD_LOGIN_EMAIL}:master:${expires}`),
      signToken(env.ADMIN_PASSWORD, `wolko-admin:${expires}`),
      signToken(env.ADMIN_PASSWORD, `wolko-car:${expires}`),
      signToken(env.ADMIN_PASSWORD, `wolko-schedule-planner:admin:${expires}`),
    ]);

    return Response.json(
      { hubToken, adminToken, carToken, schedulePlannerToken, expires },
      { headers: CORS }
    );
  } catch (e) {
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
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
