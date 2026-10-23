/**
 * 복음 통계 — 엑셀(.xlsx) 보고서. CSV 원본과 달리 제목·핵심 지표·구역별 표·최근 6개월 추이를 보기 좋게 꾸민 파일로 내보낸다.
 * 시트: 월간 요약 / 최근 6개월 / 보고 목록(이름·이메일이 들어 있으니 이 파일은 마스터·관리자만 받는다)
 */
import { GOSPEL_SECTIONS, GOSPEL_FIELDS } from './gospelStats.js';
import { buildXlsx } from './xlsxLite.js';

const BRAND = '0F6B84', BRAND_DARK = '0B4F63', BAND = 'DCEEF2', SOFT = 'F2F8FA', LINE = 'C9DCE2', INK = '1B2F38', MUTED = '5F7680', ZERO = '#,##0;-#,##0;"–"';
const bi = (ko, en) => `${ko} / ${en}`;
const monthTitle = month => { const [y, m] = month.split('-'); return `${y}년 ${Number(m)}월`; };

const sumSalv = x => (x.salvation || 0) + (x.campSalvations || 0) + (x.eeSalvations || 0);
const sumDed = x => (x.campDedications || 0) + (x.eeDedications || 0);
const sumReach = x => (x.campAttendance || 0) + (x.eeAttendance || 0);
const METRICS = [
  { ko: '복음을 들은 인원', en: 'People who heard the Gospel', get: x => x.evangelism || 0 },
  { ko: '구원 고백(전체)', en: 'Salvations (all)', get: sumSalv },
  { ko: '헌신(전체)', en: 'Dedications (all)', get: sumDed },
  { ko: '캠프·월코 행사 참석 인원', en: 'Camp & WOLKO event attendance', get: sumReach },
];
const PLACES = [['mainland', '평택', 'Pyeongtaek'], ['jeju', '제주', 'Jeju'], ['all', '통합', 'Combined']];

const S = {
  title: { bold: true, size: 18, color: 'FFFFFF', fill: BRAND_DARK, h: 'left', v: 'center' },
  subtitle: { size: 11, color: MUTED, h: 'left' },
  head: { bold: true, color: 'FFFFFF', fill: BRAND, h: 'center', v: 'center', wrap: true, border: BRAND_DARK },
  headLeft: { bold: true, color: 'FFFFFF', fill: BRAND, h: 'left', v: 'center', wrap: true, border: BRAND_DARK },
  band: { bold: true, color: BRAND_DARK, fill: BAND, h: 'left', border: LINE },
  label: { color: INK, h: 'left', wrap: true, border: LINE },
  labelBold: { bold: true, color: INK, h: 'left', wrap: true, border: LINE },
  sect: { color: MUTED, h: 'left', border: LINE },
  num: { color: INK, h: 'right', num: ZERO, border: LINE },
  numTotal: { bold: true, color: BRAND_DARK, fill: SOFT, h: 'right', num: ZERO, border: LINE },
  kpi: { bold: true, size: 13, color: BRAND_DARK, h: 'right', num: ZERO, border: LINE },
  kpiTotal: { bold: true, size: 13, color: BRAND_DARK, fill: SOFT, h: 'right', num: ZERO, border: LINE },
  note: { italic: true, size: 10, color: MUTED, h: 'left', wrap: true, v: 'top' },
  cell: { color: INK, h: 'left', border: LINE },
  cellAlt: { color: INK, fill: SOFT, h: 'left', border: LINE },
  numRow: { color: INK, h: 'right', num: ZERO, border: LINE },
  numRowAlt: { color: INK, fill: SOFT, h: 'right', num: ZERO, border: LINE },
};

function summarySheet(month, summary) {
  const rows = [], merges = [], heights = {};
  const c = summary.counts;
  rows.push([{ v: `WOLKO  월간 복음 전도 보고  ·  Monthly Gospel Outreach Report`, s: S.title }, { s: S.title }, { s: S.title }, { s: S.title }, { s: S.title }]);
  merges.push('A1:E1'); heights[1] = 38;
  rows.push([{ v: `${monthTitle(month)} (${month})   ·   보고 ${c.all}건 (개인 ${c.individual} · 팀 ${c.team})   ·   평택 ${c.mainland}건 · 제주 ${c.jeju}건`, s: S.subtitle }]);
  merges.push('A2:E2'); heights[2] = 24;
  rows.push([]);
  rows.push([{ v: bi('구분', 'Section'), s: S.head }, { v: bi('항목', 'Item'), s: S.headLeft }, ...PLACES.map(([, ko, en]) => ({ v: `${ko}\n${en}`, s: S.head }))]);
  heights[4] = 36;
  // 핵심 지표
  rows.push([{ v: bi('핵심 지표', 'Key figures'), s: S.band }, { s: S.band }, { s: S.band }, { s: S.band }, { s: S.band }]);
  merges.push(`A${rows.length}:E${rows.length}`);
  METRICS.forEach(metric => {
    rows.push([{ v: '', s: S.sect }, { v: bi(metric.ko, metric.en), s: S.labelBold }, ...PLACES.map(([id]) => ({ v: metric.get(summary[id]), s: id === 'all' ? S.kpiTotal : S.kpi }))]);
    heights[rows.length] = 26;
  });
  // 구역별 상세
  GOSPEL_SECTIONS.forEach(section => {
    rows.push([{ v: bi(section.title.ko, section.title.en), s: S.band }, { s: S.band }, { s: S.band }, { s: S.band }, { s: S.band }]);
    merges.push(`A${rows.length}:E${rows.length}`);
    section.fields.forEach(field => {
      rows.push([{ v: '', s: S.sect }, { v: bi(field.short.ko, field.short.en), s: S.label }, ...PLACES.map(([id]) => ({ v: summary[id][field.id] || 0, s: id === 'all' ? S.numTotal : S.num }))]);
      heights[rows.length] = 22;
    });
  });
  rows.push([]);
  rows.push([{ v: '※ 개인·팀 보고를 그대로 더한 합계입니다. 팀 보고에 포함된 사람은 개인 보고를 따로 내지 않는 것을 전제로 합니다. (0은 "–"로 표시)', s: S.note }]);
  merges.push(`A${rows.length}:E${rows.length}`); heights[rows.length] = 34;
  return { name: '월간 요약', cols: [16, 46, 13, 13, 13], rows, merges, rowHeights: heights, freezeRow: 4, landscape: false };
}

function trendSheet(trend) {
  const rows = [], merges = [], heights = {};
  const head1 = [{ v: bi('달', 'Month'), s: S.head }, { v: bi('보고 건수', 'Reports'), s: S.head }];
  PLACES.forEach(([, ko, en]) => { head1.push({ v: `${ko} ${en}`, s: S.head }, { s: S.head }, { s: S.head }, { s: S.head }); });
  rows.push([{ v: '최근 6개월 추이  ·  Last 6 months', s: S.title }, ...Array(13).fill({ s: S.title })]);
  merges.push('A1:N1'); heights[1] = 34;
  rows.push(head1);
  merges.push('A2:A3', 'B2:B3', 'C2:F2', 'G2:J2', 'K2:N2');
  const head2 = [{ s: S.head }, { s: S.head }];
  for (let i = 0; i < 3; i++) METRICS.forEach(m => head2.push({ v: `${m.ko}\n${m.en}`, s: S.head }));
  rows.push(head2); heights[2] = 24; heights[3] = 54;
  trend.forEach((entry, i) => {
    const alt = i % 2 === 1;
    const row = [{ v: monthTitle(entry.month), s: alt ? S.cellAlt : S.cell }, { v: entry.counts?.all || 0, s: alt ? S.numRowAlt : S.numRow }];
    PLACES.forEach(([id]) => METRICS.forEach(m => row.push({ v: m.get(entry[id] || {}), s: alt ? S.numRowAlt : S.numRow })));
    rows.push(row); heights[rows.length] = 24;
  });
  return { name: '최근 6개월', cols: [14, 10, ...Array(12).fill(14)], rows, merges, rowHeights: heights, freezeRow: 3, landscape: true };
}

function reportsSheet(reports) {
  const fixed = [['위치', 'Place', 10], ['구분', 'Type', 9], ['팀', 'Team', 18], ['이름', 'Name', 14], ['이메일', 'Email', 26], ['최종 수정', 'Updated', 17]];
  const head = [...fixed.map(([ko, en]) => ({ v: `${ko}\n${en}`, s: S.head })), ...GOSPEL_FIELDS.map(f => ({ v: `${f.short.ko}\n${f.short.en}`, s: S.head }))];
  const sorted = reports.slice().sort((a, b) => (a.location === 'jeju') - (b.location === 'jeju') || String(a.teamName || a.name || '').localeCompare(String(b.teamName || b.name || '')));
  const rows = [head];
  sorted.forEach((r, i) => {
    const alt = i % 2 === 1, text = alt ? S.cellAlt : S.cell, num = alt ? S.numRowAlt : S.numRow;
    rows.push([
      { v: r.location === 'jeju' ? '제주' : '평택', s: text }, { v: r.scope === 'team' ? '팀' : '개인', s: text }, { v: r.teamName || '', s: text }, { v: r.name || '', s: text }, { v: r.email || '', s: text },
      { v: String(r.updatedAt || '').slice(0, 16).replace('T', ' '), s: text },
      ...GOSPEL_FIELDS.map(f => ({ v: Number(r.values?.[f.id]) || 0, s: num })),
    ]);
  });
  const lastCol = fixed.length + GOSPEL_FIELDS.length;
  return { name: '보고 목록', cols: [...fixed.map(f => f[2]), ...GOSPEL_FIELDS.map(() => 13)], rows, rowHeights: { 1: 54 }, freezeRow: 1, filter: `A1:${colName(lastCol - 1)}${Math.max(rows.length, 2)}`, landscape: true };
}
function churchSheet(reports) {
  const head = [['월', 'Month', 10], ['위치', 'Place', 9], ['교회', 'Church', 26], ['행사', 'Event', 26], ['날짜', 'Date', 12], ['학생', 'Students', 10], ['구원', 'Salvations', 10], ['헌신', 'Dedications', 10], ['보고자 / 팀', 'Reporter / Team', 22], ['메모', 'Note', 36]];
  const rows = [head.map(([ko, en]) => ({ v: `${ko}\n${en}`, s: S.head }))];
  const items = [];
  reports.forEach(r => (r.churchEntries || []).forEach(e => items.push({ r, e })));
  items.sort((a, b) => String(a.e.churchName).localeCompare(String(b.e.churchName), 'ko') || String(a.e.date).localeCompare(String(b.e.date)));
  items.forEach(({ r, e }, i) => {
    const alt = i % 2 === 1, text = alt ? S.cellAlt : S.cell, num = alt ? S.numRowAlt : S.numRow;
    rows.push([{ v: r.month || '', s: text }, { v: r.location === 'jeju' ? '제주' : '평택', s: text }, { v: e.churchName, s: text }, { v: e.event || '', s: text }, { v: e.date || '', s: text },
      { v: e.students || 0, s: num }, { v: e.salvations || 0, s: num }, { v: e.dedications || 0, s: num }, { v: r.scope === 'team' ? (r.teamName || r.name || '') : (r.name || ''), s: text }, { v: e.note || '', s: text }]);
  });
  return { name: '교회별 기록', cols: head.map(h => h[2]), rows, rowHeights: { 1: 40 }, freezeRow: 1, filter: `A1:J${Math.max(rows.length, 2)}`, landscape: true };
}
function campAutoSheet(camps) {
  const head = [['캠프', 'Camp', 40], ['위치', 'Place', 9], ['확정 캠퍼', 'Confirmed campers', 14], ['스태프', 'Staff', 10], ['참석 합계', 'Attendance', 12], ['구원', 'Salvations', 10], ['헌신', 'Dedications', 10]];
  const rows = [head.map(([ko, en]) => ({ v: `${ko}\n${en}`, s: S.head }))];
  camps.forEach((c, i) => {
    const alt = i % 2 === 1, text = alt ? S.cellAlt : S.cell, num = alt ? S.numRowAlt : S.numRow;
    rows.push([{ v: c.titleKo, s: text }, { v: c.location === 'jeju' ? '제주' : '평택', s: text }, { v: c.campers, s: num }, { v: c.staff, s: num }, { v: c.campers + c.staff, s: num }, { v: c.salvations, s: num }, { v: c.dedications, s: num }]);
  });
  rows.push([]);
  rows.push([{ v: '※ 잔금까지 마쳐 최종 확정된 캠퍼만 센 자동 집계입니다. 구원은 "캠프 후 구원" 기준이고, 스태프 인원은 관리자가 입력한 숫자입니다.', s: S.note }]);
  return { name: '캠프 자동 집계', cols: head.map(h => h[2]), rows, rowHeights: { 1: 40, [rows.length]: 34 }, merges: [`A${rows.length}:G${rows.length}`], freezeRow: 1, landscape: true };
}
const colName = i => { let n = i + 1, s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - m) / 26); } return s; };

/** month: 'YYYY-MM' · summary: summarize() 결과 · trend: [{ month, ...summarize }] · reports: 보고 원본 목록 */
export function buildGospelXlsx({ month, summary, trend = [], reports = [], camps = [] }) {
  const sheets = [summarySheet(month, summary)];
  if (camps.length) sheets.push(campAutoSheet(camps));
  if (trend.length) sheets.push(trendSheet(trend));
  if (reports.length) sheets.push(reportsSheet(reports));
  if (reports.some(r => (r.churchEntries || []).length)) sheets.push(churchSheet(reports.map(r => ({ ...r, month }))));
  return buildXlsx({ sheets, title: `WOLKO Monthly Gospel Outreach Report ${month}`, creator: 'WOLKO' });
}
