import { campSession, json, needLogin, needPerm, noDb } from '../../lib/campteamAuth.js';
import { translateTasks, translateConfigured, remaining, healTitleCols } from '../../lib/campteamTranslate.js';
import { audit } from '../../lib/campteamDb.js';

/**
 * 업무 제목 번역 (관리자 전용 — 번역에는 AI 사용량이 들어서).
 *  GET  — 번역이 아직 없는 업무 수와 기능이 켜져 있는지
 *  POST — 번역이 없는 업무를 한 번에 최대 40개 번역해서 채운다 (남아 있으면 다시 누르면 이어서)
 * 새로 쓰거나 고친 업무 제목은 저장할 때 자동으로 번역된다.
 */
async function gate(env, request) {
  if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있어요.') }; return { s };
}
export async function onRequestGet({ env, request }) {
  const { res } = await gate(env, request); if (res) return res;
  await healTitleCols(env);
  return json({ configured: translateConfigured(env), untranslated: await remaining(env) });
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  if (!translateConfigured(env)) return json({ error: '번역 기능이 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);
  const r = await translateTasks(env, { limit: 40 });
  if (r.translated) await audit(env, s.email, 'translate', 'task', 'bulk', `+${r.translated}`);
  return json(r);
}
