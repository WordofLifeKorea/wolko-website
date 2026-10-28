import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { currentWeekStart, todayKst } from '../../lib/carDrive.js';
import { kitchenToday, carToday, upcomingEvents, recentChurchList, readNotices, noticesForWeek, mySchedule } from '../../lib/portalDashboard.js';
import { loadWeather } from '../../lib/weather.js';

/**
 * 캠프팀 홈이 보여 줄 포털(월코 전체) 정보 — 날씨, 내 오늘 듀티, 이번 주 공지, 키친·차량, 일정, 교회.
 * 포털의 읽기용 함수만 불러다 쓴다(포털 파일은 바꾸지 않는다). 번역을 새로 시키지도, 아무것도 저장하지도 않는다.
 * 조각마다 따로 읽어서 하나가 실패해도 나머지는 그대로 내려준다(실패한 조각은 null). 캠프팀 로그인한 누구나(연락처는 담지 않는다).
 */
// 캠프팀은 월코 공용 저장소(CAMP_KV)에 아무것도 쓰지 않는다 — 날씨를 읽을 때도 저장하지 못하게 막는다(없으면 그때그때 읽어 온다)
const readOnly = (env) => ({ ...env, CAMP_KV: { get: (k, t) => env.CAMP_KV.get(k, t), list: (o) => env.CAMP_KV.list(o), put: async () => {}, delete: async () => {} } });
const settle = async (fn) => { try { return await fn(); } catch (error) { console.error('portal-feed piece failed:', error.message); return null; } };

async function displayName(env, email) {
  const m = await settle(() => env.DB.prepare('SELECT name FROM camp_members WHERE email = ?1').bind(email).first());
  if (m && String(m.name || '').trim()) return String(m.name).trim();
  const a = await settle(() => getAccount(env, email));
  if (a && String(a.name || '').trim()) return String(a.name).trim();
  return String(email).split('@')[0];
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const today = todayKst(), weekStart = currentWeekStart(today);
  const [name, weather, notices, kitchen, car, events, churches, me] = await Promise.all([
    displayName(env, s.email),
    settle(() => loadWeather(readOnly(env))),
    settle(async () => noticesForWeek(await readNotices(env), weekStart, today).map(({ byEmail, ...n }) => n)),
    settle(() => kitchenToday(env, today)),
    settle(() => carToday(env, today)),
    settle(() => upcomingEvents(env, today)),
    settle(() => recentChurchList(env)),
    settle(() => mySchedule(env, { email: s.email }, today)),
  ]);
  return json({ today, weekStart, name, weather, notices, kitchen, car, events, churches, me: me ? { kitchen: me.kitchen, car: me.car, gospelPending: !!me.gospelPending, gospelMonth: me.gospelMonth } : null });
}
