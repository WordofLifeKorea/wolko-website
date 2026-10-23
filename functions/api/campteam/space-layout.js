import { campSession, json, needLogin, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso } from '../../lib/campteamDb.js';

/**
 * 캠프별 공간 "내 배치": 카드 순서와 숨김. 저장·초기화는 언제나 내 이메일 기준이라 다른 사람의 배치는 건드릴 수 없다.
 * 화면 모양만 정할 뿐 데이터 권한과 무관하다 (숨긴 카드의 데이터를 더 열어 주지 않고, 권한 없는 카드는 서버가 데이터를 안 내려준다).
 */
export const CARDS = ['portal', 'tasks', 'events', 'meetings', 'decisions', 'next', 'files', 'budget'];
export function sanitizeSpaceLayout(b) {
  if (!b || typeof b !== 'object') return { error: '배치 형식이 올바르지 않습니다.' };
  const pick = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => CARDS.includes(x)))];
  const order = pick(b.order), hidden = pick(b.hidden);
  return { layout: { order, hidden } };
}
async function who(env, request) { if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); return s ? { s } : { res: needLogin() }; }
export async function onRequestGet({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  const row = await env.DB.prepare('SELECT json FROM space_layout WHERE email = ?1').bind(s.email.toLowerCase()).first();
  let layout = null; if (row) { try { layout = sanitizeSpaceLayout(JSON.parse(row.json)).layout || null; } catch { layout = null; } }
  return json({ layout, cards: CARDS });
}
export async function onRequestPut({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const r = sanitizeSpaceLayout(b); if (r.error) return badRequest(r.error);
  await env.DB.prepare('INSERT INTO space_layout (email,json,updatedAt) VALUES (?1,?2,?3) ON CONFLICT(email) DO UPDATE SET json=?2, updatedAt=?3').bind(s.email.toLowerCase(), JSON.stringify(r.layout), nowIso()).run();
  return json({ ok: true, layout: r.layout });
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  await env.DB.prepare('DELETE FROM space_layout WHERE email = ?1').bind(s.email.toLowerCase()).run();
  return json({ ok: true });
}
