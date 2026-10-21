import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { getGoogleAccessToken } from '../../lib/campteamGoogle.js';

/**
 * 포털 일정 → Google Calendar 반영 (관리자 전용). 기본은 "미리보기"만이고, 실제 쓰기는 서버 설정 CAMPTEAM_CALENDAR_WRITE=1 + CAMPTEAM_CALENDAR_ID + 관리자 확인이 모두 있을 때만.
 *  - 새 일정은 만들고, 이미 반영된 일정은 바뀐 것만 고친다. 포털에서 지운 일정은 구글 달력에서 자동으로 지우지 않는다(목록으로만 알려 줌).
 *  - 구글에 있던 기존 일정은 읽거나 바꾸지 않는다 — 포털이 만든 일정(portalId 표시)만 다룬다.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const cfgOf = (env) => ({ calendarId: env.CAMPTEAM_CALENDAR_ID || '', configured: !!(env.CAMPTEAM_CALENDAR_ID && env.GOOGLE_SERVICE_ACCOUNT_JSON), writeEnabled: env.CAMPTEAM_CALENDAR_WRITE === '1' });
async function gate(env, request) {
  if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있습니다.') }; return { s };
}
const nextDay = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
export function toGoogleEvent(e) {
  const timed = !!e.startTime, endDate = e.endDate || e.startDate;
  const base = { summary: e.title, location: e.location || undefined, description: e.notes || undefined, extendedProperties: { private: { portalId: e.id } } };
  if (!timed) return { ...base, start: { date: e.startDate }, end: { date: nextDay(endDate) } }; // 종일 일정은 끝 날짜가 "다음 날"
  return { ...base, start: { dateTime: `${e.startDate}T${e.startTime}:00`, timeZone: 'Asia/Seoul' }, end: { dateTime: `${endDate}T${e.endTime || e.startTime}:00`, timeZone: 'Asia/Seoul' } };
}
async function plan(env) {
  const rows = (await env.DB.prepare(`SELECT id, title, kind, startDate, endDate, startTime, endTime, location, notes, googleEventId, googleSyncedAt, updatedAt, deletedAt FROM events ORDER BY startDate`).all()).results;
  const live = rows.filter(r => !r.deletedAt);
  return { creates: live.filter(r => !r.googleEventId), updates: live.filter(r => r.googleEventId && (!r.googleSyncedAt || r.updatedAt > r.googleSyncedAt)), removed: rows.filter(r => r.deletedAt && r.googleEventId), unchanged: live.filter(r => r.googleEventId && r.googleSyncedAt && r.updatedAt <= r.googleSyncedAt).length };
}
export async function onRequestGet({ env, request }) {
  const { res } = await gate(env, request); if (res) return res;
  const p = await plan(env), c = cfgOf(env), sm = (r) => ({ id: r.id, title: r.title, date: r.startDate + (r.startTime ? ' ' + r.startTime : '') });
  return json({ ...c, calendarId: undefined, plan: { creates: p.creates.map(sm), updates: p.updates.map(sm), removed: p.removed.map(sm), unchanged: p.unchanged } });
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  const c = cfgOf(env);
  if (!c.configured) return badRequest('달력 연결 설정(CAMPTEAM_CALENDAR_ID, 서비스 계정)이 없습니다.');
  if (!c.writeEnabled) return json({ error: '달력 쓰기가 꺼져 있어요(CAMPTEAM_CALENDAR_WRITE). 미리보기만 가능해요.', code: 'write_disabled' }, 403);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  if (b.confirm !== true) return badRequest('쓰기를 확인(confirm)해주세요.');
  try {
    const token = await getGoogleAccessToken(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON), SCOPE), p = await plan(env), h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events`; let created = 0, updated = 0;
    for (const e of p.creates) {
      const r = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(toGoogleEvent(e)) }); if (!r.ok) throw new Error('create ' + r.status);
      await env.DB.prepare('UPDATE events SET googleEventId = ?2, googleSyncedAt = ?3 WHERE id = ?1').bind(e.id, (await r.json()).id, nowIso()).run(); created++;
    }
    for (const e of p.updates) {
      const r = await fetch(`${base}/${encodeURIComponent(e.googleEventId)}`, { method: 'PATCH', headers: h, body: JSON.stringify(toGoogleEvent(e)) }); if (!r.ok) throw new Error('update ' + r.status);
      await env.DB.prepare('UPDATE events SET googleSyncedAt = ?2 WHERE id = ?1').bind(e.id, nowIso()).run(); updated++;
    }
    await audit(env, s.email, 'calendar_sync', 'events', 'bulk', `created ${created}, updated ${updated}`); return json({ created, updated, removedNotDeleted: p.removed.length });
  } catch (e) { return json({ error: '달력에 쓰지 못했어요. 달력 공유(일정 수정 권한)와 설정을 확인해주세요.', code: 'calendar_write' }, 502); }
}
