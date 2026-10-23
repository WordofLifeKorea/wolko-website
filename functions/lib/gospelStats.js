/**
 * 복음 통계 — "WOLKO Monthly Gospel Outreach Report"(월간 보고서) 항목 정의 · 검증 · 집계.
 *
 * 보고 한 건 = (달, 보고자 계정, 개인 또는 팀 한 단위) 하나. 같은 단위·같은 달에 다시 저장하면 그 보고를 고친다.
 * 팀으로 낸 숫자는 팀원이 따로 내지 않는 것을 전제로 하므로, 합계는 보고 건수를 그대로 더한다(중복 계산 방지는 보고 단위로 한다).
 * 위치(location)는 보고서의 "Jeju or Mainland" — 월코(본토) / 제주를 따로 집계하고 합쳐서도 본다.
 *
 * 저장소(CAMP_KV): gospel:rep:{YYYY-MM}:{id}  — id 는 계정·단위로 정한 짧은 해시(같은 단위는 같은 키)
 */
const L = (ko, en) => ({ ko, en });

export const GOSPEL_SECTIONS = [
  {
    id: 'personal', title: L('개인 전도', 'Personal Evangelism'),
    fields: [
      { id: 'preEvangelism', label: L('프리 에반젤리즘 — 복음 대화로 이어지길 바라며 의도적으로 영적 대화를 나눈 사람', 'Pre-Evangelism (Till the Soil) — people you had intentional spiritual conversations with, hoping to lead to a Gospel conversation'), short: L('영적 대화', 'Spiritual conversations') },
      { id: 'evangelism', label: L('전도 — 일대일 또는 소그룹에서 직접 복음을 전한 사람 (고전 15:1–4)', 'Evangelism (Plant the Seed) — people you personally shared the Gospel with, one-on-one or in a small group (1CO 15:1–4)'), short: L('복음 전한 사람', 'Gospel shared') },
      { id: 'salvation', label: L('구원 — 이 복음 대화를 통해 예수님을 믿는다고 고백한 사람', 'Salvation (Reap the Harvest) — people who indicated they believed in Jesus Christ for salvation through these Gospel conversations'), short: L('구원', 'Salvations') },
      { id: 'literature', label: L('복음 전도지 — 복음 대화 없이 나눠 준 전도지 등 자료의 수', 'Gospel Literature — tracts or similar literature distributed without a Gospel conversation'), short: L('전도지', 'Literature') },
      { id: 'social', label: L('SNS 전도 — 위에서 세지 않은 전도 게시물·릴스·영상 등으로 도달한 사람', 'Evangelistic Social Media — people reached through evangelistic posts, reels, videos or other content not counted above'), short: L('SNS 도달', 'Social media reach') },
    ],
  },
  {
    id: 'camps', title: L('캠프', 'Camps'),
    fields: [
      { id: 'campCount', label: L('캠프 횟수 — 이번 달에 열린 캠프 수(하루 이상)', 'Camps — how many camps were held this month (one day or longer)'), short: L('캠프 횟수', 'Camps held') },
      { id: 'campAttendance', label: L('캠프 참석 — 이 캠프들에 참석한 캠퍼와 캠프 크루', 'Camp Attendance — campers and camp crew members who attended these camps'), short: L('캠프 참석', 'Camp attendance') },
      { id: 'campSalvations', label: L('구원 — 캠프에서 예수님을 믿는다고 고백한 사람', 'Salvations — people who indicated they believed in Jesus for salvation during these camps'), short: L('캠프 구원', 'Camp salvations') },
      { id: 'campDedications', label: L('헌신 — 캠프에서 삶을 예수님께 헌신한 사람', 'Dedications — people who dedicated their life to Jesus during these camps'), short: L('캠프 헌신', 'Camp dedications') },
    ],
  },
  {
    id: 'events', title: L('전도 행사', 'Evangelistic Events'),
    fields: [
      { id: 'eeAttendance', label: L('행사 참석 — 복음을 전한 전도 행사(스포츠, 수련회, 세미나, 지역 교회 사역 등)에 참석한 사람', 'EE Attendance — people who attended evangelistic events (sports, retreats, seminars, local church ministries, etc.) where you and/or your team shared the Gospel'), short: L('행사 참석', 'Event attendance') },
      { id: 'eeSalvations', label: L('구원 — 이 행사에서 예수님을 믿는다고 고백한 사람', 'Salvations — people who indicated they believed in Jesus for salvation during these events'), short: L('행사 구원', 'Event salvations') },
      { id: 'eeDedications', label: L('헌신 — 이 행사에서 삶을 예수님께 헌신한 사람', 'Dedications — people who dedicated their life to Jesus during these events'), short: L('행사 헌신', 'Event dedications') },
    ],
  },
];

export const GOSPEL_FIELDS = GOSPEL_SECTIONS.flatMap(section => section.fields.map(field => ({ ...field, section: section.id })));
export const GOSPEL_FIELD_IDS = GOSPEL_FIELDS.map(field => field.id);
export const LOCATIONS = ['mainland', 'jeju'];
export const SCOPES = ['individual', 'team'];
export const REPORT_PREFIX = 'gospel:rep:';
export const MAX_VALUE = 1_000_000;
export const MONTHS_BACK = 12;

/** 보고서에서 한 사람이 볼 수 있는 모든 항목의 합계가 0 인 빈 집계 */
export const emptyTotals = () => Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 한국 시간 기준 이번 달 'YYYY-MM' */
export function currentMonthKst(now = Date.now()) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 7);
}

/** 'YYYY-MM' 에서 n 달 전/후 */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** 보고할 수 있는 달: 이번 달부터 12개월 전까지(미래 달은 안 된다) */
export function reportableMonth(month, now = Date.now()) {
  if (!MONTH_RE.test(String(month || ''))) return false;
  const current = currentMonthKst(now);
  return month <= current && month >= shiftMonth(current, -MONTHS_BACK);
}

/** 화면이 보낸 값에서 정의된 항목만 0 이상의 정수로 정리한다(비어 있으면 0) */
export function cleanValues(raw) {
  const out = {};
  for (const id of GOSPEL_FIELD_IDS) {
    const text = String(raw?.[id] ?? '').replace(/[,\s]/g, '');
    if (text === '') { out[id] = 0; continue; }
    const n = Number(text);
    if (!Number.isInteger(n) || n < 0 || n > MAX_VALUE) throw new Error(`INVALID:${id}`);
    out[id] = n;
  }
  return out;
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** 같은 (계정, 개인/팀, 팀 이름) 은 같은 id — 달 안에서 한 단위가 한 건이 되게 한다 */
export async function unitId(email, scope, teamName) {
  const source = `${String(email).toLowerCase()}|${scope}|${scope === 'team' ? teamName.toLowerCase() : ''}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const reportKey = (month, id) => `${REPORT_PREFIX}${month}:${id}`;

export async function loadMonth(env, month) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: `${REPORT_PREFIX}${month}:`, ...(cursor ? { cursor } : {}), limit: 1000 });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const items = await Promise.all(keys.map(key => env.CAMP_KV.get(key, 'json')));
  return items.filter(Boolean);
}

/** 보고 목록 → { all, mainland, jeju } 합계 + 건수 */
export function summarize(reports) {
  const out = { all: emptyTotals(), mainland: emptyTotals(), jeju: emptyTotals(), counts: { all: 0, mainland: 0, jeju: 0, individual: 0, team: 0 } };
  for (const report of reports) {
    const place = report.location === 'jeju' ? 'jeju' : 'mainland';
    for (const id of GOSPEL_FIELD_IDS) {
      const n = Number(report.values?.[id]) || 0;
      out.all[id] += n; out[place][id] += n;
    }
    out.counts.all++; out.counts[place]++; out.counts[report.scope === 'team' ? 'team' : 'individual']++;
  }
  return out;
}

// CSV — 엑셀에서 수식으로 읽히지 않게 = + - @ 로 시작하는 글자는 앞에 ' 를 붙인다
const csvCell = value => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function toCsv(month, reports) {
  const head = ['month', 'location', 'type', 'team', 'name', 'email', ...GOSPEL_FIELD_IDS];
  const rows = reports.map(r => [month, r.location === 'jeju' ? 'Jeju' : 'Mainland', r.scope, r.teamName || '', r.name || '', r.email, ...GOSPEL_FIELD_IDS.map(id => r.values?.[id] ?? 0)]);
  return '﻿' + [head, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
