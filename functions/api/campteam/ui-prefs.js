import { campSession, json, needLogin, noDb, badRequest } from '../../lib/campteamAuth.js';
import { nowIso } from '../../lib/campteamDb.js';

/**
 * 화면 설정 기억 — 계정마다 작은 값(예: 사용법 카드를 접어 둠)을 서버에 둔다. 본인 것만 읽고 쓴다.
 *  GET → { prefs:{ 키: 값 } }      PUT { key, value } → 저장(value 가 빈 글이면 지움)
 * 키는 「howto:화면이름」 또는 「howto:화면이름:탭이름」 꼴과 ai-suggest-open 만, 값은 짧은 글만 받는다. 표가 아직 없으면(DB 반영 전) 조용히 빈 값으로 동작하고, 화면은 이 브라우저에만 기억한다.
 */
export const KEY_RE = /^(howto:[a-z]{2,20}(:[a-z0-9_]{1,24})?|ai-suggest-open)$/;   // ai-suggest-open: 업무 > 템플릿 탭의 「AI 추천」 칸을 펼쳐 둘지 ('1' 펼침 · '0' 접음)
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  return { s };
}
export async function onRequestGet({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  let rows = []; try { rows = (await env.DB.prepare('SELECT k, v FROM ui_prefs WHERE email = ?1 LIMIT 400').bind(s.email).all()).results; } catch { rows = []; }
  return json({ prefs: Object.fromEntries(rows.map((r) => [r.k, r.v])) });
}
export async function onRequestPut({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const key = String(b.key || ''), value = String(b.value ?? '').slice(0, 20); if (!KEY_RE.test(key)) return badRequest('저장할 수 없는 설정이에요.');
  try {
    if (value) await env.DB.prepare('INSERT INTO ui_prefs (email, k, v, updatedAt) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(email, k) DO UPDATE SET v = ?3, updatedAt = ?4').bind(s.email, key, value, nowIso()).run();
    else await env.DB.prepare('DELETE FROM ui_prefs WHERE email = ?1 AND k = ?2').bind(s.email, key).run();
  } catch { return json({ ok: false }); }
  return json({ ok: true });
}
