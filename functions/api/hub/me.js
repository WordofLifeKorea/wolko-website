/**
 * GET /api/hub/me — 로그인한 포탈 계정의 이름·이메일·역할 (화면 우측 상단 표시용)
 * Authorization: Bearer <포탈 세션 토큰>. 저장소 읽기 1~2회만 쓴다.
 */
import { getAccount, isMasterEmail, normalizeEmail, parseHubSessionToken } from '../../lib/hubAccounts.js';
import { DISPLAY_NAMES } from '../../lib/expenses.js';

const H = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return Response.json({ error: 'config' }, { status: 503, headers: H });
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401, headers: H });
  const email = normalizeEmail(session.email);
  const account = await getAccount(env, email);
  if (account ? account.status !== 'approved' : !isMasterEmail(email)) return Response.json({ error: 'unauthorized' }, { status: 401, headers: H });
  return Response.json({
    name: account?.name || DISPLAY_NAMES[email] || email.split('@')[0],
    email,
    role: session.role,
  }, { headers: H });
}
