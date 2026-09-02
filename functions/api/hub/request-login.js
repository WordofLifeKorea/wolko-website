/**
 * POST /api/hub/request-login
 * body: { email }
 *
 * 이메일 로그인 1단계 — 이메일만 받아서:
 *  - master 계정(하드코딩)이거나 이미 승인된 계정이면 매직링크 이메일 발송.
 *  - 처음 보는 이메일이면 pending 계정을 새로 만들고 master들에게 알림 메일.
 *  - 이미 pending이면 그대로 대기 안내(중복 알림 메일은 안 보냄).
 *  - 거부된 계정이면 에러.
 *
 * 관리자(@wol.org)/상담사(그 외) 구분은 이메일 도메인으로 자동 결정.
 */
import {
  normalizeEmail, isValidEmail, isMasterEmail, roleForEmail,
  getAccount, putAccount, createMagicLinkToken, sendEmail,
  magicLinkEmailHtml, pendingRequestEmailHtml, MASTER_EMAILS,
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
  if (!isValidEmail(email)) {
    return Response.json({ error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400, headers: CORS });
  }

  try {
    const url = new URL(request.url);

    if (isMasterEmail(email)) {
      const token = await createMagicLinkToken(env.ADMIN_PASSWORD, email, 'master');
      const link = `${url.origin}/hub?magic=${encodeURIComponent(token)}`;
      await sendEmail(env, { to: email, subject: 'WOLKO 허브 로그인', html: magicLinkEmailHtml({ url: link, role: 'master' }) });
      return Response.json({ status: 'sent' }, { headers: CORS });
    }

    const role = roleForEmail(email);
    let account = await getAccount(env, email);

    if (!account) {
      account = { email, role, status: 'pending', requestedAt: new Date().toISOString() };
      await putAccount(env, account);
      try {
        await sendEmail(env, {
          to: MASTER_EMAILS,
          subject: `[WOLKO 허브] 새 접속 요청: ${email}`,
          html: pendingRequestEmailHtml({ email, role }),
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

    // approved
    const token = await createMagicLinkToken(env.ADMIN_PASSWORD, email, account.role);
    const link = `${url.origin}/hub?magic=${encodeURIComponent(token)}`;
    await sendEmail(env, { to: email, subject: 'WOLKO 허브 로그인', html: magicLinkEmailHtml({ url: link, role: account.role }) });
    return Response.json({ status: 'sent' }, { headers: CORS });
  } catch (error) {
    console.error('hub request-login error:', error);
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
