/**
 * 이번 주에 아직 채워지지 않은 자리 — 차량 운행 스케줄(픽업/드롭오프)과 주방 보조(끼니 × 준비/클린업).
 * 열려 있는(닫히지 않은) 칸만 센다. 차량은 한 칸에 한 명, 주방은 칸마다 정원(기본 준비 1명 · 클린업 2명)까지 채워야 "채워짐".
 * 매주 월요일 오전에 주방·운행 관리자(Estelle)에게 영어로 메일을 보내는 데 쓴다 (functions/api/staffing/weekly-reminder.js).
 */
import { SLOTS as CAR_SLOTS, closedKey as carClosedKey, isSlotClosed as carClosed, slotKey as carSlotKey, parseDate, periodFor, weekdayOf, DRIVE_MANAGER_EMAILS } from './carDrive.js';
import { SLOTS as KITCHEN_SLOTS, KITCHEN_MANAGER_EMAILS, capacityKey, capacityOf, closedKey as kitchenClosedKey, defaultCapacityOf, isSlotClosed as kitchenClosed, readDay } from './kitchenDuty.js';
import { getSettings } from './kitchenSettings.js';

const DAY = 86400000;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 이메일을 받을 사람 — 운행 스케줄 관리자와 주방 관리자 (지금은 둘 다 Estelle) */
export const stafferEmails = () => [...new Set([...DRIVE_MANAGER_EMAILS, ...KITCHEN_MANAGER_EMAILS])];

/** 그 날짜가 속한 주(월~일)의 날짜 7개 */
export function weekDays(dateStr) {
  const ms = parseDate(dateStr);
  const start = ms - ((weekdayOf(dateStr) + 6) % 7) * DAY;
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * DAY).toISOString().slice(0, 10));
}

export const CAR_LABEL = { pickup: 'Morning pick-up', dropoff: 'Afternoon drop-off' };
export const KITCHEN_LABEL = {
  am_prep: 'Breakfast prep', am_clean: 'Breakfast clean-up', lunch_prep: 'Lunch prep', lunch_clean: 'Lunch clean-up', dinner_prep: 'Dinner prep', dinner_clean: 'Dinner clean-up',
};
export const dayLabel = date => { const [, m, d] = date.split('-'); return `${DOW[weekdayOf(date)]}, ${MON[+m - 1]} ${+d}`; };

/** 차량: 열려 있는데 비어 있는 칸 [{ date, slot }] — today 이전 날짜는 건너뛴다 */
export async function carGaps(env, days, today) {
  const closedMap = (await env.CAMP_KV.get(carClosedKey(periodFor(days[0]).start), 'json')) || {};
  const gaps = [];
  for (const date of days) {
    if (date < today) continue;
    for (const slot of CAR_SLOTS) {
      const record = await env.CAMP_KV.get(carSlotKey(date, slot), 'json');
      if (record) continue;
      if (!carClosed(closedMap, date, slot, false)) gaps.push({ date, slot });
    }
  }
  return gaps;
}

/** 주방: 열려 있는데 정원이 덜 찬 칸 [{ date, slot, filled, capacity }] */
export async function kitchenGaps(env, days, today) {
  const period = periodFor(days[0]).start;
  const [closedMap, capMap, settings] = await Promise.all([env.CAMP_KV.get(kitchenClosedKey(period), 'json'), env.CAMP_KV.get(capacityKey(period), 'json'), getSettings(env)]);
  const gaps = [];
  for (const date of days) {
    if (date < today) continue;
    const day = await readDay(env, date);
    for (const slot of KITCHEN_SLOTS) {
      const filled = (day[slot] || []).length;
      if (kitchenClosed(closedMap, date, slot, filled > 0)) continue;
      const capacity = capacityOf(capMap, date, slot, defaultCapacityOf(slot, settings));
      if (filled < capacity) gaps.push({ date, slot, filled, capacity });
    }
  }
  return gaps;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 영어 안내 메일 — 제목, HTML, 텍스트 */
export function gapsEmail({ days, car, kitchen, origin = 'https://wolko.org', name = 'Estelle' }) {
  const weekOf = `${MON[+days[0].split('-')[1] - 1]} ${+days[0].split('-')[2]}`;
  const subject = `[WOLKO] Weekly reminder: unfilled slots for the week of ${weekOf}`;
  const byDate = list => days.map(d => [d, list.filter(g => g.date === d)]).filter(([, g]) => g.length);
  const carLine = g => CAR_LABEL[g.slot];
  const kitchenLine = g => `${KITCHEN_LABEL[g.slot]} (${g.filled} of ${g.capacity} signed up)`;
  const text = [
    `Dear ${name},`, '',
    'A new week has begun, and the following open slots have not yet been filled. We kindly ask you to remind the team and encourage members to sign up so that every slot is covered.', '',
    ...(car.length ? ['DRIVING SCHEDULE', ...byDate(car).map(([d, g]) => `  ${dayLabel(d)}: ${g.map(carLine).join('; ')}`), `  ${origin}/car-drive/`, ''] : []),
    ...(kitchen.length ? ['KITCHEN DUTY', ...byDate(kitchen).map(([d, g]) => `  ${dayLabel(d)}: ${g.map(kitchenLine).join('; ')}`), `  ${origin}/kitchen/`, ''] : []),
    'Thank you for your continued help and care for the team.', '', 'Sincerely,', 'WOLKO Portal (automated message)',
  ].join('\n');
  const section = (title, list, line, href, linkText) => !list.length ? '' : `
      <h3 style="margin:22px 0 8px;font-size:15px;color:#004f68;">${title}</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${byDate(list).map(([d, g]) => `
        <tr><td style="padding:7px 10px 7px 0;border-bottom:1px solid #e3ecf1;white-space:nowrap;vertical-align:top;"><strong>${esc(dayLabel(d))}</strong></td>
        <td style="padding:7px 0;border-bottom:1px solid #e3ecf1;">${g.map(x => esc(line(x))).join('<br>')}</td></tr>`).join('')}
      </table>
      <p style="margin:10px 0 0;font-size:13px;"><a href="${origin}${href}" style="color:#004f68;">${linkText}</a></p>`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#102936;line-height:1.55;">
      <h2 style="margin:0 0 14px;color:#004f68;font-size:19px;">Weekly Reminder: Unfilled Slots</h2>
      <p style="margin:0 0 10px;">Dear ${esc(name)},</p>
      <p style="margin:0 0 6px;">A new week has begun, and the following open slots have not yet been filled. We kindly ask you to remind the team and encourage members to sign up so that every slot is covered.</p>
      ${section('Driving Schedule', car, carLine, '/car-drive/', 'Open the driving schedule')}
      ${section('Kitchen Duty', kitchen, kitchenLine, '/kitchen/', 'Open the kitchen duty schedule')}
      <p style="margin:24px 0 0;">Thank you for your continued help and care for the team.</p>
      <p style="margin:14px 0 0;">Sincerely,<br>WOLKO Portal<br><span style="color:#7d98a3;font-size:12px;">This is an automated message sent every Monday at 9:30 AM (KST).</span></p>
    </div>`;
  return { subject, html, text };
}
