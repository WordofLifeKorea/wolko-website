import { crud } from '../../lib/campteamCrud.js';
import { cleanTimeline, parseTimelineText } from '../../lib/campteamPrep.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 캠프 당일 진행표. GET ?campId= · POST {campId,dayDate,startTime,endTime,title,place,ownerName,notes} · PATCH ?id · DELETE ?id
 *  POST { action:'paste', campId, text, preview? } — 엑셀에서 복사한 표를 읽어서(preview 면 보여 주기만) 한꺼번에 추가한다.
 */
const h = crud({ table: 'camp_timeline', entity: 'timeline', area: 'camps', cols: ['campId', 'dayDate', 'startTime', 'endTime', 'title', 'titleEn', 'place', 'ownerName', 'notes', 'sortOrder'], clean: cleanTimeline, order: 'dayDate, (startTime = \'\'), startTime, sortOrder, createdAt', filters: { campId: 'campId' } });
export const onRequestGet = h.onRequestGet, onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action !== 'paste') return h.onRequestPost(ctx);
  const g = await h.gate(env, request, !b.preview); if (g.res) return g.res;
  const camp = await env.DB.prepare('SELECT id, startDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first();
  if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const text = String(b.text || ''); if (text.length > 60000) return badRequest('내용이 너무 길어요.');
  const { rows, skipped } = parseTimelineText(text, camp.startDate || '');
  if (b.preview) return json({ preview: true, rows, skipped });
  if (!rows.length) return badRequest('가져올 줄이 없어요.');
  const now = nowIso(); let n = 0;
  for (const r of rows.slice(0, 300)) { await env.DB.prepare(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,endTime,title,titleEn,place,ownerName,notes,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,'',?7,?8,'',?9,?10,?10,?11)`).bind(uuid(), camp.id, r.dayDate, r.startTime, r.endTime, r.title, r.place, r.ownerName, n, now, g.s.email).run(); n++; }
  await audit(env, g.s.email, 'import_timeline', 'timeline', camp.id, `+${n}`); return json({ created: n, skipped }, 201);
}
