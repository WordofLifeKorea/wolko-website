import { campSession, json, needLogin, needPerm, noDb, canView } from '../../lib/campteamAuth.js';
import { nowIso } from '../../lib/campteamDb.js';
import { isTeamMember, FEED, AREA, TITLE } from './activity.js';

/**
 * 「내가 없는 동안」 — 한동안(24시간 이상) 접속하지 않았던 팀원이 홈을 열면, 그 사이 다른 사람이 바꾼 것을 짧게 알려 준다.
 *  GET  → { show:false } | { show:true, since, counts:{…}, top:{ tasks:[제목], … } }
 *  POST { dismiss:true } → 「확인했어요」: 이 요약을 닫는다 (같은 요약이 다시 뜨지 않는다)
 * 새 DB 표 없이 알림 확인 표(alert_state)에 두 줄만 쓴다: 'lastvisit'(마지막 접속 — updatedAt) · 'catchup'(요약 시작 시각 — updatedAt, state: seen=열려 있음 / dismissed=닫음).
 * 내가 한 일은 빼고, 보면 안 되는 영역(금액 파일 등)은 빼고 센다. 제목은 앞의 몇 개만 보여 준다.
 */
export const GAP_MS = 24 * 3600 * 1000, TOUCH_MS = 10 * 60 * 1000;
const BUCKETS = [['tasks', 'task'], ['meetings', 'meeting'], ['decisions', 'decision'], ['files', 'file'], ['events', 'event'], ['camps', 'camp']];
const NEW = new Set(['create', 'upload', 'supersede']);

async function digest(env, s, since) {
  let rows = (await env.DB.prepare(`SELECT at, actor, action, entity, entityId FROM audit_log WHERE at > ?1 AND LOWER(actor) <> ?2 ORDER BY at DESC LIMIT 400`).bind(since, s.email.toLowerCase()).all()).results
    .filter((r) => FEED.has(r.entity) && canView(s.perms, AREA[r.entity]) && r.action !== 'delete');
  if (!s.perms.moneyRead) { // 금액 파일은 있는지도 알려 주지 않는다 (세지도, 제목을 보이지도 않는다)
    const ids = [...new Set(rows.filter((r) => r.entity === 'file').map((r) => r.entityId))].slice(0, 200);
    if (ids.length) {
      const hid = new Set((await env.DB.prepare(`SELECT id FROM files WHERE restricted = 1 AND id IN (${ids.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...ids).all().catch(() => ({ results: [] }))).results.map((x) => x.id));
      rows = rows.filter((r) => !(r.entity === 'file' && hid.has(r.entityId)));
    }
  }
  const counts = {}, top = {};
  for (const [key, entity] of BUCKETS) {
    const mine = rows.filter((r) => r.entity === entity);
    const made = new Set(mine.filter((r) => NEW.has(r.action)).map((r) => r.entityId));
    counts[key + 'New'] = made.size;
    counts[key + 'Changed'] = new Set(mine.filter((r) => !NEW.has(r.action) && !made.has(r.entityId)).map((r) => r.entityId)).size;   // 새로 만든 것은 「바뀜」에 또 세지 않는다
    const ids = [...new Set(mine.map((r) => r.entityId))].slice(0, 3), t = TITLE[entity];
    if (!ids.length || !t) { top[key] = []; continue; }
    const [table, c1, c2] = t, marks = ids.map((_, i) => '?' + (i + 1)).join(',');
    const found = (await env.DB.prepare(`SELECT id, ${c1} AS a${c2 ? `, ${c2} AS b` : ''} FROM ${table} WHERE id IN (${marks})`).bind(...ids).all().catch(() => ({ results: [] }))).results;
    top[key] = ids.map((id) => found.find((f) => f.id === id)).filter(Boolean).map((f) => String(f.a || f.b || '').slice(0, 80)).filter(Boolean);
  }
  return { counts, top, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return json({ show: false });
  const me = s.email.toLowerCase(), now = nowIso(), nowMs = Date.parse(now);
  const get = async (k) => (await env.DB.prepare('SELECT state, updatedAt FROM alert_state WHERE email = ?1 AND alertKey = ?2').bind(me, k).first()) || null;
  const put = (k, state, at) => env.DB.prepare(`INSERT INTO alert_state (email, alertKey, state, updatedAt) VALUES (?1,?2,?3,?4) ON CONFLICT(email, alertKey) DO UPDATE SET state = excluded.state, updatedAt = excluded.updatedAt`).bind(me, k, state, at).run();
  const [last, cu] = await Promise.all([get('lastvisit'), get('catchup')]);
  let since = cu && cu.state === 'seen' ? cu.updatedAt : '';
  if (!since && last && nowMs - Date.parse(last.updatedAt) >= GAP_MS) { since = last.updatedAt; await put('catchup', 'seen', since); }
  if (!last || nowMs - Date.parse(last.updatedAt) >= TOUCH_MS) await put('lastvisit', 'seen', now);
  if (!since) return json({ show: false });
  const d = await digest(env, s, since);
  if (!d.total) { await put('catchup', 'dismissed', now); return json({ show: false }); }   // 바뀐 게 없으면 조용히 닫는다
  return json({ show: true, since, counts: d.counts, top: d.top });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return needPerm('캠프팀 팀원만 쓸 수 있습니다.');
  await env.DB.prepare(`INSERT INTO alert_state (email, alertKey, state, updatedAt) VALUES (?1,'catchup','dismissed',?2) ON CONFLICT(email, alertKey) DO UPDATE SET state = 'dismissed', updatedAt = excluded.updatedAt`).bind(s.email.toLowerCase(), nowIso()).run();
  return json({ ok: true });
}
