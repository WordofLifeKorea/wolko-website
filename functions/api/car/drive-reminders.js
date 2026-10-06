/**
 * 오전 픽업 담당자에게 8시(한국 시간) 알림 문자 — GitHub Actions가 매일 호출한다.
 *   POST /api/car/drive-reminders            (Authorization: Bearer <DRIVE_REMINDER_SECRET 또는 CRS_REMINDER_SECRET>)
 *   쿼리: ?dryRun=1 보내지 않고 대상만 확인 · ?date=YYYY-MM-DD 그날 기준으로 실행(테스트용)
 * 같은 날 같은 담당자에게 두 번 보내지 않는다(drive:sms:{date}).
 */
import { sendSms } from '../../lib/solapi.js';
import { SMS_PREFIX, isDriveDay, parseDate, shownName, slotKey, todayKst, weekdayOf } from '../../lib/carDrive.js';

const H = { 'Cache-Control': 'no-store' };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const mask = p => String(p || '').replace(/[^0-9]/g, '').replace(/^(\d{3})\d+(\d{2})$/, '$1-****-**$2');

export function reminderText(name, date) {
  const [, m, d] = date.split('-');
  return `[WOLKO 운행] ${name}님, 오늘(${+m}/${+d} ${DAYS[weekdayOf(date)]}) 오전 픽업 담당이에요. 운행 스케줄: https://wolko.org/car-drive/#${date}`;
}

export async function onRequestPost({ env, request }) {
  const secret = env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET;
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: H });
  if (!env.CAMP_KV) return Response.json({ error: 'Missing KV' }, { status: 503, headers: H });
  const params = new URL(request.url).searchParams;
  const dryRun = params.get('dryRun') === '1';
  const requested = params.get('date');
  const date = requested && parseDate(requested) !== null ? requested : todayKst();
  const configured = !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER_PHONE);
  if (!isDriveDay(date)) return Response.json({ date, skipped: 'weekend', sent: 0, configured }, { headers: H });

  const slot = await env.CAMP_KV.get(slotKey(date, 'pickup'), 'json');
  if (!slot) return Response.json({ date, pickup: null, sent: 0, configured }, { headers: H });
  const info = { date, pickup: { name: shownName(slot), phone: mask(slot.phone) }, configured };
  if (dryRun) return Response.json({ ...info, dryRun: true, sent: 0 }, { headers: H });
  if (!configured) return Response.json({ ...info, error: 'Solapi 설정(SOLAPI_API_KEY/SECRET/SENDER_PHONE)이 필요합니다.', sent: 0 }, { status: 503, headers: H });
  if (!slot.phone) return Response.json({ ...info, error: '담당자 휴대폰 번호가 없습니다.', sent: 0 }, { status: 422, headers: H });

  const doneKey = `${SMS_PREFIX}${date}`;
  const done = await env.CAMP_KV.get(doneKey, 'json');
  if (done && done.email === slot.email) return Response.json({ ...info, sent: 0, alreadySent: true }, { headers: H });
  await sendSms(env, slot.phone, reminderText(shownName(slot), date));
  await env.CAMP_KV.put(doneKey, JSON.stringify({ email: slot.email, at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 14 });
  return Response.json({ ...info, sent: 1 }, { headers: H });
}
