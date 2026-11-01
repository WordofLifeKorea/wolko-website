import { crud } from '../../lib/campteamCrud.js';
import { DEFAULT_QUESTIONS, cleanQuestions, parseQuestions } from '../../lib/campteamSurvey.js';
import { json, badRequest } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { S } from '../../lib/campteamCrud.js';

/**
 * 캠프 후 평가 설문 관리. 캠프팀 명단에 있는 사람이 보고, 캠프 영역 수정 권한이 있어야 만들고 고친다.
 *  GET ?campId= → { items:[{id,campId,title,status,questions,hasLink,link?,responses}] }   link 는 수정 권한이 있는 사람에게만(링크를 아는 사람은 누구나 답할 수 있다)
 *  POST {campId,title?,questions?} (질문을 안 보내면 기본 질문 6개) · PATCH ?id {title,status,questions,link:true|false} · DELETE ?id
 */
async function clean(b, base, env) {
  const campId = base.campId || S(b.campId, 60); if (!campId || !(await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(campId).first())) return { error: '캠프를 찾지 못했어요.' };
  const title = 'title' in b ? S(b.title, 120) : base.title || ''; if (!title) return { error: '설문 제목을 입력해주세요.' };
  const qs = 'questions' in b ? cleanQuestions(b.questions) : base.questions ? parseQuestions(base.questions) : cleanQuestions(DEFAULT_QUESTIONS);
  if (!qs.length) return { error: '질문이 하나도 없어요. 별점·선택·글 질문을 넣어 주세요.' };
  const status = 'status' in b ? (b.status === 'closed' ? 'closed' : 'open') : base.status || 'open';
  return { v: { campId, title, titleEn: 'titleEn' in b ? S(b.titleEn, 120) : base.titleEn || '', questions: JSON.stringify(qs), status } };
}
const h = crud({ table: 'surveys', entity: 'survey', area: 'camps', cols: ['campId', 'title', 'titleEn', 'questions', 'status', 'publicToken'], clean, order: 'createdAt DESC', filters: { campId: 'campId' } });
export const onRequestPost = h.onRequestPost, onRequestDelete = h.onRequestDelete;
export async function onRequestGet(ctx) {
  const res = await h.onRequestGet(ctx); if (res.status !== 200) return res;
  const d = await res.json(), edit = ctx.env && d.perms?.areas?.camps === 'edit', origin = new URL(ctx.request.url).origin;
  const cnt = new Map((await ctx.env.DB.prepare('SELECT surveyId, COUNT(*) AS n FROM survey_responses GROUP BY surveyId').all().catch(() => ({ results: [] }))).results.map((r) => [r.surveyId, r.n]));
  return json({ items: d.items.map((s) => ({ id: s.id, campId: s.campId, title: s.title, titleEn: s.titleEn, status: s.status, questions: parseQuestions(s.questions), hasLink: !!s.publicToken, link: edit && s.publicToken ? `${origin}/portal/campteam/survey/?t=${s.publicToken}` : '', responses: cnt.get(s.id) || 0, createdAt: s.createdAt })), perms: d.perms });
}
export async function onRequestPatch(ctx) {
  const { env, request } = ctx; let b; try { b = await request.clone().json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!('link' in b)) return h.onRequestPatch(ctx);
  const g = await h.gate(env, request, true); if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get('id'), row = await env.DB.prepare('SELECT id FROM surveys WHERE id = ?1 AND deletedAt IS NULL').bind(id).first(); if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  const token = b.link ? (uuid() + uuid()).replace(/-/g, '') : null;
  await env.DB.prepare('UPDATE surveys SET publicToken = ?2, updatedAt = ?3 WHERE id = ?1').bind(id, token, nowIso()).run();
  await audit(env, g.s.email, b.link ? 'survey_link_on' : 'survey_link_off', 'survey', id); return json({ ok: true, link: token ? `${new URL(request.url).origin}/portal/campteam/survey/?t=${token}` : '' });
}
