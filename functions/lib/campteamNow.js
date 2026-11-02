import { addDays, isDate } from './campteamDb.js';

/**
 * 「지금」 화면과 공개 보기 링크가 같이 쓰는 도우미.
 *  - 어느 캠프를 보여 줄지(pickCamp) · 진행표 한 줄에서 「스태프에게 보여도 되는 칸」만 고르기(staffRow) · 공개 링크 토큰 · 기한 계산
 *  진행표(camp_timeline)의 새 칸(team·prepNotes·items·prepMinutes)과 팀 표(camp_teams)는 다른 작업이 더하므로, 없어도 비어 있는 값처럼 동작한다.
 */

const S = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const L = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);

// ── 캠프 고르기 ─────────────────────────────────────────────
export const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

/** 캠프의 지금 단계: during(캠프 중) · prep(준비 기간) · before(시작 전) · after(끝남) · unknown(날짜 없음). dDay = 시작까지 남은 날(시작 전만 양수) */
export function campPhase(camp, today) {
  const s = isDate(camp?.startDate) ? camp.startDate : '', e = isDate(camp?.endDate) ? camp.endDate : s;
  const ps = isDate(camp?.prepStart) ? camp.prepStart : '', pe = isDate(camp?.prepEnd) ? camp.prepEnd : '';
  const dDay = s ? dayDiff(today, s) : null;
  if (s && s <= today && today <= e) return { phase: 'during', dDay };
  if (ps && ps <= today && today <= (pe || s || ps)) return { phase: 'prep', dDay };
  if (!s) return { phase: 'unknown', dDay: null };
  return { phase: s > today ? 'before' : 'after', dDay };
}

/**
 * 보여 줄 캠프 하나: ① 오늘 진행 중(캠프 기간·준비 기간) ② horizon 일 안에 시작하는 가장 가까운 캠프
 * ③ (mostRecent 가 켜져 있으면) 가장 최근에 끝난 캠프, 없으면 가장 가까운 앞날 캠프. 취소·삭제된 캠프는 건너뛴다.
 */
export function pickCamp(camps, today, { horizon = 14, mostRecent = true } = {}) {
  const list = (camps || []).filter((c) => c && c.status !== 'canceled' && !c.deletedAt);
  const withP = list.map((c) => ({ c, p: campPhase(c, today) }));
  const running = withP.filter((x) => x.p.phase === 'during' || x.p.phase === 'prep').sort((a, b) => String(a.c.endDate || a.c.startDate || '').localeCompare(String(b.c.endDate || b.c.startDate || '')));
  if (running.length) return running[0].c;
  const up = withP.filter((x) => x.p.phase === 'before').sort((a, b) => a.p.dDay - b.p.dDay);
  if (up.length && up[0].p.dDay <= horizon) return up[0].c;
  if (!mostRecent) return null;
  const past = withP.filter((x) => x.p.phase === 'after').sort((a, b) => String(b.c.endDate || b.c.startDate).localeCompare(String(a.c.endDate || a.c.startDate)));
  return past[0]?.c || up[0]?.c || null;
}

// ── 진행표 한 줄 → 스태프가 봐도 되는 칸만 ─────────────────────
/** 준비물 칸은 글 줄바꿈·쉼표 목록이거나 JSON 목록일 수 있다 → 짧은 글 목록으로 */
export function parseItems(v) {
  let arr = [];
  if (Array.isArray(v)) arr = v;
  else {
    const s = String(v ?? '').trim();
    if (s.startsWith('[')) { try { const j = JSON.parse(s); if (Array.isArray(j)) arr = j; } catch { arr = s.split(/\n/); } }
    else arr = s.split(/\n|;/);
  }
  return arr.map((x) => (x && typeof x === 'object' ? (x.name ?? x.title ?? x.text ?? '') : x)).map((x) => S(x, 120)).filter(Boolean).slice(0, 30);
}
/** 팀 칸(쉼표로 여러 팀) → 팀 이름 목록. 팀 표(camp_teams)에 같은 id 나 이름이 있으면 그 이름으로 */
export function rowTeamNames(row, teams = []) {
  const byId = new Map(), byName = new Map();
  for (const t of teams) { byId.set(String(t.id), t.name); byName.set(String(t.name).toLowerCase(), t.name); }
  const out = [];
  for (const tok of String(row?.team ?? '').split(',').map((x) => S(x, 40)).filter(Boolean)) {
    const nm = byId.get(tok) || byName.get(tok.toLowerCase()) || tok;
    if (!out.includes(nm)) out.push(nm);
  }
  return out;
}
/** 공개·화면용 한 줄. notes(내부 메모)·연락처·금액은 절대 넣지 않는다. 담당자 이름은 showOwners 일 때만 */
export function staffRow(r, { showOwners = false, teams = [] } = {}) {
  const pm = Math.round(Number(r.prepMinutes));
  const o = {
    dayDate: S(r.dayDate, 10), startTime: S(r.startTime, 5), endTime: S(r.endTime, 5),
    title: S(r.title, 120), titleEn: S(r.titleEn, 120), place: S(r.place, 80),
    team: rowTeamNames(r, teams).join(', '),
    prepNotes: L(r.prepNotes, 600), items: parseItems(r.items), prepMinutes: Number.isFinite(pm) && pm > 0 ? Math.min(pm, 720) : 0,
  };
  if (showOwners) o.ownerName = S(r.ownerName, 60);
  return o;
}
/** 공개 링크에 팀 제한이 있으면 그 팀 일정 + 팀이 정해지지 않은 공통 일정만 */
export function limitToTeams(rows, teamList) {
  const want = new Set((teamList || []).map((x) => String(x).toLowerCase()));
  if (!want.size) return rows;
  return rows.filter((r) => !r.team || r.team.split(',').some((t) => want.has(t.trim().toLowerCase())));
}
/** 캠프 정보 중 화면에 보여도 되는 칸 (internal=false 면 장소 같은 것도 뺀다) */
export function campOut(c, internal = false) {
  const o = { nameKo: S(c.nameKo, 120), nameEn: S(c.nameEn, 120), startDate: c.startDate || '', endDate: c.endDate || '', prepStart: isDate(c.prepStart) ? c.prepStart : '', prepEnd: isDate(c.prepEnd) ? c.prepEnd : '' };
  if (internal) { o.id = c.id; o.status = c.status; }
  return o;
}

// ── 공개 링크 ─────────────────────────────────────────────
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;
/** crypto.getRandomValues 32바이트 → 주소에 쓸 수 있는 43글자 (추측 불가) */
export function makeToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  let s = ''; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** 한국 날짜 하루의 끝(23:59:59.999 KST)을 UTC ISO 로 */
export const endOfDayKstIso = (date) => date + 'T14:59:59.999Z';
/** 기한 기본값: 캠프 끝 + 14일, 끝 날짜가 없으면 오늘 + 30일 (YYYY-MM-DD) */
export function defaultExpiryDate(camp, today) { return (isDate(camp?.endDate) ? addDays(camp.endDate, 14) : null) || addDays(today, 30); }
export function linkStatus(row, nowIsoStr) {
  if (row.revokedAt) return 'revoked';
  if (row.expiresAt && row.expiresAt <= nowIsoStr) return 'expired';
  return 'active';
}
/** 팀 이름 입력(배열 또는 쉼표 글) → 쉼표로 이은 글 (쉼표가 들어간 이름은 없앤다) */
export function cleanTeamList(v) {
  const arr = Array.isArray(v) ? v : String(v ?? '').split(',');
  return [...new Set(arr.map((x) => S(String(x).replace(/,/g, ' '), 40)).filter(Boolean))].slice(0, 12).join(',');
}
/** 모르는 링크·끝난 링크·꺼진 링크는 모두 이 똑같은 답으로 — 어느 쪽인지 알려 주지 않는다 */
export const GONE_BODY = { error: '이 링크는 없거나 더 이상 쓸 수 없어요.', code: 'gone' };
