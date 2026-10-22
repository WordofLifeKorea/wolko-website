import { campSession, json, needLogin, needPerm, badRequest, noDb, FIXED_ADMIN_EMAILS } from '../../lib/campteamAuth.js';
import { todayKST, uuid, text, audit } from '../../lib/campteamDb.js';
import { loadSettings, saveSettings, sanitizeSettings, buildAlerts, buildWeek, weekEmpty, listAnnouncements, summaryPrompt, callSummary, summaryItems, SUMMARY_MODEL, tuesdayOf, nowIso } from '../../lib/campteamAlerts.js';

/**
 * 알림공지 — 내 알림(자동) · 팀 공지 · 오늘 할 일 · 요약.
 * 캠프팀 명단에 있는 사람만 쓸 수 있다(명단 밖은 403).
 *
 * GET  (?lite=1 이면 개수와 위쪽 몇 개만)  → { date, today, items, unread, announcements, people, settings, prefs, summary, ai }
 * POST { action }
 *   state    { keys[], state: 'seen'|'dismissed'|'clear' }     알림 확인/끄기/되돌리기
 *   seenAll                                                      지금 보이는 알림을 모두 "확인"
 *   announce { title, body, audience: 'all'|'people', recipients[], pinned, link }   팀 공지 올리기
 *   edit     { id, title?, body?, audience?, recipients?, pinned?, link? }          올린 사람 또는 관리자
 *   delete   { id }                                              올린 사람 또는 관리자 (삭제 표시만 — 휴지통에서 복구)
 *   pref     { weeklyEmail }                                     주간 이메일 받기 켜기/끄기 (내 설정)
 *   settings { dueDays, eventDays, expireDays }                  알림 기준 일수 (관리자만)
 *   summary  { kind: 'daily'|'weekly' }                          AI 요약 한 번 만들기 (하루/그 주 한 번만)
 */
const KEY = /^(task|meet|event|dec|ann):[A-Za-z0-9_-]{1,64}(:[a-z0-9]{1,4})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function roster(env) {
  const rows = (await env.DB.prepare('SELECT email, name, role FROM camp_members WHERE active = 1 ORDER BY name, email').all()).results, seen = new Set(rows.map((r) => r.email.toLowerCase()));
  const out = rows.map((r) => ({ email: r.email.toLowerCase(), name: r.name || '' }));
  for (const e of FIXED_ADMIN_EMAILS) if (!seen.has(e)) out.push({ email: e, name: '' });
  return out;
}
const safeLink = (v) => { const t = String(v || '').trim(); return /^\/campteam\/[A-Za-z0-9/_?=&%.-]{0,200}$/.test(t) ? t : ''; };

async function validateAnnounce(env, b, s, base = {}) {
  const has = (k) => k in b;
  const title = has('title') ? text(b.title, 80) : base.title, body = has('body') ? text(b.body, 2000) : base.body ?? '';
  if (!title) return { error: '제목을 적어 주세요.' };
  const audience = has('audience') ? (b.audience === 'people' ? 'people' : 'all') : base.audience || 'all';
  let recipients = base.recipients || [];
  if (audience === 'people') {
    if (has('recipients') || !recipients.length) {
      const members = new Set((await roster(env)).map((m) => m.email)), list = [...new Set((Array.isArray(b.recipients) ? b.recipients : []).map((x) => String(x || '').trim().toLowerCase()).filter((x) => EMAIL.test(x)))];
      recipients = list.filter((x) => members.has(x));
      if (!recipients.length) return { error: '받을 사람을 한 명 이상 골라 주세요.' };
    }
  } else recipients = [];
  const pinned = has('pinned') ? (b.pinned ? 1 : 0) : base.pinned ? 1 : 0;
  const link = has('link') ? safeLink(b.link) : base.link || '';
  return { v: { title, body, audience, recipients, pinned, link } };
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole) return needPerm('캠프팀 명단에 있는 계정만 알림공지를 쓸 수 있어요.');
  const lite = new URL(request.url).searchParams.get('lite') === '1', today = todayKST(), settings = await loadSettings(env);
  const [{ items: all, today: box }, announcements] = await Promise.all([buildAlerts(env, s.email, { today, settings }), listAnnouncements(env, s.email, { today, settings, isAdmin: s.perms.manageMembers })]);
  const items = all.filter((x) => x.state !== 'dismissed'), unreadAuto = items.filter((x) => !x.state).length, unreadAnn = announcements.filter((a) => a.unread && !a.folded).length;
  const out = { date: today, unread: unreadAuto + unreadAnn, unreadAuto, unreadAnn, perms: { write: s.perms.write, manageMembers: s.perms.manageMembers } };
  if (lite) return json({ ...out, items: items.slice(0, 8), announcements: announcements.filter((a) => !a.folded).slice(0, 5) });
  const me = s.email.toLowerCase(), prefRow = await env.DB.prepare('SELECT weeklyEmail FROM notify_prefs WHERE email = ?1').bind(me).first();
  const forWeek = tuesdayOf(today), dow = new Date(today + 'T00:00:00Z').getUTCDay();
  const sums = (await env.DB.prepare(`SELECT kind, forDate, text FROM daily_summaries WHERE email = ?1 AND ((kind = 'daily' AND forDate = ?2) OR (kind = 'weekly' AND forDate = ?3))`).bind(me, today, forWeek).all()).results;
  const get = (k) => { const r = sums.find((x) => x.kind === k); return r && r.text ? r.text : null; };
  const week = dow === 1 ? null : await buildWeek(env, s.email, today), wk = await env.DB.prepare(`SELECT state FROM alert_state WHERE email = ?1 AND alertKey = ?2`).bind(me, 'weekly:' + forWeek).first();
  const people = await roster(env);
  return json({ ...out, today: box, items, announcements, people, settings, prefs: { weeklyEmail: prefRow ? !!prefRow.weeklyEmail : true },
    ai: !!env.ANTHROPIC_API_KEY, summary: { daily: get('daily'), weekly: get('weekly'), weeklyAvailable: !!week && !weekEmpty(week), weeklyDate: forWeek, dailyCanMake: !box.empty && !get('daily'), weeklyCanMake: !!week && !weekEmpty(week) && !get('weekly'), dismissedWeekly: !!(wk && wk.state === 'dismissed') },
    week: week ? { start: week.start, end: week.end, overdue: week.overdue.length, tasks: week.tasks.length, meetings: week.meetings.length, events: week.events.length } : null });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole) return needPerm('캠프팀 명단에 있는 계정만 알림공지를 쓸 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const me = s.email.toLowerCase(), now = nowIso(), today = todayKST(), a = b.action;

  if (a === 'state') {
    const keys = [...new Set(Array.isArray(b.keys) ? b.keys.map(String) : [])].slice(0, 60);
    if (!keys.length || keys.some((k) => !KEY.test(k) && !/^weekly:\d{4}-\d{2}-\d{2}$/.test(k))) return badRequest('알림 번호가 올바르지 않습니다.');
    if (b.state === 'clear') { for (const k of keys) await env.DB.prepare('DELETE FROM alert_state WHERE email = ?1 AND alertKey = ?2').bind(me, k).run(); return json({ ok: true }); }
    if (!['seen', 'dismissed'].includes(b.state)) return badRequest('상태가 올바르지 않습니다.');
    for (const k of keys) await env.DB.prepare('INSERT INTO alert_state (email,alertKey,state,updatedAt) VALUES (?1,?2,?3,?4) ON CONFLICT(email,alertKey) DO UPDATE SET state=?3, updatedAt=?4').bind(me, k, b.state, now).run();
    return json({ ok: true });
  }
  if (a === 'seenAll') {
    const settings = await loadSettings(env), { items } = await buildAlerts(env, s.email, { today, settings }), anns = await listAnnouncements(env, s.email, { today, settings, isAdmin: false });
    const keys = [...items.filter((x) => !x.state).map((x) => x.key), ...anns.filter((x) => x.unread).map((x) => 'ann:' + x.id)];
    for (const k of keys) await env.DB.prepare(`INSERT OR IGNORE INTO alert_state (email,alertKey,state,updatedAt) VALUES (?1,?2,'seen',?3)`).bind(me, k, now).run();
    return json({ ok: true, count: keys.length });
  }
  if (a === 'announce') {
    const r = await validateAnnounce(env, b, s); if (r.error) return badRequest(r.error);
    const v = r.v, id = uuid(), name = (await env.DB.prepare('SELECT name FROM camp_members WHERE email = ?1').bind(me).first())?.name || '';
    if (v.pinned && !s.perms.write && !s.perms.manageMembers) v.pinned = 0;
    await env.DB.prepare('INSERT INTO announcements (id,title,body,audience,pinned,link,createdAt,updatedAt,createdBy,createdByName) VALUES (?1,?2,?3,?4,?5,?6,?7,?7,?8,?9)').bind(id, v.title, v.body, v.audience, v.pinned, v.link, now, me, name).run();
    for (const e of v.recipients) await env.DB.prepare('INSERT OR IGNORE INTO announcement_recipients (announcementId,email) VALUES (?1,?2)').bind(id, e).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO alert_state (email,alertKey,state,updatedAt) VALUES (?1,?2,'seen',?3)`).bind(me, 'ann:' + id, now).run(); // 내가 올린 공지는 읽은 것으로
    await audit(env, me, 'create', 'announcement', id, v.title);
    return json({ id }, 201);
  }
  if (a === 'edit' || a === 'delete') {
    const row = await env.DB.prepare('SELECT * FROM announcements WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.id || '')).first();
    if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
    if (String(row.createdBy).toLowerCase() !== me && !s.perms.manageMembers) return needPerm('올린 사람이나 관리자만 고치거나 지울 수 있어요.');
    if (a === 'delete') { await env.DB.prepare('UPDATE announcements SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(row.id, now).run(); await audit(env, me, 'delete', 'announcement', row.id, row.title); return json({ ok: true }); }
    const cur = (await env.DB.prepare('SELECT email FROM announcement_recipients WHERE announcementId = ?1').bind(row.id).all()).results.map((x) => x.email);
    const r = await validateAnnounce(env, b, s, { ...row, recipients: cur }); if (r.error) return badRequest(r.error);
    const v = r.v;
    await env.DB.prepare('UPDATE announcements SET title=?2, body=?3, audience=?4, pinned=?5, link=?6, updatedAt=?7 WHERE id=?1').bind(row.id, v.title, v.body, v.audience, v.pinned, v.link, now).run();
    await env.DB.prepare('DELETE FROM announcement_recipients WHERE announcementId = ?1').bind(row.id).run();
    for (const e of v.recipients) await env.DB.prepare('INSERT OR IGNORE INTO announcement_recipients (announcementId,email) VALUES (?1,?2)').bind(row.id, e).run();
    await env.DB.prepare(`DELETE FROM alert_state WHERE alertKey = ?1 AND email <> ?2`).bind('ann:' + row.id, me).run(); // 고치면 다시 새 공지로 올라온다
    await audit(env, me, 'update', 'announcement', row.id, v.title);
    return json({ ok: true });
  }
  if (a === 'pref') {
    await env.DB.prepare('INSERT INTO notify_prefs (email,weeklyEmail,updatedAt) VALUES (?1,?2,?3) ON CONFLICT(email) DO UPDATE SET weeklyEmail=?2, updatedAt=?3').bind(me, b.weeklyEmail ? 1 : 0, now).run();
    return json({ ok: true, weeklyEmail: !!b.weeklyEmail });
  }
  if (a === 'settings') {
    if (!s.perms.manageMembers) return needPerm('알림 기준은 관리자만 바꿀 수 있어요.');
    const cur = await loadSettings(env), r = sanitizeSettings(b, cur); if (r.error) return badRequest(r.error);
    await saveSettings(env, r.settings, me, now); await audit(env, me, 'update', 'notify_settings', 'settings', JSON.stringify(r.settings));
    return json({ ok: true, settings: r.settings });
  }
  if (a === 'summary') {
    const kind = b.kind === 'weekly' ? 'weekly' : 'daily';
    if (!env.ANTHROPIC_API_KEY) return json({ text: null, reason: 'off' });
    const forDate = kind === 'weekly' ? tuesdayOf(today) : today;
    if (kind === 'weekly' && new Date(today + 'T00:00:00Z').getUTCDay() === 1) return json({ text: null, reason: 'early' });
    const old = await env.DB.prepare('SELECT text, createdAt FROM daily_summaries WHERE email = ?1 AND kind = ?2 AND forDate = ?3').bind(me, kind, forDate).first();
    if (old && old.text) return json({ text: old.text });
    if (old && Date.now() - Date.parse(old.createdAt) < 30 * 60000) return json({ text: null, reason: 'retry-later' }); // 직전에 실패했으면 30분은 다시 부르지 않는다
    const settings = await loadSettings(env);
    let list;
    if (kind === 'daily') { const { today: box } = await buildAlerts(env, s.email, { today, settings }); if (box.empty) return json({ text: null, reason: 'empty' }); list = summaryItems(box); }
    else { const w = await buildWeek(env, s.email, today); if (weekEmpty(w)) return json({ text: null, reason: 'empty' }); list = summaryItems({ overdue: w.overdue, today: [], soon: w.tasks, meetings: w.meetings, events: w.events }); }
    const model = env.CAMPTEAM_SUMMARY_MODEL || SUMMARY_MODEL, { system, user } = summaryPrompt(kind, today, list);
    let out = '';
    try { out = await callSummary({ apiKey: env.ANTHROPIC_API_KEY, model, system, user, url: env.CAMPTEAM_AI_URL || undefined }); } catch (e) { console.error('summary failed:', e.message); }
    await env.DB.prepare('INSERT INTO daily_summaries (email,kind,forDate,text,model,createdAt) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(email,kind,forDate) DO UPDATE SET text=?4, model=?5, createdAt=?6').bind(me, kind, forDate, out, model, now).run();
    return json({ text: out || null });
  }
  return badRequest('알 수 없는 요청입니다.');
}
