import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { S } from '../../lib/campteamCrud.js';
import { STARTERS, AUDIENCES, cleanQuestions, parseQuestions, cleanAudience } from '../../lib/campteamSurvey.js';

/**
 * 설문 템플릿(질문 묶음) — 캠프팀이 같이 쓴다. 보는 건 캠프팀 명단에 있는 사람, 저장·삭제는 캠프 영역 수정 권한이 있는 사람.
 *  GET → { items:[{id,name,audience,questions,createdBy,createdAt}], starters:{대상:{title,titleEn,description,descriptionEn,questions}}, audiences:[…] }   starters 는 코드에 들어 있는 기본 묶음(저장된 템플릿이 아직 없을 때도 고를 수 있게)
 *  POST { name, audience?, questions } → 새 템플릿 · DELETE ?id → 삭제 표시(deletedAt)
 */
async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole || !canView(s.perms, 'camps')) return { res: needPerm('캠프팀 팀원만 쓸 수 있어요.') };
  if (write && !canWrite(s.perms, 'camps')) return { res: needPerm('템플릿은 캠프 담당자만 저장하거나 지울 수 있어요.') };
  return { s };
}
export async function onRequestGet({ env, request }) {
  const g = await gate(env, request, false); if (g.res) return g.res;
  const rows = (await env.DB.prepare('SELECT id, name, audience, questions, createdBy, createdAt FROM survey_templates WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT 200').all()).results;
  return json({ items: rows.map((r) => ({ ...r, questions: parseQuestions(r.questions) })), starters: STARTERS, audiences: AUDIENCES });
}
export async function onRequestPost({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const name = S(b.name, 80); if (!name) return badRequest('템플릿 이름을 입력해 주세요.');
  const qs = cleanQuestions(b.questions); if (!qs.some((q) => q.type !== 'heading')) return badRequest('질문이 하나도 없어요. 질문을 넣은 뒤 저장해 주세요.');
  const id = uuid();
  await env.DB.prepare('INSERT INTO survey_templates (id, name, audience, questions, createdBy, createdAt) VALUES (?1,?2,?3,?4,?5,?6)').bind(id, name, cleanAudience(b.audience), JSON.stringify(qs), g.s.email, nowIso()).run();
  await audit(env, g.s.email, 'create', 'survey_template', id, name); return json({ id }, 201);
}
export async function onRequestDelete({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get('id');
  const r = await env.DB.prepare('UPDATE survey_templates SET deletedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL').bind(id, nowIso()).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, g.s.email, 'delete', 'survey_template', id); return json({ ok: true });
}
