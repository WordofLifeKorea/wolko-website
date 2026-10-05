import { getAccount, isMasterEmail, normalizeEmail, parseHubSessionToken } from './hubAccounts.js';
import { CAMPUS_OVERRIDES } from '../../src/lib/expense-config.js';
import { DISPLAY_NAMES } from './expenses.js';

export const SLOTS = ['pickup', 'dropoff'];
export const SLOT_PREFIX = 'drive:slot:';
export const SMS_PREFIX = 'drive:sms:';
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
export const isDriveDay = s => { const d = weekdayOf(s); return d >= 1 && d <= 6; }; // 월~토

/** 어떤 날짜가 속한 2주 구간 { start, end, days[] } — days는 월~토 × 2주 = 12일 */
export function periodFor(dateStr) {
  const ms = parseDate(dateStr);
  if (ms === null) return null;
  const startMs = ANCHOR + Math.floor((ms - ANCHOR) / (14 * DAY)) * 14 * DAY;
  const days = [];
  for (let w = 0; w < 2; w++) for (let d = 0; d < 6; d++) days.push(fromUtc(startMs + (w * 7 + d) * DAY));
  return { start: fromUtc(startMs), end: fromUtc(startMs + 13 * DAY), days };
}
export const shiftPeriod = (start, n) => fromUtc(parseDate(start) + n * 14 * DAY);
/** 화면에 보일 이름: 지정된 표시 이름이 있으면 그것, 없으면 신청 때 저장된 이름 */
export const shownName = (record) => DISPLAY_NAMES[record?.email] || record?.name || '';
export const slotKey = (date, slot) => `${SLOT_PREFIX}${date}:${slot}`;

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
  return { email, name: DISPLAY_NAMES[email] || account?.name || email.split('@')[0], phone: account?.phone || '', isAdmin: master || signed.role === 'master' };
}
