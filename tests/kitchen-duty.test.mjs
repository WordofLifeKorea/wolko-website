import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { isDefaultOpen, isSlotClosed, applyOpenState, todayKst } from '../functions/lib/kitchenDuty.js';
import { normalizeSettings, reminderTime } from '../functions/lib/kitchenSettings.js';
import * as K from '../functions/api/kitchen/duty.js';
import * as KS from '../functions/api/kitchen/settings.js';
import * as KM from '../functions/api/kitchen/members.js';
import * as KR from '../functions/api/kitchen/reminders.js';

function memoryEnv(extra = {}) {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'test-secret',
    CAMP_KV: {
      async get(key, type) { const v = values.get(key); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); },
      async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
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
const nextTuesday = () => { // 오늘 이후 가장 가까운 화요일 — 점심·저녁이 기본으로 열려 있는 날
  const d = new Date(todayKst() + 'T00:00:00Z');
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 2);
  return d.toISOString().slice(0, 10);
};
const MANAGER = 'esooy@wol.org';

async function world() {
  const env = memoryEnv();
  const t = {
    a: await addAccount(env, 'a@x.com', '가나다'),
    b: await addAccount(env, 'b@x.com', '라마바'),
    c: await addAccount(env, 'c@x.com', '사아자'),
    d: await addAccount(env, 'd@x.com', '차카타'),
    e: await addAccount(env, 'e@x.com', '파하갸'),
    mgr: await addAccount(env, MANAGER, 'Estelle'),
    jeju: await addAccount(env, 'jj@x.com', '제주 멤버', { campus: 'jeju' }),
    master: await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master'),
  };
  const call = (fn, method, path, token, body) => fn({ env, request: req(method, path, token, body) });
  const post = (token, body) => call(K.onRequestPost, 'POST', '/api/kitchen/duty', token, body);
  const put = (token, body) => call(K.onRequestPut, 'PUT', '/api/kitchen/duty', token, body);
  const patch = (token, body) => call(K.onRequestPatch, 'PATCH', '/api/kitchen/duty', token, body);
  const del = (token, date, slot, email) => call(K.onRequestDelete, 'DELETE', `/api/kitchen/duty?date=${date}&slot=${slot}${email ? `&email=${encodeURIComponent(email)}` : ''}`, token);
  const get = async (token, start) => (await call(K.onRequestGet, 'GET', `/api/kitchen/duty${start ? `?start=${start}` : ''}`, token)).json();
  return { env, t, post, put, patch, del, get, call };
}

test('기본 열림: 화·수·목은 점심+저녁, 금은 점심만, 아침과 나머지 요일은 닫힘', () => {
  assert.equal(isDefaultOpen('2026-10-13', 'lunch_prep'), true, '화 점심 준비');
  assert.equal(isDefaultOpen('2026-10-13', 'dinner_clean'), true, '화 저녁 클린업');
  assert.equal(isDefaultOpen('2026-10-15', 'dinner_prep'), true, '목 저녁');
  assert.equal(isDefaultOpen('2026-10-16', 'lunch_clean'), true, '금 점심');
  assert.equal(isDefaultOpen('2026-10-16', 'dinner_prep'), false, '금 저녁은 닫힘');
  assert.equal(isDefaultOpen('2026-10-13', 'am_prep'), false, '아침은 기본 닫힘');
  assert.equal(isDefaultOpen('2026-10-12', 'lunch_prep'), false, '월요일 닫힘');
  assert.equal(isDefaultOpen('2026-10-17', 'lunch_prep'), false, '토요일 닫힘');
  const map = {};
  applyOpenState(map, '2026-10-13', 'am_prep', true, 'm@x.com');
  assert.equal(isSlotClosed(map, '2026-10-13', 'am_prep'), false, '관리자가 열면 열림');
  applyOpenState(map, '2026-10-13', 'am_prep', false, 'm@x.com');
  assert.deepEqual(map, {}, '기본값으로 돌아가면 기록을 지운다');
  assert.equal(isSlotClosed({}, '2026-10-17', 'lunch_prep', true), false, '이미 신청이 있는 칸은 닫지 않는다');
});

test('평택센터 멤버만 쓸 수 있고, 제주 소속과 로그인 안 한 사람은 거절된다', async () => {
  const w = await world();
  assert.equal((await w.call(K.onRequestGet, 'GET', '/api/kitchen/duty', w.t.a)).status, 200);
  assert.equal((await w.call(K.onRequestGet, 'GET', '/api/kitchen/duty', w.t.jeju)).status, 403);
  assert.equal((await w.call(K.onRequestGet, 'GET', '/api/kitchen/duty', 'bad')).status, 401);
});

test('한 칸의 기본 정원은 2명 — 둘까지 신청되고 셋째는 거절, 같은 칸 중복 신청도 거절', async () => {
  const w = await world();
  const date = nextTuesday();
  assert.equal((await w.post(w.t.a, { date, slot: 'lunch_prep' })).status, 201);
  assert.equal((await w.post(w.t.a, { date, slot: 'lunch_prep' })).status, 409, '같은 사람 중복');
  assert.equal((await w.post(w.t.b, { date, slot: 'lunch_prep' })).status, 201);
  const full = await w.post(w.t.c, { date, slot: 'lunch_prep' });
  assert.equal(full.status, 409);
  assert.match((await full.json()).error, /정원이 찼/);
  assert.equal((await w.post(w.t.c, { date, slot: 'lunch_clean' })).status, 201, '다른 칸은 따로 센다');
  assert.equal((await w.post(w.t.a, { date, slot: 'lunch_clean' })).status, 201, '같은 끼니의 준비와 클린업을 둘 다 할 수 있다');
  const view = await w.get(w.t.b, date);
  assert.deepEqual(view.slots[`${date}:lunch_prep`].map(p => [p.name, p.mine]), [['가나다', false], ['라마바', true]]);
  assert.equal(view.slots[`${date}:lunch_prep`][0].email, undefined, '일반 멤버에게는 이메일을 주지 않는다');
  assert.equal(view.defaultCapacity, 2);
  assert.deepEqual(view.caps, {});
  assert.equal(view.maxCapacity, 4);
});

test('신청 조건: 닫힌 칸 · 지난 날짜 · 휴대폰 번호 · 잘못된 칸 이름', async () => {
  const w = await world();
  const noPhone = await addAccount(w.env, 'np@x.com', '번호없음', { phone: '' });
  const date = nextTuesday();
  assert.equal((await w.post(w.t.a, { date, slot: 'am_prep' })).status, 409, '아침은 기본 닫힘');
  assert.equal((await w.post(w.t.a, { date: '2020-01-07', slot: 'lunch_prep' })).status, 400, '지난 날짜');
  assert.equal((await w.post(w.t.a, { date, slot: 'brunch' })).status, 400, '없는 칸');
  assert.equal((await w.post(noPhone, { date, slot: 'lunch_prep' })).status, 400, '알림을 받을 번호가 없으면 신청 불가');
  assert.equal((await w.post(noPhone, { date, slot: 'lunch_prep', phone: '010-9999-0000' })).status, 201, '번호를 입력하면 가능');
});

test('취소: 본인만, 관리자는 다른 사람도 — 지난 날짜 취소는 관리자만', async () => {
  const w = await world();
  const date = nextTuesday();
  await w.post(w.t.a, { date, slot: 'dinner_prep' });
  await w.post(w.t.b, { date, slot: 'dinner_prep' });
  assert.equal((await w.del(w.t.c, date, 'dinner_prep', 'a@x.com')).status, 403, '남의 신청은 못 취소');
  assert.equal((await w.del(w.t.b, date, 'dinner_prep', 'a@x.com')).status, 403);
  assert.equal((await w.del(w.t.b, date, 'dinner_prep')).status, 200, '내 것은 취소');
  let view = await w.get(w.t.a, date);
  assert.deepEqual(view.slots[`${date}:dinner_prep`].map(p => p.name), ['가나다'], '한 명만 빠지고 한 명은 남는다');
  assert.equal((await w.del(w.t.mgr, date, 'dinner_prep', 'a@x.com')).status, 200, '주방 관리자는 다른 사람도');
  view = await w.get(w.t.a, date);
  assert.equal(view.slots[`${date}:dinner_prep`], undefined, '비면 칸이 사라진다');
});

test('정원 변경: 주방 관리자만, 1~4명, 이미 신청한 인원보다는 줄일 수 없고, 기본 인원으로 되돌릴 수 있다', async () => {
  const w = await world();
  const date = nextTuesday();
  const slot = 'lunch_prep';
  await w.post(w.t.a, { date, slot });
  await w.post(w.t.b, { date, slot });
  assert.equal((await w.post(w.t.c, { date, slot })).status, 409, '기본 2명이라 셋째는 막힘');
  assert.equal((await w.put(w.t.a, { date, slot, capacity: 4 })).status, 403, '일반 멤버는 못 바꾼다');
  assert.equal((await w.put(w.t.mgr, { date, slot, capacity: 5 })).status, 400, '5명은 안 된다');
  assert.equal((await w.put(w.t.mgr, { date, slot, capacity: 0 })).status, 400);
  assert.equal((await w.put(w.t.mgr, { date, slot: 'all', capacity: 3 })).status, 400, '정원은 칸 하나씩');
  assert.equal((await w.put(w.t.mgr, { date, slot, capacity: 4 })).status, 200);
  assert.equal((await w.post(w.t.c, { date, slot })).status, 201);
  assert.equal((await w.post(w.t.d, { date, slot })).status, 201);
  assert.equal((await w.post(w.t.e, { date, slot })).status, 409, '4명이 최대');
  assert.equal((await w.get(w.t.a, date)).caps[`${date}:${slot}`], 4);
  const tooSmall = await w.put(w.t.mgr, { date, slot, capacity: 3 });
  assert.equal(tooSmall.status, 409, '4명이 신청한 칸을 3명으로 줄일 수 없다');
  assert.match((await tooSmall.json()).error, /4명이 신청/);
  assert.equal((await w.put(w.t.master, { date, slot, capacity: null })).status, 409, '기본(2명)으로 되돌리는 것도 인원보다 적으면 거절');
  await w.del(w.t.mgr, date, slot, 'c@x.com'); await w.del(w.t.mgr, date, slot, 'd@x.com');
  assert.equal((await w.put(w.t.master, { date, slot, capacity: null })).status, 200, '마스터도 가능');
  assert.deepEqual((await w.get(w.t.a, date)).caps, {}, '기본으로 돌아가면 따로 기록하지 않는다');
});

test('기본 인원 설정: 관리자만 보고 바꾸며, 바꾸면 모든 칸에 적용된다', async () => {
  const w = await world();
  const date = nextTuesday();
  const settingsReq = (method, token, body) => (method === 'GET' ? KS.onRequestGet : KS.onRequestPut)({ env: w.env, request: req(method, '/api/kitchen/settings', token, body) });
  assert.equal((await settingsReq('GET', w.t.a)).status, 403);
  const first = await (await settingsReq('GET', w.t.mgr)).json();
  assert.deepEqual(first.settings, { meals: { am: '08:00', lunch: '12:00', dinner: '18:00' }, capacity: 2 });
  assert.equal((await settingsReq('PUT', w.t.a, first.settings)).status, 403);
  assert.equal((await settingsReq('PUT', w.t.mgr, { ...first.settings, capacity: 5 })).status, 400);
  assert.equal((await settingsReq('PUT', w.t.mgr, { ...first.settings, meals: { ...first.settings.meals, lunch: '06:30' } })).status, 400, '7시 전 식사 시간은 거절');
  assert.equal((await settingsReq('PUT', w.t.mgr, { ...first.settings, meals: { ...first.settings.meals, lunch: '12:15' } })).status, 400, '30분 단위가 아니면 거절');
  assert.equal((await settingsReq('PUT', w.t.mgr, { meals: { am: '07:30', lunch: '12:30', dinner: null }, capacity: 3 })).status, 200);
  for (const key of ['a', 'b', 'c']) assert.equal((await w.post(w.t[key], { date, slot: 'dinner_clean' })).status, 201, key);
  assert.equal((await w.post(w.t.d, { date, slot: 'dinner_clean' })).status, 409, '기본 인원을 3명으로 바꿨으니 넷째는 막힘');
  const view = await w.get(w.t.a, date);
  assert.equal(view.defaultCapacity, 3);
  assert.equal(view.meals.lunch, '12:30');
  assert.equal(view.meals.dinner, null);
});

test('관리자 직접 배정: 닫힌 칸도 열면서 배정하고, 정원이 차면 막히고, 중복 배정도 막는다', async () => {
  const w = await world();
  const date = nextTuesday();
  const members = await (await w.call(KM.onRequestGet, 'GET', '/api/kitchen/members', w.t.mgr)).json();
  assert.ok(members.members.some(m => m.email === 'a@x.com') && !members.members.some(m => m.email === 'jj@x.com'), '평택센터 멤버만 목록에 나온다');
  assert.equal((await w.call(KM.onRequestGet, 'GET', '/api/kitchen/members', w.t.a)).status, 403);
  assert.equal((await w.patch(w.t.a, { date, slot: 'am_prep', email: 'b@x.com' })).status, 403, '일반 멤버는 배정 못 함');
  assert.equal((await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'b@x.com' })).status, 200, '닫힌 아침 칸도 열면서 배정');
  assert.equal((await w.get(w.t.a, date)).closed[`${date}:am_prep`], undefined, '배정하면서 열렸다');
  assert.equal((await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'b@x.com' })).status, 409, '같은 사람 중복');
  assert.equal((await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'jj@x.com' })).status, 400, '제주 멤버는 배정 불가');
  assert.equal((await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'nobody@x.com' })).status, 404);
  assert.equal((await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'c@x.com' })).status, 200);
  const full = await w.patch(w.t.mgr, { date, slot: 'am_prep', email: 'd@x.com' });
  assert.equal(full.status, 409);
  assert.match((await full.json()).error, /정원이 찼/);
  const view = await w.get(w.t.mgr, date);
  assert.deepEqual(view.slots[`${date}:am_prep`].map(p => p.email), ['b@x.com', 'c@x.com'], '관리자에게는 이메일이 함께 간다');
});

test('칸 닫기: 신청한 사람이 모두 취소되고, 아침 두 칸/하루 전체 한 번에 닫고 열 수 있다', async () => {
  const w = await world();
  const date = nextTuesday();
  await w.post(w.t.a, { date, slot: 'lunch_prep' });
  await w.post(w.t.b, { date, slot: 'lunch_prep' });
  assert.equal((await w.put(w.t.a, { date, slot: 'lunch_prep', closed: true })).status, 403);
  const closed = await (await w.put(w.t.mgr, { date, slot: 'lunch_prep', closed: true })).json();
  assert.deepEqual(closed.cancelled.map(c => c.name), ['가나다', '라마바']);
  assert.equal((await w.post(w.t.c, { date, slot: 'lunch_prep' })).status, 409, '닫힌 칸');
  assert.equal((await w.put(w.t.mgr, { date, slot: 'am', closed: false })).status, 200, '아침 두 칸 열기');
  assert.equal((await w.post(w.t.c, { date, slot: 'am_clean' })).status, 201);
  let view = await w.get(w.t.a, date);
  assert.equal(view.closed[`${date}:am_prep`], undefined);
  assert.equal(view.closed[`${date}:am_clean`], undefined);
  await w.put(w.t.mgr, { date, slot: 'all', closed: true });
  view = await w.get(w.t.a, date);
  assert.equal(Object.keys(view.closed).filter(k => k.startsWith(date)).length, 6, '하루 6칸이 모두 닫힘');
  assert.equal(view.slots[`${date}:am_clean`], undefined, '닫으면서 신청도 취소');
});

// ── 알림: 식사 시간 1시간 전 · 카카오 알림톡 우선 · 실패하면 문자 ──
const TUE = '2026-10-13';
const remEnv = (extra = {}) => memoryEnv({ KITCHEN_REMINDER_SECRET: 'cron-secret', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '010-0000-1111', KAKAO_PF_ID: 'KA01PF', KAKAO_TEMPLATE_KITCHEN: 'tp-kitchen', ...extra });
const person = (email, name, phone, at = '2026-01-01T00:00:00Z') => ({ email, name, phone, at });
const seedDay = (env, date, slots) => env.CAMP_KV.put(`kitchen:day:${date}`, JSON.stringify(slots));
const remRun = (env, query, secret = 'cron-secret') => KR.onRequestPost({ env, request: new Request('https://t.co/api/kitchen/reminders?' + query, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });
const remJson = async (env, query) => (await remRun(env, query)).json();
const captureSolapi = (okFor = () => true) => { const sent = []; globalThis.fetch = async (url, o) => { const m = JSON.parse(o.body).message; sent.push(m); return okFor(m) ? { ok: true, json: async () => ({}) } : { ok: false, text: async () => 'template error' }; }; return sent; };

test('알림 시각은 식사 시간 1시간 전', () => {
  assert.equal(reminderTime('12:00'), '11:00');
  assert.equal(reminderTime('18:30'), '17:30');
  assert.equal(reminderTime('08:00'), '07:00');
  assert.equal(reminderTime(null), null);
  assert.deepEqual(normalizeSettings({ meals: { am: '08:00', lunch: '12:00', dinner: '18:00' } }), { meals: { am: '08:00', lunch: '12:00', dinner: '18:00' }, capacity: 2 });
});

test('점심(기본 12:00)은 11:00에 알림톡으로, 시각 전에는 안 가고, 한 번만 간다', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  await seedDay(env, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222'), person('b@x.com', '라마바', '010-3333-4444')], lunch_clean: [person('c@x.com', '사아자', '010-5555-6666')] });
  assert.equal((await remRun(env, `date=${TUE}&time=11:00`, 'wrong')).status, 401);
  const early = await remJson(env, `date=${TUE}&time=10:30&meal=lunch`);
  assert.equal(early.results[0].skipped, 'not-yet');
  assert.equal(early.results[0].sendAt, '11:00');
  assert.equal(sent.length, 0, '11시 전에는 보내지 않는다');
  const res = await remJson(env, `date=${TUE}&time=11:00&meal=lunch`);
  assert.equal(res.sent, 3, '준비 2명 + 클린업 1명 모두에게');
  const m = sent.find(x => x.to === '01011112222');
  assert.equal(m.kakaoOptions.templateId, 'tp-kitchen');
  assert.equal(m.kakaoOptions.pfId, 'KA01PF');
  assert.equal(m.kakaoOptions.disableSms, false, '알림톡이 안 가면 문자로 대신 간다');
  assert.equal(m.from, '01000001111');
  assert.deepEqual(m.kakaoOptions.variables, { '#{담당자}': '가나다', '#{날짜}': '10/13 화', '#{업무}': '점심 준비', '#{시간}': '오후 12:00' });
  assert.match(m.text, /가나다님, 10\/13 화 점심 준비 담당입니다\. 식사는 오후 12:00이에요\./);
  assert.match(m.text, /wolko\.org\/kitchen\/#2026-10-13/);
  assert.equal(sent.find(x => x.to === '01055556666').kakaoOptions.variables['#{업무}'], '점심 클린업');
  const again = await remJson(env, `date=${TUE}&time=11:30&meal=lunch`);
  assert.equal(again.sent, 0);
  assert.ok(again.results.every(r => r.alreadySent), '같은 날 두 번 보내지 않는다');
  assert.equal(sent.length, 3);
  assert.equal((await remJson(env, `date=${TUE}&time=12:30&meal=lunch`)).results[0].skipped, 'too-late', '식사 시간이 지나면 보내지 않는다');
});

test('같은 끼니의 준비와 클린업을 둘 다 신청한 사람에게는 한 번만 보낸다', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  const a = person('a@x.com', '가나다', '010-1111-2222');
  await seedDay(env, TUE, { dinner_prep: [a], dinner_clean: [a, person('b@x.com', '라마바', '010-3333-4444')] });
  const res = await remJson(env, `date=${TUE}&time=17:00&meal=dinner`);
  assert.equal(res.sent, 2);
  assert.equal(sent.length, 2);
  assert.equal(sent.find(x => x.to === '01011112222').kakaoOptions.variables['#{업무}'], '저녁 준비·클린업');
  assert.equal(sent.find(x => x.to === '01033334444').kakaoOptions.variables['#{업무}'], '저녁 클린업');
});

test('세 끼니는 각자 식사 시간 1시간 전(아침 7:00 · 점심 11:00 · 저녁 17:00)에 따로 간다', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  await seedDay(env, TUE, { am_prep: [person('a@x.com', '가나다', '010-1111-2222')], lunch_prep: [person('b@x.com', '라마바', '010-3333-4444')], dinner_prep: [person('c@x.com', '사아자', '010-5555-6666')] });
  const at = async time => (await remJson(env, `date=${TUE}&time=${time}`)).results.filter(r => r.sent).map(r => r.meal);
  assert.deepEqual(await at('06:30'), []);
  assert.deepEqual(await at('07:00'), ['am']);
  assert.deepEqual(await at('11:00'), ['lunch'], '아침은 이미 보냈고 점심만 새로 간다');
  assert.deepEqual(await at('17:00'), ['dinner']);
  assert.equal(sent.length, 3);
});

test('식사 시간을 바꾸면 알림 시각도 따라가고, 시간을 비우면 그 끼니는 알림이 없다', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  await env.CAMP_KV.put('kitchen:settings', JSON.stringify({ meals: { am: null, lunch: '13:30', dinner: '19:00' }, capacity: 2 }));
  await seedDay(env, TUE, { am_prep: [person('a@x.com', '가나다', '010-1111-2222')], lunch_prep: [person('b@x.com', '라마바', '010-3333-4444')] });
  assert.equal((await remJson(env, `date=${TUE}&time=11:00&meal=lunch`)).results[0].skipped, 'not-yet', '점심이 13:30이면 11시엔 아직');
  const res = await remJson(env, `date=${TUE}&time=12:30&meal=lunch`);
  assert.equal(res.sent, 1);
  assert.match(sent[0].text, /오후 1:30/);
  assert.equal((await remJson(env, `date=${TUE}&time=07:00&meal=am`)).results[0].skipped, 'no-time-set');
  assert.equal(sent.length, 1);
});

test('알림톡 요청이 거절되면 문자로 다시 보내고, 한 명이 실패해도 다음 사람은 보낸다', async () => {
  const env = remEnv();
  const sent = captureSolapi(m => !m.kakaoOptions);   // 알림톡 요청은 거절
  await seedDay(env, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222'), person('b@x.com', '라마바', '010-3333-4444')] });
  const res = await remJson(env, `date=${TUE}&time=11:00&meal=lunch`);
  assert.deepEqual(res.results.map(r => r.firstChannel), ['sms', 'sms']);
  assert.equal(sent.length, 4, '두 명 모두 알림톡 시도 → 문자 재발송');
  assert.ok(sent.filter(m => !m.kakaoOptions).every(m => m.text && m.from));

  const env2 = remEnv();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; if (calls <= 2) return { ok: false, text: async () => 'down' }; return { ok: true, json: async () => ({}) }; }; // 첫 사람은 알림톡·문자 모두 실패
  await seedDay(env2, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222'), person('b@x.com', '라마바', '010-3333-4444')] });
  const partial = await remJson(env2, `date=${TUE}&time=11:00&meal=lunch`);
  assert.equal(partial.sent, 1);
  assert.equal(partial.results.filter(r => r.error).length, 1);
  captureSolapi();
  const retry = await remJson(env2, `date=${TUE}&time=11:30&meal=lunch`);
  assert.equal(retry.sent, 1, '실패한 사람은 다음 확인 때 다시 시도하고, 보낸 사람은 다시 보내지 않는다');
});

test('알림톡 템플릿이 없으면 문자로만 가고, 알림 시각 이후에 신청한 사람에게는 보내지 않는다', async () => {
  const env = remEnv({ KAKAO_TEMPLATE_KITCHEN: undefined });
  const sent = captureSolapi();
  await seedDay(env, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222', '2026-10-13T01:20:00Z'), person('b@x.com', '라마바', '010-3333-4444', '2026-10-12T22:00:00Z')] }); // a: 한국 10:20 신청, b: 7:00 신청
  const res = await remJson(env, `date=${TUE}&time=11:00&meal=lunch`);
  assert.equal(res.channel === undefined ? res.results[0].channel : res.channel, 'sms');
  assert.equal(res.sent, 2);
  assert.ok(sent.every(m => !m.kakaoOptions && m.text), '문자만');
  const env2 = remEnv();
  const sent2 = captureSolapi();
  await seedDay(env2, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222', '2026-10-13T02:10:00Z')] }); // 한국 11:10 신청 (11:00 알림 이후)
  const late = await remJson(env2, `date=${TUE}&time=11:30&meal=lunch`);
  assert.equal(late.results[0].skipped, 'signed-up-after');
  assert.equal(sent2.length, 0);
});

test('알림 점검용 옵션: dryRun은 보내지 않고, force는 시각과 무관하게, testPhone은 그 번호 한 곳에만', async () => {
  const env = remEnv();
  const sent = captureSolapi();
  await seedDay(env, TUE, { lunch_prep: [person('a@x.com', '가나다', '010-1111-2222')] });
  const dry = await remJson(env, `date=${TUE}&time=11:00&meal=lunch&dryRun=1`);
  assert.equal(dry.results[0].dryRun, true);
  assert.equal(dry.results[0].person.phone, '010-****-**22', '번호는 가려서 보여준다');
  assert.equal(sent.length, 0);
  assert.equal((await remJson(env, `date=${TUE}&time=06:00&meal=lunch&force=1`)).sent, 1);
  const test1 = await remJson(env, `date=${TUE}&meal=dinner&testPhone=010-7777-8888`);
  assert.equal(test1.sent, 1);
  assert.equal(sent.at(-1).to, '01077778888');
  assert.equal(sent.at(-1).kakaoOptions.variables['#{업무}'], '저녁 준비');
  assert.equal((await remRun(env, `testPhone=12345`)).status, 400);
  assert.equal((await remRun(env, `date=${TUE}&time=11:00&meal=lunch`, 'wrong')).status, 401);
  assert.equal((await remRun(remEnv({ KITCHEN_REMINDER_SECRET: undefined }), `time=11:00`, 'cron-secret')).status, 401, '비밀키가 없으면 열리지 않는다');
});

// ── 화면·메뉴 연결 ──
test('주방 보조 페이지는 포탈 메뉴와 왼쪽 레일에 있고, 알림 워크플로는 실제 API 주소를 부른다', async () => {
  const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
  const [rail, portal, workflow, page] = await Promise.all([read('public/wolko-rail.js'), read('src/pages/portal.astro'), read('.github/workflows/kitchen-reminders.yml'), read('src/pages/kitchen/index.astro')]);
  assert.match(rail, /href: '\/kitchen'[^\n]*label: '주방 보조'/);
  assert.match(portal, /href: '\/kitchen'[^\n]*icon: 'utensils'/);
  assert.match(workflow, /https:\/\/wolko\.org\/api\/kitchen\/reminders\?/);
  assert.match(page, /\/kitchen\.js\?v=\d+/);
  assert.match(page, /\/wolko-layout\.css\?v=\d+/);
});
