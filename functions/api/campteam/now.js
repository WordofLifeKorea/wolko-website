import { campSession, json, needLogin, needPerm, noDb, canView } from '../../lib/campteamAuth.js';
import { todayKST, isDate } from '../../lib/campteamDb.js';
import { pickCamp, staffRow, campOut, campPhase } from '../../lib/campteamNow.js';

/**
 * 「지금」 화면용 읽기 전용. 진행표(camp_timeline)를 읽는 권한(캠프별 공간 보기)과 같다.
 *  GET ?campId=&day=   → { today, camp, camps:[고를 수 있는 캠프], teams, rows } — campId 가 없으면 오늘 진행 중 캠프 → 14일 안에 시작하는 캠프 → 가장 최근 캠프.
 *                        day(YYYY-MM-DD)를 주면 그날 줄만. 시계는 화면이 가지고 계산하므로 서버는 줄 목록만 준다.
 *  GET ?summary=1      → 홈 맨 위 「지금」 카드용 가벼운 답: { today, camp|null, rows(오늘 이후) } — 30일 안에 시작하거나 진행·준비 중인 캠프가 없으면 camp:null
 * 내부 메모(notes)·연락처·금액은 내보내지 않는다. 팀 칸·준비물 칸이 아직 없는 DB 에서도 동작한다(비어 있는 값).
 */
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.campRole) return { res: json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403) };
  if (!canView(s.perms, 'camps')) return { res: needPerm('볼 수 있는 권한이 없습니다.') };
  return { s };
}
async function teamsOf(env, campId) {
  try { return (await env.DB.prepare('SELECT id, name, color, sortOrder FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL ORDER BY sortOrder, name').bind(campId).all()).results; } catch { return []; }
}
async function loadCamps(env) {
  // SELECT * — 준비 기간(prepStart/prepEnd)처럼 다른 작업이 나중에 더하는 칸이 있어도 없어도 동작한다
  return (await env.DB.prepare(`SELECT * FROM camps WHERE deletedAt IS NULL AND status != 'canceled' ORDER BY (startDate IS NULL), startDate DESC LIMIT 200`).all()).results;
}
async function loadRows(env, campId, where = '', args = []) {
  return (await env.DB.prepare(`SELECT * FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL ${where} ORDER BY dayDate, (startTime = ''), startTime, sortOrder, createdAt LIMIT 600`).bind(campId, ...args).all()).results;
}

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const p = new URL(request.url).searchParams, today = todayKST(), camps = await loadCamps(env);
  if (p.get('summary')) {
    const camp = pickCamp(camps, today, { horizon: 30, mostRecent: false });
    if (!camp) return json({ today, camp: null, rows: [] });
    const teams = await teamsOf(env, camp.id), rows = await loadRows(env, camp.id, 'AND dayDate >= ?2', [today]);
    return json({ today, camp: campOut(camp, true), rows: rows.slice(0, 80).map((r) => staffRow(r, { showOwners: true, teams })) });
  }
  const want = String(p.get('campId') || ''), camp = (want && camps.find((c) => c.id === want)) || pickCamp(camps, today, { horizon: 14, mostRecent: true });
  // 고를 수 있는 캠프: 진행 중·곧 시작·최근 끝난 캠프 위주로 짧게 (많은 캠프 목록이 폰에서 길어지지 않게)
  const near = camps.filter((c) => { const ph = campPhase(c, today); return ph.phase === 'during' || ph.phase === 'prep' || (ph.phase === 'before' && ph.dDay <= 60) || (ph.phase === 'after' && ph.dDay >= -60) || c.id === camp?.id; });
  const list = near.slice(0, 20).map((c) => campOut(c, true));
  if (!camp) return json({ today, camp: null, camps: list, teams: [], rows: [] });
  const day = String(p.get('day') || ''), teams = await teamsOf(env, camp.id);
  const rows = isDate(day) ? await loadRows(env, camp.id, 'AND dayDate = ?2', [day]) : await loadRows(env, camp.id);
  return json({ today, camp: campOut(camp, true), camps: list, teams: teams.map((t) => ({ name: t.name, color: t.color || '' })), rows: rows.map((r) => staffRow(r, { showOwners: true, teams })) });
}
