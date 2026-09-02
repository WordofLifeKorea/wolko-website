/**
 * POST /api/hub/approve
 * Authorization: Bearer <허브 세션 토큰> — master 권한만 허용.
 * body: { email, action: 'approve' | 'reject' }
 *
 * 승인 시 해당 이메일로 즉시 매직링크를 보내 바로 로그인할 수 있게 안내.
 */
import {
  normalizeEmail, parseHubSessionToken, getAccount, putAccount,
  createMagicLinkToken, sendEmail, approvedEmailHtml,
} from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function requireMaster(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  if (!session || session.role !== 'master') return null;
  return session;
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const session = await requireMaster(request, env);
  if (!session) {
    return Response.json({ error: '마스터 관리자만 접근할 수 있습니다.' }, { status: 403, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const email = normalizeEmail(body.email);
  const action = body.action === 'reject' ? 'reject' : 'approve';
  const account = await getAccount(env, email);
  if (!account) {
    return Response.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
  }

  account.status = action === 'approve' ? 'approved' : 'rejected';
  account.approvedAt = new Date().toISOString();
  account.approvedBy = session.email;
  await putAccount(env, account);

  if (action === 'approve') {
    try {
      const url = new URL(request.url);
      const token = await createMagicLinkToken(env.ADMIN_PASSWORD, email, account.role);
      const link = `${url.origin}/hub?magic=${encodeURIComponent(token)}`;
      await sendEmail(env, {
        to: email,
        subject: 'WOLKO 허브 접속이 승인되었습니다',
        html: approvedEmailHtml({ url: link, role: account.role }),
      });
    } catch (e) {
      console.error('approved notification email failed:', e);
    }
  }

  return Response.json({ ok: true, account }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
