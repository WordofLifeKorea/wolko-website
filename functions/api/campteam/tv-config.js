import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { defaultLayout, sanitizeLayout, cleanSettings, DEFAULT_SETTINGS, newToken, TV_APP_VERSION } from '../../lib/campteamTv.js';

async function admin(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있습니다.') };
  return { s };
}
export async function loadSettings(env) {
  const rows = (await env.DB.prepare('SELECT key, value FROM tv_settings').all()).results, o = { ...DEFAULT_SETTINGS };
  for (const r of rows) o[r.key] = r.value; return o;
}
export async function loadLayout(env) {
  const row = await env.DB.prepare(`SELECT json, updatedAt FROM tv_layout WHERE id = 'main'`).first();
  if (!row) return { layout: defaultLayout(), updatedAt: null, isDefault: true };
  try { const r = sanitizeLayout(JSON.parse(row.json)); if (r.layout) return { layout: r.layout, updatedAt: row.updatedAt, isDefault: false }; } catch { /* 깨진 저장값은 기본 배치로 */ }
  return { layout: defaultLayout(), updatedAt: row.updatedAt, isDefault: true };
}
const setKV = (env, key, value, now) => env.DB.prepare(`INSERT INTO tv_settings (key,value,updatedAt) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET value=?2, updatedAt=?3`).bind(key, value, now).run();

/** 관리자 전용: 지금 저장된 배치·설정·TV 주소용 열쇠(token) */
export async function onRequestGet({ env, request }) {
  const { s, res } = await admin(env, request); if (res) return res;
  const [{ layout, updatedAt, isDefault }, settings] = await Promise.all([loadLayout(env), loadSettings(env)]);
  // 새 DB 에는 TV 주소용 열쇠가 아직 없다 → 관리자가 처음 열 때 한 번 만들어 둔다
  if (!settings.token) { settings.token = newToken(10); await setKV(env, 'token', settings.token, nowIso()); await audit(env, s.email, 'create', 'tv_token', 'main'); }
  return json({ layout, updatedAt, isDefault, settings, appVersion: TV_APP_VERSION });
}
/** 저장: { layout?, settings? } */
export async function onRequestPut({ env, request }) {
  const { s, res } = await admin(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso();
  if (b.layout !== undefined) {
    const r = sanitizeLayout(b.layout); if (r.error) return badRequest(r.error);
    await env.DB.prepare(`INSERT INTO tv_layout (id,json,updatedAt,updatedBy) VALUES ('main',?1,?2,?3) ON CONFLICT(id) DO UPDATE SET json=?1, updatedAt=?2, updatedBy=?3`).bind(JSON.stringify(r.layout), now, s.email).run();
    await audit(env, s.email, 'save', 'tv_layout', 'main', `${r.layout.pages.length} pages`);
  }
  if (b.settings !== undefined) {
    const r = cleanSettings(b.settings || {}); if (r.error) return badRequest(r.error);
    for (const [k, v] of Object.entries(r.settings)) await setKV(env, k, v, now);
    await audit(env, s.email, 'save', 'tv_settings', 'main', Object.keys(r.settings).join(','));
  }
  return json({ ok: true, updatedAt: now });
}
/** 새 TV 주소 열쇠 만들기(이전 열쇠는 바로 못 쓰게 됨): { action: 'rotate' } */
export async function onRequestPost({ env, request }) {
  const { s, res } = await admin(env, request); if (res) return res;
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  if (b.action !== 'rotate') return badRequest('action 이 올바르지 않습니다.');
  const token = newToken(10); await setKV(env, 'token', token, nowIso());
  await audit(env, s.email, 'rotate', 'tv_token', 'main'); return json({ token });
}
