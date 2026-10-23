import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { buildSheetPlan, sheetsConfig, readTab, applyPlan } from '../../lib/campteamSheets.js';

async function plan(env) {
  const tasks = (await env.DB.prepare(`SELECT k.id, k.title, k.ownerName, k.dueDate, k.status, k.priority, k.notes, k.deletedAt, COALESCE(ct.nameEn, ct.nameKo, '') AS campLabel
    FROM tasks k LEFT JOIN camps c ON c.id = k.campId LEFT JOIN camp_types ct ON ct.id = c.typeId ORDER BY k.createdAt`).all()).results
    .map(t => ({ ...t, deleted: !!t.deletedAt, campLabel: t.campLabel || '' }));
  const cfg = sheetsConfig(env);
  const values = cfg.configured ? await readTab(env) : null;
  return { cfg, plan: buildSheetPlan(tasks, values) };
}

/** 관리자 전용 — 미리보기: 시트에 무엇을 쓰게 될지 계획만 보여준다 (아무것도 쓰지 않는다) */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.manageMembers) return needPerm('관리자만 할 수 있습니다.');
  try {
    const { cfg, plan: p } = await plan(env);
    return json({ configured: cfg.configured, writeEnabled: cfg.writeEnabled, tab: cfg.tab, plan: { ...p, updates: p.updates.slice(0, 200), appends: p.appends.slice(0, 200).map(a => ({ id: a.id, row: a.row })) },
      counts: { updates: p.updates.length, appends: p.appends.length, adopted: p.adopted, retired: p.retired, unchanged: p.unchanged, legacyRows: p.legacyRows } });
  } catch (e) { return json({ error: '시트를 읽지 못했어요. 시트 공유 권한을 확인해주세요.', code: 'sheets_read' }, 502); }
}

/** 실제로 시트에 쓰기 — 서버 설정(CAMPTEAM_SHEETS_WRITE=1)이 켜져 있고 { confirm: true } 를 보낼 때만 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.manageMembers) return needPerm('관리자만 할 수 있습니다.');
  const cfg = sheetsConfig(env);
  if (!cfg.configured) return badRequest('시트 연결 설정(CAMPTEAM_SHEET_ID, 서비스 계정)이 없습니다.');
  if (!cfg.writeEnabled) return json({ error: '시트 쓰기가 꺼져 있어요(CAMPTEAM_SHEETS_WRITE). 미리보기만 가능해요.', code: 'write_disabled' }, 403);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  if (b.confirm !== true) return badRequest('쓰기를 확인(confirm)해주세요.');
  try {
    const { plan: p } = await plan(env);
    if (p.blocked) return json({ error: p.warnings.join(' '), code: 'blocked' }, 409);
    const out = await applyPlan(env, p);
    await audit(env, s.email, 'sheets_sync', 'sheet', cfg.sheetId, `updated ${out.updated}, appended ${out.appended}`);
    return json(out);
  } catch (e) { return json({ error: '시트에 쓰지 못했어요. 시트 편집 권한을 확인해주세요.', code: 'sheets_write' }, 502); }
}
