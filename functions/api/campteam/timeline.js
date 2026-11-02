import { crud } from '../../lib/campteamCrud.js';
import { cleanTimeline, parseTimelineText } from '../../lib/campteamPrep.js';
import { planImport, ensureTeams, LIMITS } from '../../lib/campteamCue.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 캠프 당일 진행표 = 큐시트. GET ?campId= · POST {campId,dayDate,startTime,endTime,title,place,ownerName,notes, team,prepNotes,items,prepMinutes} · PATCH ?id · DELETE ?id
 *  notes 는 내부 메모(공유·인쇄에 나가지 않음). team(팀 이름, 「전체」=모두)·prepNotes(팀이 할 일)·items(준비물, 줄마다 하나)·prepMinutes(시작 몇 분 전까지 준비)는 스태프에게 보여 주는 칸 — 안 보내면 기존 값 유지(예전 화면도 그대로 동작).
 *  POST { action:'paste', campId, text, preview? } — 엑셀에서 복사한 표를 읽어서(preview 면 보여 주기만) 한꺼번에 추가한다.
 *  POST { action:'cue-import', campId, rows:[{dayDate,startTime,endTime,title,place,team,items,prepNotes}], preview? } — 화면에서 읽은 표(엑셀 파일·붙여넣기)를 가져온다.
 *     같은 날+시간+제목+팀이 이미 있으면 건너뛰고(dup), 새 팀 이름은 캠프 팀 목록에 자동으로 더한다. preview 면 저장하지 않고 줄마다 결과(new/dup/bad)만 돌려준다.
 * 0041 반영 전에도 목록(GET)은 예전 칸만으로 동작한다.
 */
const BASE = ['campId', 'dayDate', 'startTime', 'endTime', 'title', 'titleEn', 'place', 'ownerName', 'notes', 'sortOrder'];
const mk = (cols) => crud({ table: 'camp_timeline', entity: 'timeline', area: 'camps', cols, clean: cleanTimeline, order: 'dayDate, (startTime = \'\'), startTime, sortOrder, createdAt', filters: { campId: 'campId' } });
const h = mk([...BASE, 'team', 'prepNotes', 'items', 'prepMinutes']), legacy = mk(BASE);
export const onRequestGet = async (ctx) => { try { return await h.onRequestGet(ctx); } catch { return legacy.onRequestGet(ctx); } };
export const onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action === 'cue-import') return cueImport(env, request, b);
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
async function cueImport(env, request, b) {
  const g = await h.gate(env, request, !b.preview); if (g.res) return g.res;
  const camp = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first();
  if (!camp) return badRequest('캠프를 찾지 못했어요.');
  if (!Array.isArray(b.rows) || !b.rows.length) return badRequest('가져올 줄이 없어요.');
  if (b.rows.length > LIMITS.importRows) return badRequest(`한 번에 ${LIMITS.importRows}줄까지 가져올 수 있어요. 나눠서 가져와 주세요.`);
  const existing = (await env.DB.prepare('SELECT dayDate, startTime, title, team FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL').bind(camp.id).all()).results;
  const { results, fresh } = planImport(b.rows, existing), count = (s) => results.filter((r) => r.status === s).length;
  const counts = { new: count('new'), dup: count('dup'), bad: count('bad') };
  if (b.preview) return json({ preview: true, results, counts });
  if (!fresh.length) return badRequest('새로 가져올 줄이 없어요. (이미 있거나 읽지 못한 줄뿐이에요)');
  const newTeams = await ensureTeams(env, camp.id, fresh.map((r) => r.team), g.s.email);
  const m = await env.DB.prepare('SELECT COALESCE(MAX(sortOrder), 0) AS m FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL').bind(camp.id).first(), now = nowIso(); let n = 0, order = (m?.m ?? 0) + 1;
  for (const r of fresh) { await env.DB.prepare(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,endTime,title,titleEn,place,ownerName,notes,sortOrder,team,prepNotes,items,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,'',?7,'','',?8,?9,?10,?11,?12,?12,?13)`).bind(uuid(), camp.id, r.dayDate, r.startTime, r.endTime, r.title, r.place, order++, r.team, r.prepNotes, r.items, now, g.s.email).run(); n++; }
  await audit(env, g.s.email, 'import_cue', 'timeline', camp.id, `+${n}`); return json({ created: n, duplicates: counts.dup, invalid: counts.bad, newTeams }, 201);
}
