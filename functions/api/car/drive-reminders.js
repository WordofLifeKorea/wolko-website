/**
 * 운행 담당자 알림 — GitHub Actions가 30분마다 호출하고, 설정된 시각이 된 알림만 보낸다(카카오 알림톡 우선, 실패하면 문자).
 *   POST /api/car/drive-reminders            (Authorization: Bearer <DRIVE_REMINDER_SECRET 또는 CRS_REMINDER_SECRET>)
 *   쿼리: ?dryRun=1 보내지 않고 계획만 확인 · ?slot=pickup|dropoff 한쪽만 · ?force=1 시각과 상관없이 지금 보냄(수동 점검)
 *         ?date=YYYY-MM-DD · ?time=HH:MM 그 날짜·시각 기준으로 실행(테스트용)
 * 시각: 오전은 요일과 상관없이 픽업 신청이 있는 날 매일, 오후는 요일별 설정(기본 화~목 17:00 · 금 12:00). 설정은 drive-settings.
 * 같은 날 같은 칸에는 한 번만 보낸다. 시각이 지난 뒤 5시간 안에만 보내고(스케줄이 늦게 돌아도 보냄), 시각 이후에 신청한 사람에게는 보내지 않는다.
 */
import { sendKakaoWithSmsFallback } from '../../lib/solapi.js';
import { SMS_PREFIX, parseDate, shownName, slotKey, todayKst, weekdayOf } from '../../lib/carDrive.js';
import { getSettings, minutesOf, timeFor } from '../../lib/driveSettings.js';

const H = { 'Cache-Control': 'no-store' };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const LATE_WINDOW_MIN = 5 * 60;
const mask = p => String(p || '').replace(/[^0-9]/g, '').replace(/^(\d{3})\d+(\d{2})$/, '$1-****-**$2');

/** 알림톡 템플릿 변수 — 솔라피 템플릿의 #{이름}, #{날짜}(예: 10/6 화) */
export function reminderVariables(name, date) {
  const [, m, d] = date.split('-');
  return { '#{이름}': name, '#{날짜}': `${+m}/${+d} ${DAYS[weekdayOf(date)]}` };
}

export function reminderText(name, date, slot = 'pickup') {
  const [, m, d] = date.split('-');
  const when = `오늘(${+m}/${+d} ${DAYS[weekdayOf(date)]})`;
  const body = slot === 'dropoff' ? `${when} 권사님 오후 라이드 담당입니다. 감사합니다!` : `${when} 오전 픽업 담당이에요.`;
  return `[WOLKO 운행] ${name}님, ${body} 운행 스케줄: https://wolko.org/car-drive/#${date}`;
}

const kstMinutes = (now = Date.now()) => { const d = new Date(now + 9 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const dedupeKey = (date, slot) => slot === 'dropoff' ? `${SMS_PREFIX}${date}:dropoff` : `${SMS_PREFIX}${date}`; // 픽업은 예전 키를 그대로 쓴다

export async function onRequestPost({ env, request }) {
  const secret = env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET;
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: H });
  if (!env.CAMP_KV) return Response.json({ error: 'Missing KV' }, { status: 503, headers: H });
  const params = new URL(request.url).searchParams;
  const dryRun = params.get('dryRun') === '1';
  const force = params.get('force') === '1';
  const requested = params.get('date');
  const date = requested && parseDate(requested) !== null ? requested : todayKst();
  const timeParam = params.get('time');
  const nowMin = /^\d{2}:\d{2}$/.test(timeParam || '') ? minutesOf(timeParam) : kstMinutes();
  const only = params.get('slot');
  const slots = only === 'pickup' || only === 'dropoff' ? [only] : ['pickup', 'dropoff'];
  const settings = await getSettings(env);
  const weekday = weekdayOf(date);
  const kakaoReady = slot => !!(env.KAKAO_PF_ID && (slot === 'dropoff' ? env.KAKAO_TEMPLATE_DRIVE_DROPOFF : env.KAKAO_TEMPLATE_DRIVE_PICKUP));
  const configured = !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER_PHONE);

  const results = [];
  for (const slotName of slots) {
    const at = timeFor(settings, slotName, weekday);
    const base = { slot: slotName, date, sendAt: at, channel: kakaoReady(slotName) ? 'kakao+sms' : 'sms' };
    if (!at && !force) { results.push({ ...base, skipped: 'no-time-set', sent: 0 }); continue; }
    const target = minutesOf(at) ?? 0;
    if (!force && nowMin < target) { results.push({ ...base, skipped: 'not-yet', sent: 0 }); continue; }
    if (!force && nowMin > target + LATE_WINDOW_MIN) { results.push({ ...base, skipped: 'too-late', sent: 0 }); continue; }

    const record = await env.CAMP_KV.get(slotKey(date, slotName), 'json');
    if (!record) { results.push({ ...base, person: null, sent: 0 }); continue; }
    const person = { name: shownName(record), phone: mask(record.phone) };
    // 보낼 시각 이후에 신청한 사람에게는 보내지 않는다 (이미 지나간 일정이라 혼란을 준다)
    if (!force && record.at && at) {
      const signedKst = new Date(Date.parse(record.at) + 9 * 3600000);
      const signedDate = signedKst.toISOString().slice(0, 10);
      if (signedDate === date && signedKst.getUTCHours() * 60 + signedKst.getUTCMinutes() > target) { results.push({ ...base, person, skipped: 'signed-up-after', sent: 0 }); continue; }
    }
    if (dryRun) { results.push({ ...base, person, dryRun: true, sent: 0 }); continue; }
    if (!configured) { results.push({ ...base, person, error: 'Solapi 설정(SOLAPI_API_KEY/SECRET/SENDER_PHONE)이 필요합니다.', sent: 0 }); continue; }
    if (!record.phone) { results.push({ ...base, person, error: '담당자 휴대폰 번호가 없습니다.', sent: 0 }); continue; }
    const doneKey = dedupeKey(date, slotName);
    const done = await env.CAMP_KV.get(doneKey, 'json');
    if (done && done.email === record.email) { results.push({ ...base, person, sent: 0, alreadySent: true }); continue; }
    const name = shownName(record);
    const templateId = slotName === 'dropoff' ? env.KAKAO_TEMPLATE_DRIVE_DROPOFF : env.KAKAO_TEMPLATE_DRIVE_PICKUP;
    const firstChannel = await sendKakaoWithSmsFallback(env, record.phone, templateId, reminderVariables(name, date), reminderText(name, date, slotName));
    await env.CAMP_KV.put(doneKey, JSON.stringify({ email: record.email, at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 14 });
    results.push({ ...base, person, sent: 1, firstChannel });
  }
  const failed = results.some(r => r.error);
  const sent = results.reduce((n, r) => n + r.sent, 0);
  return Response.json({ date, time: `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`, configured, sent, results }, { status: failed && sent === 0 ? 503 : 200, headers: H });
}
