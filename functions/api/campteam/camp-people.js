import { crud } from '../../lib/campteamCrud.js';
import { cleanPerson, parsePeopleText, proposeGroups, proposeRooms } from '../../lib/campteamAssign.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 참가자·스태프 명단과 배정 (민감한 정보 — 캠프팀 명단에 있는 사람만, 캠프 영역 수정 권한이 있어야 바꾼다. 이름·성별·학년·교회·역할만 둔다).
 *  GET ?campId=&q= · POST {campId,name,gender,grade,church,role,groupId,roomId,vehicleId} · PATCH ?id · DELETE ?id
 *  POST { action:'paste', campId, text, preview? }                  엑셀에서 복사한 [이름] [성별] [학년] [교회] [역할] 줄을 한꺼번에 추가
 *  POST { action:'propose', campId, what:'groups'|'rooms', redo? }   조·방 자동 배정 **제안**(저장하지 않음) → { moves:[{personId,slotId}] }
 *  POST { action:'assign', campId, what:'groups'|'rooms', moves:[{personId,slotId}] }   고른 제안을 저장
 */
const h = crud({ table: 'camp_people', entity: 'camp_person', area: 'camps', cols: ['campId', 'name', 'gender', 'grade', 'church', 'role', 'notes', 'groupId', 'roomId', 'vehicleId'], clean: cleanPerson, order: `CASE role WHEN 'participant' THEN 1 ELSE 0 END, name COLLATE NOCASE`, filters: { campId: 'campId' }, search: ['name', 'church'] });
export const onRequestGet = h.onRequestGet, onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!b.action) return h.onRequestPost(ctx);
  const g = await h.gate(env, request, b.action !== 'propose' && !(b.action === 'paste' && b.preview)); if (g.res) return g.res;
  const camp = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first(); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const now = nowIso();
  if (b.action === 'paste') {
    const text = String(b.text || ''); if (text.length > 80000) return badRequest('내용이 너무 길어요.');
    const { rows, skipped } = parsePeopleText(text); if (b.preview) return json({ preview: true, rows: rows.slice(0, 500), count: rows.length, skipped });
    if (!rows.length) return badRequest('가져올 줄이 없어요.');
    const have = new Set((await q(env, 'SELECT name, church FROM camp_people WHERE campId = ?1 AND deletedAt IS NULL', camp.id)).map((r) => `${r.name}|${r.church}`)); let n = 0, dup = 0;
    for (const r of rows.slice(0, 500)) { const k = `${r.name}|${r.church}`; if (have.has(k)) { dup++; continue; } have.add(k);
      await env.DB.prepare(`INSERT INTO camp_people (id,campId,name,gender,grade,church,role,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8,?9)`).bind(uuid(), camp.id, r.name, r.gender, r.grade, r.church, r.role, now, g.s.email).run(); n++; }
    await audit(env, g.s.email, 'import_people', 'camp_person', camp.id, `+${n} dup ${dup}`); return json({ created: n, duplicates: dup, skipped }, 201);
  }
  const what = b.what === 'rooms' ? 'rooms' : b.what === 'groups' ? 'groups' : '', col = what === 'rooms' ? 'roomId' : 'groupId', kind = what === 'rooms' ? 'room' : 'group';
  if (!what) return badRequest('what 이 올바르지 않습니다.');
  const slots = await q(env, 'SELECT id, capacity, gender FROM camp_slots WHERE campId = ?1 AND kind = ?2 AND deletedAt IS NULL ORDER BY sortOrder, name', camp.id, kind);
  if (b.action === 'propose') {
    if (!slots.length) return badRequest(what === 'rooms' ? '방을 먼저 만들어 주세요.' : '조를 먼저 만들어 주세요.');
    const people = await q(env, 'SELECT id, name, gender, grade, role, groupId, roomId FROM camp_people WHERE campId = ?1 AND deletedAt IS NULL', camp.id), parts = people.filter((p) => p.role === 'participant');
    const todo = parts.filter((p) => b.redo || !p[col]), cur = (sid) => parts.filter((p) => p[col] === sid && !(b.redo));
    const moves = (what === 'rooms' ? proposeRooms(todo, slots.map((s) => ({ ...s, current: cur(s.id) }))) : proposeGroups(todo, slots.map((s) => ({ ...s, current: cur(s.id) })))).map((m) => ({ personId: m.personId, slotId: m.groupId || m.roomId }));
    return json({ moves, count: moves.length, unassigned: todo.length - moves.length });
  }
  if (b.action === 'assign') {
    const ok = new Set(slots.map((s) => s.id)); let n = 0;
    for (const m of (Array.isArray(b.moves) ? b.moves : []).slice(0, 1000)) { if (!ok.has(m?.slotId)) continue; const r = await env.DB.prepare(`UPDATE camp_people SET ${col} = ?2, updatedAt = ?3 WHERE id = ?1 AND campId = ?4 AND deletedAt IS NULL AND role = 'participant'`).bind(String(m.personId), m.slotId, now, camp.id).run(); n += r.meta?.changes || 0; }
    await audit(env, g.s.email, 'assign_' + what, 'camp_person', camp.id, `${n} people`); return json({ assigned: n });
  }
  return badRequest('action 이 올바르지 않습니다.');
}
