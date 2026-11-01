import { json, badRequest, noDb } from '../../lib/campteamAuth.js';
import { uuid, nowIso } from '../../lib/campteamDb.js';
import { parseQuestions, cleanAnswers, MAX_RESPONSES, MAX_PER_IP_DAY } from '../../lib/campteamSurvey.js';

/**
 * 설문 답하기 — 로그인 없이, 링크(토큰)로. 이름·연락처는 받지 않는다.
 *  GET ?t=토큰 → { title, questions } (열려 있는 설문만)
 *  POST { t, answers:{질문번호:값}, hp:'' } → 저장. hp 는 사람이 보지 못하는 칸(채워져 있으면 자동 입력 프로그램으로 보고 버린다). 같은 주소에서 하루 5번, 설문당 1000개까지.
 */
const tokOk = (t) => /^[a-f0-9]{40,80}$/.test(String(t || ''));
async function load(env, t) { return tokOk(t) ? env.DB.prepare(`SELECT id, title, titleEn, questions FROM surveys WHERE publicToken = ?1 AND status = 'open' AND deletedAt IS NULL`).bind(t).first() : null; }
async function ipHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local', day = nowIso().slice(0, 10);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${day}|${ip}|campteam-survey`)); return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const sv = await load(env, new URL(request.url).searchParams.get('t')); if (!sv) return json({ error: '이 설문은 닫혔거나 없는 링크예요.', code: 'closed' }, 404);
  return json({ title: sv.title, titleEn: sv.titleEn, questions: parseQuestions(sv.questions) }, 200, { 'Cache-Control': 'no-store' });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.hp) return json({ ok: true });                                        // 자동 입력 프로그램: 저장하지 않고 조용히 성공처럼 답한다
  const sv = await load(env, b.t); if (!sv) return json({ error: '이 설문은 닫혔거나 없는 링크예요.', code: 'closed' }, 404);
  const answers = cleanAnswers(parseQuestions(sv.questions), b.answers); if (!answers) return badRequest('답을 하나 이상 골라 주세요.');
  const ip = await ipHash(request);
  const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM survey_responses WHERE surveyId = ?1').bind(sv.id).first()).n;
  if (total >= MAX_RESPONSES) return json({ error: '이 설문은 더 이상 답을 받지 않아요.', code: 'full' }, 429);
  const today = (await env.DB.prepare('SELECT COUNT(*) AS n FROM survey_responses WHERE surveyId = ?1 AND ipHash = ?2 AND createdAt >= ?3').bind(sv.id, ip, nowIso().slice(0, 10)).first()).n;
  if (today >= MAX_PER_IP_DAY) return json({ error: '오늘은 더 보낼 수 없어요. 내일 다시 해 주세요.', code: 'rate' }, 429);
  await env.DB.prepare('INSERT INTO survey_responses (id, surveyId, answers, ipHash, createdAt) VALUES (?1, ?2, ?3, ?4, ?5)').bind(uuid(), sv.id, JSON.stringify(answers), ip, nowIso()).run();
  return json({ ok: true }, 201);
}
