/**
 * 주방 보조(키친 듀티) 신청 — 차량 운행 스케줄과 같은 방식(2주 구간 · 신청/취소 · 관리자가 칸 닫기/열기/직접 배정)이고,
 * 하루에 6칸(아침·점심·저녁 × 준비·클린업)이 있다. 한 칸에 여러 명이 신청할 수 있다(기본 2명, 최대 4명 — 주방 관리자가 바꾼다).
 * 신청 기록은 차량과 섞이지 않도록 kitchen: 키를 쓴다.
 *
 * 기본값: 화요일 점심 ~ 금요일 점심까지 열림 (화·수·목은 점심+저녁, 금은 점심만). 아침 칸 전부와 금요일 저녁 ~ 화요일 아침(금 저녁·토·일·월)은 닫힘.
 * 닫힌 칸은 주방 관리자(Estelle)와 마스터가 열 수 있다.
 */
import { driveSession, parseDate, weekdayOf } from './carDrive.js';

export { MAX_AHEAD_DAYS, parseDate, periodFor, shiftPeriod, todayKst, weekdayOf, shownName } from './carDrive.js';

export const SLOTS = ['am_prep', 'am_clean', 'lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'];
export const MORNING_SLOTS = ['am_prep', 'am_clean'];
export const MEALS = ['am', 'lunch', 'dinner'];
export const mealOf = slot => slot.split('_')[0];
/** 칸 이름 — 화면·알림 문구가 같은 말을 쓴다 */
export const SLOT_TITLE = {
  am_prep: '아침 준비', am_clean: '아침 클린업', lunch_prep: '점심 준비', lunch_clean: '점심 클린업', dinner_prep: '저녁 준비', dinner_clean: '저녁 클린업',
};
export const MEAL_TITLE = { am: '아침', lunch: '점심', dinner: '저녁' };
export const DAY_PREFIX = 'kitchen:day:'; // kitchen:day:{날짜} → { 칸: [{ email, name, phone, at, assignedBy? }, …] } — 하루를 한 키로 두어 2주 조회가 KV 읽기 몇 번으로 끝난다
export const SMS_PREFIX = 'kitchen:sms:';
export const CLOSED_PREFIX = 'kitchen:closed:'; // kitchen:closed:{구간 시작일} → { '날짜:칸': { open?, by, at } }
export const CAPACITY_PREFIX = 'kitchen:cap:'; // kitchen:cap:{구간 시작일} → { '날짜:칸': 인원 } — 기본 인원과 다르게 정한 칸만
export const MAX_CAPACITY = 4;
export const DEFAULT_CAPACITY = 2;
export const TTL = 60 * 60 * 24 * 120;
/** 주방 관리자: 닫힌 칸을 열고, 인원을 바꾸고, 사람을 직접 배정할 수 있다 (마스터는 항상 가능) */
export const KITCHEN_MANAGER_EMAILS = ['esooy@wol.org'];

export const dayKey = date => `${DAY_PREFIX}${date}`;
export const closedKey = periodStart => `${CLOSED_PREFIX}${periodStart}`;
export const capacityKey = periodStart => `${CAPACITY_PREFIX}${periodStart}`;

/** 그날의 신청 기록 { 칸: [사람…] } — 없으면 빈 객체 */
export async function readDay(env, date) {
  const day = await env.CAMP_KV.get(dayKey(date), 'json');
  return day && typeof day === 'object' ? day : {};
}
/** 비어 있는 칸은 지우고, 하루 전체가 비면 키를 삭제한다 */
export async function writeDay(env, date, day) {
  const clean = Object.fromEntries(Object.entries(day).filter(([s, people]) => SLOTS.includes(s) && Array.isArray(people) && people.length));
  if (Object.keys(clean).length) await env.CAMP_KV.put(dayKey(date), JSON.stringify(clean), { expirationTtl: TTL });
  else await env.CAMP_KV.delete(dayKey(date));
}

/** 그 칸이 기본으로 열려 있는지 — 화·수·목은 점심+저녁, 금요일은 점심만. 아침 칸과 나머지 요일은 닫힘 */
export function isDefaultOpen(date, slot) {
  if (!SLOTS.includes(slot) || MORNING_SLOTS.includes(slot)) return false;
  const d = weekdayOf(date);
  if (d >= 2 && d <= 4) return true;
  return d === 5 && slot.startsWith('lunch');
}

/** 관리자가 정한 값(map)이 있으면 그것이 우선(open:true 면 열림, 그 밖에는 닫힘), 없으면 기본값. 기본 닫힘이어도 이미 신청이 있는 칸은 닫지 않는다 */
export function isSlotClosed(map, date, slot, hasRecord = false) {
  const e = map?.[`${date}:${slot}`];
  if (e) return !e.open;
  return !isDefaultOpen(date, slot) && !hasRecord;
}

/** 칸을 열거나 닫는 기록을 map 에 반영한다 — 기본값과 같아지면 기록을 지운다 */
export function applyOpenState(map, date, slot, open, by) {
  const id = `${date}:${slot}`;
  if (open === isDefaultOpen(date, slot)) delete map[id];
  else map[id] = open ? { open: true, by, at: new Date().toISOString() } : { by, at: new Date().toISOString() };
}

export const isValidCapacity = n => Number.isInteger(n) && n >= 1 && n <= MAX_CAPACITY;
/** 그 칸의 정원 — 칸마다 정한 값이 있으면 그것, 없으면 기본 인원 */
export const capacityOf = (capMap, date, slot, fallback = DEFAULT_CAPACITY) => {
  const n = capMap?.[`${date}:${slot}`];
  return isValidCapacity(n) ? n : fallback;
};

/** 접속자 — 차량 운행 스케줄과 같은 규칙(승인된 평택센터 멤버 또는 마스터)이고, 관리자는 주방 관리자 목록을 따른다 */
export async function kitchenSession(request, env) {
  const s = await driveSession(request, env);
  if (s.error) return s;
  return { ...s, isManager: s.isAdmin || KITCHEN_MANAGER_EMAILS.includes(s.email) };
}
