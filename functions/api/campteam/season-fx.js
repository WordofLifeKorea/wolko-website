import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { FX_MODES, loadSeasonFx, saveSeasonFx } from '../../lib/campteamSeasonFx.js';

/**
 * 계절 배경 효과 설정 (팀 전체) — 관리자만 바꾼다.
 *  GET  → { mode }            지금 정해진 값 (로그인한 사람은 누구나)
 *  POST { mode }              auto | weather | spring | summer | rain | autumn | winter | off  (관리자만)
 * 읽기만 필요한 홈·TV 는 로그인 없이 읽는 /api/campteam/config 의 seasonFx 값을 쓴다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  return json({ mode: await loadSeasonFx(env), modes: FX_MODES });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.perms.manageMembers) return needPerm('계절 배경은 관리자만 바꿀 수 있습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!b || !FX_MODES.includes(b.mode)) return badRequest('계절 배경 값이 올바르지 않습니다.');
  await saveSeasonFx(env, b.mode, s.email, nowIso());
  await audit(env, s.email, 'save', 'season_fx', '', b.mode);
  return json({ ok: true, mode: b.mode });
}
