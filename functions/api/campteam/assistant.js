import { campSession, json, needLogin, noDb, badRequest } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { isTeamMember } from './activity.js';
import { DEFAULT_ASSIST_MODEL, DAILY_LIMIT, buildAssistSystem, cleanMessages, parseReply, chatClaude } from '../../lib/campteamAssist.js';

/**
 * 캠프팀 AI 도우미 챗 (사용법 안내).
 *  POST { messages:[{role:'user'|'assistant', content}], path, lang } → { reply, guide }   guide 는 미리 만든 화면 안내 번호(없으면 '')
 * 포털 자료는 읽지 않는다(안내서와 대화만). 캠프팀 명단에 있는 사람만 쓸 수 있고, 사람마다 하루 질문 수가 정해져 있다.
 * 질문 내용은 저장하지 않는다 — 「썼다」는 기록(audit_log)만 남겨서 하루 한도를 센다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  return json({ member: isTeamMember(s), configured: !!env.ANTHROPIC_API_KEY });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 도우미가 아직 켜지지 않았어요. 아래의 기본 안내는 쓸 수 있어요.', code: 'ai_off' }, 503);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const messages = cleanMessages(b.messages);
  if (!messages.length) return badRequest('질문이 없습니다.');
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const used = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ?1 AND action = 'assistant' AND at >= ?2`).bind(s.email, since).first().catch(() => null))?.n || 0;
  if (used >= DAILY_LIMIT) return json({ error: `오늘 질문 한도(${DAILY_LIMIT}개)를 다 썼어요. 내일 다시 물어봐 주세요.`, code: 'limit' }, 429);
  try {
    const out = await chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || DEFAULT_ASSIST_MODEL, system: buildAssistSystem({ lang: b.lang === 'en' ? 'en' : 'ko', path: b.path }), messages, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
    await audit(env, s.email, 'assistant', 'chat', '', '');
    const r = parseReply(out);
    if (!r.reply) return json({ error: '답을 만들지 못했어요. 다시 물어봐 주세요.', code: 'empty' }, 422);
    return json(r);
  } catch (e) {
    return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502);
  }
}
