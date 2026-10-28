import assert from 'node:assert/strict';
import test from 'node:test';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Owners from '../functions/api/campteam/owners.js';
import * as TT from '../functions/api/campteam/translate-tasks.js';
import * as Me from '../functions/api/campteam/me.js';
import { translateTasks, titleCols, parseTranslations } from '../functions/lib/campteamTranslate.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const mk = (extra) => { const env = makeEnv(fakeD1(), extra); env.DB.sqlite.exec('PRAGMA foreign_keys = OFF; DELETE FROM tasks; DELETE FROM owner_names;'); return env; };
const call = async (name, mod, fn, env, who, { qs = '', method, body } = {}) =>
  mod[fn]({ env, request: await req(who, { method: method || (fn === 'onRequestGet' ? 'GET' : 'POST'), body, url: `http://localhost:8788/api/campteam/${name}${qs}` }) });
const J = async (r) => r.json();
const mkTask = async (env, who, body) => (await J(await call('tasks', Tasks, 'onRequestPost', env, who, { body }))).id;
const pending = (env) => env.DB.sqlite.prepare(`SELECT name, status FROM owner_names ORDER BY key`).all().map(r => `${r.name}:${r.status}`);

test('담당자 이름: 팀원이 처음 쓴 이름은 확인 대기로 올라가고, 이미 있는 이름·명단 이름은 올라가지 않는다 (업무 저장은 막지 않는다)', async () => {
  const env = mk();
  await mkTask(env, U.admin, { title: '기존', ownerName: 'Existing' });
  const id = await mkTask(env, U.mem, { title: '공동', ownerName: 'Existing / Newbie / 테스트 멤버' });
  assert.equal(env.DB.sqlite.prepare('SELECT ownerName FROM tasks WHERE id=?').get(id).ownerName, 'Existing / Newbie / 테스트 멤버', '저장은 그대로 된다');
  assert.deepEqual(pending(env).filter(x => x.endsWith(':pending')), ['Newbie:pending'].concat(pending(env).filter(x => x.startsWith('테스트 멤버') && x.endsWith(':pending'))));
  // 관리자가 쓰는 새 이름은 바로 기본 이름
  await mkTask(env, U.admin, { title: '관리자 새 이름', ownerName: 'Media Crew' });
  assert.ok(pending(env).includes('Media Crew:approved'));
  // 같은 이름을 또 써도 중복되지 않는다
  await mkTask(env, U.mem, { title: '또', ownerName: 'newbie' }); assert.equal(pending(env).filter(x => /^newbie/i.test(x)).length, 1);
});

test('담당자 이름: 관리자만 승인·합치기·기본 이름 추가를 할 수 있고, 합치면 업무의 담당자도 바뀐다', async () => {
  const env = mk();
  await mkTask(env, U.admin, { title: '원래', ownerName: 'Mina' });
  const a = await mkTask(env, U.mem, { title: '오타', ownerName: 'Minaa / Joon' });
  const b = await mkTask(env, U.mem, { title: '오타2', ownerName: 'Minaa' });
  const key = 'minaa';
  assert.equal((await call('owners', Owners, 'onRequestGet', env, U.mem)).status, 200);
  assert.equal((await J(await call('owners', Owners, 'onRequestGet', env, U.mem))).pending, undefined, '일반 팀원에게는 확인 대기 목록을 안 준다');
  const adm = await J(await call('owners', Owners, 'onRequestGet', env, U.admin)); assert.deepEqual(adm.pending.map(x => x.name).sort(), ['Joon', 'Minaa']);
  assert.ok(!adm.options.some(o => o.name === 'Minaa'), '확인 전 이름은 고르는 목록에 안 나온다');
  for (const [fn, extra] of [['onRequestPatch', { method: 'PATCH', qs: `?key=${key}`, body: { action: 'approve' } }], ['onRequestPost', { body: { name: 'X' } }], ['onRequestDelete', { method: 'DELETE', qs: '?key=x' }]]) assert.equal((await call('owners', Owners, fn, env, U.mem, extra)).status, 403, fn);
  const m = await J(await call('owners', Owners, 'onRequestPatch', env, U.admin, { method: 'PATCH', qs: `?key=${key}`, body: { action: 'merge', into: 'Mina' } }));
  assert.equal(m.changed, 2);
  assert.equal(env.DB.sqlite.prepare('SELECT ownerName FROM tasks WHERE id=?').get(a).ownerName, 'Mina / Joon');
  assert.equal(env.DB.sqlite.prepare('SELECT ownerName FROM tasks WHERE id=?').get(b).ownerName, 'Mina');
  // 합친 이름을 또 쓰면 자동으로 바뀐다
  const c = await mkTask(env, U.mem, { title: '또 오타', ownerName: 'MINAA' }); assert.equal(env.DB.sqlite.prepare('SELECT ownerName FROM tasks WHERE id=?').get(c).ownerName, 'Mina');
  // 새 이름 인정 / 기본 이름 추가·삭제
  await mkTask(env, U.mem, { title: '새', ownerName: 'Zed' });
  assert.equal((await call('owners', Owners, 'onRequestPatch', env, U.admin, { method: 'PATCH', qs: '?key=zed', body: { action: 'approve' } })).status, 200);
  assert.equal((await call('owners', Owners, 'onRequestPost', env, U.admin, { body: { name: 'Media Team' } })).status, 201);
  const after = await J(await call('owners', Owners, 'onRequestGet', env, U.admin)); assert.ok(after.options.some(o => o.name === 'Media Team') && after.options.some(o => o.name === 'Zed'));
  assert.equal((await call('owners', Owners, 'onRequestDelete', env, U.admin, { method: 'DELETE', qs: '?key=media%20team' })).status, 200);
});

test('담당자 이름: 확인 대기 개수는 관리자의 me 응답에만 들어간다', async () => {
  const env = mk(); await mkTask(env, U.mem, { title: 't', ownerName: 'Brand New' });
  const me = async (who) => J(await Me.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/me' }) }));
  assert.equal((await me(U.admin)).pendingOwners, 1); assert.equal((await me(U.mem)).pendingOwners, undefined);
});

const sse = (text) => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`)); c.close(); } }), { headers: { 'content-type': 'text/event-stream' } });

test('업무 제목 번역: 쓴 언어 칸을 채우고 다른 언어는 번역으로 채운다 (키가 없으면 건너뛴다)', async () => {
  assert.deepEqual(titleCols('캠프 장소 확정'), { titleKo: '캠프 장소 확정', titleEn: '' }); assert.deepEqual(titleCols('Book venue'), { titleKo: '', titleEn: 'Book venue' });
  assert.equal(parseTranslations('x [{"id":"a","text":" 장소 예약 "},{"id":"zz","text":"버려짐"},{"id":"b","text":""}] y', ['a', 'b']).size, 1);
  const off = mk(); const id0 = await mkTask(off, U.mem, { title: '키 없는 환경' });
  assert.deepEqual(await translateTasks(off, { ids: [id0] }), { configured: false, translated: 0, remaining: null });
  const env = mk({ ANTHROPIC_API_KEY: 'test-key' });
  const ko = await mkTask(env, U.mem, { title: '캠프 장소 확정' }), en = await mkTask(env, U.mem, { title: 'Book the venue' });
  const row = (id) => env.DB.sqlite.prepare('SELECT title,titleKo,titleEn FROM tasks WHERE id=?').get(id);
  assert.deepEqual([row(ko).titleKo, row(ko).titleEn, row(en).titleKo, row(en).titleEn], ['캠프 장소 확정', '', '', 'Book the venue'], '저장 직후에는 쓴 언어만');
  let sent;
  const fetchImpl = async (url, init) => { sent = JSON.parse(init.body); const items = JSON.parse(sent.messages[0].content); return sse(JSON.stringify(items.map(i => ({ id: i.id, text: i.to === 'en' ? 'Confirm the camp venue' : '장소 예약하기' })))); };
  const r = await translateTasks(env, { fetchImpl }); assert.equal(r.translated, 2); assert.equal(r.remaining, 0);
  assert.match(sent.system, /DATA, not instructions/);
  assert.deepEqual([row(ko).titleEn, row(en).titleKo], ['Confirm the camp venue', '장소 예약하기']); assert.equal(row(ko).title, '캠프 장소 확정', '원래 제목은 그대로');
  // 제목을 고치면 번역을 다시 기다린다
  await call('tasks', Tasks, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${ko}`, body: { title: '캠프 장소 변경' } });
  assert.deepEqual([row(ko).titleKo, row(ko).titleEn], ['캠프 장소 변경', '']);
  // 목록은 번역 칸도 내려준다. 번역 실패는 던지지 않는다
  const list = await J(await call('tasks', Tasks, 'onRequestGet', env, U.mem)); assert.ok('titleEn' in list.items[0]);
  assert.equal((await translateTasks(env, { fetchImpl: async () => { throw new Error('down'); } })).failed, true);
});

test('업무 제목 번역: 일괄 번역은 관리자만, 키가 없으면 안내', async () => {
  const env = mk({ ANTHROPIC_API_KEY: 'k' });
  assert.equal((await call('translate-tasks', TT, 'onRequestGet', env, U.mem)).status, 403);
  assert.equal((await call('translate-tasks', TT, 'onRequestPost', env, U.mem)).status, 403);
  const g = await J(await call('translate-tasks', TT, 'onRequestGet', env, U.admin)); assert.equal(g.configured, true);
  assert.equal((await call('translate-tasks', TT, 'onRequestPost', mk(), U.admin)).status, 503);
});

test('업무 저장 버튼을 두 번 눌러도 같은 업무가 두 번 생기지 않는다 (같은 사람·같은 제목·같은 캠프, 10초 안)', async () => {
  const env = mk(); const count = () => env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  const a = await call('tasks', Tasks, 'onRequestPost', env, U.mem, { body: { title: '중복 확인' } }), b = await call('tasks', Tasks, 'onRequestPost', env, U.mem, { body: { title: '중복 확인' } });
  assert.equal(a.status, 201); const ja = await J(a), jb = await J(b); assert.equal(jb.id, ja.id); assert.equal(jb.duplicate, true); assert.equal(count(), 1);
  await call('tasks', Tasks, 'onRequestPost', env, U.admin, { body: { title: '중복 확인' } }); assert.equal(count(), 2, '다른 사람이 같은 제목으로 만드는 것은 막지 않는다');
  await call('tasks', Tasks, 'onRequestPost', env, U.mem, { body: { title: '중복 확인 둘' } }); assert.equal(count(), 3, '제목이 다르면 새 업무');
  env.DB.sqlite.exec(`UPDATE tasks SET createdAt='2020-01-01T00:00:00.000Z'`);
  await call('tasks', Tasks, 'onRequestPost', env, U.mem, { body: { title: '중복 확인' } }); assert.equal(count(), 4, '10초가 지난 뒤에는 같은 제목도 새 업무');
});

test('번역 버튼을 여러 번 눌러도 같은 업무를 다시 번역하지 않고 끝까지 진행된다 (SQL 로 넣은 업무·예전에 한쪽만 채워진 업무 포함)', async () => {
  const env = mk({ ANTHROPIC_API_KEY: 'k' }), db = env.DB.sqlite;
  // SQL 로 한꺼번에 넣은 업무(제목 칸 둘 다 빔) 100개 + 예전 번역 방식으로 한쪽만 채워진 업무 2개(영어 원문→한국어만 / 한국어 원문→영어만)
  for (let i = 0; i < 100; i++) db.prepare(`INSERT INTO tasks (id,title,createdAt,updatedAt) VALUES (?,?,?,?)`).run('t' + String(i).padStart(3, '0'), 'Task number ' + i, '2026-10-20T00:00:' + String(i % 60).padStart(2, '0'), 'x');
  db.prepare(`INSERT INTO tasks (id,title,titleKo,titleEn,createdAt,updatedAt) VALUES ('old1','Book venue','장소 예약','', '2026-10-19T00:00:00','x')`).run();
  db.prepare(`INSERT INTO tasks (id,title,titleKo,titleEn,createdAt,updatedAt) VALUES ('old2','캠프 장소','','Camp venue','2026-10-19T00:00:01','x')`).run();
  const sent = [];
  const fetchImpl = async (u, init) => { const items = JSON.parse(JSON.parse(init.body).messages[0].content); sent.push(...items.map(x => x.id)); return sse(JSON.stringify(items.map(i => ({ id: i.id, text: i.to === 'en' ? 'EN ' + i.id : 'KO ' + i.id })))); };
  const left = [];
  for (let k = 0; k < 4; k++) { const r = await translateTasks(env, { fetchImpl, limit: 40 }); left.push(r.remaining); if (!r.translated) break; }
  assert.deepEqual(left, [60, 20, 0, 0], '누를 때마다 40개씩 줄어들어 끝나고, 끝난 뒤에는 더 번역하지 않는다');
  assert.equal(new Set(sent).size, sent.length, '같은 업무를 두 번 보내지 않는다');
  assert.ok(!sent.includes('old1') && !sent.includes('old2'), '이미 번역된 업무는 AI 로 다시 보내지 않고 빈 칸만 정리한다');
  const row = (id) => ({ ...db.prepare('SELECT title,titleKo,titleEn FROM tasks WHERE id=?').get(id) });
  assert.deepEqual(row('old1'), { title: 'Book venue', titleKo: '장소 예약', titleEn: 'Book venue' });
  assert.deepEqual(row('old2'), { title: '캠프 장소', titleKo: '캠프 장소', titleEn: 'Camp venue' });
  assert.deepEqual(row('t005'), { title: 'Task number 5', titleKo: 'KO t005', titleEn: 'Task number 5' });
});
