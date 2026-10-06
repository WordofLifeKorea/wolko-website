/**
 * 운행 알림 발송 시간 — 운행 스케줄 관리자(와 마스터)만 보고 바꾼다.
 *   GET /api/car/drive-settings            → { settings, defaults }
 *   PUT /api/car/drive-settings  { pickup, dropoff: {1..5} } → 저장
 */
import { driveSession } from '../../lib/carDrive.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, getSettings, normalizeSettings } from '../../lib/driveSettings.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

async function managerOnly(request, env) {
  const session = await driveSession(request, env);
  if (session.error) return { res: fail(session.error, session.status) };
  if (!session.isManager) return { res: fail('운행 스케줄 관리자만 사용할 수 있습니다.', 403) };
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
  if (!settings) return fail('시간은 오전 5시~오후 9시 사이, 30분 단위로 골라 주세요.');
  await env.CAMP_KV.put(SETTINGS_KEY, JSON.stringify({ ...settings, updatedBy: g.session.email, updatedAt: new Date().toISOString() }));
  return Response.json({ ok: true, settings }, { headers: H });
}
