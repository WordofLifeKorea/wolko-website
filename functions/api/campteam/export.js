import { campSession, json, needLogin, needPerm, noDb } from '../../lib/campteamAuth.js';
import { nowIso } from '../../lib/campteamDb.js';

/**
 * 관리자 전용 전체 내보내기(백업). ?format=json (전체) | ?format=csv&table=이름 (표 하나)
 * 파일 "본문"은 포함하지 않는다(파일 기록과 버전 정보만). 파일 본문은 NAS/R2 에 그대로 있다.
 * TV 열쇠(token)는 내보내지 않는다.
 */
const TABLES = ['camp_members', 'camp_types', 'camps', 'tasks', 'events', 'checklist_templates', 'checklist_items', 'meetings', 'agenda_items', 'decisions', 'meeting_files', 'meeting_texts',
  'files', 'file_versions', 'file_links', 'budget_lines', 'budget_targets', 'notices', 'tv_layout', 'home_layout', 'glossary', 'ai_drafts', 'ledger_periods', 'ledger_categories', 'ledger_entries', 'ledger_plan', 'ledger_imports', 'ledger_reconcile', 'ledger_expense_rules', 'ledger_expense_rows', 'calc_scenarios', 'announcements', 'announcement_recipients', 'member_perms', 'member_aliases', 'file_public', 'camp_order', 'space_layout', 'notify_settings', 'notify_prefs', 'mail_log', 'audit_log'];
const csvCell = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };

async function dump(env, table) {
  try { return (await env.DB.prepare(`SELECT * FROM ${table}${table === 'audit_log' ? ' ORDER BY at DESC LIMIT 5000' : ''}`).all()).results; }
  catch { return null; } // 아직 만들어지지 않은 표는 건너뛴다
}
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.manageMembers) return needPerm('관리자만 할 수 있습니다.');
  const p = new URL(request.url).searchParams, stamp = nowIso().slice(0, 10);
  if (p.get('format') === 'csv') {
    const t = p.get('table'); if (!TABLES.includes(t)) return json({ error: '표 이름이 올바르지 않습니다.', tables: TABLES }, 400);
    const rows = await dump(env, t); if (!rows) return json({ error: '이 표는 아직 없어요.' }, 404);
    const cols = rows.length ? Object.keys(rows[0]) : [];
    const body = '﻿' + [cols, ...rows.map(r => cols.map(c => r[c]))].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="campteam-${t}-${stamp}.csv"`, 'Cache-Control': 'no-store' } });
  }
  const data = {};
  for (const t of TABLES) { const rows = await dump(env, t); if (rows) data[t] = rows; }
  return new Response(JSON.stringify({ exportedAt: nowIso(), exportedBy: s.email, note: '파일 본문은 포함되지 않습니다(자료실 저장소에 그대로 있음). TV 열쇠는 포함되지 않습니다.', tables: data }, null, 1),
    { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="campteam-backup-${stamp}.json"`, 'Cache-Control': 'no-store' } });
}
