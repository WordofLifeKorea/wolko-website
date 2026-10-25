import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import * as GCamps from '../functions/api/portal/gospel-camps.js';
import { countRegistration, monthOfSchedule, campLocation, resetScheduleCache, isFinalConfirmed, monthCamps, allCamps, addCampsToSummary } from '../functions/lib/gospelCamps.js';
import { campEndDate, isCampFinished } from '../functions/lib/campDates.js';

test('캠퍼 집계: 최종 확정된 신청만, 스태프 신청은 제외', () => {
  assert.deepEqual(countRegistration({ registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true, dedicated: true }), { campers: 1, staff: 0, salvations: 1, dedications: 1 });
  assert.deepEqual(countRegistration({ status: 'confirmed' }), { campers: 1, staff: 0, salvations: 0, dedications: 0 }, 'registrationType 이 없는 옛 개인 신청도 1명');
  assert.equal(countRegistration({ status: 'deposit', saved: true }).campers, 0, '예약금만 낸 신청은 아직 세지 않는다');
  assert.equal(countRegistration({ status: 'pending' }).campers, 0);
  assert.deepEqual(countRegistration({ registrationType: 'staff', status: 'confirmed' }), { campers: 0, staff: 1, salvations: 0, dedications: 0 }, '확정된 스태프 신청은 스태프 1명');
  assert.equal(countRegistration({ registrationType: 'staff', status: 'pending' }).staff, 0, '확정 전 스태프 신청은 세지 않는다');
  assert.equal(countRegistration(null).campers, 0);
  assert.equal(isFinalConfirmed({ confirmed: true }), true, '옛 데이터: status 없이 confirmed:true');
  assert.equal(isFinalConfirmed({ status: 'deposit', confirmed: true }), false);
});

test('구원은 캠프 후 구원(또는 시점 없는 옛 체크)만, 캠프 전 구원은 제외', () => {
  const one = x => countRegistration({ status: 'confirmed', ...x }).salvations;
  assert.equal(one({ savedTiming: 'after', saved: true }), 1);
  assert.equal(one({ savedTiming: 'before', saved: true }), 0, '캠프 오기 전에 이미 구원받은 사람');
  assert.equal(one({ saved: true }), 1, '시점 기록이 없던 옛 체크');
  assert.equal(one({ saved: false }), 0);
});

test('단체 신청은 이름이 적힌 참가자마다 따로 센다', () => {
  const reg = { registrationType: 'group', status: 'confirmed', participants: [
    { name: '가', saved: true, savedTiming: 'after', dedicated: true }, { name: '나', saved: true, savedTiming: 'before' }, { name: '  ' }, { name: '다', dedicated: true }, null,
  ] };
  assert.deepEqual(countRegistration(reg), { campers: 3, staff: 0, salvations: 1, dedications: 2 });
  assert.equal(countRegistration({ registrationType: 'group', status: 'deposit', participants: [{ name: '가' }] }).campers, 0);
});

test('캠프가 속한 달은 시작일 기준, 캠퍼스는 id 로 나눈다', () => {
  assert.equal(monthOfSchedule({ startDate: '2026-07-27T00:00:00.000Z' }), '2026-07');
  assert.equal(monthOfSchedule({ startDate: '' }), '');
  assert.equal(campLocation('2026-jeju-momentum-1'), 'jeju');
  assert.equal(campLocation('2026-wolbi-x'), 'jeju');
  assert.equal(campLocation('2026-inland-union'), 'mainland');
});

function setup() {
  resetScheduleCache();
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const schedules = [
    { id: '2025-inland-union', titleKo: '연합 캠프', titleEn: 'Union', startDate: '2025-10-05T00:00:00.000Z', endDate: '2025-10-08' },
    { id: '2025-jeju-english', titleKo: '제주 영어캠프', titleEn: 'Jeju English', startDate: '2025-10-19T00:00:00.000Z', endDate: '2025-10-21' },
    { id: '2025-test-camp', titleKo: '시험', titleEn: 'Test', startDate: '2025-10-01T00:00:00.000Z', endDate: '2025-10-02' },
    { id: '2025-inland-english-junior', titleKo: '주니어', titleEn: 'Junior', startDate: '2025-07-27T00:00:00.000Z', endDate: '2025-08-01' },
    { id: '2099-inland-future', titleKo: '미래 캠프', titleEn: 'Future', startDate: '2099-03-01T00:00:00.000Z', endDate: '2099-03-03' },
  ];
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', ASSETS: { fetch: async () => Response.json(schedules) } };
  const put = (campId, id, reg) => kv.put(`camp:${campId}:reg:${id}`, JSON.stringify(reg));
  const acc = (email, role) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  const req = async (path, who, init = {}) => new Request(`https://t.co${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]) } : {}) } });
  return { env, kv, put, acc, req };
}
const master = ['admin@wolko.org', 'master'], admin = ['hkim3@wol.org', 'admin'], anna = ['anna@wol.org', 'counselor'];

test('월 요약에 캠프 자동 집계(캠퍼 + 스태프)가 평택·제주로 나뉘어 더해진다', async () => {
  const { env, put, acc, req } = setup();
  for (const [e, r] of [master, admin, anna]) await acc(e, r);
  await put('2025-inland-union', 'a', { registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true });
  await put('2025-inland-union', 'b', { registrationType: 'individual', status: 'confirmed', dedicated: true });
  await put('2025-inland-union', 'c', { registrationType: 'individual', status: 'deposit' });
  await put('2025-inland-union', 'd', { registrationType: 'staff', status: 'confirmed' });
  await put('2025-jeju-english', 'e', { registrationType: 'group', status: 'confirmed', participants: [{ name: '가', dedicated: true }, { name: '나' }] });
  await put('2025-test-camp', 'z', { status: 'confirmed' });

  // 스태프는 마스터·관리자만 입력
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', anna, { method: 'POST', body: JSON.stringify({ campId: '2025-inland-union', staff: 4 }) }) })).status, 403);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', null, { method: 'POST', body: '{}' }) })).status, 401);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: 'nope', staff: 4 }) }) })).status, 404);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: '2025-inland-union', staff: -2 }) }) })).status, 400);
  const ok = await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: '2025-inland-union', staff: '4' }) }) });
  assert.equal(ok.status, 200);

  const res = await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2025-10', anna) });
  const data = await res.json();
  assert.equal(data.canEditStaff, false);
  assert.equal(data.campAuto.length, 2, '시험 캠프와 다른 달 캠프는 빠진다');
  const union = data.campAuto.find(c => c.id === '2025-inland-union');
  assert.deepEqual([union.campers, union.staff, union.staffAuto, union.staffExtra, union.salvations, union.dedications, union.location], [2, 5, 1, 4, 1, 1, 'mainland'], '스태프 = 확정 신청 1 + 추가 4');
  assert.equal(data.summary.mainland.campAttendance, 7, '확정 캠퍼 2 + 스태프 5(확정 신청 1 + 추가 4)');
  assert.equal(data.summary.jeju.campAttendance, 2);
  assert.equal(data.summary.all.campAttendance, 9);
  assert.equal(data.summary.all.campCount, 2);
  assert.equal(data.summary.all.campSalvations, 1);
  assert.equal(data.summary.all.campDedications, 2);
  assert.equal(/"(가|나|다)"/.test(JSON.stringify(data)), false, '참가자 이름 같은 개인정보는 응답에 없다');
  const adminView = await (await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2025-10', admin) })).json();
  assert.equal(adminView.canEditStaff, true);

  // 스태프를 0 으로 되돌리면 지워지고, 캠퍼도 없는 캠프는 목록에서 빠진다
  await env.CAMP_KV.delete('gospel:campauto:2025-jeju-english');
  const trendMonth = data.trend.find(t => t.month === '2025-10');
  assert.equal(trendMonth.all.campAttendance, 9, '6개월 표에도 같은 자동 집계가 들어간다');
  const julyMonth = (await (await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2025-07', anna) })).json());
  assert.equal(julyMonth.campAuto.length, 0, '7월 캠프는 확정 캠퍼가 없어 목록에 없다');
});

test('지난 캠프까지 모두: 달이 달라도 모든 캠프가 최근 시작일 순으로 나온다', async () => {
  const { env, put, acc, req } = setup();
  await acc(anna[0], anna[1]);
  await put('2025-inland-english-junior', 'a', { registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true });
  await put('2025-inland-union', 'b', { registrationType: 'individual', status: 'confirmed' });
  await put('2025-jeju-english', 'c', { registrationType: 'individual', status: 'deposit' });
  const none = await GCamps.onRequestGet({ env, request: await req('/api/portal/gospel-camps', null) });
  assert.equal(none.status, 401);
  const res = await (await GCamps.onRequestGet({ env, request: await req('/api/portal/gospel-camps', anna) })).json();
  assert.deepEqual(res.camps.map(c => [c.id, c.month]), [['2025-inland-union', '2025-10'], ['2025-inland-english-junior', '2025-07']], '확정 캠퍼가 없는 캠프(제주)는 뺀다');
  assert.equal(res.camps[1].salvations, 1);
  assert.equal(res.canEditStaff, false);
});

test('캠프 끝나는 날 계산: 실제 일정 글 형식들', () => {
  const end = (start, text) => campEndDate(start + 'T00:00:00.000Z', text);
  assert.equal(end('2026-07-27', '2026년 7월 27일(월) – 8월 1일(토) · 5박 6일'), '2026-08-01');
  assert.equal(end('2026-08-06', '2026년 8월 6일 - 8일'), '2026-08-08');
  assert.equal(end('2027-02-02', '2027년 2월 2일(화) – 5일(금) · 4일'), '2027-02-05');
  assert.equal(end('2026-12-29', '2026년 12월 29일 – 1월 2일'), '2027-01-02', '해를 넘기는 캠프');
  assert.equal(end('2026-09-01', '2026년 9월 1일 · 3박 4일'), '2026-09-04', '줄표가 없으면 일수로');
  assert.equal(end('2026-09-01', '일정 미정'), '2026-09-01');
  assert.equal(campEndDate('', 'x'), '');
});

test('끝난 캠프만 센다: 마지막 날까지는 아직, 다음 날부터 합계에 들어간다', async () => {
  const { env, put } = setup();
  await put('2025-inland-union', 'a', { status: 'confirmed', saved: true, savedTiming: 'after', dedicated: true });
  await put('2099-inland-future', 'f', { status: 'confirmed', saved: true, savedTiming: 'after' });
  assert.equal(isCampFinished('2025-10-08', '2025-10-08'), false, '마지막 날 당일은 아직 진행 중');
  assert.equal(isCampFinished('2025-10-08', '2025-10-09'), true);
  assert.equal(isCampFinished('', '2099-01-01'), false);
  const req = { url: 'https://t.co/x' };
  const dayOf = async (month, today) => monthCamps(env, req, month, today);
  assert.equal((await dayOf('2025-10', '2025-10-08')).find(c => c.id === '2025-inland-union').counted, false, '캠프 마지막 날에는 아직');
  assert.equal((await dayOf('2025-10', '2025-10-09')).find(c => c.id === '2025-inland-union').counted, true);
  const future = (await dayOf('2099-03', '2026-10-25')).find(c => c.id === '2099-inland-future');
  assert.deepEqual([future.counted, future.endDate, future.campers], [false, '2099-03-03', 1], '시작 전 캠프는 목록에는 나오지만 세지 않는다');
  const summary = () => ({ all: { campCount: 0, campAttendance: 0, campSalvations: 0, campDedications: 0 }, mainland: { campCount: 0, campAttendance: 0, campSalvations: 0, campDedications: 0 }, jeju: { campCount: 0, campAttendance: 0, campSalvations: 0, campDedications: 0 } });
  const before = addCampsToSummary(summary(), await dayOf('2025-10', '2025-10-08'));
  assert.deepEqual([before.all.campCount, before.all.campAttendance, before.all.campSalvations], [0, 0, 0], '끝나기 전에는 합계가 0');
  const after = addCampsToSummary(summary(), await dayOf('2025-10', '2025-10-09'));
  assert.deepEqual([after.all.campCount, after.all.campAttendance, after.all.campSalvations, after.all.campDedications], [1, 1, 1, 1]);
  const futureSum = addCampsToSummary(summary(), await dayOf('2099-03', '2026-10-25'));
  assert.equal(futureSum.all.campAttendance, 0, '시작 전 캠프는 합계에 없다');
  const all = await allCamps(env, req, '2026-10-25');
  assert.equal(all.find(c => c.id === '2099-inland-future').counted, false);
  assert.equal(all.find(c => c.id === '2025-inland-union').counted, true);
});
