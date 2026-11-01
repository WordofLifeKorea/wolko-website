import { uuid, nowIso } from './campteamDb.js';
import { campEndDate } from './campDates.js';
import { cardFromCms, FIELDS } from './campForms.js';

/**
 * 새 캠프 카드 인계 흐름의 보조 기능: 홈페이지에 이미 있는 캠프 목록 읽기 · 받은 요청함(월코 포털 종 알림) · 캠프팀 공지 · 홈페이지 반영 확인과 캠프별 공간 자동 만들기.
 * 홈페이지에는 아무것도 쓰지 않는다 — 읽기만 한다.
 */
/** 홈페이지에 이미 있는 캠프들(빌드 때 만들어지는 정적 파일 portal-camps.json). 못 읽으면 빈 목록 */
export async function homepageFeed(env, request) {
  try {
    const url = new URL('/portal/campteam/portal-camps.json', request.url);
    const res = env.ASSETS ? await env.ASSETS.fetch(new Request(url)) : await fetch(url);
    if (!res.ok) return [];
    const items = (await res.json()).items;
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}
const lower = (e) => String(e || '').trim().toLowerCase();
const uniq = (list) => [...new Set(list.map(lower).filter(Boolean))];

/** 월코 포털 종 알림에 보일 요청을 넣는다(같은 사람·같은 신청서·같은 종류가 아직 안 끝난 게 있으면 또 넣지 않는다) */
export async function inboxAdd(env, emails, kind, title, href, formId) {
  const now = nowIso();
  for (const e of uniq(emails)) {
    try {
      if (await env.DB.prepare('SELECT 1 AS x FROM portal_inbox WHERE email = ?1 AND formId = ?2 AND kind = ?3 AND doneAt IS NULL AND readAt IS NULL').bind(e, formId, kind).first()) continue;
      await env.DB.prepare('INSERT INTO portal_inbox (id,email,kind,title,href,formId,createdAt) VALUES (?1,?2,?3,?4,?5,?6,?7)').bind(uuid(), e, kind, String(title).slice(0, 160), href, formId, now).run();
    } catch { /* 표가 아직 없으면 건너뜀 */ }
  }
}
export async function inboxDone(env, formId, kind) { try { await env.DB.prepare('UPDATE portal_inbox SET doneAt = ?3 WHERE formId = ?1 AND kind = ?2 AND doneAt IS NULL').bind(formId, kind, nowIso()).run(); } catch { /* 무시 */ } }
/** 그 사람이 신청서 화면을 열면 팀에게 온 완료·수정 알림은 읽은 것으로 */
export async function inboxRead(env, email, formId) { try { await env.DB.prepare(`UPDATE portal_inbox SET readAt = ?3 WHERE LOWER(email) = ?1 AND formId = ?2 AND kind <> 'camp_handoff' AND readAt IS NULL`).bind(lower(email), formId, nowIso()).run(); } catch { /* 무시 */ } }
/** 월코 포털 종 알림 말풍선에 넣을 줄들 (아직 안 끝나고 안 읽은 것, 14일이 지나면 자동으로 빠진다) */
export async function inboxFor(env, email) {
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
  try { return (await env.DB.prepare('SELECT id, kind, title, href FROM portal_inbox WHERE LOWER(email) = ?1 AND doneAt IS NULL AND readAt IS NULL AND createdAt >= ?2 ORDER BY createdAt DESC LIMIT 5').bind(lower(email), cutoff).all()).results; } catch { return []; }
}
/** 캠프팀 포털 알림공지(받는 사람을 정한 공지) 한 건 */
export async function announce(env, actor, recipients, title, body, link) {
  const to = uniq(recipients); if (!to.length) return;
  const id = uuid(), now = nowIso();
  try {
    await env.DB.prepare(`INSERT INTO announcements (id,title,body,audience,pinned,link,createdAt,updatedAt,createdBy,createdByName) VALUES (?1,?2,?3,'people',0,?4,?5,?5,?6,'캠프 신청서')`).bind(id, String(title).slice(0, 80), String(body).slice(0, 1000), link, now, lower(actor)).run();
    for (const e of to) await env.DB.prepare('INSERT OR IGNORE INTO announcement_recipients (announcementId, email) VALUES (?1, ?2)').bind(id, e).run();
  } catch { /* 표가 없으면 건너뜀 */ }
}

/**
 * 환규 선교사님이 확인한 신청서가 홈페이지에 실제로 올라왔는지(캠프 파일 이름이 홈페이지 목록에 보이는지) 확인한다.
 * 보이면 「홈페이지 반영 완료」 표시(liveAt)를 하고, 캠프 신청서(camper)라면 캠프팀 포털 「캠프별 공간」에 같은 캠프를 만든다.
 * 확인된 신청서가 없으면 아무 일도 하지 않는다(홈페이지 목록도 읽지 않는다).
 */
export async function syncLive(env, request) {
  let forms = []; try { forms = (await env.DB.prepare(`SELECT id, kind, campId, content FROM camp_forms WHERE deletedAt IS NULL AND status = 'confirmed' AND liveAt IS NULL AND campId <> ''`).all()).results; } catch { return 0; }
  if (!forms.length) return 0;
  const feed = await homepageFeed(env, request), ids = new Set(feed.map((x) => x.id)); let n = 0;
  for (const f of forms) {
    if (!ids.has(f.campId)) continue;
    const now = nowIso(); await env.DB.prepare('UPDATE camp_forms SET liveAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(f.id, now).run(); n++;
    if (f.kind !== 'camper') continue;
    try {
      if (await env.DB.prepare('SELECT 1 AS x FROM camps WHERE registrationCampId = ?1 AND deletedAt IS NULL').bind(f.campId).first()) continue;
      const raw = feed.find((x) => x.id === f.campId)?.raw, c = cardFromCms(raw || {}), start = (c.startDate || '').slice(0, 10) || null, types = (await env.DB.prepare('SELECT id, nameKo FROM camp_types WHERE deletedAt IS NULL ORDER BY sortOrder').all()).results;
      const hint = { english: '영어', union: '연합', jeju: '제주' }[c.campType] || '', type = types.find((t) => hint && String(t.nameKo).includes(hint)) || types[0]; if (!type) continue;
      await env.DB.prepare(`INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,location,notes,year,season,seriesId,createdAt,updatedAt,createdBy,capacity,registrationCampId) VALUES (?1,?2,?3,?4,?5,?6,'planning','','',?7,'',NULL,?8,?8,'system',?9,?10)`)
        .bind('camp-' + uuid().slice(0, 12), type.id, (c.titleKo || f.campId).slice(0, 80), (c.titleEn || '').slice(0, 80), start, start ? campEndDate(start, c.dateKo) || null : null, start ? +start.slice(0, 4) : null, now, Number.isFinite(c.capacity) ? c.capacity : null, f.campId).run();
    } catch (e) { console.error('camp space create failed:', e && e.message); }
  }
  return n;
}
export { FIELDS };
