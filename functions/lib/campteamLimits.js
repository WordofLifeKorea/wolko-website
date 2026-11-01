import { json } from './campteamAuth.js';

/**
 * 루미·번역 같은 AI 질문 한도 — 한 곳에서 정한다.
 *  · 캠프팀 팀원: 하루 200개 + 1분에 12개 (정상적으로 쓸 때는 걸리지 않고, 실수로 반복 실행됐을 때만 막는 안전 한도)
 *  · 캠프팀 명단 밖의 월코 팀원: 하루 20개 (루미 「도움말」과 「찾기」만 열려 있다)
 * 세는 것은 audit_log 의 AI 사용 기록(도움말·찾기·부탁·글 번역·신청서 AI 채우기·설문 AI 채우기)을 합친 개수다. 문서 번역의 조각 요청은 따로 센다(번역 쪽에서).
 * 운영에서 숫자를 바꾸려면 Cloudflare 변수 CAMPTEAM_AI_DAILY · CAMPTEAM_AI_DAILY_GUEST · CAMPTEAM_AI_PER_MIN 을 넣는다.
 */
export const AI_ACTIONS = ['ask', 'assistant', 'translate_text', 'ai_form', 'ai_survey'];
export const TEAM_DAILY = 200, GUEST_DAILY = 20, PER_MIN = 12;
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
/** 한도에 걸리면 429 응답(Response)을, 괜찮으면 null 을 돌려준다 */
export async function aiLimit(env, s) {
  const daily = s.campRole ? num(env.CAMPTEAM_AI_DAILY, TEAM_DAILY) : num(env.CAMPTEAM_AI_DAILY_GUEST, GUEST_DAILY), perMin = num(env.CAMPTEAM_AI_PER_MIN, PER_MIN);
  const marks = AI_ACTIONS.map(() => '?').join(','), count = async (ms) => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ? AND action IN (${marks}) AND at >= ?`).bind(s.email, ...AI_ACTIONS, new Date(Date.now() - ms).toISOString()).first().catch(() => null))?.n || 0;
  if (await count(60 * 1000) >= perMin) return json({ error: '너무 빨라요. 1분쯤 뒤에 다시 해 주세요.', code: 'limit' }, 429);
  if (await count(24 * 3600 * 1000) >= daily) return json({ error: `오늘 질문 한도(${daily}개)를 다 썼어요. 내일 다시 물어봐 주세요.`, code: 'limit' }, 429);
  return null;
}
