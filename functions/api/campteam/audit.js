import { campSession, json, needLogin, needPerm, noDb } from '../../lib/campteamAuth.js';
import { text, likeOf } from '../../lib/campteamDb.js';

/** 관리자 전용: 누가 언제 무엇을 바꿨는지 기록. ?entity= &action= &actor= &q= */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.manageMembers) return needPerm('관리자만 할 수 있습니다.');
  const p = new URL(request.url).searchParams, where = ['1=1'], args = [];
  for (const k of ['entity', 'action', 'actor']) if (p.get(k)) { where.push(`${k} = ?`); args.push(text(p.get(k), 60)); }
  const q = text(p.get('q'), 60); if (q) { where.push(`(detail LIKE ? ESCAPE '\\' OR entityId LIKE ? ESCAPE '\\')`); args.push(likeOf(q), likeOf(q)); }
  const rows = (await env.DB.prepare(`SELECT at, actor, action, entity, entityId, detail FROM audit_log WHERE ${where.join(' AND ')} ORDER BY at DESC LIMIT 300`).bind(...args).all()).results;
  const entities = (await env.DB.prepare('SELECT DISTINCT entity FROM audit_log ORDER BY entity').all()).results.map(r => r.entity);
  return json({ items: rows, entities });
}
