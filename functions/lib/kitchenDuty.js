/**
 * 주방 보조(키친 듀티) 신청 — 차량 운행 스케줄과 같은 방식(2주 구간 · 신청/취소 · 관리자가 칸 닫기/열기/직접 배정)이고,
 * 하루에 6칸(오전·점심·저녁 × 준비·클린업)이 있다. 신청 기록은 차량과 섞이지 않도록 kitchen: 키를 쓴다.
 *
 * 기본값: 화요일 점심 ~ 금요일 점심까지 열림 (화·수·목은 점심+저녁, 금은 점심만). 오전 칸 전부와 금요일 저녁 ~ 화요일 아침(금 저녁·토·일·월)은 닫힘.
 * 닫힌 칸은 주방 관리자(Estelle)와 마스터가 열 수 있다.
 */
import { driveSession, parseDate, weekdayOf } from './carDrive.js';

export { MAX_AHEAD_DAYS, parseDate, periodFor, shiftPeriod, todayKst, weekdayOf, shownName } from './carDrive.js';

export const SLOTS = ['am_prep', 'am_clean', 'lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'];
export const MORNING_SLOTS = ['am_prep', 'am_clean'];
export const SLOT_PREFIX = 'kitchen:slot:';
export const SMS_PREFIX = 'kitchen:sms:';
export const CLOSED_PREFIX = 'kitchen:closed:'; // kitchen:closed:{구간 시작일} → { '날짜:슬롯': { open?, by, at } }
/** 주방 관리자: 닫힌 칸을 열고 사람을 직접 배정할 수 있다 (마스터는 항상 가능) */
export const KITCHEN_MANAGER_EMAILS = ['esooy@wol.org'];

export const slotKey = (date, slot) => `${SLOT_PREFIX}${date}:${slot}`;
export const closedKey = periodStart => `${CLOSED_PREFIX}${periodStart}`;

/** 그 칸이 기본으로 열려 있는지 — 화·수·목은 점심+저녁, 금요일은 점심만. 오전 칸과 나머지 요일은 닫힘 */
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

export const isValidDate = s => parseDate(s) !== null;

/** 접속자 — 차량 운행 스케줄과 같은 규칙(승인된 평택센터 멤버 또는 마스터)이고, 관리자는 주방 관리자 목록을 따른다 */
export async function kitchenSession(request, env) {
  const s = await driveSession(request, env);
  if (s.error) return s;
  return { ...s, isManager: s.isAdmin || KITCHEN_MANAGER_EMAILS.includes(s.email) };
}
