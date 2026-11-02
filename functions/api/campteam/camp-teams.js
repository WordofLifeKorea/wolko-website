import { crud } from '../../lib/campteamCrud.js';
import { cleanTeam, LIMITS } from '../../lib/campteamCue.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 캠프별 팀 목록(큐시트). GET ?campId= → { items:[{id,campId,name,color,sortOrder,…}] } · POST {campId,name,color?} · PATCH ?id {name?,color?,sortOrder?} · DELETE ?id
 *  POST { action:'reorder', campId, ids:[팀 id…] } — 보낸 순서대로 순서를 다시 매긴다.
 *  이름을 바꾸면 그 캠프의 진행표·준비물에 붙은 옛 이름도 함께 새 이름으로 바뀐다(rename). 팀을 지우면 그 이름이 붙은 줄의 팀 칸이 비워진다(응답 cleared = 몇 줄).
 *  「전체」는 모두를 뜻하는 특별한 이름이라 팀으로 만들 수 없다(어느 칸에나 쓸 수 있다). 권한은 진행표와 같은 「캠프」 영역.
 */
const h = crud({ table: 'camp_teams', entity: 'camp_team', area: 'camps', cols: ['campId', 'name', 'color', 'sortOrder'], clean: cleanTeam, order: 'sortOrder, createdAt', filters: { campId: 'campId' } });
export const onRequestGet = h.onRequestGet;
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action === 'reorder') {
    const g = await h.gate(env, request, true); if (g.res) return g.res;
    const campId = String(b.campId || ''), ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 100) : [];
    if (!campId || !ids.length) return badRequest('순서를 바꿀 팀이 없어요.');
    const now = nowIso(); let i = 0;
    for (const id of ids) { await env.DB.prepare('UPDATE camp_teams SET sortOrder = ?3, updatedAt = ?4 WHERE id = ?1 AND campId = ?2 AND deletedAt IS NULL').bind(id, campId, i++, now).run(); }
    await audit(env, g.s.email, 'reorder', 'camp_team', campId); return json({ ok: true });
  }
  if (b.action) return badRequest('알 수 없는 요청이에요.');
  const g = await h.gate(env, request, true); if (g.res) return g.res;
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first();
  if ((n?.n || 0) >= LIMITS.teams) return badRequest(`팀은 ${LIMITS.teams}개까지 만들 수 있어요.`);
  return h.onRequestPost(ctx);
}
export async function onRequestPatch(ctx) {
  const { env, request } = ctx, id = new URL(request.url).searchParams.get('id');
  let b = {}; try { b = await request.clone().json(); } catch { /* 아래 공통 처리가 오류로 돌려준다 */ }
  const before = id && env.DB ? await env.DB.prepare('SELECT campId, name FROM camp_teams WHERE id = ?1 AND deletedAt IS NULL').bind(id).first() : null;
  const res = await h.onRequestPatch(ctx);
  if (res.status === 200 && before && 'name' in b) {
    const after = await env.DB.prepare('SELECT name FROM camp_teams WHERE id = ?1').bind(id).first();
    if (after && after.name !== before.name) {
      const now = nowIso();
      await env.DB.prepare('UPDATE camp_timeline SET team = ?3, updatedAt = ?4 WHERE campId = ?1 AND team = ?2 AND deletedAt IS NULL').bind(before.campId, before.name, after.name, now).run();
      await env.DB.prepare('UPDATE camp_supplies SET team = ?3, updatedAt = ?4 WHERE campId = ?1 AND team = ?2 AND deletedAt IS NULL').bind(before.campId, before.name, after.name, now).run();
    }
  }
  return res;
}
export async function onRequestDelete(ctx) {
  const { env, request } = ctx, id = new URL(request.url).searchParams.get('id');
  const before = id && env.DB ? await env.DB.prepare('SELECT campId, name FROM camp_teams WHERE id = ?1 AND deletedAt IS NULL').bind(id).first() : null;
  const res = await h.onRequestDelete(ctx);
  if (res.status !== 200 || !before) return res;
  const now = nowIso();
  const a = await env.DB.prepare('UPDATE camp_timeline SET team = \'\', updatedAt = ?3 WHERE campId = ?1 AND team = ?2 AND deletedAt IS NULL').bind(before.campId, before.name, now).run();
  const c = await env.DB.prepare('UPDATE camp_supplies SET team = \'\', updatedAt = ?3 WHERE campId = ?1 AND team = ?2 AND deletedAt IS NULL').bind(before.campId, before.name, now).run();
  return json({ ok: true, cleared: (a.meta?.changes || 0) + (c.meta?.changes || 0) });
}
