import { campSession, json, needLogin, noDb, badRequest, canWrite } from '../../lib/campteamAuth.js';
import { audit, todayKST } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { isTeamMember } from './activity.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { DAILY_ASK, gatherContext, buildAskSystem, buildAskUser, parseAnswer, buildActSystem, parseAction } from '../../lib/campteamAsk.js';

/**
 * 포털에게 물어보기 (루미). 캠프팀 팀원만, 사람마다 하루 40번. 질문 내용은 저장하지 않는다(「썼다」는 기록만).
 *  POST { question, lang }  → { answer, sources:[{ref,type,title,url}], found }   그 사람이 볼 수 있는 자료만 찾아 AI 에게 주고, 출처를 달아 답한다. 관련 자료가 없으면 AI 를 부르지 않고 「못 찾았어요」.
 *  POST { action:'act', text, lang } → { proposal:{type:'addTask'|'addEvent', …, say} | null }   「업무 추가해 줘」 같은 부탁을 제안 카드로 바꾼다. **저장하지 않는다** — 화면에서 사람이 확인을 눌러야 기존 저장 기능으로 저장된다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  return json({ member: isTeamMember(s), configured: !!env.ANTHROPIC_API_KEY, canTask: canWrite(s.perms, 'tasks'), canEvent: canWrite(s.perms, 'calendar') });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!isTeamMember(s)) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const lang = b.lang === 'en' ? 'en' : 'ko', act = b.action === 'act', text = String(act ? b.text : b.question || '').trim().slice(0, 500);
  if (!text) return badRequest(act ? '부탁할 내용을 적어 주세요.' : '질문을 적어 주세요.');
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 도우미가 아직 켜지지 않았어요. 위의 「찾기」 검색창은 쓸 수 있어요.', code: 'ai_off' }, 503);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const used = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ?1 AND action = 'ask' AND at >= ?2`).bind(s.email, since).first().catch(() => null))?.n || 0;
  if (used >= DAILY_ASK) return json({ error: `오늘 질문 한도(${DAILY_ASK}개)를 다 썼어요. 내일 다시 물어봐 주세요.`, code: 'limit' }, 429);
  const call = (system, user, maxTokens) => chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system, messages: [{ role: 'user', content: user }], maxTokens, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
  const today = todayKST();
  try {
    if (act) {
      const can = { task: canWrite(s.perms, 'tasks'), event: canWrite(s.perms, 'calendar') };
      if (!can.task && !can.event) return json({ proposal: null, reason: 'no_permission' });
      const camps = (await env.DB.prepare('SELECT id, nameKo FROM camps WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 40').all().catch(() => ({ results: [] }))).results;
      const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(today + 'T00:00:00Z').getUTCDay()] + '요일';
      const out = await call(buildActSystem(today, wd, camps), `<request>\n${text}\n</request>`, 500);
      await audit(env, s.email, 'ask', 'assistant', '', 'act');
      return json({ proposal: parseAction(out, camps, can) });
    }
    const items = await gatherContext(env, s, text, today);
    if (!items.length) { await audit(env, s.email, 'ask', 'assistant', '', 'none'); return json({ answer: '', sources: [], found: false }); }
    const out = await call(buildAskSystem(lang), buildAskUser(text, items), 700);
    await audit(env, s.email, 'ask', 'assistant', '', `q ${items.length}`);
    const r = parseAnswer(out, items); if (!r.answer) return json({ error: '답을 만들지 못했어요. 다시 물어봐 주세요.', code: 'empty' }, 422);
    return json({ ...r, found: true });
  } catch (e) { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
}
