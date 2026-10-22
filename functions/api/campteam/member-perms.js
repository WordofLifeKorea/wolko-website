import { campSession, json, needLogin, needPerm, badRequest, noDb, AREAS, AREA_LEVELS, roleAreas, applyOverrides, isFixedAdmin } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 사람별 항목 권한 설정 — 관리자만 보고 바꿀 수 있다.
 * 역할이 기본값이고, 여기서 정한 칸만 그 위에 덮어쓴다(역할 기본값과 같은 값은 저장하지 않는다).
 * 관리자 역할과 코드에 고정된 관리자는 바꿀 수 없다(스스로 잠기는 사고 방지).
 *
 * GET              → { list: [{ email, custom }] }              사람마다 맞춤 권한이 몇 칸인지
 * GET ?email=      → { email, name, role, locked, defaults, overrides, effective, areas, levels }
 * PUT { email, overrides: { area: level | null } }  → 그 사람의 맞춤 권한을 이 값으로 통째로 바꾼다 (null/기본값과 같은 칸은 지움)
 * DELETE ?email=   → 맞춤 권한을 모두 지우고 역할 기본값으로
 */
async function admin(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('권한 설정은 관리자만 할 수 있어요.') };
  return { s };
}
async function memberOf(env, email) {
  const e = String(email || '').trim().toLowerCase(); if (!e) return null;
  if (isFixedAdmin(e)) return { email: e, name: '', role: 'admin', locked: true };
  const row = await env.DB.prepare('SELECT email, name, role FROM camp_members WHERE email = ?1 AND active = 1').bind(e).first();
  return row ? { email: row.email.toLowerCase(), name: row.name || '', role: row.role, locked: row.role === 'admin' } : null;
}
const loadOverrides = async (env, email) => Object.fromEntries((await env.DB.prepare('SELECT area, level FROM member_perms WHERE email = ?1').bind(email).all()).results.map((r) => [r.area, r.level]));

export async function onRequestGet({ env, request }) {
  const { res } = await admin(env, request); if (res) return res;
  const email = new URL(request.url).searchParams.get('email');
  if (!email) {
    const rows = (await env.DB.prepare('SELECT email, COUNT(*) AS n FROM member_perms GROUP BY email').all()).results;
    return json({ list: rows.map((r) => ({ email: r.email, custom: r.n })) });
  }
  const m = await memberOf(env, email); if (!m) return json({ error: '명단에 없는 사람이에요.' }, 404);
  const overrides = m.locked ? {} : await loadOverrides(env, m.email), defaults = roleAreas(m.role);
  return json({ ...m, defaults, overrides, effective: applyOverrides(m.role, overrides).areas, areas: AREAS, levels: AREA_LEVELS });
}
export async function onRequestPut({ env, request }) {
  const { s, res } = await admin(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const m = await memberOf(env, b.email); if (!m) return json({ error: '명단에 없는 사람이에요.' }, 404);
  if (m.locked) return badRequest('관리자의 권한은 바꿀 수 없어요.');
  const input = b.overrides && typeof b.overrides === 'object' && !Array.isArray(b.overrides) ? b.overrides : null; if (!input) return badRequest('권한 형식이 올바르지 않습니다.');
  const defaults = roleAreas(m.role), next = {};
  for (const [a, l] of Object.entries(input)) {
    if (!AREAS.includes(a)) return badRequest('알 수 없는 항목입니다: ' + String(a).slice(0, 30));
    if (l == null || l === '') continue;
    if (!AREA_LEVELS[a].includes(l)) return badRequest('이 항목에서 고를 수 없는 수준입니다.');
    if (l !== defaults[a]) next[a] = l;
  }
  const before = await loadOverrides(env, m.email), now = nowIso();
  await env.DB.batch([env.DB.prepare('DELETE FROM member_perms WHERE email = ?1').bind(m.email),
    ...Object.entries(next).map(([a, l]) => env.DB.prepare('INSERT INTO member_perms (email,area,level,updatedAt,updatedBy) VALUES (?1,?2,?3,?4,?5)').bind(m.email, a, l, now, s.email.toLowerCase()))]);
  await audit(env, s.email, 'update', 'member_perms', m.email, `${JSON.stringify(before)} → ${JSON.stringify(next)}`);
  return json({ ok: true, overrides: next, effective: applyOverrides(m.role, next).areas });
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await admin(env, request); if (res) return res;
  const m = await memberOf(env, new URL(request.url).searchParams.get('email')); if (!m) return json({ error: '명단에 없는 사람이에요.' }, 404);
  await env.DB.prepare('DELETE FROM member_perms WHERE email = ?1').bind(m.email).run();
  await audit(env, s.email, 'delete', 'member_perms', m.email, '역할 기본값으로 되돌림');
  return json({ ok: true });
}
