import assert from 'node:assert/strict';
import test from 'node:test';
import * as Ask from '../functions/api/campteam/ask.js';
import * as Mem from '../functions/api/campteam/lumi-memory.js';
import { campSession } from '../functions/lib/campteamAuth.js';
import { parseAction, actTargets, cleanHistory } from '../functions/lib/campteamAsk.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const ai = (env) => ({ ...env, ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' });
const post = async (env, who, body) => { const r = await Ask.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/ask', body }) }); return { status: r.status, body: await r.json() }; };
const mem = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { method: o.method || 'GET', url: 'http://localhost/api/campteam/lumi-memory', body: o.body }) }); return { status: r.status, body: await r.json() }; };
async function withFetch(reply, fn) { const real = globalThis.fetch, calls = []; globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ content: [{ type: 'text', text: typeof reply === 'function' ? reply(calls.at(-1)) : reply }] }), { status: 200 }); }; try { return await fn(calls); } finally { globalThis.fetch = real; } }
const camps = [{ id: 'c1', nameKo: '겨울 캠프' }], can = { task: true, event: true };
const targets = { tasks: [{ ref: 'T1', id: 'tk1', title: '버스 예약', dueDate: '2026-11-03', ownerName: 'Mina', campId: null }], events: [{ ref: 'E1', id: 'ev1', title: '팀 모임', startDate: '2026-11-05', endDate: null, startTime: '09:00', endTime: '', location: '', campId: null }] };

test('루미 수정·삭제 제안: 목록에 있는 번호만, 실제로 바뀌는 칸만, 잘못된 값은 버린다', () => {
  const p = (o) => parseAction(JSON.stringify(o), camps, can, targets);
  const e1 = p({ type: 'editTask', target: 'T1', changes: { due: '2026-11-05', title: '버스 예약', ownerName: 'Mina' }, say: '바꿀까요?' });
  assert.deepEqual(e1.changes, { dueDate: '2026-11-05' }, '같은 값은 바뀌는 칸에서 뺀다'); assert.equal(e1.targetId, 'tk1'); assert.equal(e1.before.dueDate, '2026-11-03');
  assert.equal(p({ type: 'editTask', target: 'T9', changes: { due: '2026-11-05' } }), null, '없는 번호는 지어낼 수 없다');
  assert.equal(p({ type: 'editTask', target: 'T1', changes: { due: '2026-13-40' } }), null, '잘못된 날짜만 있으면 제안 없음');
  assert.equal(p({ type: 'editTask', target: 'E1', changes: { title: '새 이름' } }), null, '업무 제안에 일정 번호를 쓸 수 없다');
  assert.deepEqual(p({ type: 'editTask', target: 'T1', changes: { due: '' } }).changes, { dueDate: null }, '기한 비우기');
  assert.deepEqual(p({ type: 'editEvent', target: 'E1', changes: { startTime: '10:00' } }).changes, { startTime: '10:00' });
  assert.equal(p({ type: 'editEvent', target: 'E1', changes: { startTime: '25:00' } }), null);
  assert.equal(p({ type: 'editEvent', target: 'E1', changes: { endDate: '2026-11-01' } }), null, '끝나는 날이 시작일보다 앞서면 제안하지 않는다');
  const d = p({ type: 'deleteTask', target: 'T1', say: '지울까요?' }); assert.equal(d.type, 'deleteTask'); assert.equal(d.targetId, 'tk1'); assert.equal(d.targetTitle, '버스 예약');
  assert.equal(parseAction('{"type":"deleteTask","target":"T1"}', camps, { task: false, event: true }, targets), null, '권한이 없으면 제안 없음');
  assert.deepEqual(p({ type: 'none', say: '어떤 일정인가요?' }), { type: 'none', say: '어떤 일정인가요?' }); assert.equal(p({ type: 'none' }), null);
  assert.equal(p({ type: 'addTask', title: '새 업무' }).type, 'addTask', '기존 추가 제안은 그대로');
  assert.deepEqual(cleanHistory([{ r: 'u', t: 'a'.repeat(300) }, { r: 'a', t: '' }, null]).map((m) => m.t.length), [200]);
});

test('루미 부탁: 고치고 지울 후보는 내가 만든·내가 맡은 것뿐이고, AI 에는 번호와 최근 대화만 간다 (저장은 하지 않는다)', async () => {
  const env = ai(makeEnv(fakeD1()));
  await env.DB.prepare(`INSERT INTO tasks (id,title,ownerEmail,status,priority,createdAt,updatedAt,createdBy) VALUES ('mine','내가 만든 업무','','Not Started','Medium','2026-11-01','x',?1),('theirs','남의 업무','','Not Started','Medium','2026-11-02','x',?2),('owned','내가 맡은 업무',?1,'Not Started','Medium','2026-10-30','x',?2)`).bind(U.mem, U.dir).run();
  await env.DB.prepare(`INSERT INTO events (id,title,kind,startDate,startTime,endTime,location,notes,createdAt,updatedAt,createdBy) VALUES ('evMine','내 일정','team','2026-11-09','09:00','','','','2026-11-01','x',?1),('evOther','남의 일정','team','2026-11-10','','','','','2026-11-02','x',?2)`).bind(U.mem, U.dir).run();
  const t = await actTargets(env, U.mem, (await campSession(await req(U.mem), env)).perms);
  assert.deepEqual(t.tasks.map((x) => x.id).sort(), ['mine', 'owned']); assert.deepEqual(t.events.map((x) => x.id), ['evMine']);
  await withFetch('{"type":"editEvent","target":"E1","changes":{"startTime":"10:00"},"say":"10시로 바꿀까요?"}', async (calls) => {
    const r = await post(env, U.mem, { action: 'act', text: '이 일정을 오전 10시로 변경해줘', history: [{ r: 'u', t: '11월 9일 내 일정 만들어줘' }, { r: 'a', t: '추가한 일정: 내 일정 (2026-11-09 09:00)' }] });
    assert.equal(r.body.proposal.type, 'editEvent'); assert.equal(r.body.proposal.targetId, 'evMine'); assert.deepEqual(r.body.proposal.changes, { startTime: '10:00' }); assert.equal(r.body.proposal.before.startTime, '09:00');
    const sys = calls[0].system, usr = calls[0].messages[0].content;
    assert.ok(sys.includes('T1:') && sys.includes('내가 만든 업무') && sys.includes('E1:') && sys.includes('내 일정'), 'AI 에는 내 항목이 번호로 간다'); assert.ok(!sys.includes('남의 업무') && !sys.includes('남의 일정'), '남이 만든 것은 후보가 아니다'); assert.ok(!sys.includes('evMine'), '진짜 id 는 AI 에 보내지 않는다');
    assert.ok(usr.includes('<conversation>') && usr.includes('11월 9일 내 일정 만들어줘') && usr.includes('<request>'), '최근 대화가 참고 자료로 간다');
    assert.equal((await env.DB.prepare(`SELECT startTime FROM events WHERE id = 'evMine'`).first()).startTime, '09:00', '제안만 하고 저장하지 않는다');
  });
  await withFetch('{"type":"deleteTask","target":"T9","say":"x"}', async () => { assert.equal((await post(env, U.mem, { action: 'act', text: '그 업무 지워줘' })).body.proposal, null, '없는 번호는 제안이 되지 않는다'); });
  await withFetch('{"type":"none","say":"업무에는 시간이 없어요. 일정으로 만들까요?"}', async () => { const r = await post(env, U.mem, { action: 'act', text: '그 업무를 10시로' }); assert.deepEqual(r.body.proposal, { type: 'none', say: '업무에는 시간이 없어요. 일정으로 만들까요?' }); });
  await withFetch('{"type":"editEvent","target":"E1","changes":{"startTime":"10:00"}}', async () => { assert.equal((await post(env, U.view, { action: 'act', text: '일정 바꿔줘' })).body.proposal, null, '보기만 하는 계정은 고칠 수 없다'); });
});

test('루미 기억: 내 대화만 서버에 저장·불러오기·지우기, 말풍선 모양을 정리하고 오래된 기억은 버린다', async () => {
  const env = makeEnv(fakeD1());
  assert.deepEqual((await mem(Mem.onRequestGet, env, U.mem)).body.msgs, [], '처음엔 비어 있다');
  const msgs = [{ r: 'u', t: '업무 추가해줘', bad: 'x' }, { r: 'a', t: '', p: { type: 'addTask', title: '버스 예약', say: 's' }, pd: 'ok', qs: { owner: 1 } }, { r: 'a', t: '찾았어요', src: [{ title: '자료', type: 'file', url: '/portal/campteam/files/' }, { title: '나쁜 주소', type: 'x', url: 'javascript:alert(1)' }], o: ['root'] }, null, { r: 'a', t: '' }];
  assert.equal((await mem(Mem.onRequestPut, env, U.mem, { method: 'PUT', body: { msgs } })).body.n, 3);
  const got = (await mem(Mem.onRequestGet, env, U.mem)).body.msgs; assert.equal(got.length, 3); assert.ok(!('bad' in got[0]) && !('qs' in got[1]), '모르는 칸은 저장하지 않는다'); assert.equal(got[1].pd, 'ok'); assert.equal(got[2].src.length, 1, '/ 로 시작하는 주소만');
  assert.deepEqual((await mem(Mem.onRequestGet, env, U.dir)).body.msgs, [], '다른 계정은 내 대화를 볼 수 없다');
  assert.equal((await mem(Mem.onRequestGet, env, U.out)).status, 403, '명단 밖'); assert.equal((await Mem.onRequestGet({ env, request: await req(null) })).status, 401);
  assert.equal(Mem.cleanMsgs(Array.from({ length: 60 }, (_, i) => ({ r: 'u', t: 'm' + i }))).length, Mem.MAX_MSGS, '최근 40개만');
  await env.DB.prepare(`UPDATE lumi_chats SET updatedAt = ?1 WHERE email = ?2`).bind(new Date(Date.now() - 61 * 86400000).toISOString(), U.mem).run();
  assert.deepEqual((await mem(Mem.onRequestGet, env, U.mem)).body.msgs, [], '60일이 지난 기억은 버린다');
  await mem(Mem.onRequestPut, env, U.mem, { method: 'PUT', body: { msgs: [{ r: 'u', t: '안녕' }] } }); await mem(Mem.onRequestDelete, env, U.mem, { method: 'DELETE' });
  assert.deepEqual((await mem(Mem.onRequestGet, env, U.mem)).body.msgs, [], '「새 대화」는 기억도 지운다');
});
