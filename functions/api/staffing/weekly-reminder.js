/**
 * 매주 월요일 오전 9시 30분(한국 시간)에 — 이번 주에 아직 비어 있는 차량 운행·주방 보조 자리를 영어 메일로 Estelle(운행·주방 관리자)에게 알린다.
 *   POST /api/staffing/weekly-reminder   (Authorization: Bearer <STAFFING_REMINDER_SECRET · KITCHEN_REMINDER_SECRET · DRIVE_REMINDER_SECRET · CRS_REMINDER_SECRET 중 먼저 있는 것>)
 *   쿼리: ?dryRun=1 보내지 않고 비어 있는 자리만 확인 · ?force=1 월요일이 아니어도·이미 보냈어도 지금 보냄
 *         ?to=이메일 그 주소로만 보낸다(시험용, 기록을 남기지 않아 정식 메일에 영향 없음) · ?date=YYYY-MM-DD 그 날짜 기준
 * 비어 있는 자리가 하나도 없으면 메일을 보내지 않는다. 같은 주에는 한 번만 보낸다(KV staffing:weekly:{월요일}).
 * 메일 발송에는 RESEND_API_KEY 가 필요하다.
 */
import { sendEmail } from '../../lib/hubAccounts.js';
import { parseDate, todayKst, weekdayOf } from '../../lib/carDrive.js';
import { carGaps, gapsEmail, kitchenGaps, stafferEmails, weekDays } from '../../lib/staffingGaps.js';

const H = { 'Cache-Control': 'no-store' };

export async function onRequestPost({ env, request }) {
  const secret = env.STAFFING_REMINDER_SECRET || env.KITCHEN_REMINDER_SECRET || env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET;
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: H });
  if (!env.CAMP_KV) return Response.json({ error: 'Missing KV' }, { status: 503, headers: H });
  const url = new URL(request.url);
  const params = url.searchParams;
  const dryRun = params.get('dryRun') === '1';
  const force = params.get('force') === '1';
  const requested = params.get('date');
  const today = requested && parseDate(requested) !== null ? requested : todayKst();
  const testTo = String(params.get('to') || '').trim().toLowerCase();
  if (testTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo)) return Response.json({ error: 'to 는 이메일 주소여야 합니다.' }, { status: 400, headers: H });

  const days = weekDays(today);
  const doneKey = `staffing:weekly:${days[0]}`;
  const base = { today, week: `${days[0]} ~ ${days[6]}` };
  if (!force && !testTo && weekdayOf(today) !== 1) return Response.json({ ...base, skipped: 'not-monday', sent: 0 }, { headers: H });
  if (!force && !testTo && !dryRun && await env.CAMP_KV.get(doneKey)) return Response.json({ ...base, skipped: 'already-sent', sent: 0 }, { headers: H });

  const [car, kitchen] = await Promise.all([carGaps(env, days, today), kitchenGaps(env, days, today)]);
  const gaps = { car: car.length, kitchen: kitchen.length };
  if (!car.length && !kitchen.length) return Response.json({ ...base, gaps, skipped: 'nothing-open', sent: 0 }, { headers: H });
  const to = testTo ? [testTo] : stafferEmails();
  if (dryRun) return Response.json({ ...base, gaps, to, car, kitchen, dryRun: true, sent: 0 }, { headers: H });
  if (!env.RESEND_API_KEY) return Response.json({ ...base, gaps, error: 'RESEND_API_KEY 설정이 필요합니다.', sent: 0 }, { status: 503, headers: H });

  const mail = gapsEmail({ days, car, kitchen, origin: url.origin.startsWith('https://') ? url.origin : 'https://wolko.org' });
  try {
    await sendEmail(env, { to, subject: mail.subject, html: mail.html });
  } catch (error) {
    return Response.json({ ...base, gaps, error: String(error.message || error), sent: 0 }, { status: 502, headers: H });
  }
  if (!testTo) await env.CAMP_KV.put(doneKey, JSON.stringify({ at: new Date().toISOString(), gaps }), { expirationTtl: 60 * 60 * 24 * 21 });
  return Response.json({ ...base, gaps, to, sent: 1, ...(testTo ? { test: true } : {}) }, { headers: H });
}
