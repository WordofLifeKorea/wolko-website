import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from './campteamAuth.js';
import { uuid, nowIso, audit } from './campteamDb.js';

/**
 * 같은 모양의 작은 표(진행표·준비물·연락처·시리즈) 공통 처리. 캠프팀 명단에 있는 사람만 보고, 그 영역의 수정 권한이 있어야 만들고 고친다. 삭제는 deletedAt 표시(복구 가능).
 *  opts: { table, entity, area, cols:[칼럼…], clean(b, base) → {v}|{error}, order, filters:{쿼리이름:칼럼}, search:[칼럼…], extraWhere? }
 */
export function crud(opts) {
  const { table, entity, area, cols, clean, order, filters = {}, search = [] } = opts;
  async function gate(env, request, write) {
    if (!env.DB) return { res: noDb() };
    const s = await campSession(request, env);
    if (!s) return { res: needLogin() };
    if (!s.campRole) return { res: json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403) };
    if (!canView(s.perms, area)) return { res: json({ error: '볼 수 있는 권한이 없습니다.', code: 'denied' }, 403) };
    if (write && !canWrite(s.perms, area)) return { res: needPerm('작성 권한이 없습니다.') };
    return { s };
  }
  const onRequestGet = async ({ env, request }) => {
    const g = await gate(env, request, false); if (g.res) return g.res;
    const p = new URL(request.url).searchParams, where = ['deletedAt IS NULL'], args = [];
    for (const [q, col] of Object.entries(filters)) if (p.get(q)) { where.push(`${col} = ?`); args.push(String(p.get(q))); }
    const term = String(p.get('q') || '').trim().slice(0, 80);
    if (term && search.length) { const like = `%${term.replace(/[%_\\]/g, (m) => '\\' + m)}%`; where.push('(' + search.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ') + ')'); search.forEach(() => args.push(like)); }
    const rows = (await env.DB.prepare(`SELECT id, ${cols.join(', ')}, createdAt, updatedAt, createdBy FROM ${table} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 1000`).bind(...args).all()).results;
    return json({ items: rows, perms: g.s.perms });
  };
  const onRequestPost = async ({ env, request }) => {
    const g = await gate(env, request, true); if (g.res) return g.res;
    let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
    const { v, error } = await clean(b, {}, env); if (error) return badRequest(error);
    const id = uuid(), now = nowIso(), keys = Object.keys(v);
    await env.DB.prepare(`INSERT INTO ${table} (id, ${keys.join(', ')}, createdAt, updatedAt, createdBy) VALUES (?1, ${keys.map((_, i) => '?' + (i + 2)).join(', ')}, ?${keys.length + 2}, ?${keys.length + 2}, ?${keys.length + 3})`).bind(id, ...keys.map((k) => v[k]), now, g.s.email).run();
    await audit(env, g.s.email, 'create', entity, id, String(v.title || v.name || v.nameKo || '').slice(0, 120)); return json({ id }, 201);
  };
  const onRequestPatch = async ({ env, request }) => {
    const g = await gate(env, request, true); if (g.res) return g.res;
    const id = new URL(request.url).searchParams.get('id'), row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?1 AND deletedAt IS NULL`).bind(id).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
    const { v, error } = await clean(b, row, env); if (error) return badRequest(error);
    const keys = Object.keys(v);
    await env.DB.prepare(`UPDATE ${table} SET ${keys.map((k, i) => `${k} = ?${i + 2}`).join(', ')}, updatedAt = ?${keys.length + 2} WHERE id = ?1`).bind(id, ...keys.map((k) => v[k]), nowIso()).run();
    await audit(env, g.s.email, 'update', entity, id); return json({ ok: true });
  };
  const onRequestDelete = async ({ env, request }) => {
    const g = await gate(env, request, true); if (g.res) return g.res;
    const id = new URL(request.url).searchParams.get('id');
    const r = await env.DB.prepare(`UPDATE ${table} SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL`).bind(id, nowIso()).run();
    if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
    await audit(env, g.s.email, 'delete', entity, id); return json({ ok: true });
  };
  return { onRequestGet, onRequestPost, onRequestPatch, onRequestDelete, gate };
}
export const S = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const L = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);
export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s));
export const clock = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m && +m[1] < 24 && +m[2] < 60 ? String(m[1]).padStart(2, '0') + ':' + m[2] : ''; };
/** 보낸 칸이 있으면 새 값, 없으면 기존 값 */
export const pick = (b, base, k, f) => (k in b ? f(b[k]) : (base[k] ?? f('')));
