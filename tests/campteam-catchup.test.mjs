import assert from 'node:assert/strict';
import test from 'node:test';
import * as Cu from '../functions/api/campteam/catchup.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const get = async (e, who) => (await Cu.onRequestGet({ env: e, request: await req(who, { url: 'http://localhost/api/campteam/catchup' }) })).json();
const post = async (e, who) => Cu.onRequestPost({ env: e, request: await req(who, { method: 'POST', body: { dismiss: true }, url: 'http://localhost/api/campteam/catchup' }) });
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const setLast = (e, who, at) => e.DB.sqlite.prepare("INSERT OR REPLACE INTO alert_state (email, alertKey, state, updatedAt) VALUES (?1,'lastvisit','seen',?2)").run(who, at);
const log = (e, actor, action, entity, entityId, at) => e.DB.sqlite.prepare('INSERT INTO audit_log (id, at, actor, action, entity, entityId, detail) VALUES (?1,?2,?3,?4,?5,?6,?7)').run('a' + Math.random().toString(36).slice(2), at, actor, action, entity, entityId, '');

test('처음 접속이거나 24시간 안에 다시 온 사람에게는 아무것도 보여 주지 않는다', async () => {
  const e = makeEnv(fakeD1(), {});
  assert.equal((await get(e, U.mem)).show, false, '처음');
  assert.equal((await get(e, U.mem)).show, false, '바로 다시');
  setLast(e, U.mem, ago(5)); log(e, U.dir, 'create', 'task', 'x', ago(1));
  assert.equal((await get(e, U.mem)).show, false, '5시간 만에');
});

test('3일 만에 오면 그 사이 다른 사람이 한 일을 센다 — 내가 한 일·지운 것은 빼고, 닫으면 다시 안 뜬다', async () => {
  const e = makeEnv(fakeD1(), {}), t = e.DB.sqlite.prepare('SELECT id, title FROM tasks WHERE deletedAt IS NULL LIMIT 2').all();
  setLast(e, U.mem, ago(72));
  log(e, U.dir, 'create', 'task', t[0].id, ago(40)); log(e, U.dir, 'update', 'task', t[0].id, ago(30)); log(e, U.dir, 'update', 'task', t[1].id, ago(20));
  log(e, U.mem, 'create', 'task', 'mine', ago(10)); log(e, U.dir, 'delete', 'task', 'gone', ago(9));
  const d = await get(e, U.mem);
  assert.equal(d.show, true); assert.equal(d.counts.tasksNew, 1, '새 업무(내가 만든 건 제외)'); assert.equal(d.counts.tasksChanged, 1, '새로 만든 것은 바뀜에 또 세지 않는다');
  assert.ok(d.top.tasks.includes(t[0].title));
  assert.equal((await get(e, U.mem)).show, true, '다시 열어도 같은 요약이 유지된다');
  assert.equal((await post(e, U.mem)).status, 200);
  assert.equal((await get(e, U.mem)).show, false, '닫으면 다시 안 뜬다');
});

test('금액(제한) 파일은 개수에도 제목에도 나오지 않는다 · 바뀐 게 없으면 조용히 닫는다 · 조회 전용은 쓸 수 없다', async () => {
  const e = makeEnv(fakeD1(), {}), f = e.DB.sqlite.prepare('SELECT id FROM files WHERE restricted = 1 AND deletedAt IS NULL LIMIT 1').get();
  assert.ok(f, '시험용 금액 파일이 있어야 한다');
  setLast(e, U.view, ago(72)); setLast(e, U.mem, ago(72)); log(e, U.dir, 'upload', 'file', f.id, ago(5));
  assert.equal((await get(e, U.view)).show, false, '금액 권한이 없는 사람: 금액 파일만 바뀌었으면 바뀐 게 없는 것으로 본다(개수에도 안 센다)');
  const d = await get(e, U.mem); assert.equal(d.show, true, '금액 권한이 있는 사람에게는 보인다'); assert.equal(d.counts.filesNew, 1);
  setLast(e, U.out, ago(72)); log(e, U.dir, 'create', 'task', 'z', ago(5));
  assert.equal((await get(e, U.out)).show, false, '명단 밖');
});
