import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, isDate, todayKST, audit, normTags, likeOf } from '../../lib/campteamDb.js';

const KINDS = ['proposal', 'direction', 'final', 'hold', 'changed'], STATES = ['active', 'superseded', 'withdrawn'];
const EFFECTIVE_KINDS = `('direction','final','changed')`;
const SELECT = `SELECT d.id, d.meetingId, d.agendaItemId, d.campId, d.kind, d.textKo, d.textEn, d.decidedDate, d.supersedesId, d.state, d.tags, d.isTest,
    m.title AS meetingTitle, m.titleEn AS meetingTitleEn, c.nameKo AS campKo, c.nameEn AS campEn,
    (SELECT x.id FROM decisions x WHERE x.supersedesId = d.id AND x.deletedAt IS NULL LIMIT 1) AS supersededBy
  FROM decisions d LEFT JOIN meetings m ON m.id = d.meetingId LEFT JOIN camps c ON c.id = COALESCE(d.campId, m.campId)`;

/**
 * 결정 목록: ?campId= &meetingId= &kind= &state= &tag= &q= &effective=1(현재 유효한 결정만) &history=1(대체 관계를 묶어서)
 * 현재 유효 = 상태가 active 이고 종류가 방향 합의/최종 결정/변경 인 것. 제안·보류는 "아직 결정 아님".
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const p = new URL(request.url).searchParams, where = ['d.deletedAt IS NULL'], args = [];
  if (p.get('campId') === 'none') where.push('COALESCE(d.campId, m.campId) IS NULL'); else if (p.get('campId')) { where.push('COALESCE(d.campId, m.campId) = ?'); args.push(p.get('campId')); }
  if (p.get('meetingId')) { where.push('d.meetingId = ?'); args.push(p.get('meetingId')); }
  if (KINDS.includes(p.get('kind'))) { where.push('d.kind = ?'); args.push(p.get('kind')); }
  if (STATES.includes(p.get('state'))) { where.push('d.state = ?'); args.push(p.get('state')); }
  if (p.get('effective') === '1') where.push(`d.state = 'active' AND d.kind IN ${EFFECTIVE_KINDS}`);
  const tag = text(p.get('tag'), 40).toLowerCase(); if (tag) { where.push('d.tags LIKE ?'); args.push(`%,${tag},%`); }
  const q = text(p.get('q'), 80); if (q) { where.push(`(d.textKo LIKE ? ESCAPE '\\' OR d.textEn LIKE ? ESCAPE '\\')`); args.push(likeOf(q), likeOf(q)); }
  const rows = (await env.DB.prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY d.decidedDate DESC, d.createdAt DESC LIMIT 300`).bind(...args).all()).results;
  if (p.get('history') !== '1') return json({ items: rows, perms: s.perms });
  // 대체 관계 따라 묶기: 가장 처음 결정 → 바뀐 결정 → … → 지금 유효한 결정
  const byId = new Map(rows.map(r => [r.id, r])), chains = [], seen = new Set();
  const next = (r) => rows.find(x => x.supersedesId === r.id);
  for (const r of rows.filter(x => !x.supersedesId || !byId.has(x.supersedesId)).sort((a, b) => String(a.decidedDate).localeCompare(String(b.decidedDate)))) {
    const chain = []; let cur = r; while (cur && !seen.has(cur.id)) { seen.add(cur.id); chain.push(cur); cur = next(cur); }
    chains.push(chain);
  }
  chains.sort((a, b) => String(b[b.length - 1].decidedDate).localeCompare(String(a[a.length - 1].decidedDate)));
  return json({ chains, perms: s.perms });
}

/** 결정 기록: { meetingId?, agendaItemId?, campId?, kind, textKo, textEn, decidedDate?, supersedesId?, tags? } — supersedesId 가 있으면 이전 결정은 "대체됨" 으로 남는다(지우지 않음) */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!KINDS.includes(b.kind)) return badRequest('결정 종류가 올바르지 않습니다.');
  const textKo = text(b.textKo, 1000), textEn = text(b.textEn, 1000);
  if (!textKo && !textEn) return badRequest('결정 내용을 입력해주세요.');
  let campId = b.campId || null, decided = b.decidedDate ? String(b.decidedDate) : null;
  if (b.meetingId) {
    const m = await env.DB.prepare('SELECT id, campId, meetDate FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId)).first();
    if (!m) return badRequest('회의를 찾을 수 없습니다.'); campId = campId || m.campId; decided = decided || m.meetDate;
  }
  decided = decided || todayKST(); if (!isDate(decided)) return badRequest('날짜 형식이 올바르지 않습니다.');
  if (campId && !(await env.DB.prepare('SELECT 1 AS x FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(campId)).first())) return badRequest('캠프를 찾을 수 없습니다.');
  if (b.agendaItemId && !(await env.DB.prepare('SELECT 1 AS x FROM agenda_items WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.agendaItemId)).first())) return badRequest('안건을 찾을 수 없습니다.');
  let old = null;
  if (b.supersedesId) {
    old = await env.DB.prepare('SELECT id, state FROM decisions WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.supersedesId)).first();
    if (!old) return badRequest('대체할 이전 결정을 찾을 수 없습니다.');
    if (old.state === 'superseded') return badRequest('이미 다른 결정으로 대체된 결정입니다. 가장 최근 결정을 선택해주세요.');
  }
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO decisions (id,meetingId,agendaItemId,campId,kind,textKo,textEn,decidedDate,supersedesId,state,tags,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'active',?10,?11,?11,?12)`)
    .bind(id, b.meetingId || null, b.agendaItemId || null, campId, b.kind, textKo, textEn, decided, old ? old.id : null, normTags(b.tags), now, s.email).run();
  if (old) await env.DB.prepare(`UPDATE decisions SET state = 'superseded', updatedAt = ?2 WHERE id = ?1`).bind(old.id, now).run();
  await audit(env, s.email, old ? 'supersede' : 'create', 'decision', id, `${b.kind}${old ? ' ← ' + old.id : ''}`);
  return json({ id }, 201);
}

/** 수정: 내용·종류·태그·날짜, 또는 state=withdrawn(철회). 대체 관계는 바꾸지 않는다. */
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('수정 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT * FROM decisions WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const kind = 'kind' in b ? b.kind : row.kind; if (!KINDS.includes(kind)) return badRequest('결정 종류가 올바르지 않습니다.');
  const state = 'state' in b ? b.state : row.state;
  if (!STATES.includes(state) || (state === 'superseded' && row.state !== 'superseded')) return badRequest('상태가 올바르지 않습니다. (대체됨은 새 결정을 기록할 때 자동으로 정해집니다)');
  const textKo = 'textKo' in b ? text(b.textKo, 1000) : row.textKo, textEn = 'textEn' in b ? text(b.textEn, 1000) : row.textEn;
  if (!textKo && !textEn) return badRequest('결정 내용을 입력해주세요.');
  const decided = 'decidedDate' in b ? String(b.decidedDate || '') : row.decidedDate; if (decided && !isDate(decided)) return badRequest('날짜 형식이 올바르지 않습니다.');
  await env.DB.prepare('UPDATE decisions SET kind=?2,state=?3,textKo=?4,textEn=?5,decidedDate=?6,tags=?7,updatedAt=?8 WHERE id=?1')
    .bind(id, kind, state, textKo, textEn, decided || null, 'tags' in b ? normTags(b.tags) : row.tags, nowIso()).run();
  await audit(env, s.email, 'update', 'decision', id, `${kind}/${state}`);
  return json({ ok: true });
}

/** 삭제 표시. 이 결정이 이전 결정을 대체했었다면 이전 결정을 다시 유효하게 되돌린다. */
export async function onRequestDelete({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.write) return needPerm('삭제 권한이 없습니다.');
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare('SELECT supersedesId FROM decisions WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const now = nowIso();
  await env.DB.prepare('UPDATE decisions SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(id, now).run();
  if (row.supersedesId) await env.DB.prepare(`UPDATE decisions SET state = 'active', updatedAt = ?2 WHERE id = ?1 AND state = 'superseded'`).bind(row.supersedesId, now).run();
  await audit(env, s.email, 'delete', 'decision', id);
  return json({ ok: true });
}
