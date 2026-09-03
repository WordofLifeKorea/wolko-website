/**
 * POST /api/hub/account-login
 * body: { email, password }
 *
 * 승인된 계정의 이메일+비밀번호 로그인. 성공 시 허브 세션 토큰을 발급하고,
 * role이 admin/master면 관리자/차량 스케줄/스케줄 플래너 SSO 토큰까지 함께 발급한다.
 * (상담사는 허브 세션만 발급 — 관리자 도구 접근 권한 없음)
 */
import {
  normalizeEmail, isValidEmail, getAccount, verifyPassword,
  createHubSessionToken, signToken,
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

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!isValidEmail(email) || !password) {
    return Response.json({ error: '이메일과 비밀번호를 입력해 주세요.' }, { status: 400, headers: CORS });
  }

  try {
    const account = await getAccount(env, email);
    if (!account) {
      return Response.json({ error: '가입되지 않은 이메일입니다.' }, { status: 404, headers: CORS });
    }
    if (account.status === 'pending') {
      return Response.json({ status: 'pending', error: '아직 승인 대기 중인 계정입니다.' }, { status: 403, headers: CORS });
    }
    if (account.status === 'rejected') {
      return Response.json({ error: '접근이 거부된 계정입니다. 관리자에게 문의해 주세요.' }, { status: 403, headers: CORS });
    }
    if (!account.passwordHash) {
      return Response.json({ error: '비밀번호가 설정되지 않았습니다. 가입 화면에서 비밀번호를 먼저 설정해 주세요.' }, { status: 400, headers: CORS });
    }

    const ok = await verifyPassword(password, account.passwordHash, account.passwordSalt);
    if (!ok) {
      return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers: CORS });
    }

    const hubToken = await createHubSessionToken(env.ADMIN_PASSWORD, email, account.role);
    const result = { hubToken, email, role: account.role };

    if (account.role === 'admin' || account.role === 'master') {
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
    console.error('hub account-login error:', error);
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
