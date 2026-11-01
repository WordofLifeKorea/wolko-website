import { campSession, json, needLogin, needPerm, noDb, canWrite } from '../../lib/campteamAuth.js';
import { parseQuestions, summarize } from '../../lib/campteamSurvey.js';

/** 설문 결과(요약). 캠프 영역 수정 권한이 있는 사람만 본다 — 답한 사람의 이름·주소는 저장하지 않으므로 어디에도 없다. GET ?id= */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.campRole || !canWrite(s.perms, 'camps')) return needPerm('설문 결과는 캠프 담당자만 볼 수 있어요.');
  const sv = await env.DB.prepare('SELECT id, title, titleEn, campId, questions, status FROM surveys WHERE id = ?1 AND deletedAt IS NULL').bind(new URL(request.url).searchParams.get('id')).first();
  if (!sv) return json({ error: '찾을 수 없습니다.' }, 404);
  const rows = (await env.DB.prepare('SELECT answers, createdAt FROM survey_responses WHERE surveyId = ?1 ORDER BY createdAt').bind(sv.id).all()).results.map((r) => { try { return JSON.parse(r.answers); } catch { return {}; } });
  return json({ survey: { id: sv.id, title: sv.title, titleEn: sv.titleEn, status: sv.status }, responses: rows.length, summary: summarize(parseQuestions(sv.questions), rows) });
}
