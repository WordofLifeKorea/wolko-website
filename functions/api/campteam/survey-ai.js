import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { aiLimit } from '../../lib/campteamLimits.js';

/**
 * 설문 문구의 빈 쪽(영어 또는 한국어)을 AI 가 채워 준다 — 신청서의 「AI 채우기」(camp-forms.js aifill)와 같은 방식.
 *  POST { items:[{ key, from, lang:'en'|'ko' }] }  → { fills:{ key: 번역된 글 } }   lang 은 만들어 달라는 언어, from 은 설문에 적힌 문구
 * 사람 이름·전화번호·이메일·금액은 보내지 않는다: 설문 문구만 받고, 연락처 모양이 들어 있는 문구는 아예 건너뛴다(skipped).
 * 한도는 루미·번역과 같은 한 곳(campteamLimits.js aiLimit)에서 센다 — 기록 이름은 ai_survey.
 */
const PERSONAL = /[\w.+-]+@[\w-]+\.[\w.-]+|\d[\d\s().-]{7,}\d|₩|\d+\s*원/;
const SYSTEM = 'You complete the missing language side of a bilingual survey for a Korean youth camp ministry (WOLKO). Each item gives a "from" text and the target language. Translate or write the wording naturally and kindly, in a tone fit for students, parents and volunteers. Keep the meaning and the question type (do not turn a question into a statement). Never add facts, names, or numbers that are not in the original. Output ONE JSON object mapping each requested key to its text, nothing else.';
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.campRole || !canWrite(s.perms, 'camps')) return needPerm('설문은 캠프 담당자만 고칠 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const todo = [], skipped = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 120)) {
    const key = String(it?.key || ''), from = String(it?.from ?? '').replace(/\s+/g, ' ').trim().slice(0, 500), lang = it?.lang === 'ko' ? 'Korean' : it?.lang === 'en' ? 'English' : '';
    if (!/^[\w:.-]{1,40}$/.test(key) || !from || !lang) continue;
    if (PERSONAL.test(from)) { skipped.push(key); continue; }
    todo.push({ key, from, lang });
  }
  if (!todo.length) return json({ fills: {}, skipped, note: '채울 빈 칸이 없어요.' });
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 도우미가 아직 켜지지 않았어요. 칸을 직접 채워 주세요.', code: 'ai_off' }, 503);
  const lim = await aiLimit(env, s); if (lim) return lim;
  try {
    const out = await chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(todo) }], maxTokens: 2500, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
    await audit(env, s.email, 'ai_survey', 'survey', '', `${todo.length}칸`);   // 글 내용은 기록하지 않고 개수만
    const i0 = out.indexOf('{'), i1 = out.lastIndexOf('}'); let o = {}; try { o = JSON.parse(out.slice(i0, i1 + 1)); } catch { o = {}; }
    const fills = {}; for (const t of todo) { const v = String(o[t.key] ?? '').replace(/\s+/g, ' ').trim().slice(0, 500); if (v) fills[t.key] = v; }
    return json({ fills, skipped });
  } catch { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
}
