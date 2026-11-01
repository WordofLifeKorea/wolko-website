import { campSession, json, needLogin, needPerm, badRequest, noDb, canView } from '../../lib/campteamAuth.js';
import { findConflicts } from '../../lib/campteamAssign.js';

/**
 * 중복 배정·안전 경고 (알려 주기만 한다 — 막거나 자동으로 바꾸지 않는다). GET ?campId= → { warnings:[{type,level:danger|warn|info,text,refs}] }
 * 진행표에서 같은 담당·같은 장소가 시간이 겹치는 것, 차량 정원·운전자, 방 성별·정원, 미성년자와 성인 단둘이 있는 경우를 찾는다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.campRole || !canView(s.perms, 'camps')) return needPerm('캠프팀 팀원만 볼 수 있어요.');
  const id = new URL(request.url).searchParams.get('campId'), camp = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first(); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const q = (sql) => env.DB.prepare(sql).bind(camp.id).all().then((r) => r.results).catch(() => []);
  const [people, slots, timeline] = await Promise.all([q('SELECT id, name, gender, grade, role, groupId, roomId, vehicleId FROM camp_people WHERE campId = ?1 AND deletedAt IS NULL'), q('SELECT id, kind, name, capacity, gender, leader FROM camp_slots WHERE campId = ?1 AND deletedAt IS NULL'), q('SELECT id, dayDate, startTime, endTime, title, place, ownerName FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL')]);
  const warnings = findConflicts({ people, slots, timeline }), rank = { danger: 0, warn: 1, info: 2 };
  return json({ warnings: warnings.sort((a, b) => rank[a.level] - rank[b.level]), counts: { people: people.length, slots: slots.length } });
}
