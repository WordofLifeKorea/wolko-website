import { campSession, json, needLogin, needPerm, badRequest, noDb, canView } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';

/**
 * 캠프별 공간의 카드 순서(캠프 유형 카드 + 유형 안의 캠프 카드).
 *  - 기본 순서(scope 'default')는 모두에게 같게 보이고 관리자만 바꾼다.
 *  - 바꾼 사람은 자기 순서(scope 'u:이메일')를 따로 기억하고 그 사람에게만 적용된다. 지우면 기본 순서로 돌아간다.
 * GET → { default, mine }   각각 { types: [id…], camps: { 유형id: [id…] } } 또는 null
 * PUT { scope: 'mine'|'default', types: [id…], camps: { 유형id: [id…] } }
 * DELETE ?scope=mine|default
 */
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const scopeOf = (s, which) => (which === 'default' ? 'default' : 'u:' + s.email.toLowerCase());
async function load(env, scope) {
  let rows = []; try { rows = (await env.DB.prepare('SELECT kind, itemId, pos FROM camp_order WHERE scope = ?1 ORDER BY pos').bind(scope).all()).results; } catch { return null; }
  if (!rows.length) return null;
  const out = { types: [], camps: {} };
  for (const r of rows) { if (r.kind === 'type') out.types.push(r.itemId); else { const [t, c] = r.itemId.split('|'); (out.camps[t] ||= []).push(c); } }
  return out;
}
export function sanitizeOrder(b) {
  if (!b || typeof b !== 'object') return { error: '순서 형식이 올바르지 않습니다.' };
  const uniq = (a) => [...new Set((Array.isArray(a) ? a : []).map(String).filter((x) => ID.test(x)))].slice(0, 200);
  const types = uniq(b.types), camps = {};
  if (b.camps && typeof b.camps === 'object') for (const [t, list] of Object.entries(b.camps).slice(0, 100)) if (ID.test(t)) camps[t] = uniq(list);
  return { order: { types, camps } };
}
async function who(env, request) { if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); return s ? { s } : { res: needLogin() }; }

export async function onRequestGet({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  return json({ default: await load(env, 'default'), mine: await load(env, scopeOf(s, 'mine')), canEditDefault: !!s.perms.manageMembers });
}
export async function onRequestPut({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  if (!canView(s.perms, 'camps')) return needPerm('캠프별 공간을 볼 수 있어야 순서를 바꿀 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const which = b.scope === 'default' ? 'default' : 'mine';
  if (which === 'default' && !s.perms.manageMembers) return needPerm('모두의 기본 순서는 관리자만 바꿀 수 있어요.');
  const r = sanitizeOrder(b); if (r.error) return badRequest(r.error);
  const scope = scopeOf(s, which), stmts = [env.DB.prepare('DELETE FROM camp_order WHERE scope = ?1').bind(scope)];
  r.order.types.forEach((id, i) => stmts.push(env.DB.prepare(`INSERT INTO camp_order (scope,kind,itemId,pos) VALUES (?1,'type',?2,?3)`).bind(scope, id, i)));
  for (const [t, list] of Object.entries(r.order.camps)) list.forEach((id, i) => stmts.push(env.DB.prepare(`INSERT INTO camp_order (scope,kind,itemId,pos) VALUES (?1,'camp',?2,?3)`).bind(scope, t + '|' + id, i)));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  if (which === 'default') await audit(env, s.email, 'update', 'camp_order', 'default', `types ${r.order.types.length}`);
  return json({ ok: true });
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  const which = new URL(request.url).searchParams.get('scope') === 'default' ? 'default' : 'mine';
  if (which === 'default' && !s.perms.manageMembers) return needPerm('모두의 기본 순서는 관리자만 바꿀 수 있어요.');
  await env.DB.prepare('DELETE FROM camp_order WHERE scope = ?1').bind(scopeOf(s, which)).run();
  return json({ ok: true });
}
