import { campSession, json, needLogin, noDb, badRequest } from '../../lib/campteamAuth.js';
import { nowIso } from '../../lib/campteamDb.js';
import { isTeamMember } from './activity.js';

/**
 * 루미 대화 기억 — 계정마다 최근 대화(최대 40개 말풍선)를 서버에 두어, 화면을 옮기거나 다른 기기·다음 날 열어도 이어서 쓴다.
 * 본인 계정으로만 읽고 쓰고 지운다(관리자도 남의 대화는 볼 수 없다). 60일 지난 대화는 읽을 때 버린다. 표가 아직 없으면(DB 반영 전) 조용히 빈 기억으로 동작한다.
 *  GET    → { msgs:[…] }
 *  PUT    { msgs:[…] } → 통째로 바꿔 저장(말풍선 모양을 다시 정리해서 저장)
 *  DELETE → 지우기 (「새 대화」)
 */
export const KEEP_DAYS = 60, MAX_MSGS = 40, MAX_BYTES = 40000;
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').slice(0, n);
/** 브라우저가 보낸 말풍선을 저장해도 되는 모양으로만 줄인다 */
export function cleanMsgs(list) {
  const out = [];
  for (const m of (Array.isArray(list) ? list : []).slice(-MAX_MSGS)) {
    if (!m || typeof m !== 'object') continue;
    const o = { r: m.r === 'u' ? 'u' : 'a', t: str(m.t, 1500), g: str(m.g, 32), s: str(m.s, 16) };
    if (Array.isArray(m.o)) o.o = m.o.slice(0, 12).map((x) => str(x, 40)).filter(Boolean);
    if (Array.isArray(m.src)) o.src = m.src.slice(0, 6).map((x) => ({ title: str(x && x.title, 120), type: str(x && x.type, 20), url: str(x && x.url, 200) })).filter((x) => /^\//.test(x.url));
    if (m.p && typeof m.p === 'object') { const p = JSON.stringify(m.p); if (p.length <= 3000) o.p = JSON.parse(p); }
    if (m.pd === 'ok' || m.pd === 'no') o.pd = m.pd;
    if (!o.t && !o.p) continue;
    out.push(o);
  }
  return out;
}
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!isTeamMember(s)) return { res: json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403) };
  return { s };
}
export async function onRequestGet({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  let row = null; try { row = await env.DB.prepare('SELECT msgs, updatedAt FROM lumi_chats WHERE email = ?1').bind(s.email).first(); } catch { row = null; }
  if (!row || Date.parse(row.updatedAt) < Date.now() - KEEP_DAYS * 86400000) return json({ msgs: [] });
  let msgs = []; try { msgs = cleanMsgs(JSON.parse(row.msgs)); } catch { msgs = []; }
  return json({ msgs });
}
export async function onRequestPut({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  let msgs = cleanMsgs(b.msgs), body = JSON.stringify(msgs);
  while (body.length > MAX_BYTES && msgs.length > 1) { msgs.shift(); body = JSON.stringify(msgs); }
  try { await env.DB.prepare('INSERT INTO lumi_chats (email, msgs, updatedAt) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO UPDATE SET msgs = ?2, updatedAt = ?3').bind(s.email, body, nowIso()).run(); } catch { return json({ ok: false }); }
  return json({ ok: true, n: msgs.length });
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  try { await env.DB.prepare('DELETE FROM lumi_chats WHERE email = ?1').bind(s.email).run(); } catch { /* 표가 없으면 지울 것도 없다 */ }
  return json({ ok: true });
}
