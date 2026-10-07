/**
 * 주방 보조 알림 발송 시간 — KV 'kitchen:settings'
 *   { am_prep: 'HH:MM' | null, am_clean, lunch_prep, lunch_clean, dinner_prep, dinner_clean } — 칸마다 하나, 요일과 상관없이 신청이 있는 날 그 시각에 보낸다. null 이면 그 칸은 보내지 않는다.
 * 시각은 30분 단위(05:00~21:00). 알림을 확인하는 GitHub Actions가 30분마다 돌기 때문이다.
 */
import { isValidTime, minutesOf } from './driveSettings.js';
import { SLOTS } from './kitchenDuty.js';

export { minutesOf };
export const SETTINGS_KEY = 'kitchen:settings';
export const DEFAULT_TIMES = Object.freeze({
  am_prep: '07:00', am_clean: '09:00', lunch_prep: '10:00', lunch_clean: '13:00', dinner_prep: '15:00', dinner_clean: '18:30',
});

/** 저장된 값(또는 요청 본문)을 정리한다. 잘못된 칸이 있으면 null — 호출한 쪽이 거절할 수 있게 */
export function normalizeTimes(input) {
  const out = {};
  for (const s of SLOTS) {
    const v = input?.[s];
    if (v === null || v === undefined || v === '') out[s] = null;
    else if (isValidTime(v)) out[s] = v;
    else return null;
  }
  return out;
}

export async function getTimes(env) {
  const stored = await env.CAMP_KV.get(SETTINGS_KEY, 'json');
  return (stored && normalizeTimes(stored)) || { ...DEFAULT_TIMES };
}
