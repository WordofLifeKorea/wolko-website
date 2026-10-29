import { campSession, json, needLogin, noDb, canView } from '../../lib/campteamAuth.js';
import { text, likeOf } from '../../lib/campteamDb.js';
import { mapPortalItems, searchPortalItems } from './portal-files.js';

/** 통합 검색: ?q=  업무 · 회의 · 회의 구역(안건별 논의) · 결정 · 파일 · 자료실 폴더 (금액 권한이 있으면 예산 항목도). 금액 자료 파일은 권한이 없으면 나오지 않는다. */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  const q = text(new URL(request.url).searchParams.get('q'), 80);
  if (q.length < 2) return json({ q, error: '검색어를 두 글자 이상 입력해주세요.', groups: {} }, 400);
  const l = likeOf(q), db = env.DB, E = `ESCAPE '\\'`;
  const fileSql = async (withFolder) => db.prepare(`SELECT f.id, f.title, f.kind, f.storage, f.restricted, v.fileName FROM files f LEFT JOIN file_versions v ON v.id = f.currentVersionId WHERE f.deletedAt IS NULL ${s.perms.moneyRead ? '' : 'AND f.restricted = 0'} ${s.campRole ? '' : 'AND f.id IN (SELECT fileId FROM file_public)'} AND (f.title LIKE ?1 ${E} OR f.description LIKE ?1 ${E} OR f.topic LIKE ?1 ${E} OR v.fileName LIKE ?1 ${E}${withFolder ? ` OR f.folderId IN (SELECT d.id FROM file_folders d WHERE d.deletedAt IS NULL AND (d.name LIKE ?1 ${E} OR d.nameEn LIKE ?1 ${E}))` : ''}) ORDER BY f.updatedAt DESC LIMIT 8`).bind(l).all();
  // 폴더 이름으로 찾으면 그 폴더 파일도 함께 나온다(0023 적용 전 DB 에서는 폴더 없이 찾는다)
  const filesQ = fileSql(true).catch((e) => { if (!/file_folders|folderId/.test(String((e && e.message) || e))) throw e; return fileSql(false); });
  const foldersQ = (async () => db.prepare(`SELECT d.id, d.name, d.nameEn, (SELECT COUNT(*) FROM files f WHERE f.folderId = d.id AND f.deletedAt IS NULL ${s.perms.moneyRead ? '' : 'AND f.restricted = 0'} ${s.campRole ? '' : 'AND f.id IN (SELECT fileId FROM file_public)'}) AS fileCount FROM file_folders d WHERE d.deletedAt IS NULL AND (d.name LIKE ?1 ${E} OR d.nameEn LIKE ?1 ${E}) ORDER BY d.updatedAt DESC LIMIT 5`).bind(l).all())().catch(() => ({ results: [] }));
  // 월코 포털 캠프 자료실 자료(읽기만, 캠프팀 명단 사람만)
  const portalQ = (async () => {
    if (!s.campRole || !env.CAMP_KV) return [];
    const [d, c] = await Promise.all([env.CAMP_KV.get('teach:data:v1', 'json'), env.CAMP_KV.get('teach:camps:v1', 'json')]);
    return searchPortalItems(mapPortalItems(d, c), q).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);
  })().catch(() => []);
  const [tasks, meetings, sections, decisions, files, folders, portalFiles] = await Promise.all([
    db.prepare(`SELECT k.id, k.title, k.titleKo, k.titleEn, k.status, k.dueDate, k.ownerName, c.nameKo AS campKo, c.nameEn AS campEn FROM tasks k LEFT JOIN camps c ON c.id = k.campId WHERE k.deletedAt IS NULL AND (k.title LIKE ?1 ${E} OR k.notes LIKE ?1 ${E} OR k.ownerName LIKE ?1 ${E}) ORDER BY k.updatedAt DESC LIMIT 8`).bind(l).all(),
    db.prepare(`SELECT id, title, titleEn, meetDate, purpose FROM meetings WHERE deletedAt IS NULL AND (title LIKE ?1 ${E} OR titleEn LIKE ?1 ${E} OR purpose LIKE ?1 ${E} OR purposeEn LIKE ?1 ${E} OR summaryKo LIKE ?1 ${E} OR summaryEn LIKE ?1 ${E} OR attendees LIKE ?1 ${E}) ORDER BY meetDate DESC LIMIT 8`).bind(l).all(),
    db.prepare(`SELECT a.id, a.meetingId, a.topic, a.titleEn, a.nextMeeting, m.meetDate, m.title AS meetingTitle FROM agenda_items a JOIN meetings m ON m.id = a.meetingId WHERE a.deletedAt IS NULL AND m.deletedAt IS NULL AND (a.topic LIKE ?1 ${E} OR a.titleEn LIKE ?1 ${E} OR a.bodyKo LIKE ?1 ${E} OR a.bodyEn LIKE ?1 ${E}) ORDER BY m.meetDate DESC LIMIT 8`).bind(l).all(),
    db.prepare(`SELECT d.id, d.meetingId, d.kind, d.state, d.textKo, d.textEn, d.decidedDate FROM decisions d WHERE d.deletedAt IS NULL AND (d.textKo LIKE ?1 ${E} OR d.textEn LIKE ?1 ${E}) ORDER BY d.decidedDate DESC LIMIT 8`).bind(l).all(),
    filesQ,
    foldersQ,
    portalQ,
  ]);
  const V = (a, list) => (canView(s.perms, a) ? list : []); // 볼 권한이 없는 영역은 결과에서 뺀다
  const groups = { tasks: V('tasks', tasks.results), meetings: V('meetings', meetings.results), sections: V('meetings', sections.results), decisions: V('meetings', decisions.results), files: V('files', files.results), folders: V('files', folders.results.filter((d) => s.campRole || d.fileCount > 0)), portalFiles: V('files', portalFiles) };
  if (s.perms.moneyRead) { // 금액 권한이 있을 때만 예산 항목도 검색 (아니면 이 표는 읽지도 않는다)
    groups.budget = (await db.prepare(`SELECT id, label, category, plannedAmount, currency FROM budget_lines WHERE deletedAt IS NULL AND (label LIKE ?1 ${E} OR notes LIKE ?1 ${E} OR category LIKE ?1 ${E}) LIMIT 8`).bind(l).all()).results;
  }
  return json({ q, groups, total: Object.values(groups).reduce((n, g) => n + g.length, 0) });
}
