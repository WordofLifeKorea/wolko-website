import { json, noDb } from '../../lib/campteamAuth.js';
import { nowIso, todayKST } from '../../lib/campteamDb.js';
import { TOKEN_RE, GONE_BODY, linkStatus, staffRow, limitToTeams, campOut } from '../../lib/campteamNow.js';

/**
 * 공개 보기 — 로그인 없이, 링크(토큰)를 아는 사람은 누구나 「읽기만」.   GET ?t=토큰[&poll=1]
 *  - 토큰은 글자 하나까지 똑같아야 열린다. 모르는 링크·기한이 지난 링크·「끄기」한 링크는 모두 똑같은 404 답이다(어느 쪽인지 알려 주지 않음).
 *  - 열린 횟수·마지막으로 연 시각을 기록한다(poll=1 인 자동 새로고침은 횟수에 넣지 않는다).
 *  - 내보내는 것은 staffRow() 가 고른 칸(시간·제목·장소·팀·준비 메모·준비물, 링크에서 허용했을 때만 담당자 이름)과 캠프 이름·날짜·준비 기간뿐.
 *    내부 메모(notes)·연락처·금액·멤버 이메일·파일은 이 길로 나갈 수 없다.
 */
const NOSTORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...NOSTORE } });
const gone = () => send(GONE_BODY, 404);

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const p = new URL(request.url).searchParams, t = String(p.get('t') || '');
  if (!TOKEN_RE.test(t)) return gone();
  let link = null;
  try { link = await env.DB.prepare('SELECT id, campId, label, showOwners, teams, expiresAt, revokedAt FROM camp_share_links WHERE token = ?1').bind(t).first(); } catch { return gone(); } // 표가 아직 없는 DB
  if (!link || linkStatus(link, nowIso()) !== 'active') return gone();
  const camp = await env.DB.prepare('SELECT * FROM camps WHERE id = ?1').bind(link.campId).first(); // SELECT * — 준비 기간 칸이 아직 없는 DB 에서도 동작 (내보내는 칸은 campOut 이 고른다)
  if (!camp || camp.deletedAt) return gone();
  let teams = []; try { teams = (await env.DB.prepare('SELECT id, name, color FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL ORDER BY sortOrder, name').bind(link.campId).all()).results; } catch { teams = []; }
  const rows = (await env.DB.prepare(`SELECT * FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL ORDER BY dayDate, (startTime = ''), startTime, sortOrder, createdAt LIMIT 600`).bind(link.campId).all()).results;
  const limit = String(link.teams || '').split(',').map((x) => x.trim()).filter(Boolean);
  const out = limitToTeams(rows.map((r) => staffRow(r, { showOwners: !!link.showOwners, teams })), limit);
  const shownTeams = teams.map((x) => ({ name: x.name, color: x.color || '' })).filter((x) => !limit.length || limit.some((n) => n.toLowerCase() === String(x.name).toLowerCase()));
  if (!p.get('poll')) { try { await env.DB.prepare('UPDATE camp_share_links SET lastViewedAt = ?2, viewCount = viewCount + 1 WHERE id = ?1').bind(link.id, nowIso()).run(); } catch { /* 기록만 못 남길 뿐, 보기는 그대로 */ } }
  return send({ today: todayKST(), label: link.label || '', showOwners: !!link.showOwners, camp: campOut(camp, false), teams: shownTeams, rows: out });
}
