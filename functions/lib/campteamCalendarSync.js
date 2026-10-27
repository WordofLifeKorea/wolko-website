import { nowIso, audit } from './campteamDb.js';
import { getGoogleAccessToken } from './campteamGoogle.js';

/**
 * 캠프팀 일정 → Google Calendar 반영 (한 방향). 캠프팀에서 만든 일정(portalId 표시)만 다루고, 구글에 있던 다른 일정은 읽거나 바꾸지 않는다.
 * 캠프팀에서 지운 일정은, 캠프팀이 구글에 만들어 둔 것(googleEventId 가 있는 것)에 한해 구글에서도 지운다.
 */
export const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const cfgOf = (env) => ({
  calendarId: env.CAMPTEAM_CALENDAR_ID || '',
  configured: !!(env.CAMPTEAM_CALENDAR_ID && env.GOOGLE_SERVICE_ACCOUNT_JSON),
  writeEnabled: env.CAMPTEAM_CALENDAR_WRITE === '1',
  auto: env.CAMPTEAM_CALENDAR_AUTO === '1',
});
const nextDay = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
export function toGoogleEvent(e) {
  const timed = !!e.startTime, endDate = e.endDate || e.startDate;
  const base = { summary: e.title, location: e.location || undefined, description: e.notes || undefined, extendedProperties: { private: { portalId: e.id } } };
  if (!timed) return { ...base, start: { date: e.startDate }, end: { date: nextDay(endDate) } }; // 종일 일정은 끝 날짜가 "다음 날"
  return { ...base, start: { dateTime: `${e.startDate}T${e.startTime}:00`, timeZone: 'Asia/Seoul' }, end: { dateTime: `${endDate}T${e.endTime || e.startTime}:00`, timeZone: 'Asia/Seoul' } };
}
export async function plan(env) {
  const rows = (await env.DB.prepare(`SELECT id, title, kind, startDate, endDate, startTime, endTime, location, notes, googleEventId, googleSyncedAt, updatedAt, deletedAt FROM events ORDER BY startDate`).all()).results;
  const live = rows.filter(r => !r.deletedAt);
  return { creates: live.filter(r => !r.googleEventId), updates: live.filter(r => r.googleEventId && (!r.googleSyncedAt || r.updatedAt > r.googleSyncedAt)), removed: rows.filter(r => r.deletedAt && r.googleEventId), unchanged: live.filter(r => r.googleEventId && r.googleSyncedAt && r.updatedAt <= r.googleSyncedAt).length };
}
/** 지금 바로 반영한다. 실패하면 던진다. */
export async function syncNow(env, actor) {
  const c = cfgOf(env);
  const token = await getGoogleAccessToken(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON), SCOPE), p = await plan(env), h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events`; let created = 0, updated = 0, deleted = 0;
  for (const e of p.creates) {
    const r = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(toGoogleEvent(e)) }); if (!r.ok) throw new Error('create ' + r.status);
    await env.DB.prepare('UPDATE events SET googleEventId = ?2, googleSyncedAt = ?3 WHERE id = ?1').bind(e.id, (await r.json()).id, nowIso()).run(); created++;
  }
  for (const e of p.updates) {
    const r = await fetch(`${base}/${encodeURIComponent(e.googleEventId)}`, { method: 'PATCH', headers: h, body: JSON.stringify(toGoogleEvent(e)) }); if (!r.ok) throw new Error('update ' + r.status);
    await env.DB.prepare('UPDATE events SET googleSyncedAt = ?2 WHERE id = ?1').bind(e.id, nowIso()).run(); updated++;
  }
  // 캠프팀에서 지운 일정 → 구글에서도 지운다. 이미 구글에서 없어진 것(404/410)은 지운 것으로 본다. 구글에 있던 다른 일정은 건드리지 않는다
  for (const e of p.removed) {
    const r = await fetch(`${base}/${encodeURIComponent(e.googleEventId)}`, { method: 'DELETE', headers: h });
    if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error('delete ' + r.status);
    await env.DB.prepare("UPDATE events SET googleEventId = '', googleSyncedAt = ?2 WHERE id = ?1").bind(e.id, nowIso()).run(); deleted++;
  }
  if (created || updated || deleted) await audit(env, actor, 'calendar_sync', 'events', 'bulk', `created ${created}, updated ${updated}, deleted ${deleted}`);
  return { created, updated, deleted };
}

/**
 * 일정을 만들거나 고친 직후 자동으로 반영 (CAMPTEAM_CALENDAR_AUTO=1 이고 연결·쓰기가 켜져 있을 때만). 실패해도 일정 저장에는 영향이 없다.
 * 동시에 두 번 돌아 같은 일정이 구글에 두 번 생기지 않도록 짧은 잠금(60초)을 쓰고, 도는 동안 바뀐 것은 한두 번 더 확인한다.
 */
export async function autoSync(env, actor) {
  const c = cfgOf(env); if (!(c.auto && c.configured && c.writeEnabled && env.DB)) return;
  try {
    const now = new Date(), stale = new Date(now.getTime() - 60000).toISOString();
    const got = await env.DB.prepare(`INSERT INTO notify_settings (key,value,updatedAt,updatedBy) VALUES ('gcal_lock','1',?1,'') ON CONFLICT(key) DO UPDATE SET updatedAt=?1 WHERE updatedAt < ?2`).bind(now.toISOString(), stale).run();
    if (!got.meta?.changes) return; // 다른 반영이 진행 중 — 그쪽이 끝나기 전에 바뀐 것까지 확인한다
    try {
      for (let i = 0; i < 3; i++) { const r = await syncNow(env, actor); if (!r.created && !r.updated && !r.deleted) break; }
    } finally {
      await env.DB.prepare(`UPDATE notify_settings SET updatedAt='1970-01-01T00:00:00.000Z' WHERE key='gcal_lock'`).run();
    }
  } catch { /* 자동 반영 실패는 조용히 넘긴다 — 설정 화면의 「구글 달력에 반영하기」로 다시 할 수 있다 */ }
}
