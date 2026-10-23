import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  return json({ email: s.email, hubRole: s.hubRole, campRole: s.campRole, perms: s.perms });
}
