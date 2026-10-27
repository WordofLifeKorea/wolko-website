import assert from 'node:assert/strict';
import test from 'node:test';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Home from '../functions/api/campteam/home.js';
import * as Space from '../functions/api/campteam/camp-space.js';
import * as Import from '../functions/api/campteam/import-tasks.js';
import * as Calendar from '../functions/api/campteam/calendar.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

// 명단(팀원)은 시험 자료에서 가져오고, 업무·캠프·행사만 비워서 숫자를 정확히 센다
const mk = () => { const env = makeEnv(fakeD1()); env.DB.sqlite.exec('PRAGMA foreign_keys = OFF; DELETE FROM tasks; DELETE FROM events; DELETE FROM meetings; DELETE FROM camps; DELETE FROM camp_types;'); return env; };
const call = async (name, mod, fn, env, who, { qs = '', method, body } = {}) =>
  mod[fn]({ env, request: await req(who, { method: method || (fn === 'onRequestGet' ? 'GET' : 'POST'), body, url: `http://localhost:8788/api/campteam/${name}${qs}` }) });
const get = async (name, mod, env, qs = '', who = U.mem) => (await call(name, mod, 'onRequestGet', env, who, { qs })).json();
const mkCamp = async (env, body = {}) => {
  const t = await (await call('camps', Camps, 'onRequestPost', env, U.mem, { body: { kind: 'type', nameKo: '테스트 유형', nameEn: 'Test type' } })).json();
  return (await (await call('camps', Camps, 'onRequestPost', env, U.mem, { body: { kind: 'camp', typeId: t.id, nameKo: '샘플 캠프', ...body } })).json()).id;
};
const mkTask = async (env, body) => (await (await call('tasks', Tasks, 'onRequestPost', env, U.mem, { body })).json()).id;

test('비활성 업무: 목록에는 있지만 진행 중·마감·담당자 미정 집계에서는 빠진다', async () => {
  const env = mk();
  const a = await mkTask(env, { title: '활성 업무', dueDate: '2020-01-01' });
  const b = await mkTask(env, { title: '비활성 업무', dueDate: '2020-01-01', inactive: 1 });
  const all = await get('tasks', Tasks, env);
  assert.equal(all.items.length, 2, '"전체"에는 둘 다 보인다');
  assert.equal(all.items.find(x => x.id === b).inactive, 1);
  assert.deepEqual([all.counts.open, all.counts.overdue, all.counts.noOwner, all.counts.noDue, all.counts.inactive], [1, 1, 1, 0, 1]);
  for (const flag of ['open', 'overdue', 'noowner']) assert.deepEqual((await get('tasks', Tasks, env, `?flag=${flag}`)).items.map(x => x.id), [a], flag);
  assert.deepEqual((await get('tasks', Tasks, env, '?flag=inactive')).items.map(x => x.id), [b]);
  // 활성으로 바꾸면 다시 집계에 들어온다
  assert.equal((await call('tasks', Tasks, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${b}`, body: { inactive: 0 } })).status, 200);
  assert.equal((await get('tasks', Tasks, env)).counts.open, 2);
  assert.equal((await get('tasks', Tasks, env)).counts.inactive, 0);
});

test('비활성 업무: 홈·캠프 공간·캠프 목록의 진행률과 달력에서 빠지고, 비활성 개수만 알려 준다', async () => {
  const env = mk();
  const camp = await mkCamp(env, { startDate: '2027-01-11', endDate: '2027-01-16', status: 'planning' });
  await mkTask(env, { title: '활성', campId: camp, status: 'Completed', dueDate: '2027-01-05' });
  await mkTask(env, { title: '비활성 A', campId: camp, inactive: 1, dueDate: '2027-01-06' });
  await mkTask(env, { title: '비활성 B', campId: camp, inactive: 1 });
  const home = await get('home', Home, env);
  assert.deepEqual([home.stats.open, home.stats.total, home.stats.completed], [0, 1, 1]);
  const row = home.camps.find(c => c.id === camp);
  assert.deepEqual([row.taskTotal, row.taskDone], [1, 1]);
  const camps = (await get('camps', Camps, env)).types.flatMap(t => t.camps).find(c => c.id === camp);
  assert.deepEqual([camps.taskTotal, camps.taskDone, camps.taskInactive], [1, 1, 2]);
  const sp = await get('camp-space', Space, env, `?id=${camp}`);
  assert.equal(sp.stats.total, 1); assert.equal(sp.stats.inactive, 2); assert.equal(sp.tasks.length, 0);
  const cal = await get('calendar', Calendar, env, '?from=2027-01-01&to=2027-01-31');
  const titles = JSON.stringify(cal);
  assert.ok(titles.includes('활성') && !titles.includes('비활성 A'), '비활성 업무의 마감일은 달력에 나오지 않는다');
});

test('시트 가져오기: "비활성 상태로 가져오기"를 켜면 가져온 업무가 모두 비활성이다', async () => {
  const env = mk();
  const csv = 'Task,Owner,Priority\n체크 항목 하나,,2 IMPORTANT\n체크 항목 둘,Mina,';
  const on = await (await call('import-tasks', Import, 'onRequestPost', env, U.mem, { body: { csv, inactive: true } })).json();
  assert.equal(on.created, 2);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM tasks WHERE inactive = 1').get().n, 2);
  const env2 = mk();
  await call('import-tasks', Import, 'onRequestPost', env2, U.mem, { body: { csv } });
  assert.equal(env2.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM tasks WHERE inactive = 1').get().n, 0, '켜지 않으면 보통 업무로 들어온다');
});

test('캠프 연도·시즌: 저장되고 목록에 나오며, 잘못된 연도는 거절한다 (시즌은 자유 입력)', async () => {
  const env = mk();
  const id = await mkCamp(env, { year: 2027, season: '겨울' });
  const c = (await get('camps', Camps, env)).types.flatMap(t => t.camps).find(x => x.id === id);
  assert.equal(c.year, 2027); assert.equal(c.season, '겨울');
  assert.equal((await call('camps', Camps, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?kind=camp&id=${id}`, body: { season: 'Retreat', year: '2028' } })).status, 200);
  const c2 = (await get('camps', Camps, env)).types.flatMap(t => t.camps).find(x => x.id === id);
  assert.equal(c2.season, 'Retreat'); assert.equal(c2.year, 2028);
  assert.equal((await call('camps', Camps, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?kind=camp&id=${id}`, body: { year: '1999' } })).status, 400);
  assert.equal((await call('camps', Camps, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?kind=camp&id=${id}`, body: { year: '' } })).status, 200);
  assert.equal((await get('camps', Camps, env)).types.flatMap(t => t.camps).find(x => x.id === id).year, null, '연도는 비워 둘 수 있다');
});

test('담당자 칸: 공동 담당("A / B")은 목록에서 사람·팀 이름으로 풀리고, 한 사람으로 걸러도 공동 업무가 같이 나온다', async () => {
  const env = mk();
  await mkTask(env, { title: '혼자', ownerName: 'Mina' });
  await mkTask(env, { title: '둘이', ownerName: 'Joon / Mina' });
  await mkTask(env, { title: '괄호', ownerName: 'Mina (communication) / Alex (scheduling)' });
  await mkTask(env, { title: '팀', ownerName: 'All Together' });
  await mkTask(env, { title: '다른 사람', ownerName: 'Joon' });
  const all = await get('tasks', Tasks, env);
  assert.deepEqual(all.owners, ['Alex', 'All Together', 'Joon', 'Mina'], '목록에는 조합 이름이 없고 각자 한 번씩');
  const titles = async (o) => (await get('tasks', Tasks, env, `?owner=${encodeURIComponent(o)}`)).items.map(x => x.title).sort();
  assert.deepEqual(await titles('Mina'), ['괄호', '둘이', '혼자'].sort());
  assert.deepEqual(await titles('Alex'), ['괄호']);
  assert.deepEqual(await titles('mina'), ['괄호', '둘이', '혼자'].sort(), '대소문자는 구분하지 않는다');
  assert.deepEqual(await titles('All Together'), ['팀']);
});
