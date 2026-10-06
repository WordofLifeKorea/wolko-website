/**
 * 운행 알림 발송 시간 설정 — KV 'drive:settings'
 *   pickup : 'HH:MM' | null  — 오전 픽업 알림 시각 (요일과 상관없이 신청이 있는 날 매일)
 *   dropoff: { '1'..'5': 'HH:MM' | null } — 요일별(1=월 … 5=금) 오후 드롭오프 알림 시각, null 이면 그 요일은 보내지 않는다
 * 시각은 30분 단위(05:00~21:00). 알림을 확인하는 GitHub Actions가 30분마다 돌기 때문이다.
 * 기본값: 오전 08:00 · 오후 화~목 17:00, 금 12:00 (월요일은 보내지 않음).
 */
export const SETTINGS_KEY = 'drive:settings';
export const DEFAULT_SETTINGS = Object.freeze({
  pickup: '08:00',
  dropoff: Object.freeze({ 1: null, 2: '17:00', 3: '17:00', 4: '17:00', 5: '12:00' }),
});

const TIME_RE = /^(\d{2}):(\d{2})$/;
export function isValidTime(v) {
  const m = TIME_RE.exec(String(v || ''));
  if (!m) return false;
  const h = +m[1], min = +m[2];
  return (min === 0 || min === 30) && h >= 5 && (h < 21 || (h === 21 && min === 0));
}
export const minutesOf = time => { const m = TIME_RE.exec(time); return m ? +m[1] * 60 + +m[2] : null; };

/** 저장된 값(또는 요청 본문)을 정리한다. 잘못된 칸은 null 을 돌려 호출한 쪽이 거절할 수 있게 한다 */
export function normalizeSettings(input) {
  const out = { pickup: null, dropoff: {} };
  const pick = input?.pickup;
  if (pick !== null && pick !== undefined && pick !== '') { if (!isValidTime(pick)) return null; out.pickup = pick; }
  for (const d of [1, 2, 3, 4, 5]) {
    const v = input?.dropoff?.[d] ?? input?.dropoff?.[String(d)];
    if (v === null || v === undefined || v === '') out.dropoff[d] = null;
    else if (isValidTime(v)) out.dropoff[d] = v;
    else return null;
  }
  return out;
}

export async function getSettings(env) {
  const stored = await env.CAMP_KV.get(SETTINGS_KEY, 'json');
  return (stored && normalizeSettings(stored)) || { pickup: DEFAULT_SETTINGS.pickup, dropoff: { ...DEFAULT_SETTINGS.dropoff } };
}

/** 그날(요일) 그 칸의 알림 시각 — 없으면 null */
export function timeFor(settings, slot, weekday) {
  return slot === 'pickup' ? settings.pickup : (settings.dropoff[weekday] ?? null);
}
