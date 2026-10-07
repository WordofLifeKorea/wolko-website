import assert from 'node:assert/strict';
import test from 'node:test';
import * as W from '../functions/api/staffing/weekly-reminder.js';
import { carGaps, gapsEmail, kitchenGaps, stafferEmails, weekDays } from '../functions/lib/staffingGaps.js';

function memoryEnv(extra = {}) {
  const values = new Map();
  return {
    STAFFING_REMINDER_SECRET: 'cron', RESEND_API_KEY: 're_test', ADMIN_PASSWORD: 'x',
    CAMP_KV: {
      async get(key, type) { const v = values.get(key); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); },
      async list() { return { keys: [], list_complete: true }; },
    },
    ...extra,
  };
}
const MON = '2026-10-12';             // 월요일 — 그 주(10/12~10/18)의 화~금이 기본으로 열린다
const call = (env, query = '', secret = 'cron') => W.onRequestPost({ env, request: new Request('https://wolko.org/api/staffing/weekly-reminder?' + query, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });
const json = async (env, query) => (await call(env, query)).json();
const captureMail = () => { const sent = []; globalThis.fetch = async (url, o) => { sent.push({ url, body: JSON.parse(o.body) }); return { ok: true, text: async () => '' }; }; return sent; };
const person = (email, name) => ({ email, name, phone: '010-1111-2222', at: '2026-10-01T00:00:00Z' });

test('주의 날짜: 어느 날이든 그 주 월~일 7일', () => {
  assert.deepEqual(weekDays('2026-10-12'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  assert.equal(weekDays('2026-10-18')[0], '2026-10-12', '일요일은 같은 주의 끝');
  assert.equal(weekDays('2026-10-14')[6], '2026-10-18');
  assert.deepEqual(stafferEmails(), ['esooy@wol.org']);
});

test('비어 있는 칸: 열려 있는 칸만 — 차량은 화~금 픽업·드롭오프, 주방은 화~목 점심·저녁과 금 점심', async () => {
  const env = memoryEnv();
  const days = weekDays(MON);
  const car = await carGaps(env, days, MON);
  assert.equal(car.length, 8, '화~금 × 2칸');
  assert.deepEqual(car.map(g => g.date).filter((d, i, a) => a.indexOf(d) === i), ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  const kitchen = await kitchenGaps(env, days, MON);
  assert.equal(kitchen.length, 14, '화·수·목 4칸씩 12 + 금 점심 2');
  assert.ok(!kitchen.some(g => g.slot.startsWith('am_')), '아침은 기본 닫힘');
  assert.ok(!kitchen.some(g => g.date === '2026-10-16' && g.slot.startsWith('dinner')), '금 저녁은 닫힘');
});

test('채워진 칸·닫힌 칸·정원이 다 찬 칸은 빠지고, 덜 찬 칸은 몇 명 찼는지 함께 나온다', async () => {
  const env = memoryEnv();
  await env.CAMP_KV.put('drive:slot:2026-10-13:pickup', JSON.stringify(person('a@x.com', '가나다')));
  await env.CAMP_KV.put('drive:closed:2026-10-05', JSON.stringify({ '2026-10-13:dropoff': { by: 'esooy@wol.org' } }));   // 화 드롭오프는 닫음
  await env.CAMP_KV.put('kitchen:day:2026-10-13', JSON.stringify({ lunch_prep: [person('a@x.com', '가')], lunch_clean: [person('a@x.com', '가')], dinner_clean: [person('a@x.com', '가'), person('b@x.com', '나')] }));
  const car = await carGaps(env, weekDays(MON), MON);
  assert.equal(car.length, 6, '8칸 중 신청 1 + 닫힘 1 제외');
  assert.ok(!car.some(g => g.date === '2026-10-13'));
  const kitchen = await kitchenGaps(env, weekDays(MON), MON);
  assert.ok(!kitchen.some(g => g.date === '2026-10-13' && g.slot === 'lunch_prep'), '준비 칸은 1명이면 가득');
  assert.deepEqual(kitchen.find(g => g.date === '2026-10-13' && g.slot === 'lunch_clean'), { date: '2026-10-13', slot: 'lunch_clean', filled: 1, capacity: 2 }, '클린업은 2명 중 1명');
  assert.ok(!kitchen.some(g => g.date === '2026-10-13' && g.slot === 'dinner_clean'), '2명이 찬 클린업은 가득');
  // 지난 날짜는 건너뛴다
  const lateWeek = await carGaps(env, weekDays(MON), '2026-10-15');
  assert.deepEqual([...new Set(lateWeek.map(g => g.date))], ['2026-10-15', '2026-10-16']);
});

test('영어 메일: 어떤 칸이 비었는지 날짜별로 나오고, 링크와 정중한 인사말이 들어간다', async () => {
  const env = memoryEnv();
  const days = weekDays(MON);
  const m = gapsEmail({ days, car: await carGaps(env, days, MON), kitchen: await kitchenGaps(env, days, MON) });
  assert.equal(m.subject, '[WOLKO] Weekly reminder: unfilled slots for the week of Oct 12');
  assert.match(m.html, /Dear Estelle,/);
  assert.match(m.html, /Tue, Oct 13/);
  assert.match(m.html, /Morning pick-up/);
  assert.match(m.html, /Afternoon drop-off/);
  assert.match(m.html, /Lunch clean-up \(0 of 2 signed up\)/);
  assert.match(m.html, /Dinner prep \(0 of 1 signed up\)/);
  assert.match(m.html, /https:\/\/wolko\.org\/car-drive\//);
  assert.match(m.html, /https:\/\/wolko\.org\/kitchen\//);
  assert.match(m.text, /kindly ask you to remind the team/);
  assert.ok(!/[가-힣]/.test(m.html + m.text + m.subject), '한글이 섞이지 않는다');
});

test('월요일에 Estelle에게 한 번만 보낸다 — 인증, 월요일 아님, 이미 보냄, 시험 발송', async () => {
  const env = memoryEnv();
  const sent = captureMail();
  assert.equal((await call(env, `date=${MON}`, 'wrong')).status, 401);
  assert.equal((await json(env, 'date=2026-10-14')).skipped, 'not-monday', '수요일에는 보내지 않는다');
  assert.equal(sent.length, 0);
  const dry = await json(env, `date=${MON}&dryRun=1`);
  assert.equal(dry.dryRun, true);
  assert.deepEqual([dry.gaps.car, dry.gaps.kitchen], [8, 14]);
  assert.equal(sent.length, 0, '확인만 하면 보내지 않는다');
  const ok = await json(env, `date=${MON}`);
  assert.equal(ok.sent, 1);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].body.to, ['esooy@wol.org']);
  assert.match(sent[0].body.subject, /unfilled slots for the week of Oct 12/);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal((await json(env, `date=${MON}`)).skipped, 'already-sent', '같은 주에는 한 번만(두 번째 스케줄 실행 대비)');
  assert.equal(sent.length, 1);
  // 시험 발송은 다른 주소로만 가고 기록을 남기지 않는다
  const env2 = memoryEnv();
  const sent2 = captureMail();
  const test = await json(env2, `date=${MON}&to=boss@x.com`);
  assert.equal(test.test, true);
  assert.deepEqual(sent2[0].body.to, ['boss@x.com']);
  assert.equal((await json(env2, `date=${MON}`)).sent, 1, '시험 발송 뒤에도 정식 메일은 그대로 나간다');
  assert.equal((await call(env2, `date=${MON}&to=nope`)).status, 400);
});

test('비어 있는 자리가 없으면 메일을 보내지 않고, 메일 설정이 없으면 알려 준다', async () => {
  const env = memoryEnv();
  const sent = captureMail();
  const full = person('a@x.com', '가');
  for (const d of weekDays(MON)) {
    await env.CAMP_KV.put(`drive:slot:${d}:pickup`, JSON.stringify(full));
    await env.CAMP_KV.put(`drive:slot:${d}:dropoff`, JSON.stringify(full));
    await env.CAMP_KV.put(`kitchen:day:${d}`, JSON.stringify(Object.fromEntries(['am_prep', 'am_clean', 'lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'].map(s => [s, [full, person('b@x.com', '나'), person('c@x.com', '다'), person('d@x.com', '라')]]))));
  }
  assert.equal((await json(env, `date=${MON}`)).skipped, 'nothing-open');
  assert.equal(sent.length, 0);
  const noMail = memoryEnv({ RESEND_API_KEY: undefined });
  const res = await call(noMail, `date=${MON}`);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /RESEND_API_KEY/);
});

test('주간 알림 워크플로: 월요일 UTC 00:30 = 한국 9:30, 한 시간 뒤 예비 실행, 켜는 스위치', async () => {
  const { readFileSync } = await import('node:fs');
  const wf = readFileSync(new URL('../.github/workflows/staffing-reminders.yml', import.meta.url), 'utf8');
  assert.match(wf, /cron: '30 0 \* \* 1'/);
  assert.match(wf, /cron: '30 1 \* \* 1'/);
  assert.match(wf, /STAFFING_REMINDERS_ENABLED/);
  assert.match(wf, /api\/staffing\/weekly-reminder/);
});
