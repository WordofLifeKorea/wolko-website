import { getAccount, isMasterEmail, normalizeEmail, parseHubSessionToken } from './hubAccounts.js';
import { CAMPUS_OVERRIDES } from '../../src/lib/expense-config.js';
import { pickName } from './expenses.js';

export const SLOTS = ['pickup', 'dropoff'];
export const SLOT_PREFIX = 'drive:slot:';
export const SMS_PREFIX = 'drive:sms:';
export const CLOSED_PREFIX = 'drive:closed:'; // drive:closed:{구간 시작일} → { '날짜:슬롯': { by, at } }
/** 운행 스케줄 관리자: 라이드가 필요 없는 칸을 닫고 열 수 있다 (마스터는 항상 가능) */
export const DRIVE_MANAGER_EMAILS = ['esooy@wol.org'];
const DAY = 86400000;
// 2주 단위 구간의 기준이 되는 월요일 (이 날짜부터 14일씩 끊는다)
const ANCHOR = Date.UTC(2026, 9, 5);
export const MAX_AHEAD_DAYS = 70;

const pad = n => String(n).padStart(2, '0');
const fromUtc = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const parseDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null; const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]); return fromUtc(ms) === s ? ms : null; };
/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export const todayKst = (now = Date.now()) => fromUtc(now + 9 * 3600000);
export const weekdayOf = s => new Date(parseDate(s)).getUTCDay(); // 0=일 … 6=토
export const isDriveDay = s => { const d = weekdayOf(s); return d >= 1 && d <= 5; }; // 월~금
/** 월·토·일은 기본으로 닫혀 있다 — 운행 스케줄 관리자가 열어야 신청할 수 있다 (화~금은 기본 열림) */
export const isDefaultClosedDay = s => { const d = weekdayOf(s); return d === 0 || d === 1 || d === 6; };
/**
 * 칸이 닫혀 있는지. map[date:slot] 에 관리자가 정한 값이 있으면 그것이 우선(open:true 면 열림, 그 밖에는 닫힘),
 * 없으면 기본값(월·토·일 닫힘). 기본 닫힘이어도 이미 신청이 있는 칸(예전에 받은 토요일 신청 등)은 닫지 않는다.
 */
export function isSlotClosed(map, date, slot, hasRecord = false) {
  const e = map?.[`${date}:${slot}`];
  if (e) return !e.open;
  return isDefaultClosedDay(date) && !hasRecord;
}

/** 어떤 날짜가 속한 2주 구간 { start, end, days[] } — days는 월~일 × 2주 = 14일 */
export function periodFor(dateStr) {
  const ms = parseDate(dateStr);
  if (ms === null) return null;
  const startMs = ANCHOR + Math.floor((ms - ANCHOR) / (14 * DAY)) * 14 * DAY;
  const days = [];
  for (let w = 0; w < 2; w++) for (let d = 0; d < 7; d++) days.push(fromUtc(startMs + (w * 7 + d) * DAY));
  return { start: fromUtc(startMs), end: fromUtc(startMs + 13 * DAY), days };
}
export const shiftPeriod = (start, n) => fromUtc(parseDate(start) + n * 14 * DAY);

/** 날짜가 속한 주의 월요일 */
const mondayOf = dateStr => { const ms = parseDate(dateStr); const dow = new Date(ms).getUTCDay(); return fromUtc(ms - ((dow + 6) % 7) * DAY); };
const addDays = (dateStr, n) => fromUtc(parseDate(dateStr) + n * DAY);
/**
 * 화면 맨 위에 올라올 주의 월요일 — 새 주는 일요일에 시작한다. 일요일이 되면 곧 시작하는 다음 주(월요일~)가 맨 위로 올라오고,
 * 지난 주는 화면에서 빠진다. (월~토에는 그 주 월요일)
 */
export const currentWeekStart = today => mondayOf(addDays(today, 1));
/**
 * 지금부터 보여줄 두 주짜리 창 { start, end, days[14], prev, next, isCurrent } — 2주 고정 구간과 별개로 한 주씩 밀리며 움직인다.
 * 지난 주로는 돌아갈 수 없고(prev=null), MAX_AHEAD_DAYS 안쪽까지만 넘길 수 있다. 신청·닫힘·정원 데이터는 그대로 2주 구간 키(periodFor)에 저장된다.
 */
export function rollingWindow(wanted, today) {
  const min = currentWeekStart(today);
  const max = mondayOf(addDays(today, MAX_AHEAD_DAYS));
  let start = parseDate(wanted) === null ? min : mondayOf(wanted);
  if (start < min) start = min;
  if (start > max) start = max;
  const startMs = parseDate(start);
  const days = Array.from({ length: 14 }, (_, i) => fromUtc(startMs + i * DAY));
  return { start, end: days[13], days, prev: start > min ? addDays(start, -7) : null, next: start < max ? addDays(start, 7) : null, isCurrent: start === min };
}
/** 창에 걸친 2주 구간들의 시작일(중복 없이) — 구간별로 저장된 닫힘·정원 맵을 모아 읽을 때 쓴다 */
export const periodStartsOf = days => [...new Set(days.map(d => periodFor(d).start))];
/** 화면에 보일 이름: 지정된 표시 이름이 있으면 그것, 없으면 신청 때 저장된 이름 */
export const shownName = (record) => pickName(record?.email, record?.name);
export const slotKey = (date, slot) => `${SLOT_PREFIX}${date}:${slot}`;
export const closedKey = (periodStart) => `${CLOSED_PREFIX}${periodStart}`;

/**
 * 운행 스케줄 접속자: 승인된 포탈 계정 중 평택센터 소속(또는 마스터).
 * 제주 소속은 403, 로그인하지 않았으면 401.
 */
export async function driveSession(request, env) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return { status: 503, error: '서버 설정이 필요합니다.' };
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const signed = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!signed) return { status: 401, error: '포탈 로그인이 필요합니다.' };
  const email = normalizeEmail(signed.email);
  const account = await getAccount(env, email);
  const master = isMasterEmail(email);
  if (account ? account.status !== 'approved' : !master) return { status: 401, error: '포탈 로그인이 필요합니다.' };
  const campus = CAMPUS_OVERRIDES[email] || account?.campus || 'wolko';
  if (!master && campus !== 'wolko') return { status: 403, error: '평택센터 멤버만 사용할 수 있습니다.' };
  const isAdmin = master || signed.role === 'master';
  return { email, name: pickName(email, account?.name), phone: account?.phone || '', isAdmin, isManager: isAdmin || DRIVE_MANAGER_EMAILS.includes(email) };
}
