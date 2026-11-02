import { crud } from '../../lib/campteamCrud.js';
import { cleanSupply } from '../../lib/campteamPrep.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 준비물·재고 목록. GET ?campId= · POST {campId,name,qty,status,ownerName,notes,team} · PATCH ?id · DELETE ?id
 *  POST { action:'copy', fromCampId, campId } — 지난 캠프의 준비물을 「필요」 상태로 복사한다(같은 이름은 건너뜀).
 */
const COLS = ['campId', 'name', 'nameEn', 'qty', 'status', 'ownerName', 'notes'];
const mk = (cols) => crud({ table: 'camp_supplies', entity: 'supply', area: 'camps', cols, clean: cleanSupply, order: `CASE status WHEN 'need' THEN 0 WHEN 'bought' THEN 1 WHEN 'ready' THEN 2 ELSE 3 END, name COLLATE NOCASE`, filters: { campId: 'campId' }, search: ['name', 'nameEn', 'notes'] });
const h = mk([...COLS, 'team']), legacy = mk(COLS);   // team = 어느 팀이 챙기는지(큐시트). 0041 반영 전에도 목록(GET)은 예전 칸만으로 동작
export const onRequestGet = async (ctx) => { try { return await h.onRequestGet(ctx); } catch { return legacy.onRequestGet(ctx); } };
export const onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action !== 'copy') return h.onRequestPost(ctx);
  const g = await h.gate(env, request, true); if (g.res) return g.res;
  const to = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first(), from = await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.fromCampId || '')).first();
  if (!to || !from || to.id === from.id) return badRequest('캠프를 확인해주세요.');
  const have = new Set((await env.DB.prepare('SELECT name FROM camp_supplies WHERE campId = ?1 AND deletedAt IS NULL').bind(to.id).all()).results.map((r) => r.name.toLowerCase()));
  const src = (await env.DB.prepare('SELECT name, nameEn, qty, ownerName, notes FROM camp_supplies WHERE campId = ?1 AND deletedAt IS NULL').bind(from.id).all()).results, now = nowIso(); let n = 0, skipped = 0;
  for (const r of src) { if (have.has(r.name.toLowerCase())) { skipped++; continue; } await env.DB.prepare(`INSERT INTO camp_supplies (id,campId,name,nameEn,qty,status,ownerName,notes,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,'need','',?6,?7,?7,?8)`).bind(uuid(), to.id, r.name, r.nameEn, r.qty, r.notes, now, g.s.email).run(); n++; }
  await audit(env, g.s.email, 'copy_supplies', 'supply', to.id, `+${n} from ${from.id}`); return json({ created: n, skipped }, 201);
}
