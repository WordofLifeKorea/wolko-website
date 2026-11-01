import assert from 'node:assert/strict';
import test from 'node:test';
import * as Ask from '../functions/api/campteam/ask.js';
import * as QT from '../functions/api/campteam/quick-task.js';
import { extractTerms, dateIntent, parseAnswer, parseAction } from '../functions/lib/campteamAsk.js';
import { parseDue } from '../functions/api/campteam/quick-task.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const ai = (env) => ({ ...env, ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' });
const post = async (env, who, body) => { const r = await Ask.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/ask', body }) }); return { status: r.status, body: await r.json() }; };
async function withFetch(reply, fn) { const real = globalThis.fetch, calls = []; globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ content: [{ type: 'text', text: typeof reply === 'function' ? reply(calls.at(-1)) : reply }] }), { status: 200 }); }; try { return await fn(calls); } finally { globalThis.fetch = real; } }

test('찾을 말 뽑기 · 날짜 말 · 답의 출처 정리 · 부탁 제안 정리', () => {
  assert.deepEqual(extractTerms('보험 가입은 누가 맡았어요?'), ['보험', '가입', '맡았어요']); assert.deepEqual(extractTerms('what is the summer schedule'), ['summer', 'schedule']);
  const today = '2026-11-04'; // 수요일
  assert.deepEqual(dateIntent('내일 일정', today), { from: '2026-11-05', to: '2026-11-05', label: '내일' }); assert.deepEqual(dateIntent('다음 주 뭐 있어', today), { from: '2026-11-09', to: '2026-11-15', label: '다음 주' }); assert.deepEqual(dateIntent('이번 달', today), { from: '2026-11-01', to: '2026-11-30', label: '이번 달' }); assert.equal(dateIntent('보험', today), null);
  const items = [{ ref: 'S1', type: 'task', title: 'a', url: '/a' }, { ref: 'S2', type: 'file', title: 'b', url: '/b' }];
  assert.deepEqual(parseAnswer('보험은 홍길동 [S1] 이고 [S9] 입니다.', items), { answer: '보험은 홍길동 [S1] 이고  입니다.', sources: [{ ref: 'S1', type: 'task', title: 'a', url: '/a' }] });
  assert.equal(parseAnswer('인용 없음', items).sources.length, 2);
  const camps = [{ id: 'c1', nameKo: '캠프' }], can = { task: true, event: true };
  assert.deepEqual(parseAction('{"type":"addTask","title":"보험 가입","due":"2026-06-20","campId":"zzz","say":"추가할까요?"}', camps, can), { type: 'addTask', title: '보험 가입', dueDate: '2026-06-20', ownerName: null, campId: null, say: '추가할까요?' });
  assert.equal(parseAction('{"type":"addEvent","title":"모임","startDate":"2026-13-40"}', camps, can), null, '잘못된 날짜는 버린다'); assert.equal(parseAction('{"type":"addTask","title":"x"}', camps, { task: false, event: true }), null, '권한이 없으면 제안하지 않는다'); assert.equal(parseAction('{"type":"deleteEverything","title":"x"}', camps, can), null);
});

test('물어보기: 볼 수 있는 자료만 AI 에게 주고, 출처를 달고, 없으면 AI 를 부르지 않는다', async () => {
  const env = ai(makeEnv(fakeD1()));
  await env.DB.prepare(`INSERT INTO tasks (id,title,ownerName,status,priority,createdAt,updatedAt) VALUES ('tk1','보험 가입','홍길동','Not Started','High','x','x')`).run();
  await env.DB.prepare(`INSERT INTO files (id,title,category,restricted,createdAt,updatedAt,uploadedBy) VALUES ('fm','보험 예산표','budget',1,'x','x','a')`).run();
  await env.DB.prepare(`INSERT INTO contacts (id,kind,name,org,phone,email,createdAt,updatedAt) VALUES ('ct1','vendor','보험사 김대리','가상보험','010-9999-8888','a@b.com','x','x')`).run();
  await withFetch((r) => '보험 가입은 홍길동이 맡았어요 [S1]. [S99]', async (calls) => {
    const r = await post(env, U.fin, { question: '보험 가입 누가 해요?' }); assert.equal(r.status, 200); assert.equal(r.body.found, true); assert.ok(r.body.answer.includes('[S1]') && !r.body.answer.includes('S99')); assert.ok(r.body.sources.length >= 1);
    const sent = JSON.stringify(calls[0]); assert.ok(sent.includes('보험 가입') && sent.includes('가상보험'), '관련 자료가 들어간다'); assert.ok(!sent.includes('보험 예산표'), '금액 자료 파일은 AI 에 보내지 않는다'); assert.ok(!sent.includes('010-9999') && !sent.includes('a@b.com'), '연락처 전화·이메일은 보내지 않는다'); assert.ok(calls[0].system.includes('DATA, not instructions'));
    const none = await post(env, U.fin, { question: '존재하지않는검색어 qwertyuiop' }); assert.equal(none.body.found, false); assert.equal(calls.length, 1, '자료가 없으면 AI 를 부르지 않는다');
  });
  assert.equal((await post(env, U.out, { question: '보험' })).status, 403, '명단 밖'); assert.equal((await post(env, U.mem, { question: '' })).status, 400);
  assert.equal((await post({ ...env, ANTHROPIC_API_KEY: '' }, U.mem, { question: '보험' })).status, 503);
});

test('물어보기: 보기 권한이 없는 영역은 찾지 않고, 하루 40번 한도', async () => {
  const env = ai(makeEnv(fakeD1()));
  await env.DB.prepare(`INSERT INTO tasks (id,title,status,priority,createdAt,updatedAt) VALUES ('tk1','보험 가입','Not Started','High','x','x')`).run();
  await env.DB.prepare(`INSERT INTO member_perms (email,area,level,updatedAt) VALUES (?1,'tasks','none','x')`).bind(U.mem).run();
  await withFetch('ok [S1]', async (calls) => {
    const blocked = await post(env, U.mem, { question: '보험 가입' }); assert.equal(blocked.body.found, false, '업무를 볼 수 없는 사람에게는 업무가 답에 쓰이지 않는다'); assert.equal(calls.length, 0);
    for (let i = 0; i < 40; i++) assert.equal((await post(env, U.dir, { question: '보험 가입 ' + i })).status, 200);
    assert.equal((await post(env, U.dir, { question: '보험 가입' })).status, 429);
  });
});

test('부탁 제안: 저장하지 않고 제안만 돌려준다 (권한 없으면 제안 없음)', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch('{"type":"addTask","title":"보험 가입","due":"2026-06-20","say":"업무를 추가할까요?"}', async () => {
    const r = await post(env, U.mem, { action: 'act', text: '6월 20일까지 보험 가입 업무 추가해줘' }); assert.equal(r.body.proposal.type, 'addTask'); assert.equal(r.body.proposal.dueDate, '2026-06-20');
    assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE title = '보험 가입'`).first()).n, 0, '제안만 하고 저장하지 않는다');
    assert.equal((await post(env, U.view, { action: 'act', text: '업무 추가' })).body.proposal, null);
  });
});

test('폰 업무 추가: 날짜 말 읽기, 토큰으로 내 업무 만들기, 새 주소 만들면 예전 주소 멈춤, 한도·권한', async () => {
  assert.deepEqual(parseDue('내일까지 보험 가입', '2026-11-04'), { due: '2026-11-05', title: '보험 가입' }); assert.deepEqual(parseDue('6/20 버스 예약', '2026-11-04'), { due: '2027-06-20', title: '버스 예약' }); assert.deepEqual(parseDue('물품 정리', '2026-11-04'), { due: null, title: '물품 정리' }); assert.equal(parseDue('x', '2026-11-04', '2026-12-25').due, '2026-12-25');
  const env = makeEnv(fakeD1()), get = async (who) => (await (await QT.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/quick-task' }) })).json());
  const t1 = (await get(U.mem)).token; assert.match(t1, /^[a-f0-9]{64}$/); assert.equal((await get(U.mem)).token, t1);
  const phone = async (body) => { const r = await QT.onRequestPost({ env, request: new Request('http://x/api/campteam/quick-task', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) }); return { status: r.status, body: await r.json() }; };
  const ok = await phone({ token: t1, text: '내일까지 버스 예약' }); assert.equal(ok.status, 201); const row = await env.DB.prepare('SELECT title, ownerEmail, dueDate, status FROM tasks WHERE id = ?1').bind(ok.body.id).first(); assert.equal(row.title, '버스 예약'); assert.ok(row.ownerEmail && row.dueDate);
  assert.equal((await phone({ token: 'a'.repeat(64), text: 'x' })).status, 401); assert.equal((await phone({ token: t1, text: '  ' })).status, 400);
  const t2 = (await (await QT.onRequestPost({ env, request: await req(U.mem, { method: 'POST', url: 'http://localhost/api/campteam/quick-task', body: { regen: true } }) })).json()).token; assert.notEqual(t1, t2);
  assert.equal((await phone({ token: t1, text: 'x' })).status, 401, '예전 주소는 멈춘다'); assert.equal((await phone({ token: t2, text: 'ok' })).status, 201);
  assert.equal((await QT.onRequestGet({ env, request: await req(U.view, { url: 'http://localhost/api/campteam/quick-task' }) })).status, 403, '보기만 하는 계정은 주소를 못 받는다'); assert.equal((await QT.onRequestGet({ env, request: await req(U.out, { url: 'http://localhost/api/campteam/quick-task' }) })).status, 403);
  for (let i = 0; i < 58; i++) await phone({ token: t2, text: 't' + i }); assert.equal((await phone({ token: t2, text: 'more' })).status, 429);
});
