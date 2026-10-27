import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  // 관리자에게만: 팀원이 새로 적어서 확인을 기다리는 담당자 이름 개수 (설정 메뉴에 표시)
  let pendingOwners = 0;
  if (s.perms.manageMembers) { try { pendingOwners = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM owner_names WHERE status = 'pending'`).first()).n || 0; } catch { pendingOwners = 0; } }
  return json({ email: s.email, hubRole: s.hubRole, campRole: s.campRole, perms: s.perms, ...(pendingOwners ? { pendingOwners } : {}) });
}
