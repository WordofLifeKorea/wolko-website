/**
 * 주방 보조 설정 — KV 'kitchen:settings'
 *   meals   : { am, lunch, dinner } 식사 시간 'HH:MM' | null — 알림은 식사 1시간 전에 간다(null 이면 그 끼니는 알림 없음)
 *   capacity: 한 칸의 기본 인원 (1~4, 기본 2) — 칸마다 따로 바꾼 값이 있으면 그것이 우선
 * 식사 시간은 30분 단위(07:00~21:00). 알림을 확인하는 GitHub Actions가 한국 시간 06:00~21:30에 30분마다 돌기 때문이다.
 */
import { isValidTime, minutesOf } from './driveSettings.js';
import { DEFAULT_CAPACITY, MEALS, isValidCapacity } from './kitchenDuty.js';

export { minutesOf };
export const SETTINGS_KEY = 'kitchen:settings';
export const REMINDER_LEAD_MIN = 60;
export const DEFAULT_SETTINGS = Object.freeze({
  meals: Object.freeze({ am: '08:00', lunch: '12:00', dinner: '18:00' }),
  capacity: DEFAULT_CAPACITY,
});

/** 식사 시간으로 쓸 수 있는 값인지 — 30분 단위이고, 1시간 전 알림이 첫 확인(06:00) 이후가 되도록 07:00부터 */
export const isValidMealTime = v => isValidTime(v) && minutesOf(v) >= 7 * 60;
export const hhmm = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** 식사 시간 → 알림 시각 ('12:00' → '11:00') */
export const reminderTime = meal => (meal ? hhmm(minutesOf(meal) - REMINDER_LEAD_MIN) : null);

/** 저장된 값(또는 요청 본문)을 정리한다. 잘못된 값이 있으면 null — 호출한 쪽이 거절할 수 있게 */
export function normalizeSettings(input) {
  const meals = {};
  for (const m of MEALS) {
    const v = input?.meals?.[m];
    if (v === null || v === undefined || v === '') meals[m] = null;
    else if (isValidMealTime(v)) meals[m] = v;
    else return null;
  }
  const capacity = input?.capacity === undefined ? DEFAULT_CAPACITY : input.capacity;
  if (!isValidCapacity(capacity)) return null;
  return { meals, capacity };
}

export async function getSettings(env) {
  const stored = await env.CAMP_KV.get(SETTINGS_KEY, 'json');
  return (stored && normalizeSettings(stored)) || { meals: { ...DEFAULT_SETTINGS.meals }, capacity: DEFAULT_SETTINGS.capacity };
}
