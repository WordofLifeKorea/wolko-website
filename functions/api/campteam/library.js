import { campSession, json, needLogin, needPerm, badRequest, noDb, canWriteFile, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { KINDS, cleanItem } from '../../lib/campteamLibrary.js';

/**
 * 보관함 (설교·메시지 / 찬양 콘티 / 게임·활동 / 장소·시설 카드). 캠프팀 명단에 있는 사람만 본다. 자료실 수정 권한이 있어야 만들고 고친다.
 *  GET ?kind=&q=&tag=&campId=&id= → { items, counts, tagStats, perms }   q 는 제목·요약·태그·본문·설교자·종류별 칸 글자에서 찾는다
 *  POST {kind,title,...,extra} · PATCH ?id= · DELETE ?id= (휴지통처럼 deletedAt 만 채움)
 * 연결한 자료실 파일이 금액 자료(restricted)이면 연결하지 않는다.
 */
const SELECT = `SELECT i.id, i.kind, i.title, i.titleEn, i.summary, i.tags, i.lang, i.scripture, i.speaker, i.itemDate, i.campId, i.fileId, i.extra, i.createdAt, i.updatedAt, i.createdBy,
  c.nameKo AS campKo, c.nameEn AS campEn, f.title AS fileTitle FROM library_items i LEFT JOIN camps c ON c.id = i.campId LEFT JOIN files f ON f.id = i.fileId AND f.deletedAt IS NULL AND f.restricted = 0`;
const esc = (s) => String(s).replace(/[%_\\]/g, (m) => '\\' + m);
const shape = (r) => { let extra = {}; try { extra = JSON.parse(r.extra || '{}'); } catch { extra = {}; } return { ...r, extra }; };

async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  { const dv = denyView(s.perms, 'files', '보관함'); if (dv) return { res: dv }; }
  if (!s.campRole) return { res: json({ error: '캠프팀 팀원만 볼 수 있어요.', code: 'forbidden' }, 403) };
  if (write && !canWriteFile(s.perms, 0)) return { res: needPerm('작성 권한이 없습니다.') };
  return { s };
}
async function checkRefs(env, v) {
  if (v.campId && !(await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(v.campId).first())) return '캠프를 찾지 못했어요.';
  if (v.fileId && !(await env.DB.prepare('SELECT id FROM files WHERE id = ?1 AND deletedAt IS NULL AND restricted = 0').bind(v.fileId).first())) return '연결할 자료를 찾지 못했어요.';
  return '';
}

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request, false); if (g.res) return g.res;
  const p = new URL(request.url).searchParams, kind = p.get('kind'), q = String(p.get('q') || '').trim().slice(0, 80), tag = String(p.get('tag') || '').trim().slice(0, 44);
  const where = ['i.deletedAt IS NULL'], args = [];
  if (p.get('id')) { where.push('i.id = ?'); args.push(String(p.get('id'))); }
  if (KINDS.includes(kind)) { where.push('i.kind = ?'); args.push(kind); }
  if (p.get('campId')) { where.push('i.campId = ?'); args.push(String(p.get('campId'))); }
  if (q) { const like = `%${esc(q)}%`; where.push(`(i.title LIKE ? ESCAPE '\\' OR i.titleEn LIKE ? ESCAPE '\\' OR i.summary LIKE ? ESCAPE '\\' OR i.tags LIKE ? ESCAPE '\\' OR i.scripture LIKE ? ESCAPE '\\' OR i.speaker LIKE ? ESCAPE '\\' OR i.extra LIKE ? ESCAPE '\\')`); args.push(like, like, like, like, like, like, like); }
  if (tag) { where.push(`(',' || i.tags || ',') LIKE ? ESCAPE '\\'`); args.push(`%,${esc(tag)},%`); }
  const rows = (await env.DB.prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY COALESCE(i.itemDate, substr(i.createdAt,1,10)) DESC, i.title COLLATE NOCASE LIMIT 300`).bind(...args).all()).results.map(shape);
  const counts = {}; for (const r of (await env.DB.prepare('SELECT kind, COUNT(*) AS n FROM library_items WHERE deletedAt IS NULL GROUP BY kind').all()).results) counts[r.kind] = r.n;
  const cnt = new Map();
  for (const r of (await env.DB.prepare(`SELECT tags FROM library_items WHERE deletedAt IS NULL AND tags <> '' ${KINDS.includes(kind) ? 'AND kind = ?1' : ''} LIMIT 1500`).bind(...(KINDS.includes(kind) ? [kind] : [])).all()).results) for (const t of String(r.tags).split(',')) if (t) cnt.set(t, (cnt.get(t) || 0) + 1);
  const tagStats = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30).map(([t, n]) => ({ tag: t, n }));
  return json({ items: rows, counts, tagStats, perms: g.s.perms });
}

export async function onRequestPost({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (Array.isArray(b.fromFiles)) return importFromFiles(env, g.s, b);
  const { v, error } = cleanItem(b); if (error) return badRequest(error);
  const bad = await checkRefs(env, v); if (bad) return badRequest(bad);
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO library_items (id,kind,title,titleEn,summary,tags,lang,scripture,speaker,itemDate,campId,fileId,extra,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14,?15)`)
    .bind(id, v.kind, v.title, v.titleEn, v.summary, v.tags, v.lang, v.scripture, v.speaker, v.itemDate, v.campId, v.fileId, v.extra, now, g.s.email).run();
  await audit(env, g.s.email, 'create', 'library', id, `${v.kind}: ${v.title}`.slice(0, 120));
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get('id'), row = await env.DB.prepare('SELECT * FROM library_items WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const { v, error } = cleanItem(b, row); if (error) return badRequest(error);
  const bad = await checkRefs(env, v); if (bad) return badRequest(bad);
  await env.DB.prepare('UPDATE library_items SET title=?2,titleEn=?3,summary=?4,tags=?5,lang=?6,scripture=?7,speaker=?8,itemDate=?9,campId=?10,fileId=?11,extra=?12,updatedAt=?13 WHERE id=?1')
    .bind(id, v.title, v.titleEn, v.summary, v.tags, v.lang, v.scripture, v.speaker, v.itemDate, v.campId, v.fileId, v.extra, nowIso()).run();
  await audit(env, g.s.email, 'update', 'library', id); return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get('id');
  const r = await env.DB.prepare('UPDATE library_items SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, g.s.email, 'delete', 'library', id); return json({ ok: true });
}

/** 자료실 파일에서 가져오기: { kind, fromFiles:[파일 번호…] } — 제목·태그·언어·성경 본문·설교자·캠프를 그대로 옮기고, 이미 같은 파일이 이 종류에 있으면 건너뛴다 (날짜는 모르니 비움) */
async function importFromFiles(env, s, b) {
  if (!KINDS.includes(b.kind)) return badRequest('종류가 올바르지 않습니다.');
  const ids = [...new Set(b.fromFiles.map(String))].slice(0, 50); let created = 0, skipped = 0; const now = nowIso();
  for (const fid of ids) {
    const f = await env.DB.prepare('SELECT id, title, tags, lang, scripture, speaker, campId FROM files WHERE id = ?1 AND deletedAt IS NULL AND restricted = 0').bind(fid).first().catch(() => null);
    if (!f) { skipped++; continue; }
    if (await env.DB.prepare('SELECT id FROM library_items WHERE fileId = ?1 AND kind = ?2 AND deletedAt IS NULL').bind(f.id, b.kind).first()) { skipped++; continue; }
    const { v } = cleanItem({ kind: b.kind, title: f.title, tags: f.tags, lang: f.lang, scripture: f.scripture, speaker: f.speaker, campId: f.campId, fileId: f.id });
    if (!v) { skipped++; continue; }
    await env.DB.prepare(`INSERT INTO library_items (id,kind,title,titleEn,summary,tags,lang,scripture,speaker,itemDate,campId,fileId,extra,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14,?15)`)
      .bind(uuid(), v.kind, v.title, v.titleEn, v.summary, v.tags, v.lang, v.scripture, v.speaker, v.itemDate, v.campId, v.fileId, v.extra, now, s.email).run(); created++;
  }
  await audit(env, s.email, 'import_files', 'library', 'bulk', `${b.kind} +${created} skip ${skipped}`);
  return json({ created, skipped }, 201);
}
