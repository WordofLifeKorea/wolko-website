/**
 * TV 대시보드가 보여 줄 월코 포털(전체) 정보 — 이번 주 공지, 오늘 키친 듀티·차량(캠프팀 명단에 있는 사람만, 이름만), 다가오는 일정, 날씨.
 * 포털의 읽기용 함수만 불러다 쓰고 아무것도 저장하지 않는다(날씨 저장도 막는다). 조각마다 따로 읽어서 하나가 실패해도 나머지는 그대로 내려준다(실패한 조각은 null).
 * 이메일·연락처는 응답에 담지 않는다. 명단 이메일은 "이 사람이 캠프팀인가"를 가리는 데만 쓰고 밖으로 내보내지 않는다.
 */
import { oooToday } from './campteamOoo.js';
import { readDay, MEALS } from './kitchenDuty.js';
import { SLOTS as DRIVE_SLOTS, slotKey, shownName, currentWeekStart } from './carDrive.js';
import { readNotices, noticesForWeek, upcomingEvents } from './portalDashboard.js';
import { loadWeather } from './weather.js';

const readOnly = (env) => ({ ...env, CAMP_KV: { get: (k, t) => env.CAMP_KV.get(k, t), list: (o) => env.CAMP_KV.list(o), put: async () => {}, delete: async () => {} } });
const settle = async (fn) => { try { return await fn(); } catch (error) { console.error('tv portal piece failed:', error.message); return null; } };

/** 오늘 키친 듀티 — 캠프팀 명단에 있는 사람 이름만. [{ meal, prep: [이름], clean: [이름] }] (해당자가 있는 식사만) */
export async function teamKitchen(env, today, roster) {
  const day = await readDay(env, today), mine = (p) => roster.has(String(p?.email || '').trim().toLowerCase());
  const names = (slot) => (day[slot] || []).filter(mine).map((p) => shownName(p)).filter(Boolean);
  return MEALS.map((meal) => ({ meal, prep: names(`${meal}_prep`), clean: names(`${meal}_clean`) })).filter((m) => m.prep.length || m.clean.length);
}
/** 오늘 차량 운행(픽업·드롭오프) — 캠프팀 명단에 있는 사람 이름만, 아니면 null */
export async function teamCar(env, today, roster) {
  const rec = await Promise.all(DRIVE_SLOTS.map((slot) => env.CAMP_KV.get(slotKey(today, slot), 'json')));
  const pick = (r) => (r && roster.has(String(r.email || '').trim().toLowerCase()) ? shownName(r) || null : null);
  return { pickup: pick(rec[0]), dropoff: pick(rec[1]) };
}

export async function tvPortal(env, today, rosterEmails) {
  const roster = new Set((rosterEmails || []).map((e) => String(e || '').trim().toLowerCase())), week = currentWeekStart(today);
  const [weather, notices, kitchen, car, events, ooo] = await Promise.all([
    settle(() => loadWeather(readOnly(env))),
    settle(async () => noticesForWeek(await readNotices(env), week, today).slice(0, 12).map((n) => ({ title: n.title || '', body: String(n.body || '').slice(0, 500), pinned: !!n.pinned, dueDate: n.dueDate || '', tr: n.tr ? { title: n.tr.title || '', text: n.tr.text || '' } : null }))),
    settle(() => teamKitchen(env, today, roster)),
    settle(() => teamCar(env, today, roster)),
    settle(async () => { const e = await upcomingEvents(env, today, 8); return e ? e.map((x) => ({ title: x.title, allDay: !!x.allDay, start: x.start, end: x.end, location: x.location || '' })) : null; }),
    settle(async () => (await oooToday(env, today)).map((x) => x.name)),   // 오늘 부재(휴가)인 사람 이름만
  ]);
  return { weather, notices, duty: { kitchen, car }, events, ooo };
}
