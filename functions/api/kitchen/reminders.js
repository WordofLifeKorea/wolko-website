/**
 * 주방 보조 알림 — 식사 시간 1시간 전에, 그 끼니(준비·클린업)를 신청한 사람에게 카카오 알림톡으로 보낸다. 알림톡이 안 되면 문자로 대신 간다.
 * GitHub Actions가 30분마다 호출하고, 알림 시각(식사 시간 − 1시간)이 된 끼니만 보낸다.
 *   POST /api/kitchen/reminders            (Authorization: Bearer <KITCHEN_REMINDER_SECRET · DRIVE_REMINDER_SECRET · CRS_REMINDER_SECRET 중 먼저 있는 것>)
 *   쿼리: ?dryRun=1 보내지 않고 계획만 확인 · ?meal=am|lunch|dinner 한 끼니만 · ?force=1 시각과 상관없이 지금 보냄(수동 점검)
 *         ?testPhone=010xxxxxxxx 그 번호로 시험 메시지 1건만(?meal=…, 기본 lunch · 아무것도 저장하지 않음)
 *         ?date=YYYY-MM-DD · ?time=HH:MM 그 날짜·시각 기준으로 실행(테스트용)
 * 식사 시간은 주방 보조 페이지의 '시간·인원'에서 바꾼다(기본 아침 8:00 · 점심 12:00 · 저녁 18:00).
 * 알림톡 템플릿은 하나(KAKAO_TEMPLATE_KITCHEN)이고 변수는 #{담당자}, #{날짜}, #{업무}, #{시간}. 차량 알림 템플릿과는 별개다.
 * 한 사람이 같은 끼니의 준비와 클린업을 둘 다 신청했으면 한 번만 보낸다. 같은 날 같은 사람·같은 끼니에는 한 번만 보내고,
 * 알림 시각 이후에 신청한 사람에게는 보내지 않으며, 식사 시간이 지나면 보내지 않는다(스케줄이 늦게 돌아도 식사 시작 전까지는 보냄).
 */
import { sendKakaoWithSmsFallback } from '../../lib/solapi.js';
import { MEALS, MEAL_TITLE, SLOT_TITLE, SLOTS, SMS_PREFIX, mealOf, parseDate, readDay, shownName, todayKst, weekdayOf } from '../../lib/kitchenDuty.js';
import { REMINDER_LEAD_MIN, getSettings, hhmm, minutesOf } from '../../lib/kitchenSettings.js';

const H = { 'Cache-Control': 'no-store' };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const mask = p => String(p || '').replace(/[^0-9]/g, '').replace(/^(\d{3})\d+(\d{2})$/, '$1-****-**$2');
const kstMinutes = (now = Date.now()) => { const d = new Date(now + 9 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

/** '08:00' → '오전 8:00', '18:00' → '오후 6:00' */
export const timeText = hm => { const [h, m] = hm.split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`; };

/** 한 사람의 그 끼니 업무 — 준비·클린업을 둘 다 하면 '점심 준비·클린업' */
export function dutyText(meal, slots) {
  const has = kind => slots.includes(`${meal}_${kind}`);
  return has('prep') && has('clean') ? `${MEAL_TITLE[meal]} 준비·클린업` : SLOT_TITLE[slots[0]];
}

/** 알림톡 템플릿 변수 — #{담당자}(신청한 사람 이름), #{날짜}(예: 10/7 수), #{업무}(예: 점심 준비), #{시간}(식사 시간, 예: 오후 12:00) */
export function reminderVariables(name, date, duty, mealTime) {
  const [, m, d] = date.split('-');
  return { '#{담당자}': name, '#{날짜}': `${+m}/${+d} ${DAYS[weekdayOf(date)]}`, '#{업무}': duty, '#{시간}': timeText(mealTime) };
}
export function reminderText(name, date, duty, mealTime) {
  const v = reminderVariables(name, date, duty, mealTime);
  return `[WOLKO 주방] ${name}님, ${v['#{날짜}']} ${duty} 담당입니다. 식사는 ${v['#{시간}']}이에요. 주방 보조 스케줄: https://wolko.org/kitchen/#${date}`;
}

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
  const only = params.get('meal');
  const meals = MEALS.includes(only) ? [only] : MEALS;
  const configured = !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER_PHONE);
  const kakaoReady = !!(env.KAKAO_PF_ID && env.KAKAO_TEMPLATE_KITCHEN);
  const channel = kakaoReady ? 'kakao+sms' : 'sms';
  const settings = await getSettings(env);

  const testPhone = String(params.get('testPhone') || '').replace(/[^0-9]/g, '');
  if (testPhone) {
    const meal = MEALS.includes(only) ? only : 'lunch';
    if (!/^01[016789][0-9]{7,8}$/.test(testPhone)) return Response.json({ error: 'testPhone은 휴대폰 번호여야 합니다.' }, { status: 400, headers: H });
    if (!configured) return Response.json({ error: 'Solapi 설정(SOLAPI_API_KEY/SECRET/SENDER_PHONE)이 필요합니다.' }, { status: 503, headers: H });
    if (dryRun) return Response.json({ test: true, meal, to: mask(testPhone), channel, sent: 0, dryRun: true }, { headers: H });
    const mealTime = settings.meals[meal] || '12:00';
    const duty = dutyText(meal, [`${meal}_prep`]);
    const firstChannel = await sendKakaoWithSmsFallback(env, testPhone, env.KAKAO_TEMPLATE_KITCHEN, reminderVariables('테스트', date, duty, mealTime), reminderText('테스트', date, duty, mealTime));
    return Response.json({ test: true, meal, date, to: mask(testPhone), channel, firstChannel, sent: firstChannel ? 1 : 0 }, { headers: H });
  }

  const day = await readDay(env, date);
  const results = [];
  for (const meal of meals) {
    const mealTime = settings.meals[meal];
    const base = { meal, date, mealTime, sendAt: mealTime ? hhmm(minutesOf(mealTime) - REMINDER_LEAD_MIN) : null, channel };
    if (!mealTime && !force) { results.push({ ...base, skipped: 'no-time-set', sent: 0 }); continue; }
    const mealMin = minutesOf(mealTime) ?? 12 * 60;
    const target = mealMin - REMINDER_LEAD_MIN;
    if (!force && nowMin < target) { results.push({ ...base, skipped: 'not-yet', sent: 0 }); continue; }
    if (!force && nowMin > mealMin) { results.push({ ...base, skipped: 'too-late', sent: 0 }); continue; }

    // 이 끼니의 신청자를 사람별로 묶는다 (준비·클린업을 둘 다 신청했으면 한 명)
    const byPerson = new Map();
    for (const slot of SLOTS.filter(s => mealOf(s) === meal)) {
      for (const record of day[slot] || []) {
        const entry = byPerson.get(record.email) || { record, slots: [] };
        entry.slots.push(slot);
        byPerson.set(record.email, entry);
      }
    }
    if (!byPerson.size) { results.push({ ...base, person: null, sent: 0 }); continue; }

    for (const { record, slots } of byPerson.values()) {
      const name = shownName(record);
      const duty = dutyText(meal, slots);
      const one = { ...base, duty, person: { name, phone: mask(record.phone) } };
      // 알림 시각 이후에 신청한 사람에게는 보내지 않는다 (이미 지나간 시각이라 혼란을 준다)
      const lastSigned = Math.max(...slots.map(s => Date.parse(day[s].find(p => p.email === record.email)?.at) || 0));
      if (!force && lastSigned) {
        const signedKst = new Date(lastSigned + 9 * 3600000);
        if (signedKst.toISOString().slice(0, 10) === date && signedKst.getUTCHours() * 60 + signedKst.getUTCMinutes() > target) { results.push({ ...one, skipped: 'signed-up-after', sent: 0 }); continue; }
      }
      if (dryRun) { results.push({ ...one, dryRun: true, sent: 0 }); continue; }
      if (!configured) { results.push({ ...one, error: 'Solapi 설정(SOLAPI_API_KEY/SECRET/SENDER_PHONE)이 필요합니다.', sent: 0 }); continue; }
      if (!record.phone) { results.push({ ...one, error: '담당자 휴대폰 번호가 없습니다.', sent: 0 }); continue; }
      const doneKey = `${SMS_PREFIX}${date}:${meal}:${record.email}`;
      if (await env.CAMP_KV.get(doneKey, 'json')) { results.push({ ...one, sent: 0, alreadySent: true }); continue; }
      const shown = mealTime || '12:00';
      try {
        const firstChannel = await sendKakaoWithSmsFallback(env, record.phone, env.KAKAO_TEMPLATE_KITCHEN, reminderVariables(name, date, duty, shown), reminderText(name, date, duty, shown));
        if (!firstChannel) { results.push({ ...one, error: '발송하지 못했습니다. (번호 또는 Solapi 설정 확인)', sent: 0 }); continue; }
        await env.CAMP_KV.put(doneKey, JSON.stringify({ at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 14 });
        results.push({ ...one, sent: 1, firstChannel });
      } catch (error) {
        results.push({ ...one, error: String(error?.message || error).slice(0, 200), sent: 0 }); // 한 명이 실패해도 다음 사람은 계속 보낸다 — 실패한 사람은 다음 확인 때 다시 시도한다
      }
    }
  }
  const failed = results.some(r => r.error);
  const sent = results.reduce((n, r) => n + r.sent, 0);
  return Response.json({ date, time: hhmm(nowMin), configured, sent, results }, { status: failed && sent === 0 ? 503 : 200, headers: H });
}
