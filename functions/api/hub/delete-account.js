/**
 * POST /api/hub/delete-account — master 전용
 * body: { email, confirm }  (confirm 에 같은 이메일을 한 번 더 적어야 한다)
 *
 * 포탈 계정을 지운다. 같은 이메일의 카운슬러 페이지 계정이 있으면 함께 지운다.
 * 마스터 계정과 본인 계정은 지울 수 없다. 실수로 지웠을 때를 위해 30일 동안은
 * 지운 계정의 사본을 보관한다(hub:account-trash:이메일 — 개발자가 되살릴 수 있다).
 */
import { parseHubSessionToken, getAccount, normalizeEmail, isValidEmail, isMasterEmail } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const fail = (error, status) => Response.json({ error }, { status, headers: CORS });
const TRASH_TTL = 60 * 60 * 24 * 30;

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return fail('서버 설정이 필요합니다.', 500);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session || session.role !== 'master') return fail('마스터 관리자만 사용할 수 있습니다.', 403);

  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 400); }
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) return fail('이메일을 확인해 주세요.', 400);
  if (normalizeEmail(body?.confirm) !== email) return fail('확인용 이메일이 일치하지 않습니다.', 400);
  if (isMasterEmail(email) || email === normalizeEmail(session.email)) return fail('마스터 계정과 내 계정은 지울 수 없습니다.', 400);

  const account = await getAccount(env, email);
  if (!account) return fail('계정을 찾을 수 없습니다.', 404);

  await env.CAMP_KV.put(`hub:account-trash:${email}`, JSON.stringify({ ...account, deletedAt: new Date().toISOString(), deletedBy: normalizeEmail(session.email) }), { expirationTtl: TRASH_TTL });
  await env.CAMP_KV.delete(`hub:account:${email}`);

  let counselorAccount = false;
  const campKey = `camp-progress:account:${email}`;
  const camp = await env.CAMP_KV.get(campKey, 'json');
  if (camp) {
    await env.CAMP_KV.put(`camp-progress:account-trash:${email}`, JSON.stringify(camp), { expirationTtl: TRASH_TTL });
    await env.CAMP_KV.delete(campKey);
    counselorAccount = true;
  }
  return Response.json({ ok: true, email, counselorAccount }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
