import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { uuid, nowIso, text, audit } from '../../lib/campteamDb.js';
import { buildPrompt, normalizeDraft, callClaude, DEFAULT_MODEL, MAX_TRANSCRIPT_CHARS } from '../../lib/campteamAi.js';

const friendly = (e) => e.status === 401 ? 'AI 키가 올바르지 않아요. 관리자에게 알려주세요.' : e.status === 429 || e.status === 529 ? 'AI 사용 한도에 도달했거나 서비스가 바빠요. 잠시 뒤 다시 시도해주세요.' : 'AI 초안을 만들지 못했어요. 잠시 뒤 다시 시도해주세요.';

/**
 * 전사 텍스트 → 회의록 초안 (Claude).  { meetingId, textId? | transcript?, lang: 'ko'|'en'|'', hints? }
 * 응답은 줄 단위 JSON 스트림: {"t":"start"} → {"t":"p","n":글자수} … → {"t":"done","id":초안번호,"draft":{…}} 또는 {"t":"error","message":…}
 * 전사 자체는 다른 프로그램으로 만든 텍스트를 붙여넣는다(음성은 이 서버가 처리하지 않는다). ANTHROPIC_API_KEY 가 없으면 꺼져 있다.
 */
export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 기능이 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const meeting = await env.DB.prepare('SELECT id, campId, meetDate, title, titleEn FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(String(b.meetingId || '')).first();
  if (!meeting) return badRequest('회의를 찾을 수 없습니다.');
  let transcript = '';
  if (b.textId) { const t = await env.DB.prepare('SELECT body FROM meeting_texts WHERE id = ?1 AND meetingId = ?2 AND deletedAt IS NULL').bind(String(b.textId), meeting.id).first(); if (!t) return badRequest('전사 텍스트를 찾을 수 없습니다.'); transcript = t.body; }
  else transcript = String(b.transcript || '').trim();
  if (transcript.length < 50) return badRequest('전사 텍스트가 너무 짧아요(최소 50자).');
  if (transcript.length > MAX_TRANSCRIPT_CHARS) return badRequest(`전사 텍스트가 너무 길어요(최대 ${MAX_TRANSCRIPT_CHARS.toLocaleString()}자). 나눠서 넣어주세요.`);
  const since = new Date(Date.now() - 3600000).toISOString();
  const recent = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ai_drafts WHERE createdBy = ?1 AND createdAt > ?2').bind(s.email, since).first()).n;
  if (recent >= 20) return json({ error: '한 시간에 만들 수 있는 초안 수를 넘었어요(비용 보호). 잠시 뒤 다시 시도해주세요.', code: 'rate' }, 429);
  const glossary = (await env.DB.prepare('SELECT termKo, termEn, keep FROM glossary WHERE deletedAt IS NULL LIMIT 200').all()).results;
  const model = env.CAMPTEAM_AI_MODEL || DEFAULT_MODEL, lang = ['ko', 'en'].includes(b.lang) ? b.lang : '';
  const { system, user } = buildPrompt({ transcript, lang, glossary, hints: text(b.hints, 1000), meeting: { title: meeting.title || meeting.titleEn, date: meeting.meetDate } });

  const { readable, writable } = new TransformStream(), writer = writable.getWriter(), enc = new TextEncoder();
  const send = (o) => writer.write(enc.encode(JSON.stringify(o) + '\n')).catch(() => {});
  const task = (async () => {
    try {
      await send({ t: 'start', model, chars: transcript.length }); let last = 0;
      const out = await callClaude({ apiKey: env.ANTHROPIC_API_KEY, model, system, user, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined), onChunk: (n) => { if (n - last >= 400) { last = n; send({ t: 'p', n }); } } });
      const r = normalizeDraft(out); if (r.error) { await send({ t: 'error', message: r.error }); return; }
      const id = uuid();
      await env.DB.prepare(`INSERT INTO ai_drafts (id,meetingId,kind,status,model,sourceChars,sourceNote,resultJson,createdAt,createdBy) VALUES (?1,?2,'minutes','draft',?3,?4,?5,?6,?7,?8)`)
        .bind(id, meeting.id, model, transcript.length, b.textId ? `transcript:${b.textId}` : 'pasted', JSON.stringify(r.draft), nowIso(), s.email).run();
      await audit(env, s.email, 'ai_generate', 'meeting', meeting.id, `${transcript.length} chars, ${model}`);
      await send({ t: 'done', id, draft: r.draft });
    } catch (e) { await send({ t: 'error', message: friendly(e) }); }
    finally { try { await writer.close(); } catch { /* 이미 닫힘 */ } }
  })();
  context.waitUntil?.(task);
  return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
