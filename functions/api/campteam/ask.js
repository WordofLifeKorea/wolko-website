import { campSession, json, needLogin, noDb, badRequest, canWrite } from '../../lib/campteamAuth.js';
import { audit, todayKST } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { isTeamMember } from './activity.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { aiLimit } from '../../lib/campteamLimits.js';
import { DAILY_ASK, gatherContext, buildAskSystem, buildAskUser, parseAnswer, buildActSystem, buildActUser, parseAction, actTargets, cleanHistory } from '../../lib/campteamAsk.js';

/**
 * 포털에게 물어보기 (루미). 캠프팀 팀원은 하루 200번(1분 12번), 캠프팀 명단 밖의 월코 팀원은 「찾기」만 하루 20번(campteamLimits.js). 질문 내용은 저장하지 않는다(「썼다」는 기록만).
 *  POST { question, lang }  → { answer, sources:[{ref,type,title,url}], found }   그 사람이 볼 수 있는 자료만 찾아 AI 에게 주고, 출처를 달아 답한다. 관련 자료가 없으면 AI 를 부르지 않고 「못 찾았어요」.
 *  POST { action:'act', text, lang, history? } → { proposal:{type:'addTask'|'addEvent'|'editTask'|'editEvent'|'deleteTask'|'deleteEvent'|'none', …, say} | null }   「업무 추가해 줘」「그 일정 10시로 바꿔줘」「그 업무 지워줘」 같은 부탁을 제안 카드로 바꾼다.
 *     고치거나 지울 수 있는 것은 이 사람이 만들었거나 담당인 업무, 이 사람이 만든 일정뿐이다(번호로만 가리킨다). history 는 최근 대화 요약(내 말·루미가 한 일)으로 「그 일정」 같은 말을 알아듣는 데 쓴다.
 *     **저장하지 않는다** — 화면에서 사람이 확인을 눌러야 기존 저장 기능(수정·삭제는 기존 PATCH/DELETE, 삭제는 휴지통에서 되살릴 수 있음)으로 저장된다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  return json({ member: isTeamMember(s), guest: !isTeamMember(s), configured: !!env.ANTHROPIC_API_KEY, canTask: canWrite(s.perms, 'tasks'), canEvent: canWrite(s.perms, 'calendar') });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const lang = b.lang === 'en' ? 'en' : 'ko', act = b.action === 'act', text = String(act ? b.text : b.question || '').trim().slice(0, 500);
  if (act && !isTeamMember(s)) return json({ error: '「부탁」은 캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  if (!text) return badRequest(act ? '부탁할 내용을 적어 주세요.' : '질문을 적어 주세요.');
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 도우미가 아직 켜지지 않았어요. 위의 「찾기」 검색창은 쓸 수 있어요.', code: 'ai_off' }, 503);
  { const lim = await aiLimit(env, s); if (lim) return lim; }
  const call = (system, user, maxTokens) => chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system, messages: [{ role: 'user', content: user }], maxTokens, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
  const today = todayKST();
  try {
    if (act) {
      const can = { task: canWrite(s.perms, 'tasks'), event: canWrite(s.perms, 'calendar') };
      if (!can.task && !can.event) return json({ proposal: null, reason: 'no_permission' });
      const camps = (await env.DB.prepare('SELECT id, nameKo FROM camps WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 40').all().catch(() => ({ results: [] }))).results;
      const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(today + 'T00:00:00Z').getUTCDay()] + '요일';
      const targets = await actTargets(env, s.email, s.perms);
      const out = await call(buildActSystem(today, wd, camps, targets), buildActUser(text, cleanHistory(b.history)), 600);
      await audit(env, s.email, 'ask', 'assistant', '', 'act');
      const proposal = parseAction(out, camps, can, targets);
      if (proposal && proposal.changes && 'campId' in proposal.changes) { const nm = (id) => camps.find((c) => c.id === id)?.nameKo || ''; proposal.campNames = { before: nm(proposal.before.campId), after: nm(proposal.changes.campId) }; }
      return json({ proposal });
    }
    const items = await gatherContext(env, s, text, today);
    if (!items.length) { await audit(env, s.email, 'ask', 'assistant', '', 'none'); return json({ answer: '', sources: [], found: false }); }
    const out = await call(buildAskSystem(lang), buildAskUser(text, items), 700);
    await audit(env, s.email, 'ask', 'assistant', '', `q ${items.length}`);
    const r = parseAnswer(out, items); if (!r.answer) return json({ error: '답을 만들지 못했어요. 다시 물어봐 주세요.', code: 'empty' }, 422);
    return json({ ...r, found: true });
  } catch (e) { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
}
