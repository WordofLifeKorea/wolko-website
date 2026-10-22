import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';

/** 회의 하나의 전체 보기: 구역(안건별 논의), 결정, 이 회의에서 나온 업무, 연결된 파일, 전사문 목록 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'meetings', '회의록'); if (dv) return dv; }
  const id = new URL(request.url).searchParams.get('id');
  const meeting = await env.DB.prepare(`SELECT m.*, c.nameKo AS campKo, c.nameEn AS campEn FROM meetings m LEFT JOIN camps c ON c.id = m.campId WHERE m.id = ?1 AND m.deletedAt IS NULL`).bind(id).first();
  if (!meeting) return json({ error: '찾을 수 없습니다.' }, 404);
  const db = env.DB;
  const [sections, decisions, tasks, files, texts] = await Promise.all([
    db.prepare(`SELECT id, meetingId, topic, titleEn, bodyKo, bodyEn, kind, sectionNo, status, nextMeeting, note, tags, sortOrder, isTest FROM agenda_items WHERE meetingId = ?1 AND deletedAt IS NULL ORDER BY nextMeeting, sortOrder, createdAt`).bind(id).all(),
    db.prepare(`SELECT d.id, d.agendaItemId, d.kind, d.textKo, d.textEn, d.decidedDate, d.supersedesId, d.state, d.tags, d.isTest FROM decisions d WHERE d.meetingId = ?1 AND d.deletedAt IS NULL ORDER BY d.decidedDate, d.createdAt`).bind(id).all(),
    db.prepare(`SELECT id, title, ownerName, ownerSuggestion, dueDate, status, priority, agendaItemId, decisionId FROM tasks WHERE meetingId = ?1 AND deletedAt IS NULL ORDER BY createdAt`).bind(id).all(),
    db.prepare(`SELECT mf.id AS linkId, mf.role, f.id, f.title, f.kind, f.storage, f.externalUrl, f.restricted FROM meeting_files mf JOIN files f ON f.id = mf.fileId WHERE mf.meetingId = ?1 AND mf.deletedAt IS NULL AND f.deletedAt IS NULL ORDER BY mf.createdAt`).bind(id).all(),
    db.prepare(`SELECT id, kind, lang, LENGTH(body) AS chars, createdAt, createdBy FROM meeting_texts WHERE meetingId = ?1 AND deletedAt IS NULL ORDER BY createdAt`).bind(id).all(),
  ]);
  return json({ meeting, sections: sections.results, decisions: decisions.results, tasks: tasks.results,
    files: files.results.filter(f => !f.restricted || s.perms.moneyRead), texts: texts.results, perms: s.perms });
}
