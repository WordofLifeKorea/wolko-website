import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { findPairs, findDupes, pairCandidates, buildPairPrompt, parsePairs } from '../../lib/campteamTidy.js';
import { callClaude, DEFAULT_MODEL } from '../../lib/campteamAi.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';

/**
 * 자료 정리 제안 (한·영 짝 묶기 + 중복·최신본). 제안만 돌려주고, 적용은 사람이 누른다.
 *  GET ?ai=1  → { pairs:[{a,b,why,sure,reason}], dupes:[{keep,others,why}], aiUsed }   (ai=1 이면 이름만으로 못 묶은 것을 AI 가 제목만 보고 고른다)
 *  POST { action:'pair', a, b }       한 쌍으로 묶기 (이미 다른 짝이 있으면 그 짝은 풀린다)
 *  POST { action:'unpair', id }       짝 풀기
 *  POST { action:'trash', ids:[..] }  중복이라고 확인한 자료를 휴지통으로 (휴지통에서 되살릴 수 있다)
 * 금액(예산) 자료는 제안에서 빠진다.
 */
const BASE = `SELECT f.id, f.campId, f.category, f.title, f.lang, f.updatedAt, f.restricted, __PAIR__ AS pairId, v.fileName, v.sizeBytes
  FROM files f LEFT JOIN file_versions v ON v.id = f.currentVersionId WHERE f.deletedAt IS NULL AND f.restricted = 0 ORDER BY f.updatedAt DESC LIMIT 1500`;
async function load(env) {
  try { return (await env.DB.prepare(BASE.replace('__PAIR__', 'f.pairId')).all()).results; }
  catch { return (await env.DB.prepare(BASE.replace('__PAIR__', 'NULL')).all()).results; } // 0025 가 아직 없는 DB
}
const slim = (f) => ({ id: f.id, title: f.title, lang: f.lang, campId: f.campId, updatedAt: f.updatedAt, fileName: f.fileName || '' });
const pairOut = (p) => ({ a: slim(p.a), b: slim(p.b), why: p.why, sure: !!p.sure, reason: p.reason || '' });

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료실'); if (dv) return dv; }
  if (!canWriteFile(s.perms, 0)) return needPerm('정리 권한이 없습니다.');
  const files = await load(env), pairs = findPairs(files), want = new URL(request.url).searchParams.get('ai') === '1';
  let aiUsed = false;
  if (want && env.ANTHROPIC_API_KEY) {
    const groups = pairCandidates(files, pairs).slice(0, 8);
    if (groups.length) {
      try {
        const { system, user } = buildPairPrompt(groups);
        const out = await callClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_AI_MODEL || DEFAULT_MODEL, system, user, maxTokens: 2000, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
        pairs.push(...parsePairs(out, groups)); aiUsed = true;
      } catch { /* AI 가 안 되면 이름으로 찾은 것만 보여 준다 */ }
    }
  }
  return json({ pairs: pairs.map(pairOut), dupes: findDupes(files).map((d) => ({ keep: slim(d.keep), others: d.others.map(slim), why: d.why })), aiUsed, aiOn: !!env.ANTHROPIC_API_KEY });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso(), ok = async (id) => env.DB.prepare('SELECT id, pairId, restricted FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first().catch(() => null);
  if (b.action === 'pair') {
    const a = await ok(b.a), c = await ok(b.b);
    if (!a || !c || a.id === c.id || a.restricted || c.restricted) return badRequest('묶을 자료를 찾지 못했어요.');
    for (const x of [a, c]) if (x.pairId) await env.DB.prepare('UPDATE files SET pairId = NULL, updatedAt = ?2 WHERE pairId = ?1').bind(x.pairId, now).run();
    const pid = uuid();
    await env.DB.prepare('UPDATE files SET pairId = ?3, updatedAt = ?4 WHERE id IN (?1, ?2)').bind(a.id, c.id, pid, now).run();
    await audit(env, s.email, 'pair', 'file', a.id, c.id); return json({ ok: true, pairId: pid });
  }
  if (b.action === 'unpair') {
    const a = await ok(b.id); if (!a) return badRequest('자료를 찾지 못했어요.');
    if (a.pairId) await env.DB.prepare('UPDATE files SET pairId = NULL, updatedAt = ?2 WHERE pairId = ?1').bind(a.pairId, now).run();
    await audit(env, s.email, 'unpair', 'file', a.id); return json({ ok: true });
  }
  if (b.action === 'trash') {
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].slice(0, 100); let n = 0;
    for (const id of ids) { const r = await env.DB.prepare('UPDATE files SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1 AND deletedAt IS NULL AND restricted = 0').bind(id, now).run(); n += r.meta?.changes || 0; }
    await audit(env, s.email, 'tidy_trash', 'file', 'bulk', `${n} files`); return json({ ok: true, trashed: n });
  }
  return badRequest('action 이 올바르지 않습니다.');
}
