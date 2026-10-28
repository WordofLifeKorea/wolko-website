import { json } from '../../lib/campteamAuth.js';
import { todayKST, addDays } from '../../lib/campteamDb.js';
import { safeEqual, TV_APP_VERSION } from '../../lib/campteamTv.js';
import { readSubmissionCount } from '../../lib/campteamRegistrations.js';
import { loadLayout, loadSettings } from './tv-config.js';
import { tvPortal } from '../../lib/campteamTvPortal.js';

/**
 * TV 가 가져가는 데이터 (로그인 없이 TV 전용 열쇠 ?t= 로만 열림).
 * 이 응답에는 금액·예산, 이메일, 연락처, 메모 본문, 전사문, 파일 내용이 절대 들어가지 않는다. (업무 이름·담당자 이름·일정·결정 문장·공지, 그리고 포털의 이번 주 공지·캠프팀 팀원의 오늘 듀티 이름·일정·날씨만)
 * 듀티는 팀 명단에 있는 사람의 이름만 담는다 — 명단 이메일은 누가 팀원인지 가리는 데만 쓰고 응답에 넣지 않는다.
 */
export async function onRequestGet({ env, request }) {
  const deny = (m) => new Response(m, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (!env.DB) return new Response('not configured', { status: 500 });
  const settings = await loadSettings(env);
  const tokenRow = await env.DB.prepare(`SELECT value FROM tv_settings WHERE key = 'token'`).first();
  if (!tokenRow || !safeEqual(new URL(request.url).searchParams.get('t'), tokenRow.value)) return deny('Invalid link');
  delete settings.token;
  const today = todayKST(), db = env.DB, open = `k.deletedAt IS NULL AND k.inactive = 0 AND k.status NOT IN ('Completed','Not Applicable')`;
  const [{ layout, updatedAt }, st, tasks, late, events, decisions, notices, camps, roster] = await Promise.all([
    loadLayout(env),
    db.prepare(`SELECT SUM(CASE WHEN status NOT IN ('Completed','Not Applicable') THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status NOT IN ('Completed','Not Applicable') AND dueDate IS NOT NULL AND dueDate < ?1 THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status <> 'Not Applicable' THEN 1 ELSE 0 END) AS total FROM tasks WHERE deletedAt IS NULL AND inactive = 0`).bind(today).first(),
    db.prepare(`SELECT k.title, k.ownerName, k.dueDate, k.status, k.priority, c.nameKo AS campKo, c.nameEn AS campEn FROM tasks k LEFT JOIN camps c ON c.id = k.campId WHERE ${open}
        ORDER BY CASE k.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, (k.dueDate IS NULL), k.dueDate, k.createdAt LIMIT 60`).all(),
    db.prepare(`SELECT k.title, k.ownerName, k.dueDate, c.nameKo AS campKo, c.nameEn AS campEn FROM tasks k LEFT JOIN camps c ON c.id = k.campId
        WHERE ${open} AND (TRIM(k.ownerName) = '' OR (k.dueDate IS NOT NULL AND k.dueDate < ?1)) ORDER BY (TRIM(k.ownerName) = '') DESC, k.dueDate LIMIT 30`).bind(today).all(),
    db.prepare(`SELECT title, kind, startDate, endDate, startTime FROM events WHERE deletedAt IS NULL AND COALESCE(endDate, startDate) >= ?1 AND startDate <= ?2 ORDER BY startDate, startTime LIMIT 40`).bind(today, addDays(today, 30)).all(),
    db.prepare(`SELECT d.kind, d.textKo, d.textEn, d.decidedDate, c.nameKo AS campKo, c.nameEn AS campEn FROM decisions d LEFT JOIN meetings m ON m.id = d.meetingId LEFT JOIN camps c ON c.id = COALESCE(d.campId, m.campId)
        WHERE d.deletedAt IS NULL AND d.state = 'active' AND d.kind IN ('direction','final','changed') ORDER BY d.decidedDate DESC, d.createdAt DESC LIMIT 12`).all(),
    db.prepare(`SELECT message, messageEn FROM notices WHERE deletedAt IS NULL AND active = 1 ORDER BY sortOrder, createdAt LIMIT 20`).all(),
    db.prepare(`SELECT c.id, c.nameKo, c.nameEn, c.startDate, c.theme, c.capacity, c.registrationCampId,
        (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.inactive = 0 AND k.status <> 'Not Applicable') AS total,
        (SELECT COUNT(*) FROM tasks k WHERE k.campId = c.id AND k.deletedAt IS NULL AND k.inactive = 0 AND k.status = 'Completed') AS done
      FROM camps c WHERE c.deletedAt IS NULL AND c.status IN ('planning','active') ORDER BY c.startDate IS NULL, c.startDate LIMIT 12`).all(),
    db.prepare('SELECT email FROM camp_members WHERE active = 1').all().then((r) => r.results.map((x) => x.email)).catch(() => []),   // 팀 명단 이메일은 듀티가 팀원 것인지 가리는 데만 쓰고 응답에 넣지 않는다
  ]);
  const portal = await tvPortal(env, today, roster).catch(() => null);
  const upcoming = camps.results.filter(c => c.startDate && c.startDate >= today)[0] || null, dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const campers = [];
  for (const c of camps.results.filter(x => x.registrationCampId)) { const n = await readSubmissionCount(env, c.registrationCampId); if (n != null) campers.push({ nameKo: c.nameKo, nameEn: c.nameEn, count: n, capacity: c.capacity || null }); }
  return new Response(JSON.stringify({
    version: TV_APP_VERSION, serverTime: new Date().toISOString(), today, layoutUpdatedAt: updatedAt, settings, layout,
    data: {
      stats: { open: st.open || 0, overdue: st.overdue || 0, completion: st.total ? Math.round((st.completed || 0) / st.total * 100) : 0 },
      tasks: tasks.results, late: late.results.map(l => ({ ...l, reason: !String(l.ownerName || '').trim() ? 'noowner' : 'overdue' })), events: events.results, decisions: decisions.results, notices: notices.results,
      dday: upcoming ? { nameKo: upcoming.nameKo, nameEn: upcoming.nameEn, startDate: upcoming.startDate, days: dayDiff(today, upcoming.startDate) } : null,
      progress: camps.results.map(c => ({ nameKo: c.nameKo, nameEn: c.nameEn, pct: c.total ? Math.round(c.done / c.total * 100) : 0, done: c.done, total: c.total })),
      theme: (camps.results.find(c => c.theme) || {}).theme || '', campers,
      portal,
    },
  }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
}
