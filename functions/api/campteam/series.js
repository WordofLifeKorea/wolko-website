import { crud } from '../../lib/campteamCrud.js';
import { cleanSeries } from '../../lib/campteamPrep.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 반복 캠프(시리즈): 교회·교회학교처럼 해마다 같은 캠프가 반복될 때 이름·열리는 달을 한 번 적어 두고, 회차(캠프)는 사람이 달을 골라 직접 만든다. (자동으로 만들지 않는다)
 *  GET → { items:[{..., camps:[{id,nameKo,year,startDate,status}]}] } · POST · PATCH ?id · DELETE ?id
 *  POST { action:'newRound', seriesId, year, month } — 그 시리즈의 새 회차 캠프를 만든다(유형은 시리즈에 정해 둔 것, 없으면 지난 회차와 같게).
 */
const h = crud({ table: 'camp_series', entity: 'camp_series', area: 'camps', cols: ['nameKo', 'nameEn', 'kind', 'months', 'typeId', 'notes'], clean: cleanSeries, order: 'nameKo COLLATE NOCASE' });
export const onRequestPatch = h.onRequestPatch, onRequestDelete = h.onRequestDelete;
export async function onRequestGet(ctx) {
  const res = await h.onRequestGet(ctx); if (res.status !== 200) return res;
  const d = await res.json(), camps = (await ctx.env.DB.prepare(`SELECT id, nameKo, nameEn, year, startDate, status, seriesId FROM camps WHERE deletedAt IS NULL AND seriesId IS NOT NULL ORDER BY COALESCE(startDate, '9999'), year DESC`).all().catch(() => ({ results: [] }))).results;
  d.items.forEach((s) => { s.camps = camps.filter((c) => c.seriesId === s.id); }); return json(d);
}
export async function onRequestPost(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action !== 'newRound') return h.onRequestPost(ctx);
  const g = await h.gate(env, request, true); if (g.res) return g.res;
  const sr = await env.DB.prepare('SELECT * FROM camp_series WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.seriesId || '')).first(); if (!sr) return badRequest('시리즈를 찾지 못했어요.');
  const year = parseInt(b.year, 10), month = parseInt(b.month, 10); if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12)) return badRequest('연도와 달을 골라 주세요.');
  const last = await env.DB.prepare('SELECT typeId FROM camps WHERE seriesId = ?1 AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT 1').bind(sr.id).first();
  const typeId = sr.typeId || last?.typeId || null; if (!typeId) return badRequest('캠프 유형을 먼저 정해 주세요(시리즈 수정에서 선택).');
  const nameKo = `${sr.nameKo} ${year}년 ${month}월`.slice(0, 80), nameEn = sr.nameEn ? `${sr.nameEn} ${year}-${String(month).padStart(2, '0')}`.slice(0, 80) : '';
  if (await env.DB.prepare('SELECT id FROM camps WHERE seriesId = ?1 AND nameKo = ?2 AND deletedAt IS NULL').bind(sr.id, nameKo).first()) return badRequest('이미 같은 회차가 있어요.');
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,seriesId,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,NULL,NULL,'planning','','',?5,'',?6,?7,?7,?8)`).bind(id, typeId, nameKo, nameEn, year, sr.id, now, g.s.email).run();
  await audit(env, g.s.email, 'create', 'camp', id, nameKo); return json({ id, nameKo }, 201);
}
