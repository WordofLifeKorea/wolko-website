/**
 * 주방 보조 담당자 알림 — GitHub Actions가 30분마다 호출하고, 설정된 시각이 된 알림만 보낸다(카카오 알림톡 우선, 실패하면 문자).
 *   POST /api/kitchen/reminders            (Authorization: Bearer <KITCHEN_REMINDER_SECRET · DRIVE_REMINDER_SECRET · CRS_REMINDER_SECRET 중 먼저 있는 것>)
 *   쿼리: ?dryRun=1 보내지 않고 계획만 확인 · ?slot=am_prep|…|dinner_clean 한 칸만 · ?force=1 시각과 상관없이 지금 보냄(수동 점검)
 *         ?testPhone=010xxxxxxxx 그 번호로 시험 메시지 1건만(?slot=…, 기본 lunch_prep · 아무것도 저장하지 않음)
 *         ?date=YYYY-MM-DD · ?time=HH:MM 그 날짜·시각 기준으로 실행(테스트용)
 * 알림톡 템플릿은 칸마다 따로다 — 환경변수 KAKAO_TEMPLATE_KITCHEN_AM_PREP … KAKAO_TEMPLATE_KITCHEN_DINNER_CLEAN (차량 알림 템플릿과 별개). 변수는 #{담당자}, #{날짜}.
 * 같은 날 같은 칸에는 한 번만 보낸다. 시각이 지난 뒤 5시간 안에만 보내고, 시각 이후에 신청한 사람에게는 보내지 않는다.
 */
import { sendKakaoWithSmsFallback } from '../../lib/solapi.js';
import { SLOTS, SMS_PREFIX, parseDate, shownName, slotKey, todayKst, weekdayOf } from '../../lib/kitchenDuty.js';
import { getTimes, minutesOf } from '../../lib/kitchenSettings.js';

const H = { 'Cache-Control': 'no-store' };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const LATE_WINDOW_MIN = 5 * 60;
const mask = p => String(p || '').replace(/[^0-9]/g, '').replace(/^(\d{3})\d+(\d{2})$/, '$1-****-**$2');

/** 칸 이름 — 알림 문구와 같은 말 */
export const SLOT_TITLE = {
  am_prep: '오전 준비', am_clean: '오전 클린업', lunch_prep: '점심 준비', lunch_clean: '점심 클린업', dinner_prep: '저녁 준비', dinner_clean: '저녁 클린업',
};
export const templateEnvName = slot => `KAKAO_TEMPLATE_KITCHEN_${slot.toUpperCase()}`;

/** 알림톡 템플릿 변수 — #{담당자}(신청한 사람 이름), #{날짜}(예: 10/7 수) */
export function reminderVariables(name, date) {
  const [, m, d] = date.split('-');
  return { '#{담당자}': name, '#{날짜}': `${+m}/${+d} ${DAYS[weekdayOf(date)]}` };
}
export function reminderText(name, date, slot) {
  const v = reminderVariables(name, date);
  return `[WOLKO 주방] ${name}님은 ${v['#{날짜}']} ${SLOT_TITLE[slot]} 담당자 입니다. 주방 보조 스케줄: https://wolko.org/kitchen/#${date}`;
}

const kstMinutes = (now = Date.now()) => { const d = new Date(now + 9 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

export async function onRequestPost({ env, request }) {
  const secret = env.KITCHEN_REMINDER_SECRET || env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET;
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
  const slots = SLOTS.includes(only) ? [only] : SLOTS;
  const configured = !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER_PHONE);
  const kakaoReady = slot => !!(env.KAKAO_PF_ID && env[templateEnvName(slot)]);

  const testPhone = String(params.get('testPhone') || '').replace(/[^0-9]/g, '');
  if (testPhone) {
    const slotName = SLOTS.includes(only) ? only : 'lunch_prep';
    if (!/^01[016789][0-9]{7,8}$/.test(testPhone)) return Response.json({ error: 'testPhone은 휴대폰 번호여야 합니다.' }, { status: 400, headers: H });
    if (!configured) return Response.json({ error: 'Solapi 설정(SOLAPI_API_KEY/SECRET/SENDER_PHONE)이 필요합니다.' }, { status: 503, headers: H });
    const planned = kakaoReady(slotName) ? 'kakao+sms' : 'sms';
    if (dryRun) return Response.json({ test: true, slot: slotName, to: mask(testPhone), channel: planned, sent: 0, dryRun: true }, { headers: H });
    const firstChannel = await sendKakaoWithSmsFallback(env, testPhone, env[templateEnvName(slotName)], reminderVariables('테스트', date), reminderText('테스트', date, slotName));
    return Response.json({ test: true, slot: slotName, date, to: mask(testPhone), channel: planned, firstChannel, sent: firstChannel ? 1 : 0 }, { headers: H });
  }

  const times = await getTimes(env);
  const results = [];
  for (const slotName of slots) {
    const at = times[slotName];
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
    const doneKey = `${SMS_PREFIX}${date}:${slotName}`;
    const done = await env.CAMP_KV.get(doneKey, 'json');
    if (done && done.email === record.email) { results.push({ ...base, person, sent: 0, alreadySent: true }); continue; }
    const name = shownName(record);
    const firstChannel = await sendKakaoWithSmsFallback(env, record.phone, env[templateEnvName(slotName)], reminderVariables(name, date), reminderText(name, date, slotName));
    await env.CAMP_KV.put(doneKey, JSON.stringify({ email: record.email, at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 14 });
    results.push({ ...base, person, sent: 1, firstChannel });
  }
  const failed = results.some(r => r.error);
  const sent = results.reduce((n, r) => n + r.sent, 0);
  return Response.json({ date, time: `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`, configured, sent, results }, { status: failed && sent === 0 ? 503 : 200, headers: H });
}
