/**
 * 월코 캘린더(포탈 › 월코 캘린더, 대시보드 '다가오는 일정')에 함께 겹쳐 보여 줄 다른 구글 캘린더 — 보기 전용.
 *
 * 연결 방법: 그 구글 캘린더의 '특정 사용자와 공유'에 서비스 계정 이메일(GOOGLE_SERVICE_ACCOUNT_JSON 의 client_email)을
 * '모든 일정 세부정보 보기' 권한으로 넣고, 아래 EXTRA_CALENDARS 에 한 줄 추가한다.
 * (Cloudflare 환경 변수 GOOGLE_EXTRA_CALENDARS 에 같은 모양의 JSON 배열을 넣으면 그것이 우선한다.)
 *   { key: 'short-id', id: '…@group.calendar.google.com', name_ko: '표시 이름', name_en: 'Display name', color: '#hex' }
 * 포탈에서는 이 캘린더의 일정을 만들거나 고칠 수 없다. 한 캘린더를 못 읽어도 월코 캘린더는 그대로 보인다.
 */
import { listCalendarEvents } from './googleCalendar.js';

export const EXTRA_CALENDARS = [
  { key: 'school-ministry', id: '0td0ui68ldb21umdoackqhcqs0@group.calendar.google.com', name_ko: 'School Ministry', name_en: 'School Ministry', color: '#0b8043' },
];

const KEY_RE = /^[a-z0-9-]{1,24}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function extraCalendars(env = {}) {
  let list = EXTRA_CALENDARS;
  if (env.GOOGLE_EXTRA_CALENDARS) {
    try { list = JSON.parse(env.GOOGLE_EXTRA_CALENDARS); } catch (e) { console.error('GOOGLE_EXTRA_CALENDARS 를 읽지 못했습니다:', e.message); }
  }
  return (Array.isArray(list) ? list : [])
    .filter(c => c && KEY_RE.test(String(c.key || '')) && String(c.id || '').includes('@'))
    .map(c => ({ key: c.key, id: String(c.id), name_ko: String(c.name_ko || c.name_en || c.key), name_en: String(c.name_en || c.name_ko || c.key), color: COLOR_RE.test(c.color || '') ? c.color : '#8a6d3b' }));
}

/** 다른 캘린더 일정의 id 는 '<key>:<구글 id>' — 월코 캘린더 일정(구글 id 에는 ':' 가 없다)과 구분해 수정·삭제를 막는다 */
export const isExtraEventId = id => String(id || '').includes(':');

/**
 * 월코 캘린더 + 다른 캘린더 일정을 한 목록으로. 다른 캘린더 일정에는 calendar(key)·readOnly 표시.
 * mainCalendarId 가 없으면 다른 캘린더만. 다른 캘린더 하나가 실패하면 그 캘린더만 빠지고 calendars[].error 로 알린다.
 */
export async function listMergedEvents(env, { mainCalendarId, timeMin, timeMax, includeExtras = true }) {
  const extras = includeExtras ? extraCalendars(env) : [];
  const jobs = [
    mainCalendarId ? listCalendarEvents({ serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON, calendarId: mainCalendarId, timeMin, timeMax }) : Promise.resolve([]),
    ...extras.map(c => listCalendarEvents({ serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON, calendarId: c.id, timeMin, timeMax })),
  ];
  const results = await Promise.allSettled(jobs);
  if (results[0].status === 'rejected') throw results[0].reason;   // 월코 캘린더를 못 읽으면 지금처럼 오류
  const events = results[0].value.map(e => ({ ...e, calendar: 'main' }));
  const calendars = extras.map((c, i) => {
    const r = results[i + 1];
    if (r.status === 'rejected') { console.error(`extra calendar ${c.key} failed:`, r.reason?.message || r.reason); return { key: c.key, name_ko: c.name_ko, name_en: c.name_en, color: c.color, error: true }; }
    r.value.forEach(e => events.push({ ...e, id: `${c.key}:${e.id}`, colorId: null, calendar: c.key, readOnly: true }));
    return { key: c.key, name_ko: c.name_ko, name_en: c.name_en, color: c.color };
  });
  return { events, calendars };
}
