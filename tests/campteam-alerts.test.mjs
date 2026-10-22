import assert from 'node:assert/strict';
import test from 'node:test';
import * as Alerts from '../functions/api/campteam/alerts.js';
import * as Trash from '../functions/api/campteam/trash.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import { stageOf, sanitizeSettings, dayDiff, tuesdayOf, mondayOf, DEFAULT_SETTINGS } from '../functions/lib/campteamAlerts.js';
import { todayKST, addDays } from '../functions/lib/campteamDb.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPatch: 'PATCH', onRequestDelete: 'DELETE' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json(), T = todayKST(), d = (n) => addDays(T, n);
const get = (env, who, qs = '') => call(Alerts, 'onRequestGet', env, who, { qs });
const post = (env, who, body) => call(Alerts, 'onRequestPost', env, who, { body });
const ids = (list) => list.map((x) => x.key);

function mk() {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite;
  q.exec(`UPDATE tasks SET deletedAt='x'; UPDATE meetings SET deletedAt='x'; UPDATE events SET deletedAt='x'; UPDATE decisions SET deletedAt='x';`);
  const task = (id, due, owner = U.mem, status = 'In Progress') => q.prepare(`INSERT INTO tasks (id,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy) VALUES (?,?,?,?,?,?, 'Medium','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','t')`).run(id, '업무 ' + id, '이름', owner, due, status);
  return { env, q, task };
}

test('단계 계산: 3일 전·1일 전·당일·지남, 설정에 없는 먼 날짜는 알리지 않는다', () => {
  assert.deepEqual([4, 3, 2, 1, 0, -1].map((n) => stageOf(n, [3, 1])), [null, 'd3', 'd3', 'd1', 'd0', 'over']);
  assert.deepEqual([5, 2, 1].map((n) => stageOf(n, [7, 2])), ['d7', 'd2', 'd2']);
  assert.equal(dayDiff('2027-01-10', '2027-01-07'), 3); assert.equal(tuesdayOf('2027-01-10'), '2027-01-05', '일요일은 그 주(월요일 시작) 화요일'); assert.equal(mondayOf('2027-01-05'), '2027-01-04'); assert.equal(tuesdayOf('2027-01-04'), '2027-01-05');
});

test('알림공지는 캠프팀 명단에 있는 사람만 (명단 밖·로그인 전은 거부)', async () => {
  const { env } = mk();
  assert.equal((await get(env, null)).status, 401); assert.equal((await get(env, U.view)).status, 403); assert.equal((await post(env, U.view, { action: 'seenAll' })).status, 403);
  for (const who of [U.mem, U.tre, U.fin, U.dir, U.admin]) assert.equal((await get(env, who)).status, 200, who);
});

test('내 알림: 내가 맡은 업무만, 마감 3일 전·1일 전·당일·지남, 완료·다른 사람 업무·먼 마감은 제외', async () => {
  const { env, task } = mk();
  task('a', d(3)); task('b', d(2)); task('c', d(1)); task('d', d(0)); task('e', d(-2)); task('f', d(4)); task('g', d(1), U.fin); task('h', d(1), U.mem, 'Completed'); task('i', null);
  const b = await J(await get(env, U.mem)), got = Object.fromEntries(b.items.filter((x) => x.type === 'task').map((x) => [x.taskId, x.key.split(':')[2]]));
  assert.deepEqual(got, { a: 'd3', b: 'd3', c: 'd1', d: 'd0', e: 'over' });
  assert.equal(b.items[0].level, 'over', '마감 지난 것이 맨 위'); assert.deepEqual(b.today.overdue.map((x) => x.title), ['업무 e']); assert.deepEqual(b.today.today.map((x) => x.title), ['업무 d']); assert.equal(b.today.soon.length, 3);
  assert.equal(b.unread, 5); assert.equal((await J(await get(env, U.fin))).items.filter((x) => x.type === 'task').length, 1);
});

test('알림 끄기·확인과 단계가 바뀌면 다시 올라오는 규칙', async () => {
  const { env, q, task } = mk(); task('a', d(3));
  let b = await J(await get(env, U.mem)); assert.equal(b.unread, 1); const key = b.items[0].key; assert.equal(key, 'task:a:d3');
  assert.equal((await post(env, U.mem, { action: 'state', keys: [key], state: 'seen' })).status, 200);
  b = await J(await get(env, U.mem)); assert.equal(b.unread, 0); assert.equal(b.items.length, 1, '확인만 하면 목록에는 남아요');
  assert.equal((await post(env, U.mem, { action: 'state', keys: [key], state: 'dismissed' })).status, 200);
  b = await J(await get(env, U.mem)); assert.equal(b.items.length, 0, '끄면 목록에서 사라져요'); assert.equal(b.today.soon.length, 1, '오늘 할 일에는 계속 보여요');
  q.prepare('UPDATE tasks SET dueDate = ? WHERE id = ?').run(d(1), 'a');
  b = await J(await get(env, U.mem)); assert.equal(b.items[0].key, 'task:a:d1'); assert.equal(b.unread, 1, '1일 전 단계가 되면 다시 알려요');
  assert.equal((await post(env, U.mem, { action: 'state', keys: ['task:a:d1'], state: 'dismissed' })).status, 200);
  assert.equal((await post(env, U.mem, { action: 'state', keys: ['task:a:d1'], state: 'clear' })).status, 200); assert.equal((await J(await get(env, U.mem))).items.length, 1, '되돌리기');
  for (const bad of [[], ['x'], ['task:a:d1; DROP TABLE tasks'], new Array(2).fill('task:' + 'a'.repeat(70))]) assert.equal((await post(env, U.mem, { action: 'state', keys: bad, state: 'seen' })).status, 400);
  assert.equal((await post(env, U.mem, { action: 'state', keys: [key], state: 'zzz' })).status, 400);
  assert.equal((await post(env, U.fin, { action: 'seenAll' })).status, 200);
  assert.equal(q.prepare(`SELECT COUNT(*) AS n FROM alert_state WHERE email = ?`).get(U.mem).n >= 1, true, '내 표시는 내 것만');
});

test('회의·일정은 팀 전체에게 하루 전·당일에 알림, 일수는 관리자 설정으로 바뀐다', async () => {
  const { env, q } = mk();
  q.prepare(`INSERT INTO meetings (id,meetDate,meetTime,title,createdAt,updatedAt,createdBy) VALUES ('tm1',?, '10:00','주간 회의','x','x','t')`).run(d(1));
  q.prepare(`INSERT INTO meetings (id,meetDate,title,createdAt,updatedAt,createdBy) VALUES ('tm2',?, '먼 회의','x','x','t')`).run(d(2));
  q.prepare(`INSERT INTO events (id,title,kind,startDate,endDate,createdAt,updatedAt,createdBy) VALUES ('te1','행사','team',?,?,'x','x','t')`).run(d(0), d(2));
  let b = await J(await get(env, U.tre)); assert.deepEqual(ids(b.items.filter((x) => x.type !== 'task')).sort(), ['event:te1:d0', 'meet:tm1:d1']);
  assert.equal((await post(env, U.mem, { action: 'settings', eventDays: '2' })).status, 403, '일반 팀원은 설정을 못 바꿔요');
  assert.equal((await post(env, U.dir, { action: 'settings', eventDays: '2' })).status, 403, '디렉터도 설정은 관리자만');
  assert.equal((await post(env, U.admin, { action: 'settings', eventDays: '2,1', dueDays: '5, 2', expireDays: 10 })).status, 200);
  b = await J(await get(env, U.mem)); assert.deepEqual(b.settings, { dueDays: [5, 2], eventDays: [2, 1], expireDays: 10 }); assert.ok(ids(b.items).includes('meet:tm2:d2'));
  assert.equal((await post(env, U.admin, { action: 'settings', expireDays: 0 })).status, 400);
  assert.deepEqual(sanitizeSettings({ dueDays: 'x, -1, 99' }).settings.dueDays, DEFAULT_SETTINGS.dueDays, '잘못된 값은 기본값');
});

test('팀 공지: 전체/선택한 사람, 올린 사람·관리자만 고치고 지움, 읽음 표시, 고정, 오래되면 접힘, 휴지통 복구', async () => {
  const { env, q } = mk();
  assert.equal((await post(env, U.mem, { action: 'announce', title: '' })).status, 400);
  const all = await J(await post(env, U.mem, { action: 'announce', title: '전체 공지', body: '내용', audience: 'all' })); assert.ok(all.id);
  assert.equal((await post(env, U.mem, { action: 'announce', title: '선택', audience: 'people', recipients: [] })).status, 400, '받을 사람이 없으면 거부');
  assert.equal((await post(env, U.mem, { action: 'announce', title: '선택', audience: 'people', recipients: ['stranger@example.com'] })).status, 400, '명단에 없는 사람은 못 고름');
  const some = await J(await post(env, U.fin, { action: 'announce', title: '재정팀만', audience: 'people', recipients: [U.dir, U.fin], link: '/campteam/finance/' }));
  const t = async (who) => (await J(await get(env, who))).announcements;
  assert.deepEqual((await t(U.dir)).map((a) => a.title).sort(), ['재정팀만', '전체 공지']); assert.deepEqual((await t(U.mem)).map((a) => a.title), ['전체 공지'], '받는 사람이 아니면 안 보여요');
  assert.deepEqual((await t(U.tre)).map((a) => a.title), ['전체 공지']);
  let b = await J(await get(env, U.dir)); assert.equal(b.unreadAnn, 2); assert.equal((await J(await get(env, U.mem))).unreadAnn, 0, '올린 사람은 읽은 것으로');
  assert.equal((await post(env, U.dir, { action: 'state', keys: ['ann:' + all.id], state: 'seen' })).status, 200); assert.equal((await J(await get(env, U.dir))).unreadAnn, 1);
  assert.equal((await post(env, U.tre, { action: 'edit', id: all.id, title: '남의 공지' })).status, 403); assert.equal((await post(env, U.tre, { action: 'delete', id: all.id })).status, 403);
  assert.equal((await post(env, U.mem, { action: 'edit', id: all.id, title: '고친 공지', pinned: true })).status, 200); assert.equal((await J(await get(env, U.dir))).unreadAnn, 2, '고치면 다시 새 공지');
  assert.equal((await t(U.dir))[0].title, '고친 공지', '고정한 공지가 맨 위'); assert.equal((await t(U.dir))[0].pinned, true);
  assert.equal((await post(env, U.mem, { action: 'edit', id: some.id, title: '내 공지 아님' })).status, 403);
  assert.equal((await post(env, U.admin, { action: 'edit', id: some.id, title: '관리자가 고침', audience: 'all' })).status, 200); assert.ok((await t(U.mem)).some((a) => a.title === '관리자가 고침'));
  assert.equal((await t(U.fin)).find((a) => a.id === some.id).link, '/campteam/finance/'); assert.equal((await post(env, U.fin, { action: 'edit', id: some.id, link: 'https://evil.example/x' })).status, 200); assert.equal((await t(U.fin)).find((a) => a.id === some.id).link, '', '바깥 주소는 버려요');
  q.prepare(`UPDATE announcements SET createdAt = ? WHERE id = ?`).run(d(-40) + 'T00:00:00Z', some.id); const old = (await t(U.fin)).find((a) => a.id === some.id); assert.equal(old.folded, true); assert.equal((await J(await get(env, U.dir))).unreadAnn, 1, '접힌 공지는 안 읽음 숫자에서 빠져요');
  assert.equal((await post(env, U.admin, { action: 'delete', id: all.id })).status, 200); assert.equal((await t(U.dir)).some((a) => a.id === all.id), false);
  assert.equal((await J(await call(Trash, 'onRequestGet', env, U.mem, { qs: '?kind=announcements' }))).items.length, 0, '관리자가 지운 공지는 올린 팀원의 휴지통에 안 보인다');
  const trash = await J(await call(Trash, 'onRequestGet', env, U.admin, { qs: '?kind=announcements' })); assert.equal(trash.items.length, 1);
  assert.equal((await call(Trash, 'onRequestPost', env, U.admin, { body: { kind: 'announcements', id: all.id } })).status, 200); assert.equal((await t(U.dir)).some((a) => a.id === all.id), true, '복구하면 다시 보여요');
});

test('주간 이메일 받기 켜기·끄기는 내 설정만, 새 알림 단계 변경은 내 업무 완료 처리와 연결', async () => {
  const { env, task } = mk(); task('a', d(0));
  assert.equal((await J(await get(env, U.mem))).prefs.weeklyEmail, true); await post(env, U.mem, { action: 'pref', weeklyEmail: false });
  assert.equal((await J(await get(env, U.mem))).prefs.weeklyEmail, false); assert.equal((await J(await get(env, U.fin))).prefs.weeklyEmail, true);
  assert.equal((await call(Tasks, 'onRequestPatch', env, U.mem, { qs: '?id=a', body: { status: 'Completed' } })).status, 200, '알림 패널에서 바로 완료');
  assert.equal((await J(await get(env, U.mem))).items.length, 0, '완료하면 알림이 사라져요');
});

test('AI 요약: 키가 없으면 꺼짐, 할 일 없으면 호출 안 함, 하루 한 번, 실패하면 30분 쉬고, 업무 제목·마감일만 보냄', async () => {
  const { env, task } = mk(), realFetch = globalThis.fetch; let calls = []; task('a', d(0)); task('b', d(-1));
  try {
    assert.deepEqual(await J(await post(env, U.mem, { action: 'summary', kind: 'daily' })), { text: null, reason: 'off' });
    env.ANTHROPIC_API_KEY = 'sk-test-not-real';
    assert.equal((await J(await post(env, U.fin, { action: 'summary', kind: 'daily' }))).reason, 'empty'); assert.equal(calls.length, 0);
    globalThis.fetch = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return new Response(JSON.stringify({ content: [{ type: 'text', text: '오늘은 **업무 b** 마감이 지났어요.' }] }), { status: 200 }); };
    const r = await J(await post(env, U.mem, { action: 'summary', kind: 'daily' })); assert.equal(r.text, '오늘은 업무 b 마감이 지났어요.', '마크다운 기호는 지워요');
    assert.equal(calls.length, 1); const sent = JSON.stringify(calls[0].body); assert.ok(sent.includes('업무 a') && sent.includes('업무 b')); for (const secret of [U.mem, '이름', '@']) assert.equal(sent.includes(secret), false, '이메일·담당자 이름은 보내지 않아요: ' + secret);
    assert.equal(calls[0].body.model, 'claude-haiku-5-5');
    assert.equal((await J(await post(env, U.mem, { action: 'summary', kind: 'daily' }))).text, r.text); assert.equal(calls.length, 1, '하루 한 번만 호출');
    assert.equal((await J(await get(env, U.mem))).summary.daily, r.text);
    globalThis.fetch = async () => new Response('{}', { status: 500 }); calls = [];
    env.DB.sqlite.exec(`DELETE FROM daily_summaries`); const f = await J(await post(env, U.mem, { action: 'summary', kind: 'daily' })); assert.equal(f.text, null);
    globalThis.fetch = async () => { calls.push(1); return new Response('{}', { status: 500 }); }; assert.equal((await J(await post(env, U.mem, { action: 'summary', kind: 'daily' }))).reason, 'retry-later'); assert.equal(calls.length, 0, '직전에 실패했으면 바로 다시 부르지 않아요');
    const unaffected = await J(await get(env, U.mem)); assert.ok(unaffected.items.length >= 2, 'AI 가 실패해도 목록은 그대로');
  } finally { globalThis.fetch = realFetch; }
});
