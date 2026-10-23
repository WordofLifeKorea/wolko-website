import { json, badRequest, noDb, FIXED_ADMIN_EMAILS, applyOverrides } from '../../lib/campteamAuth.js';
import { todayKST } from '../../lib/campteamDb.js';
import { buildWeek, weekEmpty, summaryPrompt, callSummary, summaryItems, SUMMARY_MODEL, tuesdayOf, mondayOf, nowIso } from '../../lib/campteamAlerts.js';
import { buildWeeklyEmail, sendCampMail, fromAddress } from '../../lib/campteamMail.js';

/**
 * 주간 이메일 발송 (스케줄러가 매주 화요일 아침에 호출). 사람이 브라우저로 부르는 주소가 아니라서 로그인 대신 비밀값(CAMPTEAM_MAIL_SECRET)으로만 연다.
 *   POST ?dryRun=1   받을 사람과 건수만 보여 준다 (아무것도 보내지 않음)
 *   POST ?force=1    화요일이 아니거나 이미 보냈어도 보낸다
 *   POST ?to=주소    그 한 사람에게만 시험 발송 (설정·발송 기록과 무관, 다른 사람에게는 보내지 않음)
 * 규칙: 이번 주에 보여 줄 게 없으면 보내지 않는다 · 받기를 끈 사람은 제외 · 같은 주에 두 번 보내지 않는다(mail_log) · 한 사람이 실패해도 나머지는 계속 보낸다.
 */
async function same(a, b) {
  const enc = new TextEncoder(), [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(String(a))), crypto.subtle.digest('SHA-256', enc.encode(String(b)))]);
  const u = new Uint8Array(x), v = new Uint8Array(y); let d = 0; for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i]; return d === 0;
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const secret = env.CAMPTEAM_MAIL_SECRET || '', auth = request.headers.get('Authorization') || '', token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!secret) return json({ error: '발송 비밀값(CAMPTEAM_MAIL_SECRET)이 설정되지 않았어요.' }, 503);
  if (!token || !(await same(token, secret))) return json({ error: '인증이 필요합니다.' }, 401);
  const p = new URL(request.url).searchParams, dryRun = p.get('dryRun') === '1', force = p.get('force') === '1', only = (p.get('to') || '').trim().toLowerCase();
  if (only && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(only)) return badRequest('시험 발송 주소가 올바르지 않습니다.');
  if (!dryRun && !env.RESEND_API_KEY) return json({ error: '메일 서비스 키(RESEND_API_KEY)가 설정되지 않았어요.' }, 503);
  const today = todayKST(), isTue = new Date(today + 'T00:00:00Z').getUTCDay() === 2, weekKey = mondayOf(today);
  if (!isTue && !force && !only) return json({ skipped: 'not-tuesday', today }); // 스케줄 작업은 이 결과를 보고 실패로 표시한다(화요일을 놓친 걸 알 수 있게)
  const rows = (await env.DB.prepare('SELECT email, name, role FROM camp_members WHERE active = 1').all()).results, seen = new Set(), members = [];
  let ov = {}; try { for (const r of (await env.DB.prepare('SELECT email, area, level FROM member_perms').all()).results) (ov[r.email.toLowerCase()] ||= {})[r.area] = r.level; } catch { ov = {}; }
  for (const r of rows) { const e = r.email.toLowerCase(); if (!seen.has(e)) { seen.add(e); members.push({ email: e, name: r.name || '', perms: applyOverrides(r.role, ov[e]) }); } }
  for (const e of FIXED_ADMIN_EMAILS) if (!seen.has(e)) { seen.add(e); members.push({ email: e, name: '', perms: applyOverrides('admin', null) }); }
  const prefs = new Map((await env.DB.prepare('SELECT email, weeklyEmail FROM notify_prefs').all()).results.map((r) => [r.email.toLowerCase(), r.weeklyEmail]));
  const sent = new Set((await env.DB.prepare(`SELECT email FROM mail_log WHERE kind = 'weekly' AND weekKey = ?1 AND status = 'sent'`).bind(weekKey).all()).results.map((r) => r.email.toLowerCase()));
  const out = { today, weekKey, from: fromAddress(env), dryRun, planned: [], sent: 0, skipped: [], failed: [] }, base = env.CAMPTEAM_BASE_URL || 'https://wolko.org';
  for (const m of members) {
    if (only && m.email !== only) continue;
    if (!only && prefs.get(m.email) === 0) { out.skipped.push({ email: m.email, why: 'opted-out' }); continue; }
    if (!only && !force && sent.has(m.email)) { out.skipped.push({ email: m.email, why: 'already-sent' }); continue; }
    const week = await buildWeek(env, m.email, today, m.perms);
    if (weekEmpty(week)) { out.skipped.push({ email: m.email, why: 'nothing-this-week' }); continue; }
    out.planned.push({ email: m.email, tasks: week.tasks.length, overdue: week.overdue.length, meetings: week.meetings.length, events: week.events.length });
    if (dryRun) continue;
    try {
      let summary = null;
      if (env.ANTHROPIC_API_KEY) {
        const forDate = tuesdayOf(today), cached = await env.DB.prepare(`SELECT text FROM daily_summaries WHERE email = ?1 AND kind = 'weekly' AND forDate = ?2`).bind(m.email, forDate).first();
        if (cached && cached.text) summary = cached.text;
        else { try { const { system, user } = summaryPrompt('weekly', today, summaryItems({ overdue: week.overdue, today: [], soon: week.tasks, meetings: week.meetings, events: week.events })); const model = env.CAMPTEAM_SUMMARY_MODEL || SUMMARY_MODEL; summary = await callSummary({ apiKey: env.ANTHROPIC_API_KEY, model, system, user, url: env.CAMPTEAM_AI_URL || undefined }) || null;
          if (summary) await env.DB.prepare(`INSERT INTO daily_summaries (email,kind,forDate,text,model,createdAt) VALUES (?1,'weekly',?2,?3,?4,?5) ON CONFLICT(email,kind,forDate) DO UPDATE SET text=?3, model=?4, createdAt=?5`).bind(m.email, forDate, summary, model, nowIso()).run(); } catch { summary = null; /* 요약이 실패해도 메일은 보낸다 */ } }
      }
      const mail = buildWeeklyEmail({ name: m.name, week, summary, base });
      await sendCampMail(env, { to: m.email, ...mail, retryMs: Number(env.CAMPTEAM_MAIL_RETRY_MS) || 1200 });
      if (!only && members.length > 1) await new Promise((r) => setTimeout(r, Number(env.CAMPTEAM_MAIL_GAP_MS ?? 350))); // 메일 서비스의 초당 요청 제한을 넘지 않게 간격을 둔다
      out.sent++;
      if (!only) await env.DB.prepare(`INSERT INTO mail_log (email,kind,weekKey,status,detail,createdAt) VALUES (?1,'weekly',?2,'sent','',?3) ON CONFLICT(email,kind,weekKey) DO UPDATE SET status='sent', detail='', createdAt=?3`).bind(m.email, weekKey, nowIso()).run();
    } catch (e) {
      out.failed.push({ email: m.email, error: String(e.message || e).slice(0, 160) });
      if (!only) await env.DB.prepare(`INSERT INTO mail_log (email,kind,weekKey,status,detail,createdAt) VALUES (?1,'weekly',?2,'failed',?3,?4) ON CONFLICT(email,kind,weekKey) DO UPDATE SET status='failed', detail=?3, createdAt=?4`).bind(m.email, weekKey, String(e.message || e).slice(0, 200), nowIso()).run();
    }
  }
  // 실패한 사람이 있으면 502 로 알려서 스케줄러(GitHub 작업)가 실패로 표시하고 다시 시도하게 한다 (이미 보낸 사람은 발송 기록으로 건너뛴다)
  return json(out, out.failed.length ? 502 : 200);
}
