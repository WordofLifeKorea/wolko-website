/**
 * 포탈 첫 화면(대시보드) 데이터 — 이번 주 공지, 오늘 키친 듀티·차량 운행, 다가오는 일정, 최근 업데이트된 교회.
 * 각 조각은 따로 읽어서 하나가 실패해도(캘린더 미연결 등) 나머지는 그대로 보여 준다.
 */
import { SLOTS as KITCHEN_SLOTS, readDay } from './kitchenDuty.js';
import { SLOTS as DRIVE_SLOTS, closedKey as driveClosedKey, currentWeekStart, isSlotClosed as driveSlotClosed, periodFor, shownName, slotKey, todayKst } from './carDrive.js';
import { listCalendarEvents } from './googleCalendar.js';
import { firebaseDatabaseToken } from './firebaseCrsDatabase.js';
import { prayerBoard } from './prayers.js';
import { needsTranslation, translateNotice } from './prayerTranslate.js';
import { alwaysExempt } from './gospelReminder.js';
import { reportMonth, loadMonth, ownerOf } from './gospelStats.js';
import { crsLocation } from './crsMinistry.js';
import { NOTICE_AUDIENCES, normalizeCampus } from './campus.js';

export const NOTICES_KEY = 'portal:notices';
/** 마스터·관리자 말고도 공지를 올릴 수 있는 계정 — 본인이 올린 공지만 지울 수 있다 */
export const NOTICE_POSTER_EMAILS = ['esooy@wol.org'];
const isAdminRole = session => session?.role === 'master' || session?.role === 'admin';
export const canPostNotices = session => isAdminRole(session) || NOTICE_POSTER_EMAILS.includes(String(session?.email || '').trim().toLowerCase());
/** 이 공지를 지울 수 있는지 — 관리자는 모두, 공지 담당 계정은 자기가 올린 것만 */
export const canDeleteNotice = (session, notice) => isAdminRole(session) || (canPostNotices(session) && !!notice?.byEmail && notice.byEmail === String(session.email).trim().toLowerCase());
export const MAX_NOTICES = 60;
const DASH_CHURCH_KEY = 'portal:dash-churches-v3';
const DASH_CHURCH_SECONDS = 300;
export const CRS_DATABASE = 'https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app';
const DAY = 86400000;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanBlock = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** 공지 목록(KV) — 배열이 아니면 빈 목록 */
export async function readNotices(env) {
  const list = await env.CAMP_KV.get(NOTICES_KEY, 'json');
  return Array.isArray(list) ? list.filter(n => n && n.id && n.body) : [];
}

/** 번역이 아직 없는 공지(이미 올라가 있던 것 · 번역에 실패했던 것)를 번역해 저장한다 — 첫 화면을 열 때 뒤에서 돌고, 실패하면 1시간 뒤에 다시 시도한다 */
export async function translateMissingNotices(env, { now = Date.now(), limit = 3, fetchImpl } = {}) {
  if (!env.ANTHROPIC_API_KEY) return 0;
  const list = await env.CAMP_KV.get(NOTICES_KEY, 'json');
  if (!Array.isArray(list)) return 0;
  const todo = list.filter(n => n && n.id && n.body && needsTranslation(n.title || '', n.body, n.tr?.lang) && !(n.trTry && now - n.trTry < 3600000)).slice(0, limit);
  let done = 0;
  for (const n of todo) {
    const tr = await translateNotice(env, n, { fetchImpl });
    if (tr) { n.tr = tr; delete n.trTry; done++; } else n.trTry = now;
  }
  if (todo.length) await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(list));
  return done;
}

/** 이번 주(일요일부터 새 주) 공지 — 고정(pinned) 공지는 먼저, 나머지는 최근 순.
 *  마감일(dueDate)이 아직 지나지 않은 지난 주 공지도 마감일까지는 계속 보여 준다(today 를 넘겼을 때). */
export function noticesForWeek(list, weekStart, today = '') {
  return list
    .filter(n => n.weekStart === weekStart || (today && n.dueDate && n.dueDate >= today && n.weekStart < weekStart))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

const validYmd = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && addDays(v, 0) === v;

/** 공지 입력 정리 — 제목(선택)·내용(필수)·적용 주(이번 주/다음 주)·마감일(선택)·고정 여부 */
/** 이 소속에게 보이는 공지 — campus 가 'all' 이면 모두, 'wolko'/'jeju' 면 그 소속만. 값이 없는 옛 공지는 평택(처음엔 평택만 쓰던 시스템) */
export const noticeAudience = n => (NOTICE_AUDIENCES.includes(n?.campus) ? n.campus : 'wolko');
export const noticesForCampus = (list, campus) => list.filter(n => { const a = noticeAudience(n); return a === 'all' || a === normalizeCampus(campus); });

export function parseNoticeInput(body, today) {
  const text = cleanBlock(body?.body, 600);
  if (!text) return { error: '공지 내용을 입력해 주세요.' };
  const thisWeek = currentWeekStart(today);
  const weekStart = body?.week === 'next' ? addDays(thisWeek, 7) : thisWeek;
  const dueRaw = clean(body?.dueDate, 10);
  if (dueRaw && !validYmd(dueRaw)) return { error: '마감일 형식이 올바르지 않습니다.' };
  const audience = NOTICE_AUDIENCES.includes(body?.campus) ? body.campus : '';   // '' 이면 올리는 사람 소속으로 (API 에서 채운다)
  return { value: { title: clean(body?.title, 60), body: text, weekStart, dueDate: dueRaw, pinned: body?.pinned === true, ...(audience ? { campus: audience } : {}) } };
}

/** 오늘 키친 듀티 — 식사별 { meal, prep[], clean[] }, 신청이 있는 식사만 */
export async function kitchenToday(env, today) {
  const day = await readDay(env, today);
  const names = slot => (day[slot] || []).map(p => shownName(p)).filter(Boolean);
  return ['am', 'lunch', 'dinner']
    .map(meal => ({ meal, prep: names(`${meal}_prep`), clean: names(`${meal}_clean`) }))
    .filter(m => m.prep.length || m.clean.length);
}

/** 오늘 차량 운행(픽업·드롭오프) 담당 이름 — 없으면 null. closed 는 관리자가 닫은(또는 기본으로 닫힌) 칸 */
export async function carToday(env, today) {
  const [closedMap, pickup, dropoff] = await Promise.all([
    env.CAMP_KV.get(driveClosedKey(periodFor(today).start), 'json'),
    ...DRIVE_SLOTS.map(slot => env.CAMP_KV.get(slotKey(today, slot), 'json')),
  ]);
  return {
    pickup: pickup ? shownName(pickup) : null,
    dropoff: dropoff ? shownName(dropoff) : null,
    closed: { pickup: driveSlotClosed(closedMap, today, 'pickup', !!pickup), dropoff: driveSlotClosed(closedMap, today, 'dropoff', !!dropoff) },
  };
}

/** 오늘부터 14일 안의 일정 몇 개 — 캘린더가 연결되지 않았으면 null */
export async function upcomingEvents(env, today, limit = 5, campus = 'wolko') {
  // 제주 캘린더는 나중에 따로 연결한다 — GOOGLE_JEJU_STAFF_CALENDAR_ID 가 생기기 전에는 제주 소속에게 일정 칸을 보이지 않는다
  const calendarId = normalizeCampus(campus) === 'jeju' ? env.GOOGLE_JEJU_STAFF_CALENDAR_ID : env.GOOGLE_STAFF_CALENDAR_ID;
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !calendarId) return null;
  const events = await listCalendarEvents({
    serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    calendarId,
    timeMin: new Date(`${today}T00:00:00+09:00`).toISOString(),
    timeMax: new Date(`${addDays(today, 14)}T23:59:59+09:00`).toISOString(),
  });
  return events
    .map(e => ({ title: clean(e.summary, 120), allDay: !!e.allDay, start: e.start, end: e.end, location: clean(e.location, 80) }))
    .filter(e => e.title && e.start)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, limit);
}

const STEP_COUNT = 12;
const STEPS_VERSION = 3;
// CRS(src/pages/portal/crs/index.astro 의 DATA_MAPS)가 단계를 바꿀 때마다 옛 번호를 새 번호로 옮긴 표 — 아직 옮기지 않은 교회 기록도 같은 번호로 읽는다
const STEP_MAPS = {
  1: { 1: [2, 3], 2: [6], 3: [7], 4: [8], 5: [6], 6: [9], 7: [9], 8: [10], 9: [11], 10: [12] },
  2: { 1: [1], 2: [2], 3: [3], 4: [9], 5: [10], 6: [4], 7: [5], 8: [6], 9: [7], 10: [8], 11: [11], 12: [12] },
};
const hasStep = v => Array.isArray(v) ? v.length > 0 : !!v;

/** 교회 한 곳의 완료한 단계 번호(1~12, 오름차순) */
export function doneSteps(church) {
  let steps = church?.steps && typeof church.steps === 'object' ? church.steps : {};
  const version = Number(church?.stepsVersion);
  if (version !== STEPS_VERSION) {
    for (let v = version === 2 ? 2 : 1; v < STEPS_VERSION; v++) {
      const moved = {};
      for (const [k, val] of Object.entries(steps)) if (hasStep(val)) for (const n of STEP_MAPS[v][Number(k)] || []) moved[n] = true;
      steps = moved;
    }
  }
  return Array.from({ length: STEP_COUNT }, (_, i) => i + 1).filter(n => hasStep(steps[n]));
}

/** CRS 교회 레코드 → 최근 업데이트 순 [{ name, updatedAt, lastVisitDate, visitor, pastor, steps, done[], next }] (연락처·메모는 꺼내지 않는다) */
export function recentChurches(records, limit = 5, campus = 'wolko') {
  const place = normalizeCampus(campus) === 'jeju' ? 'jeju' : 'mainland';
  return Object.values(records || {})
    .filter(c => crsLocation(c) === place)      // 교회의 시/도가 제주면 제주, 아니면 평택(본토)
    .map(c => {
      const done = doneSteps(c);
      return {
        name: clean(c?.churchName, 80), updatedAt: Number(c?.updatedAt) || 0, lastVisitDate: clean(c?.lastVisitDate, 20),
        visitor: clean(c?.lastVisitVisitor, 40), pastor: clean(c?.pastorName, 40),
        steps: done.length, done, next: Array.from({ length: STEP_COUNT }, (_, i) => i + 1).find(n => !done.includes(n)) || null,
      };
    })
    .filter(c => c.name && c.updatedAt > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

/** 최근 업데이트된 교회 — CRS 연결이 없으면 null. 5분 동안 KV 에 담아 둔다 */
export async function recentChurchList(env, campus = 'wolko') {
  if (!env.FIREBASE_CRS_SERVICE_ACCOUNT) return null;
  const key = `${DASH_CHURCH_KEY}:${normalizeCampus(campus)}`;
  const cached = await env.CAMP_KV.get(key, 'json');
  if (cached?.list) return cached.list;
  const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
  const res = await fetch(`${CRS_DATABASE}/churches.json`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`CRS ${res.status}`);
  const list = recentChurches(await res.json(), 5, campus);
  await env.CAMP_KV.put(key, JSON.stringify({ list }), { expirationTtl: DASH_CHURCH_SECONDS });
  return list;
}

/** 지금 로그인한 사람에게 해당하는 오늘 할 일 — 주방 당번 칸, 차량 운행 칸, 지난달 복음 통계 보고(아직 안 냈을 때) */
export async function mySchedule(env, session, today) {
  const email = String(session?.email || '').trim().toLowerCase();
  if (!email) return null;
  const mine = p => String(p?.email || '').trim().toLowerCase() === email;
  const [day, pickup, dropoff] = await Promise.all([readDay(env, today), ...DRIVE_SLOTS.map(slot => env.CAMP_KV.get(slotKey(today, slot), 'json'))]);
  const kitchen = KITCHEN_SLOTS.filter(slot => (day[slot] || []).some(mine));
  const car = [pickup && mine(pickup) ? 'pickup' : '', dropoff && mine(dropoff) ? 'dropoff' : ''].filter(Boolean);
  let gospelPending = false;
  const month = reportMonth(Date.parse(`${today}T12:00:00+09:00`));   // 월간 보고는 지난달 숫자
  if (!alwaysExempt(email) && !(await env.CAMP_KV.get(`gospel:exempt:${email}`))) {
    const owner = await ownerOf(env, email);
    gospelPending = !(await loadMonth(env, month)).some(r => r.owner === owner);
  }
  return { name: String(session.name || '').trim() || email.split('@')[0], kitchen, car, gospelPending, gospelMonth: month };
}

/** 대시보드 전체 — 조각마다 실패해도 나머지는 돌려준다(실패한 조각은 null) */
export async function buildDashboard(env, session, now = Date.now(), { campus = 'wolko', canSwitchCampus = false, tools = null } = {}) {
  const today = todayKst(now);
  const weekStart = currentWeekStart(today);
  campus = normalizeCampus(campus);
  const jeju = campus === 'jeju';
  // 쓸 수 없는 도구(제주팀 일반 멤버)로 이어지는 칸은 읽지도, 보이지도 않는다. tools 가 null 이면 제한 없음
  const may = href => !tools || tools.includes(href);
  const settle = async fn => { try { return await fn(); } catch (error) { console.error('dashboard piece failed:', error.message); return null; } };
  // 주방 당번·차량 운행은 평택 캠퍼스의 도구라 제주에는 해당 정보가 없다 — 제주에서는 아예 읽지 않고 칸도 보이지 않는다
  const [notices, kitchen, car, events, churches, prayerData, me] = await Promise.all([
    settle(async () => noticesForWeek(noticesForCampus(await readNotices(env), campus), weekStart, today)),
    jeju || !may('/portal/kitchen') ? null : settle(() => kitchenToday(env, today)),
    jeju || !may('/portal/car-drive') ? null : settle(() => carToday(env, today)),
    may('/portal/schedule') ? settle(() => upcomingEvents(env, today, 5, campus)) : null,
    settle(() => recentChurchList(env, campus)),
    settle(() => prayerBoard(env, session)),
    settle(() => mySchedule(env, session, today)),
  ]);
  if (me) {   // 내 알림에서도 쓸 수 없는 도구의 항목은 뺀다
    if (!may('/portal/kitchen')) me.kitchen = [];
    if (!may('/portal/car-drive')) me.car = [];
    if (!may('/portal/gospel-stats')) me.gospelPending = false;
  }
  const hidden = jeju ? ['kitchen', 'car'] : [];
  if (!may('/portal/kitchen') && !hidden.includes('kitchen')) hidden.push('kitchen');
  if (!may('/portal/car-drive') && !hidden.includes('car')) hidden.push('car');
  if (!may('/portal/schedule')) hidden.push('events');
  return {
    today, weekStart, campus, canSwitchCampus, hidden, tools,
    canEditNotices: canPostNotices(session),
    notices: notices ? notices.map(({ byEmail, ...n }) => ({ ...n, campus: noticeAudience(n), canDelete: canDeleteNotice(session, { byEmail }) })) : notices,
    kitchen, car, events, churches, prayers: prayerData ? prayerData.prayers : null, prayerTotal: prayerData ? prayerData.total : 0, me,
  };
}
