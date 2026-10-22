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

const ALIAS_MAX = 200;
const cleanAliases = (v) => { const seen = new Set(), out = []; for (const x of String(v ?? '').split(/[,\n;]/).map((y) => text(y, 40)).filter(Boolean)) { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x); } } return out.join(', ').slice(0, ALIAS_MAX); };

export async function onRequestGet({ env, request }) {
  const { s, res } = await adminOnly(env, request); if (res) return res;
  const rows = (await env.DB.prepare('SELECT email, name, role, active, isTest FROM camp_members WHERE active = 1 ORDER BY role, email').all()).results;
  let al = {}; try { al = Object.fromEntries((await env.DB.prepare('SELECT email, aliases FROM member_aliases').all()).results.map((r) => [r.email.toLowerCase(), r.aliases])); } catch { al = {}; }
  const nameOf = Object.fromEntries(rows.map((r) => [r.email.toLowerCase(), r.name]));
  const fixed = FIXED_ADMIN_EMAILS.map((email) => ({ email, name: nameOf[email] || '', role: 'admin', active: 1, fixed: true, aliases: al[email] || '' }));
  const others = rows.filter((r) => !isFixedAdmin(r.email)).map((r) => ({ ...r, aliases: al[r.email.toLowerCase()] || '' }));
  return json({ members: [...fixed, ...others], roles: CAMP_ROLES, me: s.email });
}

/** 추가/수정: { email, name, role, aliases } — 관리자는 여러 명 가능. 코드에 고정된 관리자는 역할을 바꿀 수 없지만 이름·별칭은 고칠 수 있다. */
export async function onRequestPost({ env, request }) {
  const { s, res } = await adminOnly(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const email = normalizeEmail(b.email);
  if (!isAllowedPortalEmail(email)) return badRequest('포털에서 사용할 수 있는 이메일(wolko.org 또는 wol.org)을 입력해주세요.');
  const fixed = isFixedAdmin(email);
  if (fixed && b.role && b.role !== 'admin') return badRequest('이 계정은 코드에 고정된 관리자라서 역할을 바꿀 수 없습니다. (이름·업무에 적는 이름은 고칠 수 있어요)');
  const role = fixed ? 'admin' : b.role;
  if (!CAMP_ROLES.includes(role)) return badRequest('역할이 올바르지 않습니다.');
  const now = nowIso(), before = await env.DB.prepare('SELECT role, active FROM camp_members WHERE email = ?1').bind(email).first();
  await env.DB.prepare(`INSERT INTO camp_members (email,name,role,active,createdAt,updatedAt) VALUES (?1,?2,?3,1,?4,?4)
    ON CONFLICT(email) DO UPDATE SET name=?2, role=?3, active=1, updatedAt=?4`).bind(email, text(b.name, 60), role, now).run();
  if ('aliases' in b) { try { await env.DB.prepare('INSERT INTO member_aliases (email,aliases,updatedAt) VALUES (?1,?2,?3) ON CONFLICT(email) DO UPDATE SET aliases=?2, updatedAt=?3').bind(email, cleanAliases(b.aliases), now).run(); } catch { /* 별칭 표가 아직 없는 DB */ } }
  // 역할을 바꾸거나 명단에서 빠졌다가 다시 들어오면, 예전에 사람별로 정해 둔 항목 권한이 되살아나지 않게 지운다
  if (!fixed && before && (before.role !== role || !before.active)) { try { await env.DB.prepare('DELETE FROM member_perms WHERE email = ?1').bind(email).run(); } catch { /* 표가 없는 DB */ } }
  await audit(env, s.email, 'upsert', 'camp_member', email, role);
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
  try { await env.DB.prepare('DELETE FROM member_perms WHERE email = ?1').bind(email).run(); } catch { /* 표가 없는 DB */ }
  await audit(env, s.email, 'deactivate', 'camp_member', email);
  return json({ ok: true });
}
