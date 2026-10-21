/** 시트에서 내려받은 CSV 를 업무로 바꾸기 위한 도우미 (Google 접속 없이 동작) */
import { TASK_STATUSES, TASK_PRIORITIES, isDate } from './campteamDb.js';

/** 따옴표·줄바꿈·BOM 을 처리하는 간단한 CSV 읽기 → 2차원 배열 */
export function parseCsv(input) {
  const s = String(input || '').replace(/^\uFEFF/, '');
  // 구분자 자동 판별: 첫 줄에 탭이 쉼표보다 많으면 탭(시트에서 셀을 그대로 복사해 붙여넣은 경우)
  const first = s.split(/\r?\n/, 1)[0] || '', delim = (first.split('\t').length > first.split(',').length) ? '\t' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const byLower = (list) => new Map(list.map(v => [norm(v), v]));
const STATUS_MAP = byLower(TASK_STATUSES), PRIORITY_MAP = byLower(TASK_PRIORITIES);

export function parseLooseDate(v) {
  const t = String(v ?? '').trim(); if (!t) return { date: null };
  let m;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t))) return fix(m[1], m[2], m[3], t);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return fix(m[3], m[1], m[2], t); // M/D/YYYY (미국식)
  return { date: null, warn: `날짜를 읽지 못했어요: ${t}` };
}
function fix(y, mo, d, raw) {
  const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isDate(date) ? { date } : { date: null, warn: `날짜가 올바르지 않아요: ${raw}` };
}

/** 캠프 이름 글자를 기존 캠프와 맞춰 본다. 확실할 때만 연결하고, 애매하면 연결하지 않고 알려준다. */
export function matchCamp(text, camps, types) {
  const t = norm(text); if (!t) return { campId: null };
  const exact = camps.filter(c => norm(c.nameKo) === t || norm(c.nameEn) === t);
  if (exact.length === 1) return { campId: exact[0].id };
  const type = types.filter(x => norm(x.nameKo) === t || norm(x.nameEn) === t);
  if (type.length === 1) {
    const inType = camps.filter(c => c.typeId === type[0].id);
    const live = inType.filter(c => c.status === 'planning' || c.status === 'active');
    const pick = live.length ? live : inType;
    if (pick.length === 1) return { campId: pick[0].id };
  }
  return { campId: null, unmatched: String(text).trim() };
}

/** CSV 전체 → { rows:[{title,ownerName,dueDate,status,priority,notes,campText,campId,sourceKey,warn,skip}], unmatched:[...], warnings:[...] } */
export function planCsvImport(csv, { camps, types, existing }) {
  const table = parseCsv(csv);
  if (table.length < 2) return { error: '내용이 비어 있어요. 시트에서 CSV로 내려받은 전체 내용을 붙여넣어 주세요.' };
  const head = table[0].map(norm), col = name => head.indexOf(name);
  if (col('task') < 0) return { error: '"Task" 열을 찾지 못했어요. 첫 줄(머리글)까지 포함해서 붙여넣어 주세요.' };
  const seen = new Set(existing.map(e => `${e.campId || ''}|${norm(e.title)}`));
  const unmatched = new Set(), warnings = [], rows = [];
  for (const r of table.slice(1)) {
    const g = n => (col(n) >= 0 ? String(r[col(n)] ?? '').trim() : '');
    const title = g('task'); if (!title) continue;
    const warn = [];
    const st = g('status'), status = !st ? 'Not Started' : (STATUS_MAP.get(norm(st)) || (warn.push(`상태 "${st}" → Not Started`), 'Not Started'));
    const pr = g('priority'), priority = !pr ? 'Medium' : (PRIORITY_MAP.get(norm(pr)) || (warn.push(`우선순위 "${pr}" → Medium`), 'Medium'));
    const d = parseLooseDate(g('due')); if (d.warn) warn.push(d.warn);
    const campText = g('camp'), m = matchCamp(campText, camps, types); if (m.unmatched) unmatched.add(m.unmatched);
    const key = `${m.campId || ''}|${norm(title)}`, skip = seen.has(key); seen.add(key);
    rows.push({ title: title.slice(0, 200), ownerName: g('owner').slice(0, 60), dueDate: d.date, status, priority, notes: g('notes').slice(0, 1000), campText, campId: m.campId,
      sourceKey: `csv:${norm(title)}|${norm(campText)}`, warn, skip });
    if (rows.length > 500) return { error: '한 번에 500개까지만 가져올 수 있어요.' };
  }
  return { rows, unmatched: [...unmatched], warnings };
}
