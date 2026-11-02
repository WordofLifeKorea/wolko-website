/**
 * 큐시트(진행표 + 팀별 준비) 서버 쪽 도구.
 *  1) groupByDay / currentAndNext / staffView — public/portal/campteam/cue-core.js 의 거울(같은 약속, 같은 결과). 공유 링크처럼 서버에서 같은 계산이 필요할 때 쓴다. 시험이 둘을 비교한다.
 *     staffView 는 시간·제목·장소·팀·할 일·준비물·준비 몇 분 전만 돌려주고, 내부 메모(notes)와 담당자는 절대 넣지 않는다.
 *  2) 칸 정리: cleanTeamName / cleanItems / cleanPrepMinutes / cleanCueFields(진행표 한 줄의 새 칸들) / cleanTeam(camp_teams 한 줄)
 *  3) 표 가져오기: cleanImportRow · importKey · planImport(미리보기·저장 공통) — 같은 날+시간+제목+팀이면 이미 있는 줄로 보고 건너뛴다.
 */
import { S, L, isDay, clock, pick } from './campteamCrud.js';
import { uuid, nowIso } from './campteamDb.js';

export const TEAM_ALL = '전체';
export const TEAM_COLORS = ['#2f7fd1', '#d2557a', '#2e9e6b', '#e08a1e', '#7a5cc7', '#16899c', '#b8662b', '#5b6b7a'];
export const LIMITS = { team: 30, prepNotes: 1000, items: 1000, itemLine: 60, itemLines: 40, importRows: 400, teams: 40 };

// ---- cue-core 거울 ----
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t ?? '').trim()); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
const dayNum = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '')); if (!m) return null; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); return Number.isNaN(t) ? null : Math.round(t / 86400000); };
const so = (r) => { const n = Number(r?.sortOrder); return Number.isFinite(n) ? n : 0; };
const str = (v) => (v == null ? '' : String(v));

export function groupByDay(rows) {
  const list = [];
  (Array.isArray(rows) ? rows : []).forEach((r, i) => { if (r && dayNum(r.dayDate) != null) list.push({ r, i, m: toMin(r.startTime) }); });
  list.sort((a, b) => {
    if (a.r.dayDate !== b.r.dayDate) return a.r.dayDate < b.r.dayDate ? -1 : 1;
    const am = a.m == null ? 1e9 : a.m, bm = b.m == null ? 1e9 : b.m; if (am !== bm) return am - bm;
    return so(a.r) - so(b.r) || a.i - b.i;
  });
  const out = [], by = {};
  for (const x of list) { const d = x.r.dayDate; if (!by[d]) { by[d] = { day: d, rows: [] }; out.push(by[d]); } by[d].rows.push(x.r); }
  return out;
}

export function currentAndNext(rows, now) {
  const out = { current: null, next: null, later: [], alsoNow: [] };
  const nd = now ? dayNum(now.date) : null, nm = now ? Number(now.minutes) : NaN;
  if (nd == null || !Number.isFinite(nm)) return out;
  const nowAbs = nd * 1440 + nm, list = [];
  (Array.isArray(rows) ? rows : []).forEach((r, i) => {
    if (!r) return; const d = dayNum(r.dayDate), s = toMin(r.startTime); if (d == null || s == null) return;
    list.push({ r, i, d, sm: s, em: toMin(r.endTime), s: d * 1440 + s, e: 0 });
  });
  list.sort((a, b) => a.s - b.s || so(a.r) - so(b.r) || a.i - b.i);
  list.forEach((x, k) => {
    if (x.em != null && x.em > x.sm) x.e = x.d * 1440 + x.em;
    else if (x.em != null && x.em < x.sm) x.e = (x.d + 1) * 1440 + x.em;
    else { let nx = null; for (let j = k + 1; j < list.length; j++) if (list[j].s > x.s) { nx = list[j]; break; } x.e = nx && nx.d === x.d ? nx.s : x.s + 60; }
  });
  const cur = list.filter((x) => x.s <= nowAbs && nowAbs < x.e);
  if (cur.length) { let main = cur[0]; for (const x of cur) if (x.s > main.s) main = x; out.current = main.r; out.alsoNow = cur.filter((x) => x !== main).map((x) => x.r); }
  const up = list.filter((x) => x.s > nowAbs);
  if (up.length) { out.next = up[0].r; out.later = up.slice(1).filter((x) => x.d === up[0].d).map((x) => x.r); }
  return out;
}

export function staffView(row) {
  const r = row || {}; let pm = r.prepMinutes;
  pm = pm === null || pm === undefined || pm === '' ? null : Number(pm); if (pm !== null && !Number.isFinite(pm)) pm = null;
  return { dayDate: str(r.dayDate), startTime: str(r.startTime), endTime: str(r.endTime), title: str(r.title), place: str(r.place), team: str(r.team), prepNotes: str(r.prepNotes), items: str(r.items), prepMinutes: pm };
}

// ---- 칸 정리 ----
export const cleanTeamName = (x) => S(x, LIMITS.team);
/** 준비물: 줄마다 하나. 빈 줄·앞뒤 공백을 없애고 줄 수·길이를 제한한다 */
export const cleanItems = (x) => String(x ?? '').replace(/\r/g, '').split('\n').map((s) => s.replace(/\s+/g, ' ').trim().slice(0, LIMITS.itemLine)).filter(Boolean).slice(0, LIMITS.itemLines).join('\n');
/** 준비 몇 분 전: 비어 있으면 null, 0~720 의 정수. 그 밖의 값은 null 대신 오류(undefined 를 돌려 줘서 부른 쪽이 안내) */
export function cleanPrepMinutes(x) {
  if (x === null || x === undefined || String(x).trim() === '') return null;
  const n = Number(String(x).trim()); return Number.isInteger(n) && n >= 0 && n <= 720 ? n : undefined;
}
/** 진행표 한 줄의 새 칸들(팀·할 일·준비물·준비 몇 분 전). 보내지 않은 칸은 기존 값을 그대로 둔다 */
export function cleanCueFields(b, base = {}) {
  const pm = 'prepMinutes' in b ? cleanPrepMinutes(b.prepMinutes) : (base.prepMinutes ?? null);
  if (pm === undefined) return { error: '준비 시간은 0~720 사이의 분(숫자)으로 적어 주세요.' };
  return { v: { team: pick(b, base, 'team', cleanTeamName), prepNotes: pick(b, base, 'prepNotes', (x) => L(x, LIMITS.prepNotes)), items: pick(b, base, 'items', cleanItems), prepMinutes: pm } };
}
/** camp_teams 한 줄: 이름(캠프 안에서 겹치면 안 됨, 「전체」는 이미 있는 이름) · 색(#rrggbb 또는 비움) · 순서 */
export async function cleanTeam(b, base, env) {
  const campId = base.campId || S(b.campId, 60);
  if (!campId || !(await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(campId).first())) return { error: '캠프를 찾지 못했어요.' };
  const name = pick(b, base, 'name', cleanTeamName); if (!name) return { error: '팀 이름을 입력해주세요.' };
  if (name === TEAM_ALL) return { error: '「전체」는 모두를 뜻하는 이름이라 이미 쓸 수 있어요. 다른 이름을 써 주세요.' };
  const dup = await env.DB.prepare('SELECT id FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL AND name = ?2 COLLATE NOCASE AND id != ?3').bind(campId, name, base.id || '').first();
  if (dup) return { error: '같은 이름의 팀이 이미 있어요.' };
  const color = 'color' in b ? S(b.color, 9) : (base.color || ''); if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: '색은 #2f7fd1 같은 모양이어야 해요.' };
  let sortOrder = 'sortOrder' in b ? parseInt(b.sortOrder, 10) : base.sortOrder;
  if (!Number.isFinite(sortOrder)) { const m = await env.DB.prepare('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL').bind(campId).first(); sortOrder = (m?.m ?? -1) + 1; }
  return { v: { campId, name, color: color ? color.toLowerCase() : base.color || (!base.id ? TEAM_COLORS[sortOrder % TEAM_COLORS.length] : ''), sortOrder } };
}

// ---- 표 가져오기 ----
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
export const importKey = (r) => `${r.dayDate}|${r.startTime}|${norm(r.title)}|${norm(r.team)}`;
/** 가져올 한 줄 정리(화면에서 읽은 값을 서버가 다시 검사). 못 쓰는 줄은 { error } */
export function cleanImportRow(x) {
  const r = x || {}, dayDate = String(r.dayDate || '').slice(0, 10);
  if (!isDay(dayDate)) return { error: '날짜를 읽지 못했어요' };
  const title = S(r.title, 120); if (!title) return { error: '일정 이름이 없어요' };
  const startTime = clock(r.startTime), endTime = clock(r.endTime);
  if (String(r.startTime || '').trim() && !startTime) return { error: '시작 시간을 읽지 못했어요' };
  if (String(r.endTime || '').trim() && !endTime) return { error: '끝 시간을 읽지 못했어요' };
  if (startTime && endTime && endTime < startTime) return { error: '끝나는 시간이 시작보다 빨라요' };
  return { v: { dayDate, startTime, endTime, title, place: S(r.place, 80), team: cleanTeamName(r.team), prepNotes: L(r.prepNotes, LIMITS.prepNotes), items: cleanItems(r.items) } };
}
/** rows(화면에서 읽은 줄들) + existing(이미 저장된 줄들) → 줄마다 { status:'new'|'dup'|'bad', reason?, row? } 와 새로 쓸 줄 목록 */
export function planImport(rows, existing) {
  const have = new Set((existing || []).map(importKey)), results = [], fresh = [];
  for (const raw of (rows || []).slice(0, LIMITS.importRows)) {
    const { v, error } = cleanImportRow(raw);
    if (error) { results.push({ status: 'bad', reason: error }); continue; }
    const k = importKey(v);
    if (have.has(k)) { results.push({ status: 'dup', row: v }); continue; }
    have.add(k); fresh.push(v); results.push({ status: 'new', row: v });
  }
  return { results, fresh };
}

/** 팀 목록에 없는 이름을 캠프 팀으로 만든다(「전체」·빈 이름·이미 있는 이름은 건너뜀). 새로 만든 이름 목록을 돌려준다 */
export async function ensureTeams(env, campId, names, email = '') {
  const have = new Set(((await env.DB.prepare('SELECT name FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL').bind(campId).all()).results || []).map((r) => norm(r.name)));
  const m = await env.DB.prepare('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM camp_teams WHERE campId = ?1 AND deletedAt IS NULL').bind(campId).first();
  let order = (m?.m ?? -1) + 1; const made = [], now = nowIso();
  for (const n of names || []) {
    const name = cleanTeamName(n); if (!name || name === TEAM_ALL || have.has(norm(name))) continue;
    if (have.size >= LIMITS.teams) break;
    have.add(norm(name)); made.push(name);
    await env.DB.prepare('INSERT INTO camp_teams (id,campId,name,color,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?6,?7)').bind(uuid(), campId, name, TEAM_COLORS[order % TEAM_COLORS.length], order, now, email).run(); order++;
  }
  return made;
}
