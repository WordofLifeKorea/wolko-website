/** 캠프 준비(진행표·준비물·연락처·시리즈) 정리 + 엑셀에서 복사한 진행표 읽기 + 폰 캘린더(ICS) 만들기 */
import { S, L, isDay, clock, pick } from './campteamCrud.js';

export const SUPPLY_STATUS = ['need', 'bought', 'ready', 'skip'];
export const CONTACT_KINDS = ['church', 'school', 'vendor', 'speaker', 'venue', 'other'];
export const SERIES_KINDS = ['church', 'school', 'other'];

async function campOk(env, id) { return !!(await env.DB.prepare('SELECT id FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(id).first()); }
export async function cleanTimeline(b, base, env) {
  const campId = base.campId || S(b.campId, 60); if (!campId || !(await campOk(env, campId))) return { error: '캠프를 찾지 못했어요.' };
  const dayDate = pick(b, base, 'dayDate', (x) => String(x || '').slice(0, 10)); if (!isDay(dayDate)) return { error: '날짜를 YYYY-MM-DD 로 입력해주세요.' };
  const title = pick(b, base, 'title', (x) => S(x, 120)); if (!title) return { error: '제목을 입력해주세요.' };
  const startTime = pick(b, base, 'startTime', clock), endTime = pick(b, base, 'endTime', clock);
  if (startTime && endTime && endTime < startTime) return { error: '끝나는 시간이 시작 시간보다 빨라요.' };
  const so = 'sortOrder' in b ? parseInt(b.sortOrder, 10) : base.sortOrder;
  return { v: { campId, dayDate, startTime, endTime, title, titleEn: pick(b, base, 'titleEn', (x) => S(x, 120)), place: pick(b, base, 'place', (x) => S(x, 80)), ownerName: pick(b, base, 'ownerName', (x) => S(x, 60)), notes: pick(b, base, 'notes', (x) => L(x, 600)), sortOrder: Number.isFinite(so) ? so : 0 } };
}
export async function cleanSupply(b, base, env) {
  const campId = base.campId || S(b.campId, 60); if (!campId || !(await campOk(env, campId))) return { error: '캠프를 찾지 못했어요.' };
  const name = pick(b, base, 'name', (x) => S(x, 100)); if (!name) return { error: '물품 이름을 입력해주세요.' };
  const status = 'status' in b ? (SUPPLY_STATUS.includes(b.status) ? b.status : base.status || 'need') : base.status || 'need';
  return { v: { campId, name, nameEn: pick(b, base, 'nameEn', (x) => S(x, 100)), qty: pick(b, base, 'qty', (x) => S(x, 40)), status, ownerName: pick(b, base, 'ownerName', (x) => S(x, 60)), notes: pick(b, base, 'notes', (x) => L(x, 400)) } };
}
export async function cleanContact(b, base, env) {
  const name = pick(b, base, 'name', (x) => S(x, 80)); if (!name) return { error: '이름을 입력해주세요.' };
  const kind = 'kind' in b ? (CONTACT_KINDS.includes(b.kind) ? b.kind : 'other') : base.kind || 'other';
  const campId = 'campId' in b ? (S(b.campId, 60) || null) : base.campId ?? null; if (campId && !(await campOk(env, campId))) return { error: '캠프를 찾지 못했어요.' };
  const email = pick(b, base, 'email', (x) => S(x, 120)); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: '이메일 형식이 올바르지 않아요.' };
  return { v: { kind, name, org: pick(b, base, 'org', (x) => S(x, 100)), phone: pick(b, base, 'phone', (x) => S(x, 40)), email, notes: pick(b, base, 'notes', (x) => L(x, 600)), campId } };
}
export async function cleanSeries(b, base, env) {
  const nameKo = pick(b, base, 'nameKo', (x) => S(x, 80)); if (!nameKo) return { error: '이름을 입력해주세요.' };
  const kind = 'kind' in b ? (SERIES_KINDS.includes(b.kind) ? b.kind : 'other') : base.kind || 'church';
  const months = 'months' in b ? [...new Set(String(Array.isArray(b.months) ? b.months.join(',') : b.months || '').split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, c) => a - c).join(',') : base.months || '';
  const typeId = 'typeId' in b ? (S(b.typeId, 60) || null) : base.typeId ?? null;
  if (typeId && !(await env.DB.prepare('SELECT id FROM camp_types WHERE id = ?1 AND deletedAt IS NULL').bind(typeId).first())) return { error: '캠프 유형을 찾지 못했어요.' };
  return { v: { nameKo, nameEn: pick(b, base, 'nameEn', (x) => S(x, 80)), kind, months, typeId, notes: pick(b, base, 'notes', (x) => L(x, 400)) } };
}

/**
 * 엑셀·표에서 복사해 붙여넣은 진행표 읽기: 줄마다 [날짜] [시작] [끝] [제목] [장소] [담당] 칸(탭 또는 쉼표). 머리글 줄은 건너뛴다.
 * 날짜 칸이 비면 바로 위 줄의 날짜를 이어 쓰고, 맨 위부터 비면 defaultDay(캠프 시작일)를 쓴다. 해석 못 한 줄은 skipped 에 이유와 함께 돌려준다.
 */
export function parseTimelineText(input, defaultDay = '') {
  const rows = [], skipped = []; let day = isDay(defaultDay) ? defaultDay : '';
  String(input || '').replace(/^﻿/, '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim());
    if (/^(date|날짜|일자|day)$/i.test(cells[0]) || /^(time|시간|start|시작)$/i.test(cells[0])) return;
    let [d, st, et, title, place, owner] = cells; const dm = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(d || '');
    if (dm) day = `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}`;
    else { // 날짜 칸이 없는 줄이면 한 칸씩 당긴다
      [st, et, title, place, owner] = [d, st, et, title, place];
    }
    const s1 = clock(st), e1 = clock(et);
    if (!title && !s1) { skipped.push({ line: i + 1, reason: '제목이 없어요' }); return; }
    if (!day) { skipped.push({ line: i + 1, reason: '날짜를 알 수 없어요' }); return; }
    if (!s1 && st) { skipped.push({ line: i + 1, reason: '시작 시간을 읽지 못했어요' }); return; }
    rows.push({ dayDate: day, startTime: s1, endTime: e1, title: S(title || '', 120), place: S(place || '', 80), ownerName: S(owner || '', 60) });
  });
  return { rows: rows.filter((r) => r.title), skipped };
}

// ---- 폰 캘린더(ICS) ----
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dayCompact = (d) => d.replace(/-/g, '');
function nextDay(d) { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
/** 한국 시간(UTC+9, 서머타임 없음)을 UTC 로 바꿔 줘서 어느 달력 앱에서도 같은 시각으로 보인다 */
function kstToUtc(d, t) { const [h, m] = t.split(':').map(Number), x = new Date(`${d}T${pad(h)}:${pad(m)}:00Z`); x.setUTCHours(x.getUTCHours() - 9); return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`; }
export function buildIcs(items, name = 'WOLKO 캠프팀', now = new Date()) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WOLKO Camp Team//Portal//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Asia/Seoul'];
  for (const it of items) {
    if (!isDay(it.start)) continue;
    out.push('BEGIN:VEVENT', `UID:${it.uid}@campteam.wolko`, `DTSTAMP:${stamp}`);
    if (clock(it.startTime)) {
      out.push(`DTSTART:${kstToUtc(it.start, clock(it.startTime))}`);
      const end = clock(it.endTime) ? kstToUtc(it.end && isDay(it.end) ? it.end : it.start, clock(it.endTime)) : kstToUtc(it.start, clock(it.startTime));
      out.push(`DTEND:${end}`);
    } else { out.push(`DTSTART;VALUE=DATE:${dayCompact(it.start)}`, `DTEND;VALUE=DATE:${dayCompact(nextDay(it.end && isDay(it.end) ? it.end : it.start))}`); }
    out.push(`SUMMARY:${esc(it.title)}`); if (it.place) out.push(`LOCATION:${esc(it.place)}`); if (it.desc) out.push(`DESCRIPTION:${esc(it.desc)}`);
    out.push('END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}
