import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import * as GCamps from '../functions/api/portal/gospel-camps.js';
import { countRegistration, monthOfSchedule, campLocation, resetScheduleCache, isFinalConfirmed } from '../functions/lib/gospelCamps.js';

test('캠퍼 집계: 최종 확정된 신청만, 스태프 신청은 제외', () => {
  assert.deepEqual(countRegistration({ registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true, dedicated: true }), { campers: 1, salvations: 1, dedications: 1 });
  assert.deepEqual(countRegistration({ status: 'confirmed' }), { campers: 1, salvations: 0, dedications: 0 }, 'registrationType 이 없는 옛 개인 신청도 1명');
  assert.equal(countRegistration({ status: 'deposit', saved: true }).campers, 0, '예약금만 낸 신청은 아직 세지 않는다');
  assert.equal(countRegistration({ status: 'pending' }).campers, 0);
  assert.equal(countRegistration({ registrationType: 'staff', status: 'confirmed' }).campers, 0, '스태프 신청은 자동으로 세지 않는다');
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
  assert.deepEqual(countRegistration(reg), { campers: 3, salvations: 1, dedications: 2 });
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
    { id: '2026-inland-union', titleKo: '연합 캠프', titleEn: 'Union', startDate: '2026-10-05T00:00:00.000Z' },
    { id: '2026-jeju-english', titleKo: '제주 영어캠프', titleEn: 'Jeju English', startDate: '2026-10-19T00:00:00.000Z' },
    { id: '2026-test-camp', titleKo: '시험', titleEn: 'Test', startDate: '2026-10-01T00:00:00.000Z' },
    { id: '2026-inland-english-junior', titleKo: '주니어', titleEn: 'Junior', startDate: '2026-07-27T00:00:00.000Z' },
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
  await put('2026-inland-union', 'a', { registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true });
  await put('2026-inland-union', 'b', { registrationType: 'individual', status: 'confirmed', dedicated: true });
  await put('2026-inland-union', 'c', { registrationType: 'individual', status: 'deposit' });
  await put('2026-inland-union', 'd', { registrationType: 'staff', status: 'confirmed' });
  await put('2026-jeju-english', 'e', { registrationType: 'group', status: 'confirmed', participants: [{ name: '가', dedicated: true }, { name: '나' }] });
  await put('2026-test-camp', 'z', { status: 'confirmed' });

  // 스태프는 마스터·관리자만 입력
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', anna, { method: 'POST', body: JSON.stringify({ campId: '2026-inland-union', staff: 4 }) }) })).status, 403);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', null, { method: 'POST', body: '{}' }) })).status, 401);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: 'nope', staff: 4 }) }) })).status, 404);
  assert.equal((await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: '2026-inland-union', staff: -2 }) }) })).status, 400);
  const ok = await GCamps.onRequestPost({ env, request: await req('/api/portal/gospel-camps', admin, { method: 'POST', body: JSON.stringify({ campId: '2026-inland-union', staff: '4' }) }) });
  assert.equal(ok.status, 200);

  const res = await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2026-10', anna) });
  const data = await res.json();
  assert.equal(data.canEditStaff, false);
  assert.equal(data.campAuto.length, 2, '시험 캠프와 다른 달 캠프는 빠진다');
  const union = data.campAuto.find(c => c.id === '2026-inland-union');
  assert.deepEqual([union.campers, union.staff, union.salvations, union.dedications, union.location], [2, 4, 1, 1, 'mainland']);
  assert.equal(data.summary.mainland.campAttendance, 6, '확정 캠퍼 2 + 스태프 4');
  assert.equal(data.summary.jeju.campAttendance, 2);
  assert.equal(data.summary.all.campAttendance, 8);
  assert.equal(data.summary.all.campCount, 2);
  assert.equal(data.summary.all.campSalvations, 1);
  assert.equal(data.summary.all.campDedications, 2);
  assert.equal(/"(가|나|다)"/.test(JSON.stringify(data)), false, '참가자 이름 같은 개인정보는 응답에 없다');
  const adminView = await (await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2026-10', admin) })).json();
  assert.equal(adminView.canEditStaff, true);

  // 스태프를 0 으로 되돌리면 지워지고, 캠퍼도 없는 캠프는 목록에서 빠진다
  await env.CAMP_KV.delete('gospel:campauto:2026-jeju-english');
  const trendMonth = data.trend.find(t => t.month === '2026-10');
  assert.equal(trendMonth.all.campAttendance, 8, '6개월 표에도 같은 자동 집계가 들어간다');
  const julyMonth = (await (await G.onRequestGet({ env, request: await req('/api/portal/gospel-stats?month=2026-07', anna) })).json());
  assert.equal(julyMonth.campAuto.length, 0, '7월 캠프는 확정 캠퍼가 없어 목록에 없다');
});

test('지난 캠프까지 모두: 달이 달라도 모든 캠프가 최근 시작일 순으로 나온다', async () => {
  const { env, put, acc, req } = setup();
  await acc(anna[0], anna[1]);
  await put('2026-inland-english-junior', 'a', { registrationType: 'individual', status: 'confirmed', savedTiming: 'after', saved: true });
  await put('2026-inland-union', 'b', { registrationType: 'individual', status: 'confirmed' });
  await put('2026-jeju-english', 'c', { registrationType: 'individual', status: 'deposit' });
  const none = await GCamps.onRequestGet({ env, request: await req('/api/portal/gospel-camps', null) });
  assert.equal(none.status, 401);
  const res = await (await GCamps.onRequestGet({ env, request: await req('/api/portal/gospel-camps', anna) })).json();
  assert.deepEqual(res.camps.map(c => [c.id, c.month]), [['2026-inland-union', '2026-10'], ['2026-inland-english-junior', '2026-07']], '확정 캠퍼가 없는 캠프(제주)는 뺀다');
  assert.equal(res.camps[1].salvations, 1);
  assert.equal(res.canEditStaff, false);
});
