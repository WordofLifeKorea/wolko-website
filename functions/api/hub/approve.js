/**
 * POST /api/hub/approve
 * Authorization: Bearer <허브 세션 토큰> — master 권한만 허용.
 * body: { email, action: 'approve' | 'reject', role?: 'admin' | 'counselor' }
 *
 * 승인(action: 'approve') 시 role을 반드시 지정해야 하며, 그 역할로 계정이
 * 확정된다. admin 역할은 @wol.org 이메일에만 부여할 수 있다 — 실제 권한이
 * 부여되는 지점이 여기이므로 가입 시점 검증과 별개로 여기서도 다시 막는다.
 * 승인 완료 후 해당 이메일로 안내 메일을 보낸다(비밀번호는 가입 시
 * 이미 설정했으므로 바로 로그인 가능).
 */
import {
  normalizeEmail, parseHubSessionToken, getAccount, putAccount,
  sendEmail, approvedEmailHtml, isWolDomain,
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
  const role = body.role === 'admin' ? 'admin' : body.role === 'counselor' ? 'counselor' : null;
  if (action === 'approve' && !role) {
    return Response.json({ error: '승인 시 역할(관리자/상담사)을 지정해 주세요.' }, { status: 400, headers: CORS });
  }
  if (action === 'approve' && role === 'admin' && !isWolDomain(email)) {
    return Response.json({ error: '관리자 역할은 wol.org 이메일에만 지정할 수 있습니다.' }, { status: 400, headers: CORS });
  }

  const account = await getAccount(env, email);
  if (!account) {
    return Response.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
  }

  account.status = action === 'approve' ? 'approved' : 'rejected';
  if (action === 'approve') account.role = role;
  account.approvedAt = new Date().toISOString();
  account.approvedBy = session.email;
  await putAccount(env, account);

  if (action === 'approve') {
    try {
      const url = new URL(request.url);
      await sendEmail(env, {
        to: email,
        subject: 'WOLKO 허브 접속이 승인되었습니다',
        html: approvedEmailHtml({ url: `${url.origin}/hub`, role: account.role }),
      });
    } catch (e) {
      console.error('approved notification email failed:', e);
    }
  }

  const { passwordHash, passwordSalt, ...safeAccount } = account;
  return Response.json({ ok: true, account: safeAccount }, { headers: CORS });
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
