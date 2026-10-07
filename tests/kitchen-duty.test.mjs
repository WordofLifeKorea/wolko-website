import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { SLOTS, isDefaultOpen, isSlotClosed, applyOpenState, todayKst } from '../functions/lib/kitchenDuty.js';
import * as K from '../functions/api/kitchen/duty.js';
import * as KM from '../functions/api/kitchen/members.js';
import * as KS from '../functions/api/kitchen/settings.js';
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
const future = weekday => { const d = new Date(todayKst() + 'T00:00:00Z'); do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== weekday); return d.toISOString().slice(0, 10); };

test('기본값: 화요일 점심 ~ 금요일 점심만 열림, 오전 · 금요일 저녁 ~ 화요일 아침은 닫힘', () => {
  assert.deepEqual(SLOTS, ['am_prep', 'am_clean', 'lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean']);
  const open = d => SLOTS.filter(s => isDefaultOpen(d, s));
  assert.deepEqual(open('2026-10-06'), ['lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'], '화');
  assert.deepEqual(open('2026-10-07'), ['lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'], '수');
  assert.deepEqual(open('2026-10-08'), ['lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'], '목');
  assert.deepEqual(open('2026-10-09'), ['lunch_prep', 'lunch_clean'], '금은 점심까지');
  assert.deepEqual(open('2026-10-10'), [], '토');
  assert.deepEqual(open('2026-10-11'), [], '일');
  assert.deepEqual(open('2026-10-12'), [], '월');
  assert.equal(isDefaultOpen('2026-10-07', 'am_prep'), false, '오전은 늘 기본 닫힘');
  assert.equal(isSlotClosed({}, '2026-10-10', 'lunch_prep'), true);
  assert.equal(isSlotClosed({}, '2026-10-10', 'lunch_prep', true), false, '이미 신청이 있으면 닫지 않는다');
  assert.equal(isSlotClosed({ '2026-10-07:am_prep': { open: true } }, '2026-10-07', 'am_prep'), false, '관리자가 열면 열림');
  assert.equal(isSlotClosed({ '2026-10-07:lunch_prep': { by: 'x' } }, '2026-10-07', 'lunch_prep'), true, '관리자가 닫으면 닫힘');
  const map = {};
  applyOpenState(map, '2026-10-07', 'lunch_prep', false, 'm'); assert.ok(map['2026-10-07:lunch_prep']);
  applyOpenState(map, '2026-10-07', 'lunch_prep', true, 'm'); assert.deepEqual(map, {}, '기본값으로 돌아가면 기록을 지운다');
});

test('신청 · 중복 거절 · 본인만 취소 · 닫힌 칸 · 휴대폰 번호 · 평택센터만', async () => {
  const env = memoryEnv();
  const a = await addAccount(env, 'a@x.com', '가나다');
  const b = await addAccount(env, 'b@x.com', '라마바', { phone: '' });
  const jj = await addAccount(env, 'jj@x.com', '제주', { campus: 'jeju' });
  const admin = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  const tue = future(2), sat = future(6);
  const post = (token, body) => K.onRequestPost({ env, request: req('POST', '/api/kitchen/duty', token, body) });
  assert.equal((await K.onRequestGet({ env, request: req('GET', '/api/kitchen/duty', jj) })).status, 403);
  assert.equal((await post(a, { date: tue, slot: 'lunch_prep' })).status, 201);
  assert.equal((await post(b, { date: tue, slot: 'lunch_prep', phone: '010-9999-0000' })).status, 409, '이미 찬 칸');
  assert.equal((await post(b, { date: tue, slot: 'lunch_clean' })).status, 400, '번호가 없으면 신청 불가');
  assert.equal((await post(b, { date: tue, slot: 'lunch_clean', phone: '010-9999-0000' })).status, 201);
  assert.equal((await post(a, { date: tue, slot: 'am_prep' })).status, 409, '오전은 기본 닫힘');
  assert.equal((await post(a, { date: sat, slot: 'lunch_prep' })).status, 409, '토요일은 기본 닫힘');
  assert.equal((await post(a, { date: tue, slot: 'nope' })).status, 400);
  assert.equal((await post(a, { date: '2020-01-07', slot: 'lunch_prep' })).status, 400, '지난 날짜');
  const view = await (await K.onRequestGet({ env, request: req('GET', `/api/kitchen/duty?start=${tue}`, b) })).json();
  assert.deepEqual(view.slots[`${tue}:lunch_prep`], { name: '가나다', mine: false });
  assert.equal(view.closed[`${tue}:am_prep`], true);
  assert.equal(view.closed[`${tue}:lunch_prep`], undefined);
  const del = (token, slot) => K.onRequestDelete({ env, request: req('DELETE', `/api/kitchen/duty?date=${tue}&slot=${slot}`, token) });
  assert.equal((await del(b, 'lunch_prep')).status, 403);
  assert.equal((await del(a, 'lunch_prep')).status, 200);
  assert.equal((await del(admin, 'lunch_clean')).status, 200, '마스터는 누구든 취소');
  assert.equal(await env.CAMP_KV.get(`drive:slot:${tue}:lunch_prep`), null, '차량 스케줄 키와 섞이지 않는다');
});

test('주방 관리자(Estelle)는 오전 칸을 따로 열고, 칸을 닫고, 사람을 직접 배정한다 — 일반 멤버는 못 한다', async () => {
  const env = memoryEnv();
  const estelle = await addAccount(env, 'esooy@wol.org', 'Estelle Sooy');
  const a = await addAccount(env, 'a@x.com', '가나다');
  const noPhone = await addAccount(env, 'c@x.com', '번호없음', { phone: '' });
  const wed = future(3);
  const put = (token, body) => K.onRequestPut({ env, request: req('PUT', '/api/kitchen/duty', token, body) });
  const post = (token, body) => K.onRequestPost({ env, request: req('POST', '/api/kitchen/duty', token, body) });
  const patch = (token, body) => K.onRequestPatch({ env, request: req('PATCH', '/api/kitchen/duty', token, body) });
  const get = async token => (await K.onRequestGet({ env, request: req('GET', `/api/kitchen/duty?start=${wed}`, token) })).json();
  assert.equal((await get(a)).me.isManager, false);
  assert.equal((await get(estelle)).me.isManager, true);
  assert.equal((await put(a, { date: wed, slot: 'am_prep', closed: false })).status, 403);
  assert.equal((await patch(a, { date: wed, slot: 'am_prep', email: 'a@x.com' })).status, 403);

  // 오전 두 칸만 열기
  assert.equal((await put(estelle, { date: wed, slot: 'am', closed: false })).status, 200);
  let view = await get(a);
  assert.equal(view.closed[`${wed}:am_prep`], undefined);
  assert.equal(view.closed[`${wed}:am_clean`], undefined);
  assert.equal((await post(a, { date: wed, slot: 'am_prep' })).status, 201);
  // 점심 칸을 닫으면 신청이 취소된다
  assert.equal((await post(a, { date: wed, slot: 'lunch_prep' })).status, 201);
  const closed = await (await put(estelle, { date: wed, slot: 'lunch_prep', closed: true })).json();
  assert.deepEqual(closed.cancelled, [{ slot: 'lunch_prep', name: '가나다' }]);
  assert.equal((await post(a, { date: wed, slot: 'lunch_prep' })).status, 409);
  // 하루 전체 닫기 → 오전 신청도 취소 → 다시 열면 오전은 열림
  const all = await (await put(estelle, { date: wed, slot: 'all', closed: true })).json();
  assert.equal(all.cancelled.length, 1);
  assert.equal(Object.keys((await get(a)).closed).filter(k => k.startsWith(wed)).length, 6);
  await put(estelle, { date: wed, slot: 'all', closed: false });
  assert.equal(Object.keys((await get(a)).closed).filter(k => k.startsWith(wed)).length, 0);
  // 배정: 닫힌 칸에 배정하면 열리고, 해제할 수 있다
  const sat = future(6);
  const assigned = await (await patch(estelle, { date: sat, slot: 'dinner_clean', email: 'a@x.com' })).json();
  assert.equal(assigned.assigned.name, '가나다');
  assert.equal((await (await K.onRequestGet({ env, request: req('GET', `/api/kitchen/duty?start=${sat}`, a) })).json()).slots[`${sat}:dinner_clean`].mine, true);
  assert.equal((await (await patch(estelle, { date: sat, slot: 'lunch_prep', email: 'c@x.com' })).json()).noPhone, true);
  assert.equal((await patch(estelle, { date: sat, slot: 'dinner_clean', email: null })).status, 200);
  assert.equal((await patch(estelle, { date: sat, slot: 'dinner_clean', email: 'nobody@x.com' })).status, 404);
  assert.equal((await put(estelle, { date: '2020-01-07', slot: 'am', closed: false })).status, 409, '지난 날짜는 바꿀 수 없다');
  const members = await KM.onRequestGet({ env, request: req('GET', '/api/kitchen/members', estelle) });
  assert.equal((await members.json()).members.length, 3);
  assert.equal((await KM.onRequestGet({ env, request: req('GET', '/api/kitchen/members', a) })).status, 403);
  void noPhone;
});

test('알림 시간 설정: 관리자만, 30분 단위, 기본값 제공', async () => {
  const env = memoryEnv();
  const estelle = await addAccount(env, 'esooy@wol.org', 'Estelle Sooy');
  const a = await addAccount(env, 'a@x.com', '가나다');
  assert.equal((await KS.onRequestGet({ env, request: req('GET', '/api/kitchen/settings', a) })).status, 403);
  const got = await (await KS.onRequestGet({ env, request: req('GET', '/api/kitchen/settings', estelle) })).json();
  assert.equal(got.settings.lunch_prep, '10:00');
  const put = body => KS.onRequestPut({ env, request: req('PUT', '/api/kitchen/settings', estelle, body) });
  assert.equal((await put({ ...got.settings, lunch_prep: '10:15' })).status, 400);
  assert.equal((await put({ ...got.settings, lunch_prep: '10:30', am_prep: null })).status, 200);
  const after = await (await KS.onRequestGet({ env, request: req('GET', '/api/kitchen/settings', estelle) })).json();
  assert.equal(after.settings.lunch_prep, '10:30');
  assert.equal(after.settings.am_prep, null);
});

test('알림: 칸마다 따로 한 번씩, 칸별 알림톡 템플릿 환경변수와 문구', async () => {
  assert.equal(KR.templateEnvName('lunch_prep'), 'KAKAO_TEMPLATE_KITCHEN_LUNCH_PREP');
  assert.equal(KR.templateEnvName('dinner_clean'), 'KAKAO_TEMPLATE_KITCHEN_DINNER_CLEAN');
  assert.deepEqual(KR.reminderVariables('가나다', '2026-10-07'), { '#{담당자}': '가나다', '#{날짜}': '10/7 수' });
  assert.match(KR.reminderText('가나다', '2026-10-07', 'lunch_clean'), /가나다님은 10\/7 수 점심 클린업 담당자 입니다/);
  const env = memoryEnv({ KITCHEN_REMINDER_SECRET: 's', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '01000000000', KAKAO_PF_ID: 'pf', KAKAO_TEMPLATE_KITCHEN_LUNCH_PREP: 'T1' });
  await addAccount(env, 'a@x.com', '가나다');
  const date = '2026-10-07';
  await env.CAMP_KV.put(`kitchen:slot:${date}:lunch_prep`, JSON.stringify({ date, slot: 'lunch_prep', email: 'a@x.com', name: '가나다', phone: '010-1234-5678', at: '2026-10-01T00:00:00Z' }));
  const call = q => KR.onRequestPost({ env, request: new Request(`https://t.co/api/kitchen/reminders?${q}`, { method: 'POST', headers: { Authorization: 'Bearer s' } }) });
  assert.equal((await KR.onRequestPost({ env, request: new Request('https://t.co/api/kitchen/reminders', { method: 'POST' }) })).status, 401);
  const early = await (await call(`dryRun=1&date=${date}&time=09:00`)).json();
  assert.equal(early.results.find(r => r.slot === 'lunch_prep').skipped, 'not-yet');
  const due = await (await call(`dryRun=1&date=${date}&time=10:00`)).json();
  const lunch = due.results.find(r => r.slot === 'lunch_prep');
  assert.equal(lunch.person.name, '가나다');
  assert.equal(lunch.channel, 'kakao+sms');
  assert.equal(due.results.find(r => r.slot === 'dinner_prep').channel, 'sms', '템플릿이 없는 칸은 문자만');
  assert.equal(due.sent, 0);
});

test('주방 보조 페이지: 메뉴 등록 · 같은 버전의 공용 파일 · 별도 알림 설정', () => {
  const page = readFileSync(new URL('../src/pages/kitchen/index.astro', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../public/kitchen.js', import.meta.url), 'utf8');
  assert.match(page, /\/kitchen\.js\?v=\d+/);
  assert.match(page, /wolko-rail\.js\?v=\d+/);
  for (const s of SLOTS) assert.ok(js.includes(`${s}:`), `${s} 번역`);
  assert.ok(js.includes('/api/kitchen/duty') && !js.includes('/api/car/'), '차량 API를 쓰지 않는다');
  assert.match(readFileSync(new URL('../public/wolko-rail.js', import.meta.url), 'utf8'), /href: '\/kitchen', color: '#d4a373'/);
  assert.match(readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8'), /href: '\/kitchen', color: '#d4a373'/);
  const wf = readFileSync(new URL('../.github/workflows/kitchen-reminders.yml', import.meta.url), 'utf8');
  assert.match(wf, /api\/kitchen\/reminders/);
  assert.match(wf, /KITCHEN_REMINDERS_ENABLED/);
});
