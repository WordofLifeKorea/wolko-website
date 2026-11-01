import { campSession, json, needLogin, noDb } from '../../lib/campteamAuth.js';

/**
 * 입력창 이름 자동 완성 후보. GET ?kind=church|school|vendor|speaker|venue|topic|place  → { names:[…] }  (많이 쓴 순, 최대 60)
 * 연락처에 적은 이름·기관, 지난 캠프 장소, 보관함 장소 카드, 자료실 주제에서 모은다. 전화번호·이메일은 내보내지 않는다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.campRole) return json({ names: [] });
  const kind = new URL(request.url).searchParams.get('kind') || '', q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results).catch(() => []);
  const cnt = new Map(), add = (v, w = 1) => { const t = String(v || '').replace(/\s+/g, ' ').trim(); if (t && t.length <= 80) cnt.set(t, (cnt.get(t) || 0) + w); };
  if (['church', 'school', 'vendor', 'speaker', 'venue'].includes(kind)) for (const r of await q('SELECT name, org FROM contacts WHERE deletedAt IS NULL AND kind = ?1 LIMIT 500', kind)) { add(r.org, 2); add(r.name); }
  if (kind === 'venue' || kind === 'place') {
    for (const r of await q(`SELECT location FROM camps WHERE deletedAt IS NULL AND location <> '' LIMIT 500`)) add(r.location, 2);
    for (const r of await q(`SELECT title FROM library_items WHERE deletedAt IS NULL AND kind = 'venue' LIMIT 300`)) add(r.title, 3);
  }
  if (kind === 'topic') for (const r of await q(`SELECT topic FROM files WHERE deletedAt IS NULL AND restricted = 0 AND topic <> '' LIMIT 1500`)) add(r.topic);
  return json({ names: [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 60).map(([n]) => n) });
}
