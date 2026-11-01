import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  // 관리자에게만: 팀원이 새로 적어서 확인을 기다리는 담당자 이름 개수 (설정 메뉴에 표시)
  let pendingOwners = 0;
  if (s.perms.manageMembers) { try { pendingOwners = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM owner_names WHERE status = 'pending'`).first()).n || 0; } catch { pendingOwners = 0; } }
  // 위쪽 머리글에 보일 이름(팀 명단에 적힌 이름)
  let name = ''; try { name = (await env.DB.prepare('SELECT name FROM camp_members WHERE LOWER(email) = LOWER(?1)').bind(s.email).first())?.name || ''; } catch { name = ''; }
  return json({ email: s.email, name, hubRole: s.hubRole, campRole: s.campRole, perms: s.perms, ...(pendingOwners ? { pendingOwners } : {}) });
}
