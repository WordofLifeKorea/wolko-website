/**
 * POST /api/portal/gospel-camps  { campId, staff }  — 월코 캠프의 스태프 인원을 직접 입력한다(마스터·관리자만).
 * 캠퍼 인원·구원·헌신은 신청 기록에서 자동으로 세고(functions/lib/gospelCamps.js), 스태프는 신청 기록에 없으니 이렇게 더한다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { CAMP_ID_RE, MAX_STAFF, STAFF_KEY, loadSchedules } from '../../lib/gospelCamps.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master' && session.role !== 'admin') return fail('스태프 인원은 마스터·관리자만 입력할 수 있어요.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const campId = String(body?.campId || '');
  if (!CAMP_ID_RE.test(campId) || !(await loadSchedules(env, request)).some(s => s.id === campId)) return fail('캠프를 찾을 수 없습니다.', 404);
  const text = String(body?.staff ?? '').replace(/[,\s]/g, '');
  const staff = text === '' ? 0 : Number(text);
  if (!Number.isInteger(staff) || staff < 0 || staff > MAX_STAFF) return fail(`스태프 인원은 0~${MAX_STAFF} 사이의 정수로 입력해 주세요.`);
  if (staff === 0) await env.CAMP_KV.delete(STAFF_KEY(campId));
  else await env.CAMP_KV.put(STAFF_KEY(campId), JSON.stringify({ count: staff, by: session.email, at: new Date().toISOString() }));
  return Response.json({ campId, staff }, { headers: H });
}
