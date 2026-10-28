/**
 * 매달 마지막 날(한국 시간) 오전 9시 이후 — 그 달 복음 통계 보고를 아직 안 낸 포탈 계정에 알림 메일을 보낸다.
 *   POST /api/gospel-reminders   (Authorization: Bearer <GOSPEL_REMINDER_SECRET · KITCHEN_REMINDER_SECRET · DRIVE_REMINDER_SECRET · CRS_REMINDER_SECRET 중 먼저 있는 것>)
 *   쿼리: ?dryRun=1 보내지 않고 대상만 확인 · ?force=1 마지막 날이 아니어도 지금 보냄 · ?month=YYYY-MM 그 달 기준
 *         ?to=이메일 그 주소로만 시험 메일 한 통(기록을 남기지 않는다)
 * 한 번 호출에 최대 20통을 보내고 남은 사람 수를 remaining 으로 알려 준다(통합 스케줄러가 다음 틱에 이어서 보낸다).
 * 같은 달·같은 사람에게는 한 번만 간다. 메일 발송에는 RESEND_API_KEY 가 필요하다.
 */
import { sendEmail } from '../lib/hubAccounts.js';
import { MONTH_RE, loadMonth } from '../lib/gospelStats.js';
import { MAIL_KEY, isLastDayOfMonth, missingReporters, submittedEmails, reminderMail, reportLink, reporterRoster } from '../lib/gospelReminder.js';

const H = { 'Cache-Control': 'no-store' };
const BATCH = 20;
const todayKst = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

export async function onRequestPost({ env, request }) {
  const secret = env.GOSPEL_REMINDER_SECRET || env.KITCHEN_REMINDER_SECRET || env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET;
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: H });
  if (!env.CAMP_KV) return Response.json({ error: 'Missing KV' }, { status: 503, headers: H });
  const params = new URL(request.url).searchParams;
  const dryRun = params.get('dryRun') === '1', force = params.get('force') === '1';
  const today = todayKst();
  const month = params.get('month') && MONTH_RE.test(params.get('month')) ? params.get('month') : today.slice(0, 7);
  const testTo = String(params.get('to') || '').trim().toLowerCase();
  if (testTo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo)) return Response.json({ error: 'to 는 이메일 주소여야 합니다.' }, { status: 400, headers: H });
  const base = { today, month, sent: 0, remaining: 0 };
  if (!force && !testTo && !isLastDayOfMonth(today)) return Response.json({ ...base, skipped: 'not-last-day' }, { headers: H });

  const origin = 'https://wolko.org';
  const link = reportLink(month, origin);
  if (testTo) {
    if (!env.RESEND_API_KEY) return Response.json({ ...base, error: 'RESEND_API_KEY 설정이 필요합니다.' }, { status: 503, headers: H });
    const mail = reminderMail({ name: '시험 수신자', month, link });
    try { await sendEmail(env, { to: testTo, ...mail }); } catch (error) { return Response.json({ ...base, error: String(error.message || error) }, { status: 502, headers: H }); }
    return Response.json({ ...base, sent: 1, test: true }, { headers: H });
  }

  const roster = await reporterRoster(env);
  const missing = missingReporters(roster, await submittedEmails(env, roster, await loadMonth(env, month)));
  const pending = [];
  for (const person of missing) if (!(await env.CAMP_KV.get(MAIL_KEY(month, person.email)))) pending.push(person);
  if (dryRun) return Response.json({ ...base, dryRun: true, missing: missing.length, pending: pending.length }, { headers: H });
  if (!pending.length) return Response.json({ ...base, missing: missing.length }, { headers: H });
  if (!env.RESEND_API_KEY) return Response.json({ ...base, missing: missing.length, error: 'RESEND_API_KEY 설정이 필요합니다.' }, { status: 503, headers: H });

  let sent = 0;
  const results = [];
  for (const person of pending.slice(0, BATCH)) {
    try {
      await sendEmail(env, { to: person.email, ...reminderMail({ name: person.name, month, link }) });
      await env.CAMP_KV.put(MAIL_KEY(month, person.email), new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 60 });
      sent++;
    } catch { results.push({ error: true }); }      // 주소는 기록에 남기지 않는다
  }
  return Response.json({ ...base, missing: missing.length, sent, results, remaining: Math.max(0, pending.length - sent) }, { headers: H });
}
