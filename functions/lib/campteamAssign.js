/**
 * 사람 배정: 정리, 조 자동 배정 제안, 방 자동 배정 제안, 겹침·안전 경고.
 * 안전 원칙(운영자가 정한 규칙): 미성년자와 성인이 닫힌 공간(차량·방)에 단둘이 있으면 경고, 성별이 다른 두 사람만 있는 차량·방도 경고(혼인 여부는 저장하지 않으므로 더 보수적으로 알림).
 * 경고는 알려 주기만 한다 — 막지 않고, 자동으로 바꾸지도 않는다.
 */
import { S, L } from './campteamCrud.js';
export const SLOT_KINDS = ['group', 'room', 'vehicle'], ROLES = ['participant', 'staff', 'leader'];
const camp = async (env, id) => !!(await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL AND id = ?1').bind(id).first());
const pk = (b, base, k, f) => (k in b ? f(b[k]) : (base[k] ?? f('')));
export async function cleanSlot(b, base, env) {
  const campId = base.campId || S(b.campId, 60); if (!campId || !(await camp(env, campId))) return { error: '캠프를 찾지 못했어요.' };
  const kind = base.kind || b.kind; if (!SLOT_KINDS.includes(kind)) return { error: '종류가 올바르지 않아요.' };
  const name = pk(b, base, 'name', (x) => S(x, 60)); if (!name) return { error: '이름을 입력해주세요.' };
  const cap = 'capacity' in b ? (b.capacity === '' || b.capacity == null ? null : parseInt(b.capacity, 10)) : base.capacity ?? null;
  if (cap != null && !(cap >= 1 && cap <= 500)) return { error: '정원은 1~500 사이로 적어 주세요.' };
  const gender = 'gender' in b ? (['M', 'F'].includes(b.gender) ? b.gender : '') : base.gender || '';
  return { v: { campId, kind, name, capacity: cap, gender: kind === 'room' ? gender : '', leader: pk(b, base, 'leader', (x) => S(x, 60)), notes: pk(b, base, 'notes', (x) => L(x, 300)) } };
}
export async function cleanPerson(b, base, env) {
  const campId = base.campId || S(b.campId, 60); if (!campId || !(await camp(env, campId))) return { error: '캠프를 찾지 못했어요.' };
  const name = pk(b, base, 'name', (x) => S(x, 60)); if (!name) return { error: '이름을 입력해주세요.' };
  const gender = 'gender' in b ? (['M', 'F'].includes(b.gender) ? b.gender : '') : base.gender || '';
  const role = 'role' in b ? (ROLES.includes(b.role) ? b.role : 'participant') : base.role || 'participant';
  const v = { campId, name, gender, grade: pk(b, base, 'grade', (x) => S(x, 12)), church: pk(b, base, 'church', (x) => S(x, 60)), role, notes: pk(b, base, 'notes', (x) => L(x, 200)) };
  for (const [col, kind] of [['groupId', 'group'], ['roomId', 'room'], ['vehicleId', 'vehicle']]) {
    const id = col in b ? (S(b[col], 60) || null) : base[col] ?? null;
    if (id && !(await env.DB.prepare('SELECT id FROM camp_slots WHERE id = ?1 AND campId = ?2 AND kind = ?3 AND deletedAt IS NULL').bind(id, campId, kind).first())) return { error: '배정할 곳을 찾지 못했어요.' };
    v[col] = id;
  }
  return { v };
}

const ADULT = /성인|청년|대학|직장|adult|college|young adult|staff/i;
export const isMinor = (p) => p.role === 'participant' && !ADULT.test(p.grade || '');
/** 학년 → 숫자(초1=1 … 중1=7 … 고3=12). 모르면 0 */
export function gradeNum(g) { const t = String(g || ''), m = /(초|중|고|elem|middle|high|grade|g)\D*(\d+)/i.exec(t) || /(\d+)\s*학년/.exec(t); if (!m) return 0; const n = +(m[2] || m[1]); if (/초|elem/i.test(m[1] || '')) return n; if (/중|middle/i.test(m[1] || '')) return 6 + n; if (/고|high/i.test(m[1] || '')) return 9 + n; return n; }

/** 조 자동 배정 제안: 성별·학년이 골고루 섞이도록, 정원을 넘기지 않게. people: 배정할 참가자, groups: [{id,capacity,current:[이미 있는 사람]}] → [{personId, groupId}] */
export function proposeGroups(people, groups) {
  const st = groups.map((g) => ({ id: g.id, cap: g.capacity || Infinity, n: (g.current || []).length, M: (g.current || []).filter((p) => p.gender === 'M').length, F: (g.current || []).filter((p) => p.gender === 'F').length, sum: (g.current || []).reduce((s, p) => s + gradeNum(p.grade), 0) }));
  if (!st.length) return [];
  const order = [...people].sort((a, b) => (a.gender || 'z').localeCompare(b.gender || 'z') || gradeNum(b.grade) - gradeNum(a.grade) || a.name.localeCompare(b.name)), out = [];
  for (const p of order) {
    const open = st.filter((g) => g.n < g.cap); if (!open.length) break;
    const key = (g) => [(p.gender === 'M' ? g.M : p.gender === 'F' ? g.F : 0), g.n, g.sum];
    open.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    const g = open[0]; g.n++; if (p.gender === 'M') g.M++; if (p.gender === 'F') g.F++; g.sum += gradeNum(p.grade); out.push({ personId: p.id, groupId: g.id });
  }
  return out;
}
/** 방 자동 배정 제안: 성별별로, 같은 조 사람들이 가까이 가도록 채운다. 스태프·성별 모름은 건드리지 않는다 */
export function proposeRooms(people, rooms) {
  const st = rooms.map((r) => ({ id: r.id, cap: r.capacity || 4, gender: r.gender || '', n: (r.current || []).length, g: r.gender || ((r.current || [])[0]?.gender || '') })), out = [];
  const list = people.filter((p) => p.gender === 'M' || p.gender === 'F').sort((a, b) => (a.groupId || '').localeCompare(b.groupId || '') || a.name.localeCompare(b.name));
  for (const p of list) {
    const r = st.find((x) => x.n < x.cap && (x.g === p.gender || (!x.g && !x.gender))) || st.find((x) => x.n < x.cap && !x.g);
    if (!r) continue; if (!r.g) r.g = p.gender; r.n++; out.push({ personId: p.id, roomId: r.id });
  }
  return out;
}
const toMin = (t) => { const m = /^(\d\d):(\d\d)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
/** 경고 만들기. people/slots/timeline 은 한 캠프의 행들. */
export function findConflicts({ people, slots, timeline }) {
  const w = [], slotName = (id) => slots.find((s) => s.id === id)?.name || '', byKind = (k) => slots.filter((s) => s.kind === k);
  // 1) 진행표: 같은 담당이 겹치는 시간, 같은 장소가 겹치는 시간
  const rows = timeline.map((t) => ({ ...t, a: toMin(t.startTime), b: toMin(t.endTime) ?? (toMin(t.startTime) != null ? toMin(t.startTime) + 30 : null) })).filter((t) => t.a != null);
  const overlap = (x, y) => x.dayDate === y.dayDate && x.a < y.b && y.a < x.b;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const x = rows[i], y = rows[j]; if (!overlap(x, y)) continue;
    if (x.ownerName && x.ownerName === y.ownerName) w.push({ type: 'person-overlap', level: 'warn', text: `${x.ownerName}: ${x.dayDate} ${x.startTime} 「${x.title}」 와 「${y.title}」 시간이 겹쳐요`, refs: [x.id, y.id] });
    if (x.place && x.place === y.place) w.push({ type: 'place-overlap', level: 'warn', text: `${x.place}: ${x.dayDate} 「${x.title}」 와 「${y.title}」 시간이 겹쳐요`, refs: [x.id, y.id] });
  }
  // 2) 차량·방·조
  const members = (col, id) => people.filter((p) => p[col] === id);
  const pairRisk = (list, where, kindLabel) => {
    if (list.length === 2) {
      const [a, b] = list;
      if ((isMinor(a) && !isMinor(b)) || (isMinor(b) && !isMinor(a))) w.push({ type: 'minor-adult-alone', level: 'danger', text: `${where}: 미성년자와 성인 단둘이에요 (${a.name}, ${b.name}) — ${kindLabel}에 한 명 이상 더 함께 타도록 조정하세요`, refs: [a.id, b.id] });
      else if (a.gender && b.gender && a.gender !== b.gender) w.push({ type: 'opposite-pair', level: 'warn', text: `${where}: 성별이 다른 두 명만 있어요 (${a.name}, ${b.name}) — 규칙을 확인하세요`, refs: [a.id, b.id] });
    }
  };
  const drivers = new Map();
  for (const v of byKind('vehicle')) {
    const ps = members('vehicleId', v.id);
    if (v.capacity && ps.length > v.capacity) w.push({ type: 'over-capacity', level: 'warn', text: `차량 ${v.name}: 정원 ${v.capacity}명인데 ${ps.length}명이에요`, refs: [v.id] });
    if (ps.length && !v.leader) w.push({ type: 'no-driver', level: 'warn', text: `차량 ${v.name}: 운전자가 정해지지 않았어요`, refs: [v.id] });
    if (v.leader) { (drivers.get(v.leader) || drivers.set(v.leader, []).get(v.leader)).push(v.name); }
    const occupants = [...ps, ...(v.leader && !ps.some((p) => p.name === v.leader) ? [people.find((p) => p.name === v.leader) || { id: 'driver:' + v.id, name: v.leader, role: 'staff', grade: '성인', gender: '' }] : [])];
    pairRisk(occupants, `차량 ${v.name}`, '차량');
  }
  for (const [name, list] of drivers) if (list.length > 1) w.push({ type: 'driver-twice', level: 'warn', text: `${name}: 운전자로 ${list.length}대에 배정됐어요 (${list.join(', ')})`, refs: [] });
  for (const r of byKind('room')) {
    const ps = members('roomId', r.id);
    if (r.capacity && ps.length > r.capacity) w.push({ type: 'over-capacity', level: 'warn', text: `방 ${r.name}: 정원 ${r.capacity}명인데 ${ps.length}명이에요`, refs: [r.id] });
    const g = new Set(ps.map((p) => p.gender).filter(Boolean));
    if (g.size > 1) w.push({ type: 'room-gender-mix', level: 'danger', text: `방 ${r.name}: 남녀가 함께 배정됐어요`, refs: [r.id] });
    if (r.gender && ps.some((p) => p.gender && p.gender !== r.gender)) w.push({ type: 'room-rule', level: 'danger', text: `방 ${r.name}: 방 성별 규칙(${r.gender === 'M' ? '남' : '여'})과 다른 사람이 있어요`, refs: [r.id] });
    pairRisk(ps, `방 ${r.name}`, '방');
  }
  for (const gp of byKind('group')) { const ps = members('groupId', gp.id); if (gp.capacity && ps.length > gp.capacity) w.push({ type: 'over-capacity', level: 'warn', text: `조 ${gp.name}: 정원 ${gp.capacity}명인데 ${ps.length}명이에요`, refs: [gp.id] }); }
  const parts = people.filter((p) => p.role === 'participant');
  const noGroup = parts.filter((p) => !p.groupId).length, noRoom = parts.filter((p) => !p.roomId).length;
  if (byKind('group').length && noGroup) w.push({ type: 'unassigned', level: 'info', text: `조가 정해지지 않은 참가자 ${noGroup}명`, refs: [] });
  if (byKind('room').length && noRoom) w.push({ type: 'unassigned', level: 'info', text: `방이 정해지지 않은 참가자 ${noRoom}명`, refs: [] });
  const sizes = byKind('group').map((g) => members('groupId', g.id).length);
  if (sizes.length > 1 && Math.max(...sizes) - Math.min(...sizes) > 2) w.push({ type: 'group-balance', level: 'info', text: `조 인원 차이가 커요 (${Math.min(...sizes)}~${Math.max(...sizes)}명)`, refs: [] });
  return w;
}
export function parsePeopleText(input) {
  const rows = [], skipped = [];
  String(input || '').replace(/^﻿/, '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return; const c = (line.includes('\t') ? line.split('\t') : line.split(',')).map((x) => x.trim());
    if (/^(이름|name)$/i.test(c[0])) return;
    const g = /^(m|male|남|남자|남성)$/i.test(c[1] || '') ? 'M' : /^(f|female|여|여자|여성)$/i.test(c[1] || '') ? 'F' : '';
    const role = /스태프|staff/i.test(c[4] || '') ? 'staff' : /리더|조장|leader/i.test(c[4] || '') ? 'leader' : 'participant';
    if (!c[0]) { skipped.push({ line: i + 1, reason: '이름이 없어요' }); return; }
    rows.push({ name: S(c[0], 60), gender: g, grade: S(c[2] || '', 12), church: S(c[3] || '', 60), role });
  });
  return { rows, skipped };
}
