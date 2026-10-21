import { campSession, json, needLogin, needPerm, badRequest, noDb, CAMP_ROLES, FIXED_ADMIN_EMAILS, isFixedAdmin } from '../../lib/campteamAuth.js';
import { normalizeEmail, isAllowedPortalEmail } from '../../lib/hubAccounts.js';
import { nowIso, text, audit } from '../../lib/campteamDb.js';

/** 캠프팀 명단 관리 — 관리자(admin)만 */
async function adminOnly(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있습니다.') };
  return { s };
}

export async function onRequestGet({ env, request }) {
  const { s, res } = await adminOnly(env, request); if (res) return res;
  const rows = (await env.DB.prepare('SELECT email, name, role, active, isTest FROM camp_members WHERE active = 1 ORDER BY role, email').all()).results.filter(r => !isFixedAdmin(r.email));
  const fixed = FIXED_ADMIN_EMAILS.map(email => ({ email, name: '', role: 'admin', active: 1, fixed: true }));
  return json({ members: [...fixed, ...rows], roles: CAMP_ROLES, me: s.email });
}

/** 추가/수정: { email, name, role } — 관리자는 여러 명 가능. 코드에 고정된 관리자는 바꿀 수 없다. */
export async function onRequestPost({ env, request }) {
  const { s, res } = await adminOnly(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const email = normalizeEmail(b.email);
  if (!isAllowedPortalEmail(email)) return badRequest('포털에서 사용할 수 있는 이메일(wolko.org 또는 wol.org)을 입력해주세요.');
  if (!CAMP_ROLES.includes(b.role)) return badRequest('역할이 올바르지 않습니다.');
  if (isFixedAdmin(email)) return badRequest('이 계정은 코드에 고정된 관리자라서 바꿀 수 없습니다.');
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO camp_members (email,name,role,active,createdAt,updatedAt) VALUES (?1,?2,?3,1,?4,?4)
    ON CONFLICT(email) DO UPDATE SET name=?2, role=?3, active=1, updatedAt=?4`).bind(email, text(b.name, 60), b.role, now).run();
  await audit(env, s.email, 'upsert', 'camp_member', email, b.role);
  return json({ ok: true });
}

/** 명단에서 빼기(비활성): ?email=... — 코드에 고정된 관리자는 뺄 수 없다 */
export async function onRequestDelete({ env, request }) {
  const { s, res } = await adminOnly(env, request); if (res) return res;
  const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
  if (isFixedAdmin(email)) return badRequest('코드에 고정된 관리자는 뺄 수 없습니다.');
  const row = await env.DB.prepare('SELECT role FROM camp_members WHERE email = ?1 AND active = 1').bind(email).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  await env.DB.prepare('UPDATE camp_members SET active = 0, updatedAt = ?2 WHERE email = ?1').bind(email, nowIso()).run();
  await audit(env, s.email, 'deactivate', 'camp_member', email);
  return json({ ok: true });
}
