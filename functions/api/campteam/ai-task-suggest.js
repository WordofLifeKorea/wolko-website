import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, addDays, audit } from '../../lib/campteamDb.js';
import { aiLimit } from '../../lib/campteamLimits.js';
import { titleCols, translateTasks } from '../../lib/campteamTranslate.js';
import { dailyLimit, usedToday, normTitle, safeTitle, buildSuggestPrompt, parseSuggestions, askClaudeForTasks, MAX_TITLES, USAGE_ACTION } from '../../lib/campteamAiTasks.js';

/**
 * AI 업무 추천 — 체크리스트 템플릿 화면의 「AI 추천」 칸.
 *  GET  ?campId=&templateId=  → { suggestions:{ new:[], kept:[], dropped:[] }, remainingToday, dailyLimit, aiOn, ready }
 *        (캠프 + 템플릿 한 쌍마다 따로 저장된다. 이 화면을 접었다 펴도, 다른 기기에서 열어도 같은 목록이 보인다)
 *  POST { action:'generate', campId, templateId? } → Claude 에게 추천을 받아 status 'new' 로 저장. 사람마다 하루 20번(한국 시간 기준, 실제로 AI 를 부른 때만 센다).
 *        AI 로는 캠프 이름·유형·날짜와 업무 "제목"만 보낸다(금액·담당자·연락처·메모는 보내지 않는다). 키가 없거나 실패하면 안내만 하고 추천을 지어내지 않는다.
 *  POST { action:'decide', ids:[…], decision:'keep'|'drop'|'restore', alsoTemplate? }
 *        keep → 그 캠프의 업무로 만든다(담당자는 비움, sourceKey='ai:<추천 id>' 라 두 번 만들어지지 않는다). alsoTemplate 이면 템플릿 항목에도 넣는다.
 *        drop → 「넣지 않은 추천」으로 · restore → 다시 추천 목록으로.
 * 쓰기(추천 받기·결정)는 업무 작성 권한, 읽기는 업무 보기 권한. 표(0040)가 아직 없으면 조용히 비어 있는 상태로 동작한다.
 */
const SUGG = 'SELECT id, campId, templateId, batchId, title, offsetDays, priority, section, reason, status, createdAt, decidedAt FROM task_ai_suggestions';
const noTable = (e) => /no such table/i.test(String(e && e.message));

async function listFor(env, campId, templateId) {
  const out = { new: [], kept: [], dropped: [] };
  if (!campId) return out;
  // 가장 최근에 받은 묶음이 위에, 같은 묶음 안에서는 AI 가 적은 순서대로
  const rows = (await env.DB.prepare(`${SUGG} WHERE campId = ?1 AND IFNULL(templateId,'') = ?2 ORDER BY createdAt DESC, rowid`).bind(campId, templateId || '').all()).results;
  for (const r of rows) if (out[r.status]) out[r.status].push(r);
  return out;
}
const usage = async (env, s) => { const lim = dailyLimit(env), used = await usedToday(env, s.email); return { dailyLimit: lim, remainingToday: Math.max(0, lim - used) }; };

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'tasks', 'AI 업무 추천'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, campId = String(p.get('campId') || ''), templateId = String(p.get('templateId') || '');
  let suggestions = { new: [], kept: [], dropped: [] }, ready = true;
  try { suggestions = await listFor(env, campId, templateId); } catch (e) { if (!noTable(e)) throw e; ready = false; }
  return json({ suggestions, ...(await usage(env, s)), aiOn: !!env.ANTHROPIC_API_KEY, ready, canWrite: !!s.campRole && canWrite(s.perms, 'tasks') });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole || !canWrite(s.perms, 'tasks')) return needPerm('AI 추천은 업무를 작성할 수 있는 팀원만 쓸 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.action === 'generate') return generate(env, s, b);
  if (b.action === 'decide') return decide(context, s, b);
  return badRequest('action 이 올바르지 않습니다.');
}

/* ---------- 추천 받기 ---------- */
async function generate(env, s, b) {
  const camp = await env.DB.prepare('SELECT c.id, c.typeId, c.nameKo, c.nameEn, c.startDate, c.endDate, t.nameKo AS typeKo, t.nameEn AS typeEn FROM camps c LEFT JOIN camp_types t ON t.id = c.typeId WHERE c.id = ?1 AND c.deletedAt IS NULL').bind(String(b.campId || '')).first();
  if (!camp) return badRequest('캠프를 찾을 수 없어요. 캠프를 골라 주세요.');
  const templateId = b.templateId ? String(b.templateId) : '';
  let tpl = null;
  if (templateId) { tpl = await env.DB.prepare('SELECT id FROM checklist_templates WHERE id = ?1 AND deletedAt IS NULL').bind(templateId).first(); if (!tpl) return badRequest('템플릿을 찾을 수 없어요.'); }
  try { await env.DB.prepare('SELECT 1 AS x FROM task_ai_suggestions LIMIT 1').first(); } catch (e) { if (noTable(e)) return json({ error: 'AI 추천을 쓰려면 관리자가 데이터베이스 업데이트를 먼저 해야 해요.', code: 'not_ready' }, 503); throw e; }
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 추천이 아직 켜지지 않았어요. (관리자가 Claude API 키를 서버 설정에 넣어야 해요)', code: 'ai_off' }, 503);

  const u = await usage(env, s);
  if (u.remainingToday <= 0) return json({ error: `오늘 AI 추천은 ${u.dailyLimit}번을 다 썼어요. 내일 다시 받을 수 있어요.`, code: 'limit', ...u }, 429);
  const lim = await aiLimit(env, s); if (lim) return lim;   // 1분에 너무 많이 누르는 것을 막는 공통 안전 한도

  // 이미 있는 제목들 (중복 검사는 전부 대상으로, AI 에 보내는 것은 안전한 제목만 · 최대 80개)
  const titlesOf = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results.map((r) => String(r.title));
  const campAll = await titlesOf('SELECT title FROM tasks WHERE campId = ?1 AND deletedAt IS NULL ORDER BY createdAt', camp.id);
  const tplAll = tpl ? await titlesOf('SELECT title FROM checklist_items WHERE templateId = ?1 AND deletedAt IS NULL ORDER BY sortOrder, createdAt', tpl.id) : [];
  const sugAll = await titlesOf('SELECT title FROM task_ai_suggestions WHERE campId = ?1', camp.id);
  const pastAll = camp.typeId ? await titlesOf(`SELECT k.title AS title FROM tasks k JOIN camps c ON c.id = k.campId WHERE c.typeId = ?1 AND c.id <> ?2 AND c.deletedAt IS NULL AND k.deletedAt IS NULL ORDER BY c.startDate IS NULL, c.startDate DESC, k.createdAt LIMIT 400`, camp.typeId, camp.id) : [];
  const pick = (all, skip = new Set()) => { const seen = new Set(skip), out = []; for (const t of all) { const c = safeTitle(t), k = normTitle(c); if (!c || seen.has(k)) continue; seen.add(k); out.push(c); if (out.length >= MAX_TITLES) break; } return out; };
  const prompt = buildSuggestPrompt({ camp: { nameKo: camp.nameKo, nameEn: camp.nameEn, startDate: camp.startDate, endDate: camp.endDate }, typeName: camp.typeKo || camp.typeEn || '', campTitles: pick(campAll), templateTitles: pick(tplAll), pastTitles: pick(pastAll, new Set([...campAll, ...tplAll].map(normTitle))) });

  const ai = await askClaudeForTasks(env, prompt);
  if (!ai.ok) return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요. (오늘 횟수는 줄지 않았어요)', code: 'ai_failed', ...u }, 502);
  // 실제로 AI 를 불렀으니 횟수에 센다 (결과가 비어 있어도 AI 비용은 썼다)
  await audit(env, s.email, USAGE_ACTION, 'camp', camp.id, `${camp.nameKo}${tpl ? ' · tpl ' + tpl.id : ''}`.slice(0, 200));
  const after = { dailyLimit: u.dailyLimit, remainingToday: Math.max(0, u.remainingToday - 1) };
  const parsed = parseSuggestions(ai.text, [...campAll, ...tplAll, ...sugAll].map(normTitle));
  if (!parsed.ok) return json({ error: 'AI 가 알아볼 수 있는 추천을 만들지 못했어요. 다시 눌러 보세요.', code: 'ai_unreadable', ...after }, 502);
  const batchId = uuid(), now = nowIso();
  if (parsed.items.length) {
    await env.DB.batch(parsed.items.map((x) => env.DB.prepare('INSERT INTO task_ai_suggestions (id,campId,templateId,batchId,title,offsetDays,priority,section,reason,status,createdAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,\'new\',?10,?11)')
      .bind(uuid(), camp.id, tpl ? tpl.id : null, batchId, x.title, x.offsetDays, x.priority, x.section, x.reason, now, s.email)));
  }
  return json({ added: parsed.items.length, suggestions: await listFor(env, camp.id, tpl ? tpl.id : ''), ...after, aiOn: true, ready: true, note: parsed.items.length ? '' : '새로 추천할 업무가 없어요. 이미 있는 업무와 겹치는 것뿐이었어요.' });
}

/* ---------- ✓ / ✕ / 다시 넣기 ---------- */
async function decide(context, s, b) {
  const { env } = context;
  const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map((x) => String(x)).filter(Boolean))].slice(0, 50);
  const decision = String(b.decision || '');
  if (!ids.length) return badRequest('고른 추천이 없어요.');
  if (!['keep', 'drop', 'restore'].includes(decision)) return badRequest('decision 이 올바르지 않습니다.');
  const now = nowIso(), results = []; let created = 0, templateAdded = 0, campId = '', templateId = '';
  const createdTaskIds = [];
  for (const id of ids) {
    let row; try { row = await env.DB.prepare(`${SUGG} WHERE id = ?1`).bind(id).first(); } catch (e) { if (noTable(e)) return json({ error: '데이터베이스 업데이트가 아직 안 됐어요.', code: 'not_ready' }, 503); throw e; }
    if (!row) { results.push({ id, result: 'missing' }); continue; }
    campId = row.campId; templateId = row.templateId || '';
    if (decision === 'drop' || decision === 'restore') {
      const from = decision === 'drop' ? 'new' : 'dropped', to = decision === 'drop' ? 'dropped' : 'new';
      const r = await env.DB.prepare('UPDATE task_ai_suggestions SET status = ?2, decidedAt = ?3, decidedBy = ?4 WHERE id = ?1 AND status = ?5').bind(id, to, now, s.email, from).run();
      if (r.meta.changes === 1) { await audit(env, s.email, decision === 'drop' ? 'ai_suggest_drop' : 'ai_suggest_restore', 'task_ai_suggestion', id, row.title); results.push({ id, result: to }); } else results.push({ id, result: 'noop' });
      continue;
    }
    // keep: 먼저 상태를 바꾸는 데 성공한 한 번만 업무를 만든다 (두 번 눌러도 업무는 하나)
    const camp = await env.DB.prepare('SELECT id, startDate FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(row.campId).first();
    if (!camp) { results.push({ id, result: 'camp_missing' }); continue; }
    const flip = await env.DB.prepare(`UPDATE task_ai_suggestions SET status = 'kept', decidedAt = ?2, decidedBy = ?3 WHERE id = ?1 AND status = 'new'`).bind(id, now, s.email).run();
    if (flip.meta.changes !== 1) { results.push({ id, result: 'noop' }); continue; }
    const sourceKey = `ai:${id}`;
    try {
      const have = await env.DB.prepare('SELECT id FROM tasks WHERE sourceKey = ?1 AND deletedAt IS NULL').bind(sourceKey).first();
      if (!have) {
        const taskId = uuid(), tc = titleCols(row.title), due = camp.startDate && row.offsetDays != null ? addDays(camp.startDate, row.offsetDays) : null;
        await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,section,createdAt,updatedAt,createdBy,titleKo,titleEn) VALUES (?1,?2,?3,'','',?4,'Not Started',?5,?6,?7,?8,?9,?9,?10,?11,?12)`)
          .bind(taskId, camp.id, row.title, due, row.priority, row.reason ? `AI 추천: ${row.reason}`.slice(0, 1000) : '', sourceKey, row.section || '', now, s.email, tc.titleKo, tc.titleEn).run();
        createdTaskIds.push(taskId); created++;
      }
    } catch (e) { await env.DB.prepare(`UPDATE task_ai_suggestions SET status = 'new', decidedAt = NULL, decidedBy = NULL WHERE id = ?1`).bind(id).run().catch(() => {}); throw e; }
    await audit(env, s.email, 'ai_suggest_keep', 'task_ai_suggestion', id, row.title);
    let inTpl = false;
    if (b.alsoTemplate && row.templateId) {
      const tpl = await env.DB.prepare('SELECT id FROM checklist_templates WHERE id = ?1 AND deletedAt IS NULL').bind(row.templateId).first();
      if (tpl) {
        const items = (await env.DB.prepare('SELECT title FROM checklist_items WHERE templateId = ?1 AND deletedAt IS NULL').bind(tpl.id).all()).results;
        if (!items.some((i) => normTitle(i.title) === normTitle(row.title))) {
          const order = ((await env.DB.prepare('SELECT MAX(sortOrder) AS n FROM checklist_items WHERE templateId = ?1').bind(tpl.id).first())?.n || 0) + 1, itemId = uuid();
          await env.DB.prepare('INSERT INTO checklist_items (id,templateId,title,offsetDays,ownerSuggestion,priority,notes,sortOrder,section,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,\'\',?5,\'\',?6,?7,?8,?8,?9)')
            .bind(itemId, tpl.id, row.title, row.offsetDays, row.priority, order, row.section || '', now, s.email).run();
          await audit(env, s.email, 'create', 'checklist_item', itemId, `AI 추천: ${row.title}`);
          templateAdded++; inTpl = true;
        }
      }
    }
    results.push({ id, result: 'kept', inTemplate: inTpl });
  }
  if (createdTaskIds.length) { try { context.waitUntil ? context.waitUntil(translateTasks(env, { ids: createdTaskIds })) : translateTasks(env, { ids: createdTaskIds }); } catch { /* 번역은 나중에 채워진다 */ } }
  return json({ results, created, templateAdded, suggestions: await listFor(env, campId, templateId), ...(await usage(env, s)) });
}
