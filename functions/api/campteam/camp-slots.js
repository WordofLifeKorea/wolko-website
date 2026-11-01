import { crud } from '../../lib/campteamCrud.js';
import { cleanSlot } from '../../lib/campteamAssign.js';

/** 조·방·차량. GET ?campId=&kind= · POST {campId,kind,name,capacity,gender,leader,notes} · PATCH ?id · DELETE ?id (지우면 거기 배정된 사람은 배정 없음으로 돌아간다) */
const h = crud({ table: 'camp_slots', entity: 'camp_slot', area: 'camps', cols: ['campId', 'kind', 'name', 'capacity', 'gender', 'leader', 'notes', 'sortOrder'], clean: cleanSlot, order: 'kind, sortOrder, name COLLATE NOCASE', filters: { campId: 'campId', kind: 'kind' } });
export const onRequestGet = h.onRequestGet, onRequestPost = h.onRequestPost, onRequestPatch = h.onRequestPatch;
export async function onRequestDelete(ctx) {
  const id = new URL(ctx.request.url).searchParams.get('id'), res = await h.onRequestDelete(ctx);
  if (res.status === 200 && id) for (const col of ['groupId', 'roomId', 'vehicleId']) await ctx.env.DB.prepare(`UPDATE camp_people SET ${col} = NULL WHERE ${col} = ?1`).bind(id).run();
  return res;
}
