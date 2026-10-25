/**
 * POST /api/portal/gospel-exempt  { email, exempt }  — 그 계정을 월말 보고 알림·미제출 목록에서 뺀다/다시 넣는다(마스터·관리자만).
 * 보고할 일이 없는 계정(후원자·외부 담당자 등)용. 이미 낸 보고는 그대로 남는다.
 */
import { portalSession, normalizeEmail } from '../../lib/hubAccounts.js';
import { EXEMPT_PREFIX } from '../../lib/gospelReminder.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master' && session.role !== 'admin') return fail('마스터·관리자만 바꿀 수 있어요.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const email = normalizeEmail(body?.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('이메일 주소가 올바르지 않습니다.');
  if (body?.exempt === true) await env.CAMP_KV.put(EXEMPT_PREFIX + email, JSON.stringify({ by: session.email, at: new Date().toISOString() }));
  else await env.CAMP_KV.delete(EXEMPT_PREFIX + email);
  return Response.json({ email, exempt: body?.exempt === true }, { headers: H });
}
