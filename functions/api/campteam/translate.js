import { campSession, json, needLogin, noDb, badRequest } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { isTeamMember } from './activity.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { MAX_TEXT, DAILY_TRANSLATE, cleanKind, detectTarget, buildTextPrompt, cleanOutput } from '../../lib/campteamTranslateText.js';

/**
 * 번역 도우미. POST { text, kind:'general'|'sermon'|'notice'|'schedule', to?:'ko'|'en' (없으면 글의 언어를 보고 반대로) } → { text, to }
 * 캠프팀 팀원만, 사람마다 하루 40번. 글 내용은 저장하지 않는다(「썼다」는 기록만 남겨 한도를 센다). 용어집 단어를 지킨다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  return json({ member: isTeamMember(s), configured: !!env.ANTHROPIC_API_KEY, max: MAX_TEXT });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: '번역 도우미가 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const text = String(b.text || '').trim();
  if (!text) return badRequest('번역할 글을 넣어 주세요.');
  if (text.length > MAX_TEXT) return json({ error: `글이 너무 길어요 (${MAX_TEXT.toLocaleString()}자까지). 나눠서 번역해 주세요.`, code: 'too_long' }, 413);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const used = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ?1 AND action = 'translate_text' AND at >= ?2`).bind(s.email, since).first().catch(() => null))?.n || 0;
  if (used >= DAILY_TRANSLATE) return json({ error: `오늘 번역 한도(${DAILY_TRANSLATE}번)를 다 썼어요. 내일 다시 해 주세요.`, code: 'limit' }, 429);
  const to = detectTarget(text, b.to), kind = cleanKind(b.kind);
  let glossary = []; try { glossary = (await env.DB.prepare('SELECT termKo, termEn, keep FROM glossary WHERE deletedAt IS NULL').all()).results; } catch { glossary = []; }
  try {
    const out = await chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system: buildTextPrompt({ kind, to, glossary }), messages: [{ role: 'user', content: `<text>\n${text}\n</text>` }], maxTokens: 6000, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
    await audit(env, s.email, 'translate_text', 'translate', '', `${kind} ${to} ${text.length}`);
    const t = cleanOutput(out); if (!t) return json({ error: '번역을 만들지 못했어요. 다시 눌러 주세요.', code: 'empty' }, 422);
    return json({ text: t, to });
  } catch (e) { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
}
