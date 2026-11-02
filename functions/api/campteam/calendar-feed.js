import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { buildIcs } from '../../lib/campteamPrep.js';
import { phoneGate, phoneToolsOn } from '../../lib/campteamPhone.js';

/**
 * 폰 캘린더 구독(읽기 전용, 사람별 주소). **지금은 꺼 둠** — CAMPTEAM_PHONE_TOOLS=on 일 때만, 그리고 관리자에게만 열린다(campteamPhone.js).
 *  GET  (로그인) → { url }      내 구독 주소(없으면 만든다). 이 주소를 아는 사람은 일정을 볼 수 있으니 남에게 주지 않는다.
 *  POST (로그인) { regen:true } → 주소를 새로 만든다(예전 주소는 바로 멈춘다)
 *  GET ?token=…  → .ics 일정 (로그인 없이 달력 앱이 가져가는 용도): 팀 일정·캠프 기간·캠프 진행표·내 업무 마감·회의. 금액·연락처 정보는 들어가지 않는다.
 */
const tokenOf = () => (uuid() + uuid()).replace(/-/g, '');
async function mine(env, email, regen) {
  let row = await env.DB.prepare('SELECT token FROM calendar_tokens WHERE email = ?1').bind(email).first();
  if (!row || regen) { const token = tokenOf(); await env.DB.prepare('INSERT INTO calendar_tokens (email, token, createdAt) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO UPDATE SET token = ?2, createdAt = ?3').bind(email, token, nowIso()).run(); row = { token }; }
  return row.token;
}
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const url = new URL(request.url), token = url.searchParams.get('token');
  if (token) return phoneToolsOn(env) ? feed(env, token) : new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const s = await campSession(request, env); if (!s) return needLogin();
  const off = phoneGate(env, s); if (off) return off;
  if (!s.campRole) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  return json({ url: `${url.origin}/api/campteam/calendar-feed?token=${await mine(env, s.email, false)}` });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  const off = phoneGate(env, s); if (off) return off;
  if (!s.campRole) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  const t = await mine(env, s.email, !!b.regen); if (b.regen) await audit(env, s.email, 'calendar_token_reset', 'calendar', '', '');
  return json({ url: `${new URL(request.url).origin}/api/campteam/calendar-feed?token=${t}` });
}
async function feed(env, token) {
  const none = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (!/^[a-f0-9]{40,80}$/.test(token)) return none();
  const row = await env.DB.prepare('SELECT email FROM calendar_tokens WHERE token = ?1').bind(token).first(); if (!row) return none();
  const member = await env.DB.prepare('SELECT email FROM camp_members WHERE LOWER(email) = LOWER(?1) AND active = 1').bind(row.email).first(); if (!member) return none();
  const items = [], q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results).catch(() => []);
  for (const e of await q(`SELECT id, title, kind, startDate, endDate, startTime, endTime FROM events WHERE deletedAt IS NULL AND startDate >= date('now','-60 day') ORDER BY startDate LIMIT 600`)) items.push({ uid: 'ev-' + e.id, title: e.title, start: e.startDate, end: e.endDate || e.startDate, startTime: e.startTime, endTime: e.endTime });
  for (const c of await q(`SELECT id, nameKo, startDate, endDate FROM camps WHERE deletedAt IS NULL AND status <> 'canceled' AND startDate IS NOT NULL AND COALESCE(endDate, startDate) >= date('now','-60 day')`)) items.push({ uid: 'camp-' + c.id, title: '🏕 ' + c.nameKo, start: c.startDate, end: c.endDate || c.startDate });
  // 준비기간: 캠프 시작 전 스태프가 먼저 모이는 기간 — 종일 일정으로 한 건 (0039 전의 DB 에서는 q 가 빈 목록을 돌려줘서 그냥 없다)
  for (const c of await q(`SELECT id, nameKo, prepStart, prepEnd FROM camps WHERE deletedAt IS NULL AND status <> 'canceled' AND startDate IS NOT NULL AND prepStart IS NOT NULL AND prepEnd IS NOT NULL AND prepEnd >= date('now','-60 day')`)) items.push({ uid: 'prep-' + c.id, title: '🧳 ' + c.nameKo + ' 준비', start: c.prepStart, end: c.prepEnd });
  for (const t of await q(`SELECT t.id, t.dayDate, t.startTime, t.endTime, t.title, t.place, c.nameKo FROM camp_timeline t JOIN camps c ON c.id = t.campId AND c.deletedAt IS NULL WHERE t.deletedAt IS NULL AND t.dayDate >= date('now','-30 day') ORDER BY t.dayDate LIMIT 1500`)) items.push({ uid: 'tl-' + t.id, title: t.title, start: t.dayDate, end: t.dayDate, startTime: t.startTime, endTime: t.endTime, place: t.place, desc: t.nameKo });
  for (const k of await q(`SELECT id, title, dueDate FROM tasks WHERE deletedAt IS NULL AND inactive = 0 AND LOWER(ownerEmail) = LOWER(?1) AND status NOT IN ('Completed','Not Applicable') AND dueDate >= date('now','-30 day') LIMIT 500`, row.email)) items.push({ uid: 'task-' + k.id, title: '✅ ' + k.title, start: k.dueDate, end: k.dueDate });
  for (const m of await q(`SELECT id, title, meetDate, meetTime FROM meetings WHERE deletedAt IS NULL AND meetDate >= date('now','-30 day') LIMIT 300`)) items.push({ uid: 'mt-' + m.id, title: '🗒 ' + m.title, start: m.meetDate, end: m.meetDate, startTime: m.meetTime });
  return new Response(buildIcs(items), { status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300', 'content-disposition': 'inline; filename="wolko-campteam.ics"' } });
}
