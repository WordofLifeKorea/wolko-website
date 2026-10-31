import { listMergedEvents } from './extraCalendars.js';

/**
 * 오늘 부재(휴가) 중인 사람 — 월코 직원 캘린더의 「종일」 일정 중 제목에 부재 표시(Out of office · OOO · Day off · 휴가 · 연차)가 있는 것과,
 * 캠프팀 달력의 「부재」 종류 일정을 합친다. 구글 캘린더는 읽기만 한다.
 * 제목에서 부재 표시를 빼고 남은 말을 이름으로 본다 (예: 「Aiden Out of office」 → Aiden, 「박에이든 휴가」 → 박에이든).
 * 캠프팀 명단과는 이름으로 맞춘다: 이름 한 단어면 명단 이름의 첫 단어와 같을 때(여러 명이면 모호하니 맞추지 않음), 여러 단어면 전체 이름이 같을 때.
 * 명단에 없는 월코 직원은 적은 이름 그대로 보여 준다.
 */
const KEYWORDS = [/\bout[\s-]+of[\s-]+(?:the[\s-]+)?office\b/gi, /\booo\b/gi, /\bday[\s-]*off\b/gi, /휴가/g, /연차/g];
const clean = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** 일정 제목 → 부재 중인 사람 이름 ('' 이면 부재 일정이 아님) */
export function parseOooName(summary) {
  let t = clean(summary), hit = false;
  for (const re of KEYWORDS) { re.lastIndex = 0; if (re.test(t)) hit = true; re.lastIndex = 0; t = t.replace(re, ' '); }
  if (!hit) return '';
  t = clean(t.replace(/[()[\]{}<>:|/\\,;·•–—-]+/g, ' ').replace(/\b(?:is|am|will be|on|for|the|all day)\b/gi, ' '));
  const words = t.split(' ').filter(Boolean);
  if (!words.length || words.length > 3 || t.length > 40 || /\d/.test(t)) return ''; // 문장·회의 제목 같은 것은 사람 이름으로 보지 않는다
  return t;
}

const norm = (s) => clean(s).toLowerCase().replace(/\s+/g, '');
const firstWord = (s) => clean(s).toLowerCase().split(' ')[0] || '';

/** 적은 이름 → 명단 사람(없거나 모호하면 null) */
export function matchMember(typed, members) {
  const words = clean(typed).split(' ').filter(Boolean);
  const hits = words.length === 1
    ? members.filter((m) => firstWord(m.name) === words[0].toLowerCase() || norm(m.name) === norm(typed))
    : members.filter((m) => norm(m.name) === norm(typed));
  return hits.length === 1 ? hits[0] : null;
}

const addDay = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
/** 구글 종일 일정은 끝 날짜가 「다음 날」(포함하지 않음) */
export function coversToday(ev, today) {
  if (!ev || !ev.allDay || !ev.start) return false;
  const s = String(ev.start).slice(0, 10), e = ev.end ? String(ev.end).slice(0, 10) : addDay(s, 1);
  return s <= today && today < (e > s ? e : addDay(s, 1));
}

let cache = { key: '', at: 0, events: [] };
/**
 * 오늘 부재인 사람들: [{ name, email|null }] — email 은 캠프팀 명단과 맞았을 때만 (서버 안에서 「나」 표시에만 쓰고 화면에는 보내지 않는다).
 * listEvents 는 시험용으로 바꿔 끼울 수 있다. 구글 읽기는 5분 동안 모아 둔다.
 */
export async function oooToday(env, today, { listEvents, now = Date.now() } = {}) {
  const members = await env.DB.prepare('SELECT email, name FROM camp_members WHERE active = 1').all().then((r) => r.results).catch(() => []);
  let events = [];
  const calId = env.GOOGLE_STAFF_CALENDAR_ID;
  if (listEvents || (env.GOOGLE_SERVICE_ACCOUNT_JSON && calId)) {
    const key = calId + '|' + today;
    if (!listEvents && cache.key === key && now - cache.at < 300000) events = cache.events;
    else {
      try {
        const read = listEvents || ((a) => listMergedEvents(env, { mainCalendarId: calId, includeExtras: false, ...a }).then((r) => r.events));
        events = await read({ timeMin: new Date(`${today}T00:00:00+09:00`).toISOString(), timeMax: new Date(`${addDay(today, 1)}T00:00:00+09:00`).toISOString() });
        if (!listEvents) cache = { key, at: now, events };
      } catch (e) { console.error('ooo calendar read failed:', e && e.message); }
    }
  }
  const typed = events.filter((e) => coversToday(e, today)).map((e) => parseOooName(e.summary)).filter(Boolean);
  // 캠프팀 달력의 「부재」 종류 일정 (제목에 부재 표시가 없어도 이름으로 본다)
  const own = await env.DB.prepare(`SELECT title FROM events WHERE kind = 'out' AND deletedAt IS NULL AND startDate <= ?1 AND COALESCE(endDate, startDate) >= ?1`).bind(today).all().then((r) => r.results).catch(() => []);
  for (const e of own) { const t = clean(parseOooName(e.title) || String(e.title || '').replace(/[()[\]{}<>:|/\\,;·•–—-]+/g, ' ')); if (t && t.length <= 40) typed.push(t); }
  const out = [], seen = new Set();
  for (const t of typed) {
    const m = matchMember(t, members), name = m ? m.name || t : t, key = m ? m.email.toLowerCase() : norm(t);
    if (seen.has(key)) continue; seen.add(key); out.push({ name, email: m ? m.email.toLowerCase() : null });
  }
  return out;
}
