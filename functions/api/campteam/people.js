import { campSession, json, needLogin, needPerm, noDb, FIXED_ADMIN_EMAILS } from '../../lib/campteamAuth.js';

/**
 * 팀 명단의 사람들(이름·이메일·업무에 적는 이름) — 업무 담당자 고르기 등에 쓴다.
 * 캠프팀 명단에 있는 사람만 볼 수 있다(명단 밖은 403). 역할·권한은 내려주지 않는다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole) return needPerm('캠프팀 명단에 있는 계정만 볼 수 있어요.');
  const rows = (await env.DB.prepare('SELECT email, name FROM camp_members WHERE active = 1 ORDER BY name, email').all()).results;
  let al = {}; try { al = Object.fromEntries((await env.DB.prepare('SELECT email, aliases FROM member_aliases').all()).results.map((r) => [r.email.toLowerCase(), r.aliases])); } catch { al = {}; }
  const seen = new Set(), people = [];
  for (const r of rows) { const e = r.email.toLowerCase(); if (!seen.has(e)) { seen.add(e); people.push({ email: e, name: r.name || '', aliases: al[e] || '' }); } }
  for (const e of FIXED_ADMIN_EMAILS) if (!seen.has(e)) people.push({ email: e, name: '', aliases: al[e] || '' });
  return json({ people });
}
