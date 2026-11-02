import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, todayKST, isDate, audit } from '../../lib/campteamDb.js';
import { makeToken, linkStatus, endOfDayKstIso, defaultExpiryDate, cleanTeamList } from '../../lib/campteamNow.js';

/**
 * 공개 보기 링크 관리(로그인한 팀원용). 진행표를 고치는 권한(캠프별 공간 수정)이 있어야 목록·만들기·끄기를 할 수 있다 — 링크 주소가 곧 열쇠라서 보기만 하는 사람에게는 목록도 주지 않는다.
 *  GET ?campId=                    → { items:[{id,label,token,showOwners,teams,expiresAt,expiresDate,revokedAt,status,createdBy,createdAt,lastViewedAt,viewCount}], defaultExpiry }
 *  POST { campId, label, showOwners, teams, expiresDate }          → 새 링크 { item }   (expiresDate 'YYYY-MM-DD' 한국 날짜 끝까지, 빈 값 = 기한 없음, 안 보내면 기본값)
 *  POST { action:'replace', id }   → 그 링크를 끄고 같은 설정으로 새 링크 { item }
 *  DELETE ?id=                     → 「끄기」: 바로 열리지 않게 한다(기록은 남김)
 * 만들기·끄기는 활동 기록(audit)에 남긴다. 기록에는 링크 이름만 적고 토큰은 적지 않는다.
 */
const MAX_ACTIVE = 20;
async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.campRole) return { res: json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403) };
  if (!canView(s.perms, 'camps') || !canWrite(s.perms, 'camps')) return { res: needPerm('공개 링크는 진행표를 고칠 수 있는 사람만 만들 수 있어요.') };
  return { s };
}
const out = (r, now) => ({ id: r.id, campId: r.campId, label: r.label, token: r.token, showOwners: !!r.showOwners, teams: r.teams || '', expiresAt: r.expiresAt || '', expiresDate: r.expiresAt ? r.expiresAt.slice(0, 10) : '', revokedAt: r.revokedAt || '', status: linkStatus(r, now), createdBy: r.createdBy, createdAt: r.createdAt, lastViewedAt: r.lastViewedAt || '', viewCount: r.viewCount || 0 });
async function create(env, s, camp, o) {
  const active = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM camp_share_links WHERE campId = ?1 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > ?2)`).bind(camp.id, nowIso()).first()).n;
  if (active >= MAX_ACTIVE) return { error: `켜져 있는 링크가 ${MAX_ACTIVE}개예요. 안 쓰는 링크를 먼저 꺼 주세요.` };
  const id = uuid(), token = makeToken(), now = nowIso();
  await env.DB.prepare('INSERT INTO camp_share_links (id, campId, token, label, showOwners, teams, expiresAt, createdBy, createdAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)').bind(id, camp.id, token, o.label, o.showOwners ? 1 : 0, o.teams, o.expiresAt, s.email, now).run();
  await audit(env, s.email, 'share_link_create', 'share_link', id, `${camp.nameKo} · ${o.label || '이름 없음'}`);
  return { row: await env.DB.prepare('SELECT * FROM camp_share_links WHERE id = ?1').bind(id).first() };
}

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const campId = String(new URL(request.url).searchParams.get('campId') || ''); if (!campId) return badRequest('캠프를 골라 주세요.');
  const camp = await env.DB.prepare('SELECT id, endDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(campId).first(); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  let rows = []; try { rows = (await env.DB.prepare('SELECT * FROM camp_share_links WHERE campId = ?1 ORDER BY createdAt DESC LIMIT 50').bind(campId).all()).results; } catch { rows = []; }
  const now = nowIso();
  return json({ items: rows.map((r) => out(r, now)), defaultExpiry: defaultExpiryDate(camp, todayKST()) });
}
export async function onRequestPost({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  let o, camp;
  if (b.action === 'replace') {
    const old = await env.DB.prepare('SELECT * FROM camp_share_links WHERE id = ?1').bind(String(b.id || '')).first(); if (!old) return json({ error: '찾을 수 없습니다.' }, 404);
    camp = await env.DB.prepare('SELECT id, nameKo, endDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(old.campId).first(); if (!camp) return badRequest('캠프를 찾지 못했어요.');
    // 새 링크의 기한은 처음과 같은 길이가 아니라 기본값(캠프 끝 + 14일)으로 새로 정한다 — 기한이 지나 바꾸는 경우가 많아서
    o = { label: old.label, showOwners: !!old.showOwners, teams: old.teams || '', expiresAt: endOfDayKstIso(defaultExpiryDate(camp, todayKST())) };
    const made = await create(env, g.s, camp, o); if (made.error) return badRequest(made.error);
    if (!old.revokedAt) { await env.DB.prepare('UPDATE camp_share_links SET revokedAt = ?2 WHERE id = ?1 AND revokedAt IS NULL').bind(old.id, nowIso()).run(); await audit(env, g.s.email, 'share_link_revoke', 'share_link', old.id, `${camp.nameKo} · ${old.label || '이름 없음'} (새 링크로 바꿈)`); }
    return json({ item: out(made.row, nowIso()) }, 201);
  }
  camp = await env.DB.prepare('SELECT id, nameKo, endDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.campId || '')).first(); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const today = todayKST(); let expiresAt = null;
  const ed = b.expiresDate === undefined ? defaultExpiryDate(camp, today) : String(b.expiresDate || '').trim();
  if (ed) { if (!isDate(ed)) return badRequest('기한 날짜가 올바르지 않아요.'); if (ed < today) return badRequest('기한은 오늘이거나 그 뒤여야 해요.'); expiresAt = endOfDayKstIso(ed); }
  o = { label: String(b.label ?? '').replace(/\s+/g, ' ').trim().slice(0, 60), showOwners: b.showOwners === true || b.showOwners === 1 || b.showOwners === '1', teams: cleanTeamList(b.teams), expiresAt };
  const made = await create(env, g.s, camp, o); if (made.error) return badRequest(made.error);
  return json({ item: out(made.row, nowIso()) }, 201);
}
export async function onRequestDelete({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  const id = String(new URL(request.url).searchParams.get('id') || '');
  const row = await env.DB.prepare('SELECT l.*, c.nameKo AS campName FROM camp_share_links l LEFT JOIN camps c ON c.id = l.campId WHERE l.id = ?1').bind(id).first(); if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  if (!row.revokedAt) { await env.DB.prepare('UPDATE camp_share_links SET revokedAt = ?2 WHERE id = ?1 AND revokedAt IS NULL').bind(id, nowIso()).run(); await audit(env, g.s.email, 'share_link_revoke', 'share_link', id, `${row.campName || ''} · ${row.label || '이름 없음'}`); }
  return json({ ok: true });
}
