import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite, denyView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, text, audit, normTags } from '../../lib/campteamDb.js';

/** AI 초안 목록/상세: ?meetingId= | ?id= */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', 'AI 초안'); if (dv) return dv; }
  const p = new URL(request.url).searchParams;
  if (p.get('id')) {
    const r = await env.DB.prepare('SELECT * FROM ai_drafts WHERE id = ?1 AND deletedAt IS NULL').bind(p.get('id')).first();
    return r ? json({ draft: { ...r, resultJson: undefined, result: JSON.parse(r.resultJson) } }) : json({ error: '찾을 수 없습니다.' }, 404);
  }
  const rows = (await env.DB.prepare('SELECT id, status, model, sourceChars, createdAt, createdBy, appliedAt FROM ai_drafts WHERE meetingId = ?1 AND deletedAt IS NULL ORDER BY createdAt DESC').bind(p.get('meetingId')).all()).results;
  return json({ items: rows });
}

/**
 * 초안 처리: { id, action: 'apply' | 'reject', pick?: { sections:[번호], decisions:[번호], tasks:[번호], next:[번호], summary: true } }
 *  apply 는 사람이 고른 항목만 회의록에 넣는다(안 고르면 전부). 담당자는 비워 두고 AI 가 들은 이름은 "제안"으로만, 기한은 메모로만 남긴다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWrite(s.perms, 'meetings')) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const row = await env.DB.prepare(`SELECT * FROM ai_drafts WHERE id = ?1 AND deletedAt IS NULL`).bind(String(b.id || '')).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  if (row.status !== 'draft') return badRequest('이미 처리된 초안이에요.');
  const now = nowIso();
  if (b.action === 'reject') { await env.DB.prepare(`UPDATE ai_drafts SET status = 'rejected' WHERE id = ?1`).bind(row.id).run(); await audit(env, s.email, 'ai_reject', 'ai_draft', row.id); return json({ ok: true }); }
  if (b.action !== 'apply') return badRequest('action 이 올바르지 않습니다.');
  const m = await env.DB.prepare('SELECT id, campId, meetDate, summaryKo, summaryEn FROM meetings WHERE id = ?1 AND deletedAt IS NULL').bind(row.meetingId).first();
  if (!m) return badRequest('회의를 찾을 수 없습니다.');
  const d = JSON.parse(row.resultJson), pick = b.pick || {};
  const chosen = (key, arr) => Array.isArray(pick[key]) ? pick[key].filter(i => Number.isInteger(i) && i >= 0 && i < arr.length) : arr.map((_, i) => i);
  const secMap = new Map(); let order = ((await env.DB.prepare('SELECT MAX(sortOrder) AS n FROM agenda_items WHERE meetingId = ?1').bind(m.id).first()).n || 0), no = ((await env.DB.prepare('SELECT MAX(sectionNo) AS n FROM agenda_items WHERE meetingId = ?1').bind(m.id).first()).n || 0);
  const counts = { sections: 0, decisions: 0, tasks: 0, next: 0, summary: false };
  for (const i of chosen('sections', d.sections)) {
    const x = d.sections[i], id = uuid(); secMap.set(i, id);
    await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,sectionNo,status,nextMeeting,note,tags,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'discussed',0,?10,?11,?12,?13,?13,?14)`)
      .bind(id, m.id, m.campId, text(x.titleKo || x.titleEn, 200), x.titleEn, x.bodyKo, x.bodyEn, x.kind, ++no, text('AI 초안 근거: ' + x.evidence.join(' | '), 400), normTags(x.tags.join(',')), ++order, now, s.email).run(); counts.sections++;
  }
  for (const i of chosen('decisions', d.decisions)) {
    const x = d.decisions[i];
    await env.DB.prepare(`INSERT INTO decisions (id,meetingId,agendaItemId,campId,kind,textKo,textEn,decidedDate,state,tags,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'active',?9,?10,?10,?11)`)
      .bind(uuid(), m.id, x.sectionIndex != null ? secMap.get(x.sectionIndex) || null : null, m.campId, x.kind, x.textKo, x.textEn, m.meetDate, normTags(x.tags.join(',')), now, s.email).run(); counts.decisions++;
  }
  for (const i of chosen('tasks', d.tasks)) {
    const x = d.tasks[i], key = `ai:${row.id}:${i}`;
    if (await env.DB.prepare('SELECT 1 AS x FROM tasks WHERE sourceKey = ?1').bind(key).first()) continue;
    const note = [x.dueMentioned ? `Due mentioned: ${x.dueMentioned}` : '', x.evidence.length ? 'Evidence: ' + x.evidence.join(' | ') : ''].filter(Boolean).join(' · ');
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerSuggestion,dueDate,status,priority,notes,sourceKey,meetingId,agendaItemId,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,'',?4,NULL,'Not Started','Medium',?5,?6,?7,?8,?9,?9,?10)`)
      .bind(uuid(), m.campId, x.title, x.ownerMentioned || '', text(note, 1000), key, m.id, x.sectionIndex != null ? secMap.get(x.sectionIndex) || null : null, now, s.email).run(); counts.tasks++;
  }
  for (const i of chosen('next', d.nextAgenda)) {
    const x = d.nextAgenda[i];
    await env.DB.prepare(`INSERT INTO agenda_items (id,meetingId,campId,topic,titleEn,bodyKo,bodyEn,kind,status,nextMeeting,sortOrder,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,?5,?6,?7,'other','pending',1,?8,?9,?9,?10)`)
      .bind(uuid(), m.id, m.campId, text(x.topicKo || x.topicEn, 200), x.topicEn, x.noteKo, x.noteEn, ++order, now, s.email).run(); counts.next++;
  }
  if (pick.summary !== false && !m.summaryKo && !m.summaryEn && (d.summary.ko || d.summary.en)) { await env.DB.prepare('UPDATE meetings SET summaryKo = ?2, summaryEn = ?3, updatedAt = ?4 WHERE id = ?1').bind(m.id, d.summary.ko, d.summary.en, now).run(); counts.summary = true; }
  await env.DB.prepare(`UPDATE ai_drafts SET status = 'applied', appliedAt = ?2 WHERE id = ?1`).bind(row.id, now).run();
  await audit(env, s.email, 'ai_apply', 'meeting', m.id, JSON.stringify(counts));
  return json({ ok: true, counts });
}
