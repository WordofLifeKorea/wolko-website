/**
 * POST /api/hub/signup
 * body: { email, password }
 *
 * 이메일+비밀번호 가입/최초 로그인 설정:
 *  - master 계정(하드코딩)이면 승인 없이 즉시 계정을 만들거나 비밀번호를 갱신하고 로그인 가능.
 *  - 이미 승인됐지만 아직 비밀번호가 없는 계정(과거 승인분)이면 이 요청으로 비밀번호를 최초 설정.
 *  - 이미 비밀번호가 설정된 승인 계정이면 "로그인해주세요" 안내.
 *  - 처음 보는 이메일이면 pending 계정을 새로 만들고 master들에게 알림 메일.
 *  - 이미 pending이면 그대로 대기 안내(중복 알림 메일은 안 보냄).
 *  - 거부된 계정이면 에러.
 *
 * 역할(admin/counselor)은 가입 시점에는 정해지지 않고, master가 승인할 때 지정한다.
 */
import {
  normalizeEmail, isValidEmail, isValidPassword, isMasterEmail,
  getAccount, putAccount, hashPassword, sendEmail,
  pendingRequestEmailHtml, MASTER_EMAILS,
} from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD || !env.RESEND_API_KEY) {
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
  if (!isValidEmail(email)) {
    return Response.json({ error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400, headers: CORS });
  }
  if (!isValidPassword(password)) {
    return Response.json({ error: '비밀번호는 8자 이상의 영문/숫자/특수문자로 입력해 주세요.' }, { status: 400, headers: CORS });
  }

  try {
    const { hash, salt } = await hashPassword(password);

    if (isMasterEmail(email)) {
      const existing = await getAccount(env, email);
      await putAccount(env, {
        ...(existing || {}),
        email, role: 'master', status: 'approved',
        passwordHash: hash, passwordSalt: salt,
      });
      return Response.json({ status: 'approved' }, { headers: CORS });
    }

    let account = await getAccount(env, email);

    if (!account) {
      account = {
        email, role: null, status: 'pending',
        passwordHash: hash, passwordSalt: salt,
        requestedAt: new Date().toISOString(),
      };
      await putAccount(env, account);
      try {
        await sendEmail(env, {
          to: MASTER_EMAILS,
          subject: `[WOLKO 허브] 새 가입 요청: ${email}`,
          html: pendingRequestEmailHtml({ email }),
        });
      } catch (e) {
        console.error('pending notification email failed:', e);
      }
      return Response.json({ status: 'pending' }, { headers: CORS });
    }

    if (account.status === 'pending') {
      return Response.json({ status: 'pending' }, { headers: CORS });
    }
    if (account.status === 'rejected') {
      return Response.json({ error: '접근이 거부된 계정입니다. 관리자에게 문의해 주세요.' }, { status: 403, headers: CORS });
    }

    // approved 계정: 비밀번호가 아직 없으면(과거 승인분) 이번 요청으로 최초 설정 허용
    if (!account.passwordHash) {
      await putAccount(env, { ...account, passwordHash: hash, passwordSalt: salt });
      return Response.json({ status: 'approved' }, { headers: CORS });
    }

    return Response.json({ error: '이미 가입된 이메일입니다. 로그인해 주세요.' }, { status: 409, headers: CORS });
  } catch (error) {
    console.error('hub signup error:', error);
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
