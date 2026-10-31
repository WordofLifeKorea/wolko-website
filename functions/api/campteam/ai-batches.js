import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { cleanBatchId } from '../../lib/campteamFileMeta.js';

/**
 * 「AI 정리함」 일괄 올리기 묶음 — 한 번에 되돌리기.
 *  GET  → { batches:[{ id, count, createdAt, live }] }   내가 최근(7일) 올린 묶음 (되돌리지 않은 것). 관리자는 모두.
 *  POST { undo: 묶음번호 } → 그 묶음으로 올린 자료를 모두 휴지통으로 보낸다(휴지통에서 다시 살릴 수 있다). 자기 묶음이거나 관리자만.
 * 파일 본문은 지우지 않는다 — 자료 기록만 「지움」 표시를 해서 휴지통에 들어가고, 되살리면 그대로 돌아온다.
 */
const WEEK = 7 * 24 * 3600 * 1000;
const safe = async (fn, d) => { try { return await fn(); } catch { return d; } };   // 0024 가 아직 없는 DB 에서도 오류 없이 빈 목록
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole) return json({ batches: [] });
  const since = new Date(Date.now() - WEEK).toISOString(), all = !!s.perms.manageMembers;
  const rows = await safe(async () => (await env.DB.prepare(`SELECT b.id, b.actor, b.createdAt, (SELECT COUNT(*) FROM files f WHERE f.aiBatchId = b.id AND f.deletedAt IS NULL) AS live
      FROM ai_batches b WHERE b.undoneAt IS NULL AND b.createdAt >= ?1 ${all ? '' : 'AND LOWER(b.actor) = ?2'} ORDER BY b.createdAt DESC LIMIT 10`).bind(...(all ? [since] : [since, s.email.toLowerCase()])).all()).results, []);
  return json({ batches: rows.filter((r) => r.live > 0).map((r) => ({ id: r.id, count: r.live, createdAt: r.createdAt, mine: String(r.actor).toLowerCase() === s.email.toLowerCase() })) });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const id = cleanBatchId(b && b.undo);
  if (!id) return badRequest('되돌릴 묶음을 찾을 수 없습니다.');
  const batch = await safe(() => env.DB.prepare('SELECT id, actor, undoneAt FROM ai_batches WHERE id = ?1').bind(id).first(), null);
  if (!batch) return json({ error: '되돌릴 묶음을 찾을 수 없습니다.' }, 404);
  if (batch.undoneAt) return json({ ok: true, count: 0, already: true });
  if (String(batch.actor).toLowerCase() !== s.email.toLowerCase() && !s.perms.manageMembers) return needPerm('내가 올린 묶음이나 관리자만 되돌릴 수 있습니다.');
  const now = nowIso();
  const res = await env.DB.prepare('UPDATE files SET deletedAt = ?2, updatedAt = ?2 WHERE aiBatchId = ?1 AND deletedAt IS NULL').bind(id, now).run();
  await env.DB.prepare('UPDATE ai_batches SET undoneAt = ?2, undoneBy = ?3 WHERE id = ?1').bind(id, now, s.email).run();
  const count = Number(res && res.meta && res.meta.changes) || 0;
  await audit(env, s.email, 'undo_batch', 'ai_batch', id, `${count} files`);
  return json({ ok: true, count });
}
