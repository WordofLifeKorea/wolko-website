/**
 * 주방 보조 신청 — 평택센터 멤버 전용, 2주 단위. 하루 6칸(아침/점심/저녁 × 준비/클린업), 한 칸에 여러 명(준비 칸 기본 1명 · 최대 2명, 클린업 칸 기본 2명 · 최대 4명).
 *   GET    /api/kitchen/duty?start=YYYY-MM-DD          → 그 날짜가 속한 2주 구간의 신청 현황
 *   POST   /api/kitchen/duty  { date, slot, phone? }   → 칸 신청 (정원이 찼으면 409)
 *   DELETE /api/kitchen/duty?date=...&slot=...[&email=...] → 본인 신청 취소. email 을 붙이면 그 사람의 신청을 취소(주방 관리자·마스터)
 *   PATCH  /api/kitchen/duty  { date, slot, email }    → 주방 관리자가 사람을 직접 배정. 닫힌 칸이면 열면서 배정한다.
 *   PUT    /api/kitchen/duty  { date, slot, closed }   → 칸 닫기/열기 (주방 관리자·마스터). slot 은 칸 이름 | am(아침 두 칸) | all(하루 전체).
 *                                                         닫으면 그 칸의 기존 신청은 모두 취소되고 더는 신청할 수 없다.
 *   PUT    /api/kitchen/duty  { date, slot, capacity }  → 그 칸의 정원을 바꾼다(준비 칸 1~2명, 클린업 칸 1~4명) (null 이면 기본 인원으로). 이미 신청한 인원보다 줄일 수는 없다.
 * KV: kitchen:day:{날짜}(그날의 신청), kitchen:closed:{구간 시작일}, kitchen:cap:{구간 시작일}, kitchen:settings
 */
import { isValidPhone, getAccount, isMasterEmail, normalizeEmail } from '../../lib/hubAccounts.js';
import { CAMPUS_OVERRIDES } from '../../../src/lib/expense-config.js';
import { pickName } from '../../lib/expenses.js';
import { MAX_AHEAD_DAYS, MAX_CAPACITY, MORNING_SLOTS, SLOTS, SLOT_TITLE, TTL, applyOpenState, capacityKey, capacityOf, defaultCapacityOf, maxCapacityOf, closedKey, isSlotClosed, isValidCapacity, kitchenSession, parseDate, periodFor, readDay, shiftPeriod, shownName, todayKst, writeDay } from '../../lib/kitchenDuty.js';
import { getSettings } from '../../lib/kitchenSettings.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });
const DAY = 86400000;

export async function onRequestGet({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  const today = todayKst();
  const wanted = new URL(request.url).searchParams.get('start') || today;
  const period = periodFor(parseDate(wanted) === null ? today : wanted);
  const [days, closedMap, capMap, settings] = await Promise.all([
    Promise.all(period.days.map(date => readDay(env, date))),
    env.CAMP_KV.get(closedKey(period.start), 'json'),
    env.CAMP_KV.get(capacityKey(period.start), 'json'),
    getSettings(env),
  ]);
  const slots = {}, closed = {}, caps = {};
  period.days.forEach((date, i) => {
    for (const slot of SLOTS) {
      const people = days[i][slot] || [];
      const id = `${date}:${slot}`;
      if (people.length) slots[id] = people.map(p => ({ name: shownName(p), mine: p.email === session.email, ...(session.isManager ? { email: p.email } : {}) }));
      if (isSlotClosed(closedMap, date, slot, people.length > 0)) closed[id] = true;
      if (capMap?.[id] !== undefined && capacityOf(capMap, date, slot) !== defaultCapacityOf(slot, settings)) caps[id] = capacityOf(capMap, date, slot);
    }
  });
  return Response.json({
    me: { name: session.name, phone: session.phone, isAdmin: session.isAdmin, isManager: session.isManager },
    today, period: { start: period.start, end: period.end, days: period.days, prev: shiftPeriod(period.start, -1), next: shiftPeriod(period.start, 1) },
    slots, closed, caps, defaultCapacity: { prep: defaultCapacityOf('x_prep', settings), clean: defaultCapacityOf('x_clean', settings) }, maxCapacity: { prep: maxCapacityOf('x_prep'), clean: maxCapacityOf('x_clean') }, meals: settings.meals,
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

  const period = periodFor(date).start;
  const [day, closedMap, capMap, settings] = await Promise.all([readDay(env, date), env.CAMP_KV.get(closedKey(period), 'json'), env.CAMP_KV.get(capacityKey(period), 'json'), getSettings(env)]);
  const people = day[slot] || [];
  if (isSlotClosed(closedMap, date, slot, people.length > 0)) return fail('닫힌 칸입니다. (관리자가 열어야 신청할 수 있어요.)', 409);
  if (people.some(p => p.email === session.email)) return fail('이미 신청한 칸입니다.', 409);
  if (people.length >= capacityOf(capMap, date, slot, defaultCapacityOf(slot, settings))) return fail(`정원이 찼습니다. (${people.map(shownName).join(', ')})`, 409);
  day[slot] = [...people, { email: session.email, name: session.name, phone, at: new Date().toISOString() }];
  await writeDay(env, date, day);
  // 동시에 눌렀다면 나중에 쓴 쪽이 이긴다 — 다시 읽어 내가 없으면 알려준다
  const check = (await readDay(env, date))[slot] || [];
  if (!check.some(p => p.email === session.email)) return fail('다른 분이 먼저 신청해서 처리되지 못했어요. 다시 시도해 주세요.', 409);
  return Response.json({ ok: true }, { status: 201, headers: H });
}

export async function onRequestDelete({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  const params = new URL(request.url).searchParams;
  const date = params.get('date') || '', slot = params.get('slot') || '';
  if (parseDate(date) === null || !SLOTS.includes(slot)) return fail('날짜와 업무를 확인해 주세요.');
  const target = params.get('email') ? normalizeEmail(params.get('email')) : session.email;
  if (target !== session.email && !session.isManager) return fail('본인이 신청한 칸만 취소할 수 있습니다.', 403);
  if (date < todayKst() && !session.isManager) return fail('지난 날짜는 취소할 수 없습니다.', 409);
  const day = await readDay(env, date);
  const people = day[slot] || [];
  if (!people.some(p => p.email === target)) return Response.json({ ok: true }, { headers: H });
  day[slot] = people.filter(p => p.email !== target);
  await writeDay(env, date, day);
  return Response.json({ ok: true }, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  if (!session.isManager) return fail('주방 관리자만 칸을 바꿀 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const date = String(body?.date || ''), slot = String(body?.slot || '');
  if (parseDate(date) === null || !(SLOTS.includes(slot) || slot === 'all' || slot === 'am')) return fail('날짜와 업무를 확인해 주세요.');
  if (date < todayKst()) return fail('지난 날짜는 바꿀 수 없습니다.', 409);

  // 정원 바꾸기 — 칸 하나만
  if (body && 'capacity' in body) {
    if (!SLOTS.includes(slot)) return fail('정원은 칸 하나씩 바꿀 수 있습니다.');
    const wanted = body.capacity === null ? null : Number(body.capacity);
    if (wanted !== null && !isValidCapacity(wanted, slot)) return fail(`정원은 1~${maxCapacityOf(slot)}명으로 정해 주세요.`);
    const people = (await readDay(env, date))[slot] || [];
    const effective = wanted ?? defaultCapacityOf(slot, await getSettings(env)); // null 이면 기본 인원으로 돌아가므로 그 인원 기준으로 확인한다
    if (effective < people.length) return fail(`이미 ${people.length}명이 신청해서 ${effective}명으로 줄일 수 없어요. 먼저 배정을 해제해 주세요.`, 409);
    const key = capacityKey(periodFor(date).start);
    const map = (await env.CAMP_KV.get(key, 'json')) || {};
    if (wanted === null) delete map[`${date}:${slot}`]; else map[`${date}:${slot}`] = wanted;
    await env.CAMP_KV.put(key, JSON.stringify(map), { expirationTtl: TTL });
    return Response.json({ ok: true, capacity: wanted }, { headers: H });
  }

  // 칸 닫기/열기
  const closed = body?.closed !== false;
  const targets = slot === 'all' ? SLOTS : slot === 'am' ? MORNING_SLOTS : [slot];
  const key = closedKey(periodFor(date).start);
  const map = (await env.CAMP_KV.get(key, 'json')) || {};
  const day = await readDay(env, date);
  const cancelled = [];
  for (const s of targets) {
    applyOpenState(map, date, s, !closed, session.email);
    if (closed && day[s]?.length) { cancelled.push(...day[s].map(p => ({ slot: s, name: shownName(p) }))); delete day[s]; }
  }
  await env.CAMP_KV.put(key, JSON.stringify(map), { expirationTtl: TTL });
  if (cancelled.length) await writeDay(env, date, day);
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

  const email = normalizeEmail(body?.email);
  const account = await getAccount(env, email);
  const master = isMasterEmail(email);
  if (account ? account.status !== 'approved' : !master) return fail('승인된 포탈 멤버만 배정할 수 있습니다.', 404);
  const campus = CAMPUS_OVERRIDES[email] || account?.campus || 'wolko';
  if (!master && campus !== 'wolko') return fail('평택센터 멤버만 배정할 수 있습니다.', 400);

  const period = periodFor(date).start;
  const [day, closedMap, capMap, settings] = await Promise.all([readDay(env, date), env.CAMP_KV.get(closedKey(period), 'json'), env.CAMP_KV.get(capacityKey(period), 'json'), getSettings(env)]);
  const people = day[slot] || [];
  if (people.some(p => p.email === email)) return fail('이미 이 칸에 신청한 분이에요.', 409);
  if (people.length >= capacityOf(capMap, date, slot, defaultCapacityOf(slot, settings))) return fail(`${SLOT_TITLE[slot]} 정원이 찼어요. 정원을 늘리거나 다른 분의 배정을 해제해 주세요.`, 409);

  // 닫힌 칸이면 열면서 배정한다
  const map = closedMap || {};
  if (isSlotClosed(map, date, slot, people.length > 0)) {
    applyOpenState(map, date, slot, true, session.email);
    await env.CAMP_KV.put(closedKey(period), JSON.stringify(map), { expirationTtl: TTL });
  }
  const phone = String(account?.phone || '').trim();
  const record = { email, name: pickName(email, account?.name), phone: isValidPhone(phone) ? phone : '', at: new Date().toISOString(), assignedBy: session.email };
  day[slot] = [...people, record];
  await writeDay(env, date, day);
  return Response.json({ ok: true, assigned: { name: shownName(record) }, noPhone: !record.phone }, { headers: H });
}
