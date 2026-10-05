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

test('2주 구간: 월요일 시작, 월~토 × 2주 = 12일, 앞뒤로 14일씩 이동', () => {
  const p = periodFor('2026-10-08');
  assert.equal(p.start, '2026-10-05');
  assert.equal(p.end, '2026-10-18');
  assert.equal(p.days.length, 12);
  assert.deepEqual([p.days[0], p.days[5], p.days[6], p.days[11]], ['2026-10-05', '2026-10-10', '2026-10-12', '2026-10-17']);
  assert.equal(periodFor('2026-10-19').start, '2026-10-19');
  assert.equal(periodFor('2026-10-04').start, '2026-09-21', '기준일 이전도 14일 단위');
  assert.equal(shiftPeriod('2026-10-05', 1), '2026-10-19');
  assert.equal(isDriveDay('2026-10-11'), false, '일요일은 제외');
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

test('8시 알림: 오늘 픽업 담당자에게 한 번만 문자를 보낸다', async () => {
  const env = memoryEnv({ DRIVE_REMINDER_SECRET: 'cron-secret', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '02-123-4567' });
  const a = await addAccount(env, 'a@x.com', '가나다', { phone: '010-1111-2222' });
  const date = nextWeekday();
  await D.onRequestPost({ env, request: req('POST', '/api/car/drive', a, { date, slot: 'pickup' }) });
  const sent = [];
  globalThis.fetch = async (url, o) => { sent.push({ url: String(url), body: JSON.parse(o.body) }); return { ok: true, json: async () => ({}) }; };
  const run = (query, secret = 'cron-secret') => RM.onRequestPost({ env, request: new Request('https://t.co/api/car/drive-reminders' + query, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });
  assert.equal((await run(`?date=${date}`, 'wrong')).status, 401);
  const dry = await (await run(`?date=${date}&dryRun=1`)).json();
  assert.equal(dry.pickup.name, '가나다');
  assert.equal(dry.pickup.phone, '010-****-**22', '번호는 가려서 보여준다');
  assert.equal(sent.length, 0, 'dry run은 보내지 않는다');
  const first = await (await run(`?date=${date}`)).json();
  assert.equal(first.sent, 1);
  assert.equal(sent[0].body.message.to, '01011112222');
  assert.match(sent[0].body.message.text, /가나다님.*오전 픽업/);
  assert.ok(sent[0].body.message.text.endsWith(`/car-drive/#${date}`), '링크에 날짜 앵커가 붙는다');
  const second = await (await run(`?date=${date}`)).json();
  assert.equal(second.sent, 0);
  assert.equal(second.alreadySent, true);
  assert.equal(sent.length, 1, '같은 날 두 번 보내지 않는다');
  assert.equal((await (await run('?date=2026-10-11')).json()).skipped, 'sunday');
});

test('/api/hub/me 는 로그인한 계정의 이름과 이메일을 돌려준다', async () => {
  const { onRequestGet } = await import('../functions/api/hub/me.js');
  const env = memoryEnv();
  const token = await addAccount(env, 'a@x.com', '김환규');
  const ok = await onRequestGet({ env, request: req('GET', '/api/hub/me', token) });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { name: '김환규', email: 'a@x.com', role: 'counselor' });
  assert.equal((await onRequestGet({ env, request: req('GET', '/api/hub/me', 'bad') })).status, 401);
});
