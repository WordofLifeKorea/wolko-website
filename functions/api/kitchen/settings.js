/**
 * 주방 보조 설정 — 식사 시간(알림은 1시간 전)과 한 칸의 기본 인원. 주방 관리자(와 마스터)만 보고 바꾼다.
 *   GET /api/kitchen/settings            → { settings, defaults }
 *   PUT /api/kitchen/settings  { meals: { am, lunch, dinner }, capacity } → 저장 (식사 시간은 'HH:MM' 또는 null, 기본 인원은 1~4)
 */
import { kitchenSession } from '../../lib/kitchenDuty.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, getSettings, normalizeSettings } from '../../lib/kitchenSettings.js';

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
  return Response.json({ settings: await getSettings(env), defaults: DEFAULT_SETTINGS }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const g = await managerOnly(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const settings = normalizeSettings(body);
  if (!settings) return fail('식사 시간은 오전 7시~오후 9시 사이 30분 단위로, 기본 인원은 1~4명으로 정해 주세요.');
  await env.CAMP_KV.put(SETTINGS_KEY, JSON.stringify({ ...settings, updatedBy: g.session.email, updatedAt: new Date().toISOString() }));
  return Response.json({ ok: true, settings }, { headers: H });
}
