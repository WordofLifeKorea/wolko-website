/**
 * 포털 → Google Sheets 미러링 (Tasks 탭).
 * 기본은 "미리보기"만: 어느 칸에 무엇을 쓸지 계획만 만든다. 실제 쓰기는 서버 설정(CAMPTEAM_SHEETS_WRITE=1)과 관리자 확인이 모두 있을 때만.
 * 대시보드(Apps Script)가 읽는 열 이름(Task, Owner, Due, Status, Camp, Priority, Notes)을 그대로 쓰고, 끝에 "Task ID" 열만 추가로 필요하다.
 * "Task ID" 가 없는 기존 줄은 절대 건드리지 않는다. 시트 줄 삭제는 하지 않는다(포털에서 삭제한 업무는 Not Applicable 로 표시).
 */
import { getAccessToken } from './googleSheets.js';

export const COLS = { title: 'Task', owner: 'Owner', due: 'Due', status: 'Status', camp: 'Camp', priority: 'Priority', notes: 'Notes' };
export const ID_HEADER = 'Task ID', SOURCE_HEADER = 'Source';

export function taskCells(t) {
  return { [COLS.title]: t.title, [COLS.owner]: t.ownerName || '', [COLS.due]: t.dueDate || '', [COLS.status]: t.status, [COLS.camp]: t.campLabel || '',
    [COLS.priority]: t.priority, [SOURCE_HEADER]: 'Portal', [COLS.notes]: t.notes || '', [ID_HEADER]: t.id };
}
const colLetter = (n) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
const normTitle = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** tasks: 포털 업무 [{id,title,ownerName,dueDate,status,priority,notes,campLabel,deleted}], sheetValues: 시트에서 읽은 2차원 배열(첫 줄이 머리글) 또는 null */
export function buildSheetPlan(tasks, sheetValues) {
  const plan = { blocked: false, warnings: [], updates: [], appends: [], retired: 0, unchanged: 0, legacyRows: 0, adopted: 0, headers: [] };
  const values = Array.isArray(sheetValues) ? sheetValues : [];
  const headers = (values[0] || []).map(h => String(h).trim()); plan.headers = headers;
  const idCol = headers.indexOf(ID_HEADER);
  if (!headers.length) plan.warnings.push('시트에 연결되어 있지 않아서, 있다고 가정하고 계획만 보여드려요.');
  else if (idCol < 0) { plan.blocked = true; plan.warnings.push(`시트 Tasks 탭 맨 오른쪽에 "${ID_HEADER}" 열(머리글)을 먼저 추가해야 연동할 수 있어요.`); }
  const existing = new Map(), legacy = new Map(), titleCol = headers.indexOf(COLS.title);
  values.slice(1).forEach((row, i) => {
    const id = idCol >= 0 ? String(row[idCol] || '').trim() : '';
    if (id) existing.set(id, { rowNo: i + 2, row });
    else if (row.some(v => String(v).trim())) {
      plan.legacyRows++;
      const k = titleCol >= 0 ? normTitle(row[titleCol]) : ''; if (k) legacy.set(k, [...(legacy.get(k) || []), { rowNo: i + 2, row }]);
    }
  });
  const useHeaders = headers.length ? headers : [...Object.values(COLS), SOURCE_HEADER, ID_HEADER];
  for (const t of tasks) {
    const cells = taskCells(t.deleted ? { ...t, status: 'Not Applicable' } : t); let found = existing.get(t.id), changed = 0;
    if (!found && !t.deleted && idCol >= 0) {
      // 기존 시트 줄(Task ID 없음) 중 이름이 같은 줄이 딱 하나면 새로 추가하지 않고 그 줄에 ID만 연결한다
      const cands = (legacy.get(normTitle(t.title)) || []).filter(c => !c.claimed);
      if (cands.length === 1) { found = cands[0]; found.claimed = true; plan.adopted = (plan.adopted || 0) + 1;
        plan.updates.push({ id: t.id, rowNo: found.rowNo, col: idCol, cell: `${colLetter(idCol)}${found.rowNo}`, header: ID_HEADER, from: '', to: t.id });
        continue; } // 연결하는 순간에는 ID 칸만 쓴다. 다른 칸은 다음 동기화부터 ID 로 찾아서 바뀐 것만 고친다
      else if (cands.length > 1) { plan.warnings.push(`같은 이름의 줄이 시트에 여러 개라 연결하지 못했어요(건드리지 않음): ${t.title}`); continue; }
    }
    if (!found) { if (!t.deleted) plan.appends.push({ id: t.id, row: useHeaders.map(h => cells[h] ?? '') }); continue; }
    for (const h of [COLS.title, COLS.owner, COLS.due, COLS.status, COLS.camp, COLS.priority, COLS.notes]) {
      const ci = headers.indexOf(h); if (ci < 0) continue;
      const cur = found.row[ci]; // Due 는 시트가 날짜로 돌려줄 수 있어 앞 10글자만 비교
      const eq = h === COLS.due ? same(String(cur ?? '').slice(0, 10), cells[h]) || same(cur, cells[h]) : same(cur, cells[h]);
      if (!eq) { plan.updates.push({ id: t.id, rowNo: found.rowNo, col: ci, cell: `${colLetter(ci)}${found.rowNo}`, header: h, from: String(cur ?? ''), to: String(cells[h] ?? '') }); changed++; }
    }
    if (t.deleted && changed) plan.retired++;
    if (!changed) plan.unchanged++;
  }
  return plan;
}

export function sheetsConfig(env) {
  const tab = env.CAMPTEAM_SHEET_TAB || 'Tasks';
  return { configured: !!(env.CAMPTEAM_SHEET_ID && env.GOOGLE_SERVICE_ACCOUNT_JSON), sheetId: env.CAMPTEAM_SHEET_ID, tab, writeEnabled: env.CAMPTEAM_SHEETS_WRITE === '1' };
}
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
async function auth(env) { return getAccessToken(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON)); }
export async function readTab(env) {
  const c = sheetsConfig(env), token = await auth(env);
  const res = await fetch(`${API}/${c.sheetId}/values/${encodeURIComponent(c.tab)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets read failed (${res.status})`);
  return (await res.json()).values || [];
}
export async function applyPlan(env, plan) {
  const c = sheetsConfig(env), token = await auth(env), headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (plan.updates.length) {
    const data = plan.updates.map(u => ({ range: `${c.tab}!${u.cell}`, values: [[u.to]] }));
    const res = await fetch(`${API}/${c.sheetId}/values:batchUpdate`, { method: 'POST', headers, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) });
    if (!res.ok) throw new Error(`Sheets update failed (${res.status})`);
  }
  if (plan.appends.length) {
    const res = await fetch(`${API}/${c.sheetId}/values/${encodeURIComponent(c.tab)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', headers, body: JSON.stringify({ values: plan.appends.map(a => a.row) }) });
    if (!res.ok) throw new Error(`Sheets append failed (${res.status})`);
  }
  return { updated: plan.updates.length, appended: plan.appends.length };
}
