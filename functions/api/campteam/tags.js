import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';
import { tagList } from '../../lib/campteamDb.js';

/** 주제(태그) 목록과 개수 — 회의 구역과 결정에 붙은 태그를 모아서 "주제별 보기"에 쓴다 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', '주제'); if (dv) return dv; }
  const [a, d] = await Promise.all([
    env.DB.prepare(`SELECT tags FROM agenda_items WHERE deletedAt IS NULL AND tags <> ''`).all(),
    env.DB.prepare(`SELECT tags FROM decisions WHERE deletedAt IS NULL AND tags <> ''`).all(),
  ]);
  const count = new Map();
  for (const r of [...a.results, ...d.results]) for (const t of tagList(r.tags)) count.set(t, (count.get(t) || 0) + 1);
  return json({ tags: [...count.entries()].map(([tag, n]) => ({ tag, n })).sort((x, y) => y.n - x.n || x.tag.localeCompare(y.tag)) });
}
