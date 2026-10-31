import { campSession, canWriteFile, canWrite, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { restrictedFor, CATEGORIES } from '../../lib/campteamFiles.js';
import { LIMITS, aiConfigured, suggestForFile, suggestCampNames } from '../../lib/campteamSuggest.js';

/**
 * AI 추천 — 저장하지 않고 **제안만** 돌려준다 (저장은 사람이 화면에서 직접 누른다).
 *  POST { mode:'file', name, kind:'text'|'pdf'|'image'|'none', text?, data?(base64), mime?, category? }
 *       → { suggestion:{ titles:[{ko,en}], description, category, topic, year, season, campId, campReason } }
 *       금액(예산) 분류로 올리는 파일은 내용을 AI 에 보내지 않는다(400 restricted). 글은 앞 4,000자, PDF 8MB, 사진 5MB 까지만 받는다.
 *  POST { mode:'title', title, category? } → 같은 { suggestion } (파일 없이, 입력 중인 제목만 보고 제목 완성·종류·주제·캠프를 제안. 설명은 비어 있음)
 *  POST { mode:'camp', typeName, year, season, location, notes }  → { names:[{ko,en}] }   (행사 이름 추천)
 *  GET → { configured }   (AI 키가 서버에 있는지)
 * 서버에 ANTHROPIC_API_KEY 가 없으면 503 { code:'ai_off' }.
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  return json({ configured: aiConfigured(env) });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!aiConfigured(env)) return json({ error: 'AI 추천이 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);

  if (b.mode === 'camp') {
    if (!canWrite(s.perms, 'camps')) return needPerm('행사를 만들 권한이 없습니다.');
    const names = await env.DB.prepare('SELECT nameKo FROM camps WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 12').all().then((r) => r.results.map((x) => x.nameKo)).catch(() => []);
    const r = await suggestCampNames(env, { typeName: b.typeName, year: Number(b.year) || null, season: b.season, location: b.location, notes: b.notes, existing: names });
    if (!r.ok) return json({ error: failText(r), code: r.code }, r.code === 'ai_failed' ? 502 : 422);
    await audit(env, s.email, 'ai_suggest', 'camp', '', 'camp name');
    return json({ names: r.names });
  }

  if (b.mode !== 'file' && b.mode !== 'title') return badRequest('mode 가 올바르지 않습니다.');
  const category = CATEGORIES.includes(b.category) ? b.category : 'etc';
  if (restrictedFor(category)) return json({ error: '금액(예산) 자료는 AI 에 보내지 않아요.', code: 'restricted' }, 400);
  if (!canWriteFile(s.perms, 0)) return needPerm('작성 권한이 없습니다.');
  const isTitle = b.mode === 'title', name = String(isTitle ? b.title : b.name || '').slice(0, isTitle ? 160 : 200), kind = isTitle ? 'title' : ['text', 'pdf', 'image'].includes(b.kind) ? b.kind : 'none';
  if (!name.trim()) return badRequest(isTitle ? '제목이 없습니다.' : '파일 이름이 없습니다.');
  const data = String(b.data || '');
  if (kind === 'pdf' && data.length > LIMITS.pdfBase64) return json({ error: 'PDF 가 너무 커서 AI 에 보내지 않아요 (8MB 까지).', code: 'too_large' }, 413);
  if (kind === 'image' && data.length > LIMITS.imageBase64) return json({ error: '사진이 너무 커요 (5MB 까지).', code: 'too_large' }, 413);
  // 관련 캠프 후보: 지워지지 않은 캠프(이름만) — AI 가 번호를 지어내지 못하게 목록 안에서만 고르게 한다
  const camps = await env.DB.prepare('SELECT id, nameKo, nameEn FROM camps WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT ?1').bind(LIMITS.camps).all().then((r) => r.results).catch(() => []);
  // 이미 쓰고 있는 태그(금액 자료 제외, 자주 쓰인 순) — AI 가 같은 뜻의 새 태그를 또 만들지 않고 기존 태그를 고르게 한다
  const tagCount = new Map();
  for (const x of ((await env.DB.prepare(`SELECT tags FROM files WHERE deletedAt IS NULL AND restricted = 0 AND tags <> '' ORDER BY updatedAt DESC LIMIT 1500`).all().catch(() => ({ results: [] }))).results)) for (const t of String(x.tags).split(',')) if (t) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const tags = [...tagCount.entries()].sort((a, c) => c[1] - a[1]).slice(0, 40).map((x) => x[0]);
  const r = await suggestForFile(env, { name, kind, text: b.text, data, mime: b.mime }, { camps, tags });
  if (!r.ok) return json({ error: failText(r), code: r.code }, r.code === 'ai_failed' ? 502 : 422);
  // 금액 분류는 금액 권한이 있는 사람만 고를 수 있다 — 권한이 없으면 종류 추천은 비운다
  if (r.suggestion.category && restrictedFor(r.suggestion.category) && !s.perms.moneyWrite) r.suggestion.category = '';
  await audit(env, s.email, 'ai_suggest', 'file', '', isTitle ? 'title' : `${kind}:${name}`.slice(0, 120));
  return json({ suggestion: r.suggestion });
}
const failText = (r) => (r.code === 'ai_unreadable' ? 'AI 가 알아볼 수 있는 추천을 만들지 못했어요. 다시 눌러 보세요.' : 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.');
