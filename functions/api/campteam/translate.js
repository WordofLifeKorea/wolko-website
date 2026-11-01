import { campSession, json, needLogin, noDb, badRequest } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { isTeamMember } from './activity.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { aiLimit } from '../../lib/campteamLimits.js';
import { MAX_TEXT, DAILY_TRANSLATE, cleanKind, detectTarget, buildTextPrompt, cleanOutput } from '../../lib/campteamTranslateText.js';
import { DOC_ACTION, MAX_UNITS, MAX_CHARS, FINANCE_MSG, financeReason, docLimit, buildDocPrompt, translateUnits } from '../../lib/campteamTranslateDoc.js';

/**
 * 번역 도우미. POST { text, kind:'general'|'sermon'|'notice'|'schedule', to?:'ko'|'en' (없으면 글의 언어를 보고 반대로) } → { text, to }
 * 캠프팀 팀원만, 사람마다 하루 40번. 글 내용은 저장하지 않는다(「썼다」는 기록만 남겨 한도를 센다). 용어집 단어를 지킨다.
 * 문서 번역: POST { action:'doc', units:[글 조각…](40개·6,000자까지), to?:'ko'|'en', kind?, name?(파일 이름 — 돈 파일 확인에만 쓰고 저장 안 함) } → { out:[번역…(같은 순서)], to, kept?:[번역 못 해 원문 그대로 둔 번호] }
 * 문서 조각은 글 번역 한도(aiLimit)와 따로 센다: 사람마다 1분 30번·하루 400번(lib/campteamTranslateDoc.js). 돈 문서는 서버에서도 거절한다.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  return json({ member: isTeamMember(s), configured: !!env.ANTHROPIC_API_KEY, max: MAX_TEXT, doc: { maxUnits: MAX_UNITS, maxChars: MAX_CHARS } });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return json({ error: '캠프팀 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: '번역 도우미가 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action === 'doc') return docChunk(env, s, b);
  const text = String(b.text || '').trim();
  if (!text) return badRequest('번역할 글을 넣어 주세요.');
  if (text.length > MAX_TEXT) return json({ error: `글이 너무 길어요 (${MAX_TEXT.toLocaleString()}자까지). 나눠서 번역해 주세요.`, code: 'too_long' }, 413);
  { const lim = await aiLimit(env, s); if (lim) return lim; }
  const to = detectTarget(text, b.to), kind = cleanKind(b.kind);
  let glossary = []; try { glossary = (await env.DB.prepare('SELECT termKo, termEn, keep FROM glossary WHERE deletedAt IS NULL').all()).results; } catch { glossary = []; }
  try {
    const out = await chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system: buildTextPrompt({ kind, to, glossary }), messages: [{ role: 'user', content: `<text>\n${text}\n</text>` }], maxTokens: 6000, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
    await audit(env, s.email, 'translate_text', 'translate', '', `${kind} ${to} ${text.length}`);
    const t = cleanOutput(out); if (!t) return json({ error: '번역을 만들지 못했어요. 다시 눌러 주세요.', code: 'empty' }, 422);
    return json({ text: t, to });
  } catch (e) { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
}

/** 문서 한 조각(글 조각 여러 개)을 번역한다. 글 조각은 저장하지 않고 개수·글자 수만 기록한다. */
async function docChunk(env, s, b) {
  const units = b.units;
  if (!Array.isArray(units) || !units.length || units.some((u) => typeof u !== 'string')) return badRequest('번역할 글 조각이 올바르지 않습니다.');
  const chars = units.reduce((n, u) => n + u.length, 0);
  if (units.length > MAX_UNITS || chars > MAX_CHARS) return json({ error: `한 번에 보낼 수 있는 양을 넘었어요 (${MAX_UNITS}개·${MAX_CHARS.toLocaleString()}자까지).`, code: 'too_long' }, 413);
  const send = units.map((u, i) => [u, i]).filter(([u]) => u.trim());
  if (!send.length) return json({ out: units.slice(), to: b.to === 'ko' ? 'ko' : 'en' });
  if (financeReason(String(b.name || '').slice(0, 300), send.map(([u]) => u).join('\n'))) return json({ error: FINANCE_MSG, code: 'finance' }, 422);
  { const lim = await docLimit(env, s); if (lim) return lim; }
  const sent = send.map(([u]) => u), to = detectTarget(sent.join('\n'), b.to), kind = cleanKind(b.kind);
  let glossary = []; try { glossary = (await env.DB.prepare('SELECT termKo, termEn, keep FROM glossary WHERE deletedAt IS NULL').all()).results; } catch { glossary = []; }
  const ask = (list) => chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system: buildDocPrompt({ kind, to, glossary, n: list.length }), messages: [{ role: 'user', content: `<units>\n${JSON.stringify(list)}\n</units>` }], maxTokens: 8000, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
  let res; try { res = await translateUnits(sent, ask); } catch (e) { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
  await audit(env, s.email, DOC_ACTION, 'translate', '', `${to} ${units.length} ${chars}`);
  const out = units.slice(), kept = [];
  res.forEach((t, k) => { const i = send[k][1]; if (typeof t === 'string' && t.trim()) out[i] = t; else kept.push(i); });
  if (kept.length === send.length) return json({ error: '번역을 만들지 못했어요. 다시 눌러 주세요.', code: 'empty' }, 502);
  return json(kept.length ? { out, to, kept } : { out, to });
}
