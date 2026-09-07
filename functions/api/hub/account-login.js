/**
 * POST /api/hub/account-login
 * body: { email, password }
 *
 * 승인된 계정의 이메일+비밀번호 로그인. 성공 시 허브 세션 토큰 하나만 발급한다.
 * 관리자 도구(캠프 매니지먼트/차량 캘린더)는 이 허브 세션 토큰을 그대로 사용해
 * 서버에서 role을 검사하므로 별도 SSO 토큰이 필요 없다.
 * (상담사도 허브 세션은 발급받지만, role이 admin/master가 아니므로 관리자
 * 도구 API가 거부한다 — 상담사 전용 도구는 이것과 완전히 별개의 계정 체계)
 */
import {
  normalizeEmail, isValidEmail, getAccount, verifyPassword,
  createHubSessionToken,
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
    return Response.json({ hubToken, email, role: account.role }, { headers: CORS });
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
