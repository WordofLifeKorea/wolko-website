import { campSession, json, needLogin, needPerm, badRequest, noDb, canView, canWrite } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { MAX_DEPTH, buildIndex, depthOf, heightOf } from '../../lib/campteamFolderTree.js';

/**
 * 휴지통: 삭제 표시된 항목을 보고 복구한다. (영구 삭제 기능은 일부러 만들지 않았다 — 삭제는 언제나 복구 가능)
 * 금액 자료(예산 항목, 금액 파일)는 금액 권한이 있는 사람만 보고 복구할 수 있다.
 */
const KINDS = {
  tasks: { table: 'tasks', label: 'title', sub: `COALESCE(ownerName,'')` },
  events: { table: 'events', label: 'title', sub: 'startDate' },
  meetings: { table: 'meetings', label: 'title', sub: 'meetDate' },
  sections: { table: 'agenda_items', label: 'topic', sub: `COALESCE(titleEn,'')` },
  decisions: { table: 'decisions', label: `CASE WHEN textKo <> '' THEN textKo ELSE textEn END`, sub: 'kind' },
  files: { table: 'files', label: 'title', sub: 'category', restricted: 'restricted', hide: 'deletedWith IS NULL' }, // 폴더째 지워진 파일은 폴더를 복구할 때 함께 돌아온다
  folders: { table: 'file_folders', label: 'name', sub: `COALESCE(nameEn,'')`, hide: 'deletedWith IS NULL' },
  camps: { table: 'camps', label: 'nameKo', sub: `COALESCE(nameEn,'')` },
  camp_types: { table: 'camp_types', label: 'nameKo', sub: `COALESCE(nameEn,'')` },
  templates: { table: 'checklist_templates', label: 'nameKo', sub: `COALESCE(nameEn,'')` },
  template_items: { table: 'checklist_items', label: 'title', sub: `COALESCE(section,'')` },
  announcements: { table: 'announcements', label: 'title', sub: 'createdBy' },
  notices: { table: 'notices', label: 'message', sub: `COALESCE(messageEn,'')` },
  library: { table: 'library_items', label: 'title', sub: 'kind' },
  budget: { table: 'budget_lines', label: 'label', sub: 'currency', money: true },
  ledger: { table: 'ledger_entries', label: `CASE WHEN description <> '' THEN description ELSE category END`, sub: `entryDate || ' · ' || amount`, money: true, where: `source <> 'carry'` }, // 장부 거래(이월금 줄은 시스템이 관리하므로 제외)
};
// 항목별 권한: 종류마다 어느 영역인지 (그 영역을 볼 수 있어야 목록에 나오고, 수정할 수 있어야 복구할 수 있다)
const AREA = { tasks: 'tasks', events: 'calendar', templates: 'tasks', template_items: 'tasks', meetings: 'meetings', sections: 'meetings', decisions: 'meetings', files: 'files', folders: 'files', library: 'files', camps: 'camps', camp_types: 'camps', notices: 'camps', announcements: 'notices', budget: 'money', ledger: 'ledger' };
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  if (!s) return { res: needLogin() };
  if (!s.campRole) return { res: needPerm('캠프팀 명단에 있는 계정만 쓸 수 있어요.') }; // 보이는 범위와 복구 권한은 종류별 영역 권한으로 다시 걸러진다
  return { s };
}

/**
 * 휴지통 보기·복구 범위: 관리자는 전부, 그 밖의 사람은 "내가 지운 것"만 (실수로 지운 걸 되살릴 수 있게).
 * 누가 지웠는지는 변경 기록(audit_log)의 가장 최근 delete 기록으로 판단한다.
 */
const lastDeleter = (alias) => `LOWER(COALESCE((SELECT a.actor FROM audit_log a WHERE a.entityId = ${alias}.id AND a.action = 'delete' ORDER BY a.at DESC LIMIT 1), ''))`;
const mine = (s, alias) => (s.perms.manageMembers ? '' : ` AND ${lastDeleter(alias)} = ?`);
const mineArgs = (s) => (s.perms.manageMembers ? [] : [s.email.toLowerCase()]);

/**
 * 폴더째 지워진 파일·폴더(deletedWith 가 있는 것)는 목록에서 빼고 폴더 하나로 보여 준다. 0036 이 아직 없는 DB 에서는 그 조건 없이 다시 묻는다.
 */
async function tryHide(k, run, fallback) {
  const hide = k.hide ? ` AND t.${k.hide}` : '';
  try { return await run(hide); } catch { /* 아래에서 다시 */ }
  if (!hide) return fallback;
  try { return await run(''); } catch { return fallback; }
}

/** 목록: ?kind= (없으면 모든 종류의 개수만) */
export async function onRequestGet({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  const kind = new URL(request.url).searchParams.get('kind');
  const allowed = Object.entries(KINDS).filter(([name, k]) => canView(s.perms, AREA[name]));
  if (!kind) {
    const counts = {};
    for (const [name, k] of allowed) counts[name] = await tryHide(k, async (hide) => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${k.table} t WHERE t.deletedAt IS NOT NULL ${k.restricted && !s.perms.moneyRead ? `AND t.${k.restricted} = 0` : ''} ${k.where ? 'AND t.' + k.where : ''}${hide}${mine(s, 't')}`).bind(...mineArgs(s)).first()).n, 0); // 아직 이 표가 없는 DB 는 0개로 본다
    return json({ counts });
  }
  const k = KINDS[kind]; if (!k || !canView(s.perms, AREA[kind])) return badRequest('종류가 올바르지 않습니다.');
  const rows = await tryHide(k, async (hide) => (await env.DB.prepare(`SELECT t.id, ${k.label} AS label, ${k.sub} AS sub, t.deletedAt,
      (SELECT a.actor FROM audit_log a WHERE a.entityId = t.id AND a.action = 'delete' ORDER BY a.at DESC LIMIT 1) AS deletedBy
    FROM ${k.table} t WHERE t.deletedAt IS NOT NULL ${k.restricted && !s.perms.moneyRead ? `AND t.${k.restricted} = 0` : ''} ${k.where ? 'AND t.' + k.where : ''}${hide}${mine(s, 't')} ORDER BY t.deletedAt DESC LIMIT 200`).bind(...mineArgs(s)).all()).results, []); // 아직 이 표가 없는 DB 는 빈 목록
  return json({ kind, items: rows });
}

/** 복구: { kind, id } */
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const k = KINDS[b.kind]; if (!k) return badRequest('종류가 올바르지 않습니다.');
  if (!canWrite(s.perms, AREA[b.kind])) return needPerm('복구 권한이 없습니다.');
  const row = await env.DB.prepare(`SELECT * FROM ${k.table} WHERE id = ?1 AND deletedAt IS NOT NULL`).bind(String(b.id || '')).first();
  if (!row || (k.restricted && row[k.restricted] && !s.perms.moneyWrite)) return json({ error: '찾을 수 없습니다.' }, 404);
  if (!s.perms.manageMembers && !(await env.DB.prepare(`SELECT 1 AS x FROM ${k.table} t WHERE t.id = ?1${mine(s, 't')}`).bind(row.id, ...mineArgs(s)).first())) return json({ error: '내가 지운 항목만 복구할 수 있어요. 다른 사람이 지운 건 관리자에게 요청해 주세요.' }, 404);
  // 연결된 상위 항목이 아직 삭제 상태면 복구해도 보이지 않으므로 먼저 알려준다
  const parent = { tasks: ['camps', 'campId'], sections: ['meetings', 'meetingId'], decisions: ['meetings', 'meetingId'], template_items: ['checklist_templates', 'templateId'], camps: ['camp_types', 'typeId'], files: ['camps', 'campId'], budget: ['camps', 'campId'] }[b.kind];
  if (parent && row[parent[1]]) {
    const p = await env.DB.prepare(`SELECT deletedAt FROM ${parent[0]} WHERE id = ?1`).bind(row[parent[1]]).first();
    if (p && p.deletedAt) return json({ error: '이 항목이 속한 상위 항목(캠프·회의·템플릿)이 삭제 상태예요. 상위 항목을 먼저 복구해주세요.', code: 'parent_deleted' }, 409);
  }
  if (b.kind === 'ledger') { // 장부 거래: 기간이 열려 있어야 하고, 같은 열쇠(연동·이월)의 줄이 이미 있으면 안 된다
    if (row.source === 'carry') return json({ error: '이월금 줄은 복구할 수 없어요.' }, 409);
    const per = await env.DB.prepare('SELECT name, status, deletedAt FROM ledger_periods WHERE id = ?1').bind(row.periodId).first();
    if (!per || per.deletedAt) return json({ error: '이 거래가 속한 기간이 지워졌어요.', code: 'parent_deleted' }, 409);
    if (per.status === 'closed') return json({ error: `「${per.name}」은 마감된 기간이에요. 다시 연 뒤에 복구해 주세요.`, code: 'closed' }, 409);
    if (row.externalKey && await env.DB.prepare('SELECT 1 AS x FROM ledger_entries WHERE periodId = ?1 AND externalKey = ?2 AND deletedAt IS NULL').bind(row.periodId, row.externalKey).first()) return json({ error: '같은 거래가 이미 있어요.' }, 409);
  }
  const now = nowIso();
  if (b.kind === 'folders') {
    let r; try { r = await restoreFolder(env, s, row, now); } catch (e) { if (!/parentId|deletedWith/.test(String((e && e.message) || e))) throw e; await env.DB.prepare('UPDATE file_folders SET deletedAt = NULL, updatedAt = ?2 WHERE id = ?1').bind(row.id, now).run(); } // 0036 적용 전 DB
    if (r) return r; await audit(env, s.email, 'restore', k.table, row.id); return json({ ok: true }); }
  await env.DB.prepare(`UPDATE ${k.table} SET deletedAt = NULL, updatedAt = ?2 WHERE id = ?1`).bind(row.id, now).run();
  if (b.kind === 'files') { // 들어 있던 폴더가 지워졌거나 없으면 폴더 밖(맨 위)으로 돌아온다
    await env.DB.prepare('UPDATE files SET folderId = NULL WHERE id = ?1 AND folderId IS NOT NULL AND folderId NOT IN (SELECT id FROM file_folders WHERE deletedAt IS NULL)').bind(row.id).run().catch(() => {});
    await env.DB.prepare('UPDATE files SET deletedWith = NULL WHERE id = ?1').bind(row.id).run().catch(() => {});
  }
  if (b.kind === 'ledger' && row.source === 'expense') await env.DB.prepare("UPDATE ledger_expense_rows SET state = 'linked', reason = '', updatedAt = ?2 WHERE entryId = ?1 AND state = 'ignored'").bind(row.id, now).run();
  // 결정을 복구하면, 삭제 때 되살아났던 이전 결정을 다시 "대체됨"으로 돌려놓는다
  if (b.kind === 'decisions' && row.supersedesId) await env.DB.prepare(`UPDATE decisions SET state = 'superseded', updatedAt = ?2 WHERE id = ?1 AND state = 'active' AND deletedAt IS NULL`).bind(row.supersedesId, now).run();
  await audit(env, s.email, 'restore', k.table, row.id);
  return json({ ok: true });
}

/**
 * 폴더 복구: 이 폴더와, 이 폴더를 「안의 것까지 모두 삭제」할 때 함께 지워진 폴더·파일(deletedWith = 이 폴더 id)을 한꺼번에 되돌린다.
 * 위 폴더가 지워졌거나 없거나, 되돌리면 5단계를 넘으면 맨 위(최상위)에 복구한다. 위 폴더가 있으면 그 폴더의 캠프·유형을 아래에 다시 적용한다.
 */
async function restoreFolder(env, s, row, now) {
  const live = (await env.DB.prepare('SELECT id, parentId, campId, typeId FROM file_folders WHERE deletedAt IS NULL').all()).results;
  const together = (await env.DB.prepare('SELECT id, parentId FROM file_folders WHERE deletedWith = ?1').bind(row.id).all()).results;
  const restrictedN = (await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE deletedWith = ?1 AND restricted = 1').bind(row.id).first()).n;
  if (restrictedN > 0 && !s.perms.moneyWrite) return json({ error: '금액 자료가 들어 있어서 복구할 수 없어요. 예산·장부 수정 권한이 있는 사람에게 요청해 주세요.' }, 403);
  const idx = buildIndex([...live, { id: row.id, parentId: row.parentId }, ...together]);
  let parent = row.parentId && live.find((x) => x.id === row.parentId) ? row.parentId : null;
  if (parent && depthOf(buildIndex(live), parent) + heightOf(idx, row.id) > MAX_DEPTH) parent = null;
  const stmts = [
    env.DB.prepare('UPDATE file_folders SET deletedAt = NULL, deletedWith = NULL, parentId = ?2, updatedAt = ?3 WHERE id = ?1').bind(row.id, parent, now),
    env.DB.prepare('UPDATE file_folders SET deletedAt = NULL, deletedWith = NULL, updatedAt = ?2 WHERE deletedWith = ?1').bind(row.id, now),
    env.DB.prepare('UPDATE files SET deletedAt = NULL, deletedWith = NULL, updatedAt = ?2 WHERE deletedWith = ?1').bind(row.id, now),
  ];
  if (parent) { const par = live.find((x) => x.id === parent); stmts.push(env.DB.prepare(`WITH RECURSIVE sub(id) AS (SELECT id FROM file_folders WHERE id = ?1 UNION SELECT d.id FROM file_folders d JOIN sub ON d.parentId = sub.id WHERE d.deletedAt IS NULL) UPDATE file_folders SET campId = ?2, typeId = ?3 WHERE id IN (SELECT id FROM sub)`).bind(row.id, par.campId || null, par.typeId || null)); }
  await env.DB.batch(stmts);
  return null;
}
