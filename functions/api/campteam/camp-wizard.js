import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { rankSources, buildCandidates, pickIdx, buildRankPrompt, parseRank, norm } from '../../lib/campteamWizard.js';
import { callClaude, DEFAULT_MODEL } from '../../lib/campteamAi.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';

/**
 * 캠프 시작 마법사 — 새 캠프를 시작할 때 지난 캠프의 업무·진행표·준비물·자료를 후보로 보여 주고, **고른 것만** 복사한다.
 *  GET ?campId=                  → { camp, sources:[{id,nameKo,…,score,why,counts}] }   지난 캠프 후보(점수순)
 *  GET ?campId=&fromCampId=      → { dated, offsetDays, tasks, timeline, supplies, files }   복사할 수 있는 것들(날짜는 시작일 차이만큼 옮김, 담당자는 가져오지 않음)
 *  POST { action:'recommend', campId } → { picks:[{id,reason}], ai }   AI(없으면 규칙)가 가장 좋은 지난 캠프 3개를 고른다 — 이름·개수만 AI 에 보낸다
 *  POST { action:'apply', campId, fromCampId, tasks:[번호], timeline:[번호], supplies:[번호], files:[파일번호] } → { created }   번호는 서버가 다시 만든 후보 안에서만 받는다
 */
async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole || !canView(s.perms, 'camps')) return { res: needPerm('캠프팀 팀원만 쓸 수 있어요.') };
  if (write && !(canWrite(s.perms, 'camps') && canWrite(s.perms, 'tasks'))) return { res: needPerm('캠프와 업무를 수정할 권한이 있어야 해요.') };
  return { s };
}
const CAMP = `SELECT c.id, c.typeId, c.nameKo, c.nameEn, c.startDate, c.endDate, c.status, c.year, c.season, c.theme, c.seriesId, t.nameKo AS typeName FROM camps c LEFT JOIN camp_types t ON t.id = c.typeId WHERE c.deletedAt IS NULL`;
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results).catch(() => []);
async function campRow(env, id) {
  const bind = String(id || '');
  try { return await env.DB.prepare(`${CAMP} AND c.id = ?1`).bind(bind).first(); }
  catch { return env.DB.prepare(`${CAMP.replace(', c.seriesId', '')} AND c.id = ?1`).bind(bind).first(); } // 0027 전
}
async function sourceRows(env, id) {
  return { tasks: await q(env, `SELECT title, section, priority, dueDate FROM tasks WHERE campId = ?1 AND deletedAt IS NULL AND status <> 'Not Applicable' ORDER BY section, createdAt LIMIT 400`, id),
    timeline: await q(env, `SELECT dayDate, startTime, endTime, title, place FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL ORDER BY dayDate, startTime LIMIT 400`, id),
    supplies: await q(env, `SELECT name, qty FROM camp_supplies WHERE campId = ?1 AND deletedAt IS NULL ORDER BY name LIMIT 400`, id),
    files: await q(env, `SELECT f.id, f.title FROM files f WHERE f.deletedAt IS NULL AND f.restricted = 0 AND (f.campId = ?1 OR f.id IN (SELECT fileId FROM file_links WHERE campId = ?1 AND deletedAt IS NULL)) ORDER BY f.title LIMIT 200`, id) };
}

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request, false); if (g.res) return g.res;
  const p = new URL(request.url).searchParams, target = await campRow(env, p.get('campId')); if (!target) return badRequest('캠프를 찾지 못했어요.');
  if (p.get('fromCampId')) {
    const src = await campRow(env, p.get('fromCampId')); if (!src || src.id === target.id) return badRequest('지난 캠프를 확인해주세요.');
    return json({ camp: { id: target.id, nameKo: target.nameKo, startDate: target.startDate }, from: { id: src.id, nameKo: src.nameKo, startDate: src.startDate }, ...buildCandidates(target, src, await sourceRows(env, src.id)) });
  }
  const camps = await q(env, CAMP);
  const counts = {};
  for (const [k, sql] of [['tasks', `SELECT campId AS id, COUNT(*) AS n FROM tasks WHERE deletedAt IS NULL AND campId IS NOT NULL GROUP BY campId`], ['timeline', `SELECT campId AS id, COUNT(*) AS n FROM camp_timeline WHERE deletedAt IS NULL GROUP BY campId`], ['supplies', `SELECT campId AS id, COUNT(*) AS n FROM camp_supplies WHERE deletedAt IS NULL GROUP BY campId`], ['files', `SELECT campId AS id, COUNT(*) AS n FROM files WHERE deletedAt IS NULL AND restricted = 0 AND campId IS NOT NULL GROUP BY campId`]])
    for (const r of await q(env, sql)) (counts[r.id] = counts[r.id] || { tasks: 0, timeline: 0, supplies: 0, files: 0 })[k] = r.n;
  return json({ camp: { id: target.id, nameKo: target.nameKo, nameEn: target.nameEn, startDate: target.startDate, typeId: target.typeId }, sources: rankSources(target, camps, counts), aiOn: !!env.ANTHROPIC_API_KEY });
}

export async function onRequestPost({ env, request }) {
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const g = await gate(env, request, b.action === 'apply'); if (g.res) return g.res;
  const target = await campRow(env, b.campId); if (!target) return badRequest('캠프를 찾지 못했어요.');
  if (b.action === 'recommend') {
    const camps = await q(env, CAMP), counts = {};
    for (const r of await q(env, `SELECT campId AS id, COUNT(*) AS n FROM tasks WHERE deletedAt IS NULL AND campId IS NOT NULL GROUP BY campId`)) (counts[r.id] = counts[r.id] || { tasks: 0, timeline: 0, supplies: 0, files: 0 }).tasks = r.n;
    for (const r of await q(env, `SELECT campId AS id, COUNT(*) AS n FROM files WHERE deletedAt IS NULL AND restricted = 0 AND campId IS NOT NULL GROUP BY campId`)) (counts[r.id] = counts[r.id] || { tasks: 0, timeline: 0, supplies: 0, files: 0 }).files = r.n;
    const ranked = rankSources(target, camps, counts);
    let picks = ranked.slice(0, 3).map((c) => ({ id: c.id, reason: '' })), ai = false;
    if (env.ANTHROPIC_API_KEY && ranked.length > 1) {
      try { const { system, user } = buildRankPrompt(target, ranked); const out = await callClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_AI_MODEL || DEFAULT_MODEL, system, user, maxTokens: 800, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) }); const r = parseRank(out, ranked); if (r.length) { picks = r; ai = true; } } catch { /* 규칙 순서를 쓴다 */ }
    }
    return json({ picks, ai });
  }
  if (b.action !== 'apply') return badRequest('action 이 올바르지 않습니다.');
  const src = await campRow(env, b.fromCampId); if (!src || src.id === target.id) return badRequest('지난 캠프를 확인해주세요.');
  const rows = await sourceRows(env, src.id), cand = buildCandidates(target, src, rows), now = nowIso(); let created = { tasks: 0, timeline: 0, supplies: 0, files: 0 };
  const haveTask = new Set((await q(env, 'SELECT title FROM tasks WHERE campId = ?1 AND deletedAt IS NULL', target.id)).map((r) => norm(r.title)));
  for (const t of pickIdx(cand.tasks, b.tasks)) { if (haveTask.has(norm(t.title))) continue; haveTask.add(norm(t.title));
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,'','',?4,'Not Started',?5,'',?6,?7,?8,?8,?9)`).bind(uuid(), target.id, t.title, t.dueDate, t.priority || 'Medium', `wiz:${norm(t.title)}|${target.id}`, t.section, now, g.s.email).run(); created.tasks++; }
  const haveTl = new Set((await q(env, 'SELECT dayDate, startTime, title FROM camp_timeline WHERE campId = ?1 AND deletedAt IS NULL', target.id)).map((r) => `${r.dayDate}|${r.startTime}|${norm(r.title)}`));
  for (const t of pickIdx(cand.timeline, b.timeline)) { const k = `${t.dayDate}|${t.startTime}|${norm(t.title)}`; if (haveTl.has(k)) continue; haveTl.add(k);
    await env.DB.prepare(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,endTime,title,place,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8,?8,?9)`).bind(uuid(), target.id, t.dayDate, t.startTime, t.endTime, t.title, t.place, now, g.s.email).run(); created.timeline++; }
  const haveSu = new Set((await q(env, 'SELECT name FROM camp_supplies WHERE campId = ?1 AND deletedAt IS NULL', target.id)).map((r) => norm(r.name)));
  for (const t of pickIdx(cand.supplies, b.supplies)) { if (haveSu.has(norm(t.name))) continue; haveSu.add(norm(t.name));
    await env.DB.prepare(`INSERT INTO camp_supplies (id,campId,name,qty,status,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,'need',?5,?5,?6)`).bind(uuid(), target.id, t.name, t.qty, now, g.s.email).run(); created.supplies++; }
  const okFiles = new Set(cand.files.map((f) => f.id)), haveLink = new Set((await q(env, 'SELECT fileId FROM file_links WHERE campId = ?1 AND deletedAt IS NULL', target.id)).map((r) => r.fileId));
  for (const fid of [...new Set(Array.isArray(b.files) ? b.files.map(String) : [])]) { if (!okFiles.has(fid) || haveLink.has(fid)) continue;
    await env.DB.prepare('INSERT INTO file_links (id,fileId,campId,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5)').bind(uuid(), fid, target.id, now, g.s.email).run(); created.files++; }
  await audit(env, g.s.email, 'camp_wizard', 'camp', target.id, `from ${src.id}: ${JSON.stringify(created)}`.slice(0, 200));
  return json({ created }, 201);
}
