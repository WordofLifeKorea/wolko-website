/**
 * 주방 보조 신청 — 평택센터 멤버 전용, 2주 단위. 하루 6칸(오전/점심/저녁 × 준비/클린업).
 *   GET    /api/kitchen/duty?start=YYYY-MM-DD          → 그 날짜가 속한 2주 구간의 신청 현황
 *   POST   /api/kitchen/duty  { date, slot, phone? }   → 칸 신청 (이미 찼으면 409)
 *   DELETE /api/kitchen/duty?date=...&slot=...         → 본인 신청 취소 (마스터는 누구든)
 *   PATCH  /api/kitchen/duty  { date, slot, email }    → 주방 관리자가 사람을 직접 배정(email) 하거나 해제(email 이 null). 닫힌 칸이면 열면서 배정한다.
 *   PUT    /api/kitchen/duty  { date, slot, closed }   → 칸 닫기/열기 (주방 관리자·마스터). slot 은 칸 이름 | am(오전 두 칸) | all(하루 전체).
 *                                                         닫으면 그 칸의 기존 신청은 취소되고 더는 신청할 수 없다.
 * KV: kitchen:slot:{date}:{slot}, kitchen:closed:{구간 시작일}
 */
import { isValidPhone, getAccount, isMasterEmail, normalizeEmail } from '../../lib/hubAccounts.js';
import { CAMPUS_OVERRIDES } from '../../../src/lib/expense-config.js';
import { pickName } from '../../lib/expenses.js';
import { MAX_AHEAD_DAYS, MORNING_SLOTS, SLOTS, applyOpenState, closedKey, isSlotClosed, kitchenSession, parseDate, periodFor, shiftPeriod, shownName, slotKey, todayKst } from '../../lib/kitchenDuty.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });
const DAY = 86400000;
const TTL = 60 * 60 * 24 * 120;

export async function onRequestGet({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  const today = todayKst();
  const wanted = new URL(request.url).searchParams.get('start') || today;
  const period = periodFor(parseDate(wanted) === null ? today : wanted);
  const keys = period.days.flatMap(date => SLOTS.map(slot => [date, slot]));
  const [values, closedMap] = await Promise.all([
    Promise.all(keys.map(([d, s]) => env.CAMP_KV.get(slotKey(d, s), 'json'))),
    env.CAMP_KV.get(closedKey(period.start), 'json'),
  ]);
  const slots = {};
  keys.forEach(([d, s], i) => {
    const v = values[i];
    if (v) slots[`${d}:${s}`] = { name: shownName(v), mine: v.email === session.email };
  });
  return Response.json({
    me: { name: session.name, phone: session.phone, isAdmin: session.isAdmin, isManager: session.isManager },
    today, period: { start: period.start, end: period.end, days: period.days, prev: shiftPeriod(period.start, -1), next: shiftPeriod(period.start, 1) },
    slots,
    closed: Object.fromEntries(keys.filter(([d, s], i) => isSlotClosed(closedMap, d, s, !!values[i])).map(([d, s]) => [`${d}:${s}`, true])),
  }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const date = String(body?.date || ''), slot = String(body?.slot || '');
  const ms = parseDate(date);
  if (ms === null || !SLOTS.includes(slot)) return fail('날짜와 업무를 확인해 주세요.');
  const today = todayKst();
  if (date < today) return fail('지난 날짜는 신청할 수 없습니다.');
  if (ms - parseDate(today) > MAX_AHEAD_DAYS * DAY) return fail('너무 먼 날짜는 아직 신청할 수 없습니다.');
  const phone = String(body?.phone || session.phone || '').trim();
  if (!isValidPhone(phone)) return fail('알림을 받을 휴대폰 번호를 입력해 주세요.');

  const closedMap = (await env.CAMP_KV.get(closedKey(periodFor(date).start), 'json')) || {};
  if (isSlotClosed(closedMap, date, slot)) return fail('닫힌 칸입니다. (관리자가 열어야 신청할 수 있어요.)', 409);
  const key = slotKey(date, slot);
  const existing = await env.CAMP_KV.get(key, 'json');
  if (existing) return fail(existing.email === session.email ? '이미 신청한 칸입니다.' : `${shownName(existing)} 님이 먼저 신청했습니다.`, 409);
  const record = { date, slot, email: session.email, name: session.name, phone, at: new Date().toISOString() };
  await env.CAMP_KV.put(key, JSON.stringify(record), { expirationTtl: TTL });
  // 동시에 두 명이 눌렀다면 나중에 쓴 쪽이 이긴다 — 다시 읽어 내 것이 아니면 알려준다
  const check = await env.CAMP_KV.get(key, 'json');
  if (check && check.email !== session.email) return fail(`${shownName(check)} 님이 먼저 신청했습니다.`, 409);
  return Response.json({ ok: true, slot: { name: record.name, mine: true } }, { status: 201, headers: H });
}

export async function onRequestDelete({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  const params = new URL(request.url).searchParams;
  const date = params.get('date') || '', slot = params.get('slot') || '';
  if (parseDate(date) === null || !SLOTS.includes(slot)) return fail('날짜와 업무를 확인해 주세요.');
  const key = slotKey(date, slot);
  const existing = await env.CAMP_KV.get(key, 'json');
  if (!existing) return Response.json({ ok: true }, { headers: H });
  if (existing.email !== session.email && !session.isAdmin) return fail('본인이 신청한 칸만 취소할 수 있습니다.', 403);
  if (date < todayKst() && !session.isAdmin) return fail('지난 날짜는 취소할 수 없습니다.', 409);
  await env.CAMP_KV.delete(key);
  return Response.json({ ok: true }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  if (!session.isManager) return fail('주방 관리자만 칸을 닫거나 열 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const date = String(body?.date || ''), slot = String(body?.slot || '');
  if (parseDate(date) === null || !(SLOTS.includes(slot) || slot === 'all' || slot === 'am')) return fail('날짜와 업무를 확인해 주세요.');
  if (date < todayKst()) return fail('지난 날짜는 바꿀 수 없습니다.', 409);
  const closed = body?.closed !== false;
  const targets = slot === 'all' ? SLOTS : slot === 'am' ? MORNING_SLOTS : [slot];
  const key = closedKey(periodFor(date).start);
  const map = (await env.CAMP_KV.get(key, 'json')) || {};
  const cancelled = [];
  for (const s of targets) {
    applyOpenState(map, date, s, !closed, session.email);
    if (closed) {
      const existing = await env.CAMP_KV.get(slotKey(date, s), 'json');
      if (existing) { await env.CAMP_KV.delete(slotKey(date, s)); cancelled.push({ slot: s, name: shownName(existing) }); }
    }
  }
  await env.CAMP_KV.put(key, JSON.stringify(map), { expirationTtl: TTL });
  return Response.json({ ok: true, closed, cancelled }, { headers: H });
}

export async function onRequestPatch({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  if (!session.isManager) return fail('주방 관리자만 사람을 배정할 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const date = String(body?.date || ''), slot = String(body?.slot || '');
  if (parseDate(date) === null || !SLOTS.includes(slot)) return fail('날짜와 업무를 확인해 주세요.');
  if (date < todayKst()) return fail('지난 날짜는 바꿀 수 없습니다.', 409);
  const key = slotKey(date, slot);
  const existing = await env.CAMP_KV.get(key, 'json');

  // 배정 해제
  if (body?.email === null || body?.email === '') {
    if (existing) await env.CAMP_KV.delete(key);
    return Response.json({ ok: true, assigned: null, removed: existing ? shownName(existing) : null }, { headers: H });
  }

  const email = normalizeEmail(body?.email);
  const account = await getAccount(env, email);
  const master = isMasterEmail(email);
  if (account ? account.status !== 'approved' : !master) return fail('승인된 포탈 멤버만 배정할 수 있습니다.', 404);
  const campus = CAMPUS_OVERRIDES[email] || account?.campus || 'wolko';
  if (!master && campus !== 'wolko') return fail('평택센터 멤버만 배정할 수 있습니다.', 400);

  // 닫힌 칸이면 열면서 배정한다
  const mapKey = closedKey(periodFor(date).start);
  const map = (await env.CAMP_KV.get(mapKey, 'json')) || {};
  if (isSlotClosed(map, date, slot, !!existing)) {
    applyOpenState(map, date, slot, true, session.email);
    await env.CAMP_KV.put(mapKey, JSON.stringify(map), { expirationTtl: TTL });
  }
  const phone = String(account?.phone || '').trim();
  const record = { date, slot, email, name: pickName(email, account?.name), phone: isValidPhone(phone) ? phone : '', at: new Date().toISOString(), assignedBy: session.email };
  await env.CAMP_KV.put(key, JSON.stringify(record), { expirationTtl: TTL });
  return Response.json({ ok: true, assigned: { name: shownName(record) }, replaced: existing && existing.email !== email ? shownName(existing) : null, noPhone: !record.phone }, { headers: H });
}
