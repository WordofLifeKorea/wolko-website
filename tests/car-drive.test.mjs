import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { periodFor, shiftPeriod, todayKst, isDriveDay } from '../functions/lib/carDrive.js';
import * as D from '../functions/api/car/drive.js';
import * as RM from '../functions/api/car/drive-reminders.js';

function memoryEnv(extra = {}) {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'test-secret',
    CAMP_KV: {
      async get(key, type) { const v = values.get(key); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); },
    },
    ...extra,
  };
}
async function addAccount(env, email, name, extra = {}) {
  await env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name, status: 'approved', phone: '010-1234-5678', campus: 'wolko', ...extra }));
  return createHubSessionToken(env.ADMIN_PASSWORD, email, extra.role || 'counselor');
}
const req = (method, path, token, body) => new Request('https://t.co' + path, {
  method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
});
const nextWeekday = () => { // 오늘 이후 가장 가까운 화요일
  const d = new Date(todayKst() + 'T00:00:00Z');
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 2);
  return d.toISOString().slice(0, 10);
};

test('2주 구간: 월요일 시작, 월~금 × 2주 = 10일, 앞뒤로 14일씩 이동', () => {
  const p = periodFor('2026-10-08');
  assert.equal(p.start, '2026-10-05');
  assert.equal(p.end, '2026-10-18');
  assert.equal(p.days.length, 10);
  assert.deepEqual([p.days[0], p.days[4], p.days[5], p.days[9]], ['2026-10-05', '2026-10-09', '2026-10-12', '2026-10-16']);
  assert.equal(periodFor('2026-10-19').start, '2026-10-19');
  assert.equal(periodFor('2026-10-04').start, '2026-09-21', '기준일 이전도 14일 단위');
  assert.equal(shiftPeriod('2026-10-05', 1), '2026-10-19');
  assert.equal(isDriveDay('2026-10-11'), false, '일요일은 제외');
  assert.equal(isDriveDay('2026-10-10'), false, '토요일도 제외');
});

test('평택센터 멤버만 신청할 수 있고, 제주 소속은 거절된다', async () => {
  const env = memoryEnv();
  const pt = await addAccount(env, 'pt@x.com', '평택 멤버');
  const jj = await addAccount(env, 'jj@x.com', '제주 멤버', { campus: 'jeju' });
  const jeremy = await addAccount(env, 'jeremyrodgers@wol.org', 'Jeremy');
  assert.equal((await D.onRequestGet({ env, request: req('GET', '/api/car/drive', pt) })).status, 200);
  assert.equal((await D.onRequestGet({ env, request: req('GET', '/api/car/drive', jj) })).status, 403);
  assert.equal((await D.onRequestGet({ env, request: req('GET', '/api/car/drive', jeremy) })).status, 403, 'Jeremy는 제주로 고정');
  assert.equal((await D.onRequestGet({ env, request: req('GET', '/api/car/drive', 'bad') })).status, 401);
});

test('칸 신청 · 중복 거절 · 본인만 취소 · 휴대폰 번호 필요', async () => {
  const env = memoryEnv();
  const a = await addAccount(env, 'a@x.com', '가나다');
  const b = await addAccount(env, 'b@x.com', '라마바', { phone: '' });
  const admin = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  const date = nextWeekday();
  const post = (token, body) => D.onRequestPost({ env, request: req('POST', '/api/car/drive', token, body) });
  assert.equal((await post(a, { date, slot: 'pickup' })).status, 201);
  assert.equal((await post(b, { date, slot: 'pickup', phone: '010-9999-0000' })).status, 409, '이미 찬 칸');
  assert.equal((await post(b, { date, slot: 'pickup' })).status, 400, '번호가 없으면 오전 픽업 신청 불가');
  assert.equal((await post(b, { date, slot: 'dropoff' })).status, 201, '드롭오프는 번호 없이도 가능');
  assert.equal((await post(a, { date: '2020-01-06', slot: 'pickup' })).status, 400, '지난 날짜');
  assert.equal((await post(a, { date: '2026-10-11', slot: 'pickup' })).status, 400, '일요일');
  assert.equal((await post(a, { date: '2026-10-10', slot: 'pickup' })).status, 400, '토요일');
  const get = async token => (await D.onRequestGet({ env, request: req('GET', `/api/car/drive?start=${date}`, token) })).json();
  const view = await get(b);
  assert.deepEqual(view.slots[`${date}:pickup`], { name: '가나다', mine: false });
  assert.equal(JSON.stringify(view).includes('010-'), view.me.phone ? true : false, '다른 사람 번호는 목록에 나가지 않는다');
  const del = (token, slot) => D.onRequestDelete({ env, request: req('DELETE', `/api/car/drive?date=${date}&slot=${slot}`, token) });
  assert.equal((await del(b, 'pickup')).status, 403);
  assert.equal((await del(a, 'pickup')).status, 200);
  assert.equal((await post(b, { date, slot: 'pickup', phone: '010-9999-0000' })).status, 201, '취소 후 다시 신청 가능');
  assert.equal((await del(admin, 'pickup')).status, 200, '마스터는 누구든 취소');
});

test('/api/hub/me 는 로그인한 계정의 이름과 이메일을 돌려준다', async () => {
  const { onRequestGet } = await import('../functions/api/hub/me.js');
  const env = memoryEnv();
  const token = await addAccount(env, 'a@x.com', '김환규');
  const ok = await onRequestGet({ env, request: req('GET', '/api/hub/me', token) });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { name: '김환규', email: 'a@x.com', role: 'counselor', phone: '010-1234-5678', campus: 'wolko', mustChangePassword: false });
  assert.equal((await onRequestGet({ env, request: req('GET', '/api/hub/me', 'bad') })).status, 401);
});

test('지정된 표시 이름(hkim3 → 김환규)이 신청 칸과 문자에 쓰인다 — 이미 저장된 신청도 이름으로 보인다', async () => {
  const env = memoryEnv();
  const token = await addAccount(env, 'hkim3@wol.org', 'hkim3');
  const date = nextWeekday();
  await env.CAMP_KV.put(`drive:slot:${date}:pickup`, JSON.stringify({ date, slot: 'pickup', email: 'hkim3@wol.org', name: 'hkim3', phone: '010-1234-5678' }));
  const view = await (await D.onRequestGet({ env, request: req('GET', `/api/car/drive?start=${date}`, token) })).json();
  assert.equal(view.slots[`${date}:pickup`].name, '김환규');
  const ok = await D.onRequestPost({ env, request: req('POST', '/api/car/drive', token, { date, slot: 'dropoff' }) });
  assert.equal((await ok.json()).slot.name, '김환규');
  assert.equal(RM.reminderText('김환규', date).includes('김환규님'), true);
});

test('내 정보 수정: 이름과 휴대폰만 바꿀 수 있고, 바꾼 이름이 곧바로 쓰인다', async () => {
  const { onRequestGet, onRequestPatch } = await import('../functions/api/hub/me.js');
  const env = memoryEnv();
  const token = await addAccount(env, 'hkim3@wol.org', 'hkim3', { campus: 'wolko' });
  const get = async () => (await onRequestGet({ env, request: req('GET', '/api/hub/me', token) })).json();
  assert.equal((await get()).name, '김환규', '이름이 이메일 앞부분뿐이면 지정된 표시 이름');
  const patch = body => onRequestPatch({ env, request: req('PATCH', '/api/hub/me', token, body) });
  assert.equal((await patch({ name: '', phone: '010-1111-2222' })).status, 400);
  assert.equal((await patch({ name: 'a@b.c' })).status, 400);
  assert.equal((await patch({ name: 'Hwankyu Kim', phone: 'abc' })).status, 400);
  const ok = await patch({ name: 'Hwankyu Kim', phone: '010-9999-8888', campus: 'jeju', role: 'master', email: 'x@y.z' });
  assert.equal(ok.status, 200);
  const me = await ok.json();
  assert.deepEqual([me.name, me.phone, me.campus, me.email, me.role], ['Hwankyu Kim', '010-9999-8888', 'wolko', 'hkim3@wol.org', 'admin'], '소속 · 역할 · 이메일은 바뀌지 않는다(역할은 코드의 관리자 목록 기준)');
  assert.equal((await get()).name, 'Hwankyu Kim', '직접 고친 이름이 표시 이름보다 우선');
  const date = nextWeekday();
  const slot = await (await D.onRequestPost({ env, request: req('POST', '/api/car/drive', token, { date, slot: 'pickup' }) })).json();
  assert.equal(slot.slot.name, 'Hwankyu Kim');
});

test('가입 때 등급(관리자/일반 멤버)을 고르고, 관리자는 wol.org 이메일만 신청할 수 있다', async () => {
  const S = await import('../functions/api/hub/signup.js');
  const env = memoryEnv({ RESEND_API_KEY: 'x' });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
  const signup = body => S.onRequestPost({ env, request: new Request('https://t.co/api/hub/signup', { method: 'POST', body: JSON.stringify({ phone: '010-1111-2222', password: 'Passw0rd!x', campus: 'wolko', ...body }) }) });
  const bad = await signup({ name: '가', email: 'a@gmail.com', requestedRole: 'admin' });
  assert.equal(bad.status, 400, '관리자는 wol.org만');
  const admin = await signup({ name: '나', email: 'b@wol.org', requestedRole: 'admin' });
  assert.equal(admin.status, 200);
  const member = await signup({ name: '다', email: 'c@gmail.com' });
  assert.equal(member.status, 200);
  const get = async email => JSON.parse(await env.CAMP_KV.get(`hub:account:${email}`));
  assert.deepEqual([(await get('b@wol.org')).requestedRole, (await get('b@wol.org')).role, (await get('b@wol.org')).status], ['admin', null, 'pending'], '신청일 뿐 승인 전에는 권한이 없다');
  assert.equal((await get('c@gmail.com')).requestedRole, 'member');
});

test('등급은 코드의 목록이 기준: 마스터 wolkorea1 · 관리자 4명 · 나머지는 일반 멤버, 승인에서도 목록 밖은 관리자로 못 올린다', async () => {
  const H = await import('../functions/lib/hubAccounts.js');
  assert.deepEqual(H.MASTER_EMAILS, ['wolkorea1@gmail.com']);
  for (const e of ['hkim3@wol.org', 'jacobmorse@wol.org', 'samuelsong@wol.org', 'jeremyrodgers@wol.org']) assert.equal(H.effectiveRole(e, 'counselor'), 'admin', e);
  assert.equal(H.effectiveRole('wolkorea1@gmail.com', 'counselor'), 'master');
  assert.equal(H.effectiveRole('someone@wol.org', 'admin'), 'counselor', '예전에 admin이던 계정도 목록에 없으면 일반 멤버');
  assert.equal(H.effectiveRole('someone@wol.org', 'master'), 'counselor');
  const env = memoryEnv();
  const token = await H.createHubSessionToken(env.ADMIN_PASSWORD, 'someone@wol.org', 'admin');
  assert.equal((await H.parseHubSessionToken(env.ADMIN_PASSWORD, token)).role, 'counselor');
  const { onRequestPost: approve } = await import('../functions/api/hub/approve.js');
  const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  await env.CAMP_KV.put('hub:account:someone@wol.org', JSON.stringify({ email: 'someone@wol.org', name: 's', status: 'pending', requestedRole: 'admin' }));
  const post = body => approve({ env, request: new Request('https://t.co/api/hub/approve', { method: 'POST', headers: { Authorization: `Bearer ${master}` }, body: JSON.stringify(body) }) });
  assert.equal((await post({ email: 'someone@wol.org', action: 'approve', role: 'admin' })).status, 400, '목록 밖 관리자 승인 거절');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
  env.RESEND_API_KEY = 'x';
  assert.equal((await post({ email: 'someone@wol.org', action: 'approve', role: 'counselor' })).status, 200, '일반 멤버로는 승인');
});

test('운행 스케줄 관리자는 라이드가 필요 없는 칸을 닫고 열 수 있다', async () => {
  const env = memoryEnv();
  const estelle = await addAccount(env, 'esooy@wol.org', 'Estelle Sooy');
  const a = await addAccount(env, 'a@x.com', '가나다');
  const date = nextWeekday();
  const put = (token, body) => D.onRequestPut({ env, request: req('PUT', '/api/car/drive', token, body) });
  const post = (token, body) => D.onRequestPost({ env, request: req('POST', '/api/car/drive', token, body) });
  const get = async token => (await D.onRequestGet({ env, request: req('GET', `/api/car/drive?start=${date}`, token) })).json();

  assert.equal((await get(a)).me.isManager, false);
  assert.equal((await get(estelle)).me.isManager, true);
  assert.equal((await put(a, { date, slot: 'pickup', closed: true })).status, 403, '일반 멤버는 닫을 수 없다');

  assert.equal((await post(a, { date, slot: 'pickup' })).status, 201);
  const closed = await put(estelle, { date, slot: 'pickup', closed: true });
  assert.equal(closed.status, 200);
  assert.deepEqual((await closed.json()).cancelled, [{ slot: 'pickup', name: '가나다' }], '이미 신청한 사람의 신청은 취소된다');
  const view = await get(a);
  assert.equal(view.closed[`${date}:pickup`], true);
  assert.equal(view.slots[`${date}:pickup`], undefined);
  assert.equal((await post(a, { date, slot: 'pickup' })).status, 409, '닫힌 칸은 신청할 수 없다');
  assert.equal((await post(a, { date, slot: 'dropoff' })).status, 201, '다른 칸은 그대로');

  assert.equal((await put(estelle, { date, slot: 'pickup', closed: false })).status, 200);
  assert.equal((await post(a, { date, slot: 'pickup' })).status, 201, '다시 열면 신청할 수 있다');

  const all = await put(estelle, { date, slot: 'all', closed: true });
  assert.equal((await all.json()).cancelled.length, 2, '하루 전체를 닫으면 두 칸의 신청이 모두 취소된다');
  const day = await get(a);
  assert.ok(day.closed[`${date}:pickup`] && day.closed[`${date}:dropoff`]);
  assert.equal((await put(estelle, { date: '2026-10-10', slot: 'pickup', closed: true })).status, 400, '주말은 칸이 없다');
  assert.equal((await put(estelle, { date: '2020-01-06', slot: 'pickup', closed: true })).status, 409, '지난 날짜는 바꿀 수 없다');
});

// ── 운행 알림 (카카오 알림톡 우선 · 문자 대체 · 시각 설정) ──
const seedSlot = (env, date, slot, email, name, phone, at = '2026-01-01T00:00:00Z') =>
  env.CAMP_KV.put(`drive:slot:${date}:${slot}`, JSON.stringify({ date, slot, email, name, phone, at }));
const remEnv = (extra = {}) => memoryEnv({ DRIVE_REMINDER_SECRET: 'cron-secret', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '010-0000-1111', KAKAO_PF_ID: 'KA01PF', KAKAO_TEMPLATE_DRIVE_PICKUP: 'tp-am', KAKAO_TEMPLATE_DRIVE_DROPOFF: 'tp-pm', ...extra });
const remRun = (env, query, secret = 'cron-secret') => RM.onRequestPost({ env, request: new Request('https://t.co/api/car/drive-reminders?' + query, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });
const captureSolapi = (okFor = () => true) => { const sent = []; globalThis.fetch = async (url, o) => { const m = JSON.parse(o.body).message; sent.push(m); return okFor(m) ? { ok: true, json: async () => ({}) } : { ok: false, text: async () => 'template error' }; }; return sent; };
const MON = '2026-10-12', TUE = '2026-10-13', FRI = '2026-10-16', SAT = '2026-10-17';

test('오전 알림: 요일과 상관없이 신청이 있는 날 오전 8시에 알림톡(+문자 대체)으로 한 번만', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  for (const d of [MON, SAT]) await seedSlot(env, d, 'pickup', 'a@x.com', '가나다', '010-1111-2222');
  assert.equal((await remRun(env, `date=${MON}&time=07:30&slot=pickup`, 'wrong')).status, 401);
  const early = await (await remRun(env, `date=${MON}&time=07:30&slot=pickup`)).json();
  assert.equal(early.results[0].skipped, 'not-yet');
  assert.equal(sent.length, 0, '8시 전에는 보내지 않는다');
  for (const d of [MON, SAT]) {   // 토요일에 신청이 남아 있어도 보낸다
    const res = await (await remRun(env, `date=${d}&time=08:00&slot=pickup`)).json();
    assert.equal(res.sent, 1, d);
  }
  const m = sent[0];
  assert.equal(m.to, '01011112222');
  assert.equal(m.kakaoOptions.templateId, 'tp-am');
  assert.equal(m.kakaoOptions.pfId, 'KA01PF');
  assert.equal(m.kakaoOptions.disableSms, false);
  assert.equal(m.kakaoOptions.variables['#{이름}'], '가나다');
  assert.match(m.kakaoOptions.variables['#{날짜}'], /^10\/12 월$/);
  assert.equal(m.from, '01000001111');
  assert.match(m.text, /가나다님.*오전 픽업/);
  assert.equal((await (await remRun(env, `date=${MON}&time=08:30&slot=pickup`)).json()).results[0].alreadySent, true, '같은 날 두 번 보내지 않는다');
  assert.equal(sent.length, 2);
  assert.equal((await (await remRun(env, `date=${MON}&time=15:00&slot=pickup`)).json()).results[0].skipped, 'too-late', '시각이 한참 지난 뒤에는 보내지 않는다');
});

test('오후 알림: 화~목 17:00, 금 12:00, 월요일은 보내지 않는다 (기본값)', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  for (const d of [MON, TUE, FRI]) await seedSlot(env, d, 'dropoff', 'b@x.com', '라마바', '010-3333-4444');
  const at = async (date, time) => (await (await remRun(env, `date=${date}&time=${time}&slot=dropoff`)).json()).results[0];
  assert.equal((await at(TUE, '16:30')).skipped, 'not-yet');
  assert.equal((await at(TUE, '17:00')).sent, 1);
  assert.equal((await at(FRI, '11:30')).skipped, 'not-yet');
  assert.equal((await at(FRI, '12:00')).sent, 1);
  assert.equal((await at(MON, '17:00')).skipped, 'no-time-set', '월요일은 시간이 없어 보내지 않는다');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].kakaoOptions.templateId, 'tp-pm');
  assert.match(sent[0].text, /라마바님.*권사님 오후 라이드 담당입니다\. 감사합니다!/);
  assert.equal((await at(TUE, '17:30')).alreadySent, true);
});

test('알림 시각 이후에 신청한 사람에게는 보내지 않고, 알림톡 요청이 거절되면 문자로 다시 보낸다', async () => {
  const env = remEnv();
  const sent = captureSolapi(m => !m.kakaoOptions);   // 알림톡 요청은 거절
  await seedSlot(env, TUE, 'pickup', 'a@x.com', '가나다', '010-1111-2222', '2026-10-12T22:30:00Z'); // 한국 시간 10/13 07:30 신청
  await seedSlot(env, TUE, 'dropoff', 'b@x.com', '라마바', '010-3333-4444', '2026-10-13T08:30:00Z'); // 한국 시간 17:30 신청 (17:00 이후)
  const am = (await (await remRun(env, `date=${TUE}&time=08:00&slot=pickup`)).json()).results[0];
  assert.equal(am.firstChannel, 'sms');
  assert.equal(sent.length, 2, '알림톡 거절 → 문자 재발송');
  assert.ok(!sent[1].kakaoOptions && sent[1].text);
  const pm = (await (await remRun(env, `date=${TUE}&time=17:00&slot=dropoff`)).json()).results[0];
  assert.equal(pm.skipped, 'signed-up-after');
  assert.equal(sent.length, 2);
});

test('발송 시각 설정: 관리자만 보고 바꾸고, 바꾼 시각대로 보낸다', async () => {
  const S = await import('../functions/api/car/drive-settings.js');
  const env = remEnv();
  const sent = captureSolapi();
  const estelle = await addAccount(env, 'esooy@wol.org', 'Estelle Sooy');
  const a = await addAccount(env, 'a@x.com', '가나다', { phone: '010-1111-2222' });
  const call = (fn, token, body) => fn({ env, request: req(body ? 'PUT' : 'GET', '/api/car/drive-settings', token, body) });
  assert.equal((await call(S.onRequestGet, a)).status, 403, '일반 멤버는 볼 수 없다');
  assert.equal((await call(S.onRequestPut, a, { pickup: '09:00', dropoff: {} })).status, 403);
  const got = await (await call(S.onRequestGet, estelle)).json();
  assert.equal(got.settings.pickup, '08:00');
  assert.deepEqual(got.settings.dropoff, { 1: null, 2: '17:00', 3: '17:00', 4: '17:00', 5: '12:00' });
  assert.equal((await call(S.onRequestPut, estelle, { pickup: '08:15', dropoff: {} })).status, 400, '30분 단위만');
  assert.equal((await call(S.onRequestPut, estelle, { pickup: '09:00', dropoff: { 1: '16:00', 2: '18:30', 3: null, 4: '17:00', 5: '12:00' } })).status, 200);
  await seedSlot(env, MON, 'pickup', 'a@x.com', '가나다', '010-1111-2222');
  await seedSlot(env, MON, 'dropoff', 'a@x.com', '가나다', '010-1111-2222');
  await seedSlot(env, TUE, 'dropoff', 'a@x.com', '가나다', '010-1111-2222');
  const r = async (date, time, slot) => (await (await remRun(env, `date=${date}&time=${time}&slot=${slot}`)).json()).results[0];
  assert.equal((await r(MON, '08:00', 'pickup')).skipped, 'not-yet', '오전은 9시로 바뀜');
  assert.equal((await r(MON, '09:00', 'pickup')).sent, 1);
  assert.equal((await r(MON, '16:00', 'dropoff')).sent, 1, '월요일 오후 알림을 새로 켬');
  assert.equal((await r(TUE, '17:00', 'dropoff')).skipped, 'not-yet', '화요일은 18:30으로 바뀜');
  assert.equal((await r(TUE, '18:30', 'dropoff')).sent, 1);
});
