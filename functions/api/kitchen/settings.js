/**
 * 주방 보조 알림 발송 시간 — 주방 관리자(와 마스터)만 보고 바꾼다.
 *   GET /api/kitchen/settings            → { settings, defaults }
 *   PUT /api/kitchen/settings  { am_prep, am_clean, lunch_prep, ... } → 저장 (칸마다 'HH:MM' 또는 null)
 */
import { kitchenSession } from '../../lib/kitchenDuty.js';
import { DEFAULT_TIMES, SETTINGS_KEY, getTimes, normalizeTimes } from '../../lib/kitchenSettings.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

async function managerOnly(request, env) {
  const session = await kitchenSession(request, env);
  if (session.error) return { res: fail(session.error, session.status) };
  if (!session.isManager) return { res: fail('주방 관리자만 사용할 수 있습니다.', 403) };
  return { session };
}

export async function onRequestGet({ env, request }) {
  const g = await managerOnly(request, env);
  if (g.res) return g.res;
  return Response.json({ settings: await getTimes(env), defaults: DEFAULT_TIMES }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const g = await managerOnly(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const settings = normalizeTimes(body);
  if (!settings) return fail('시간은 오전 5시~오후 9시 사이, 30분 단위로 골라 주세요.');
  await env.CAMP_KV.put(SETTINGS_KEY, JSON.stringify({ ...settings, updatedBy: g.session.email, updatedAt: new Date().toISOString() }));
  return Response.json({ ok: true, settings }, { headers: H });
}
