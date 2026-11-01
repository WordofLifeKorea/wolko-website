import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { FOLLOWUPS, norm } from '../../lib/campteamWizard.js';

/**
 * 캠프 마감 마법사 — 캠프가 끝난 뒤 점검·정리. 하나도 자동으로 바꾸지 않고, 사람이 고른 것만 적용한다.
 *  GET ?campId= → { camp, openTasks:[…], counts, money?:{budgetLines,ledgerEntries}, surveys, followups:[{id,title,titleEn,exists}] }   money 는 금액 권한이 있는 사람에게만
 *  POST { campId, markNA:[업무번호], addFollowups:[후속번호], setStatus?:'done' } → { markedNA, added, status }
 *   「해당 없음」 처리는 업무를 지우지 않고 상태만 바꾼다(되돌릴 수 있다). 후속 업무는 담당·기한을 비워 만든다.
 */
async function gate(env, request, write) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole || !canView(s.perms, 'camps')) return { res: needPerm('캠프팀 팀원만 쓸 수 있어요.') };
  if (write && !(canWrite(s.perms, 'camps') && canWrite(s.perms, 'tasks'))) return { res: needPerm('캠프와 업무를 수정할 권한이 있어야 해요.') };
  return { s };
}
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results).catch(() => []);
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first().catch(() => null);

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request, false); if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get('campId'), camp = await one(env, 'SELECT id, nameKo, nameEn, startDate, endDate, status FROM camps WHERE id = ?1 AND deletedAt IS NULL', id); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const openTasks = await q(env, `SELECT id, title, ownerName, dueDate, status FROM tasks WHERE campId = ?1 AND deletedAt IS NULL AND inactive = 0 AND status NOT IN ('Completed','Not Applicable') ORDER BY (dueDate IS NULL), dueDate LIMIT 200`, id);
  const c = (sql) => one(env, sql, id).then((r) => r?.n || 0);
  const counts = { tasks: await c('SELECT COUNT(*) AS n FROM tasks WHERE campId = ?1 AND deletedAt IS NULL'), files: await c('SELECT COUNT(*) AS n FROM files WHERE campId = ?1 AND deletedAt IS NULL AND restricted = 0'), filesUntagged: await c(`SELECT COUNT(*) AS n FROM files WHERE campId = ?1 AND deletedAt IS NULL AND restricted = 0 AND (tags IS NULL OR tags = '')`), suppliesOpen: await c(`SELECT COUNT(*) AS n FROM camp_supplies WHERE campId = ?1 AND deletedAt IS NULL AND status IN ('need','bought')`), meetings: await c('SELECT COUNT(*) AS n FROM meetings WHERE campId = ?1 AND deletedAt IS NULL') };
  let money; if (g.s.perms.moneyRead) money = { budgetLines: await c('SELECT COUNT(*) AS n FROM budget_lines WHERE campId = ?1 AND deletedAt IS NULL'), ledgerEntries: await c('SELECT COUNT(*) AS n FROM ledger_entries WHERE campId = ?1 AND deletedAt IS NULL') };
  const surveys = await q(env, `SELECT s.id, s.title, s.status, (SELECT COUNT(*) FROM survey_responses r WHERE r.surveyId = s.id) AS responses FROM surveys s WHERE s.campId = ?1 AND s.deletedAt IS NULL`, id);
  const have = new Set((await q(env, 'SELECT title FROM tasks WHERE campId = ?1 AND deletedAt IS NULL', id)).map((r) => norm(r.title)));
  return json({ camp, openTasks, counts, money, surveys, followups: FOLLOWUPS.map((f) => ({ ...f, exists: have.has(norm(f.title)) })) });
}

export async function onRequestPost({ env, request }) {
  const g = await gate(env, request, true); if (g.res) return g.res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const camp = await one(env, 'SELECT id, status FROM camps WHERE id = ?1 AND deletedAt IS NULL', String(b.campId || '')); if (!camp) return badRequest('캠프를 찾지 못했어요.');
  const now = nowIso(); let markedNA = 0, added = 0, status = camp.status;
  for (const tid of [...new Set(Array.isArray(b.markNA) ? b.markNA.map(String) : [])].slice(0, 200)) { const r = await env.DB.prepare(`UPDATE tasks SET status = 'Not Applicable', updatedAt = ?3 WHERE id = ?1 AND campId = ?2 AND deletedAt IS NULL AND status NOT IN ('Completed','Not Applicable')`).bind(tid, camp.id, now).run(); markedNA += r.meta?.changes || 0; }
  const have = new Set((await q(env, 'SELECT title FROM tasks WHERE campId = ?1 AND deletedAt IS NULL', camp.id)).map((r) => norm(r.title)));
  for (const fid of [...new Set(Array.isArray(b.addFollowups) ? b.addFollowups.map(String) : [])]) { const f = FOLLOWUPS.find((x) => x.id === fid); if (!f || have.has(norm(f.title))) continue;
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,titleKo,titleEn,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?3,?4,'','',NULL,'Not Started','Medium','',?5,'사후',?6,?6,?7)`).bind(uuid(), camp.id, f.title, f.titleEn, `close:${f.id}|${camp.id}`, now, g.s.email).run().catch(async () => env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,'','',NULL,'Not Started','Medium','',?4,'사후',?5,?5,?6)`).bind(uuid(), camp.id, f.title, `close:${f.id}|${camp.id}`, now, g.s.email).run()); added++; }
  if (b.setStatus === 'done' && camp.status !== 'done') { await env.DB.prepare(`UPDATE camps SET status = 'done', updatedAt = ?2 WHERE id = ?1`).bind(camp.id, now).run(); status = 'done'; }
  await audit(env, g.s.email, 'camp_close', 'camp', camp.id, `NA ${markedNA} + ${added} ${status}`);
  return json({ markedNA, added, status });
}
