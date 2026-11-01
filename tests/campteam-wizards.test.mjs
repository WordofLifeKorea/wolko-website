import assert from 'node:assert/strict';
import test from 'node:test';
import * as W from '../functions/api/campteam/camp-wizard.js';
import * as C from '../functions/api/campteam/camp-close.js';
import * as SV from '../functions/api/campteam/surveys.js';
import * as SA from '../functions/api/campteam/survey-answer.js';
import * as SR from '../functions/api/campteam/survey-results.js';
import { shiftDay, rankSources, buildCandidates, parseRank } from '../functions/lib/campteamWizard.js';
import { cleanQuestions, cleanAnswers, summarize } from '../functions/lib/campteamSurvey.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { url: 'http://localhost/api/campteam/x' + (o.qs || ''), method: o.method, body: o.body }) }); return { status: r.status, body: await r.json() }; };
const anon = async (m, env, url, body) => { const r = await m({ env, request: new Request(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' } } : {}) }); return { status: r.status, body: await r.json() }; };
const mkCamp = async (env, id, name, start, typeId, extra = {}) => env.DB.prepare(`INSERT INTO camps (id,typeId,nameKo,startDate,status,year,season,createdAt,updatedAt) VALUES (?1,?2,?3,?4,'planning',?5,?6,'x','x')`).bind(id, typeId, name, start, extra.year || null, extra.season || '').run();
const typeId = async (env) => (await env.DB.prepare('SELECT id FROM camp_types WHERE deletedAt IS NULL LIMIT 1').first()).id;

test('날짜 옮기기·후보 순위·AI 응답 정리', () => {
  assert.equal(shiftDay('2026-07-30', 5), '2026-08-04'); assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
  const tgt = { id: 't', typeId: 'A', startDate: '2027-07-20', season: 'summer' };
  const r = rankSources(tgt, [{ id: 'a', typeId: 'A', startDate: '2026-07-20', season: 'summer', status: 'done' }, { id: 'b', typeId: 'B', startDate: '2026-07-20', status: 'done' }, { id: 'c', typeId: 'A', startDate: '2026-07-20', status: 'done' }], { a: { tasks: 5, timeline: 0, supplies: 0, files: 0 }, b: { tasks: 9, timeline: 0, supplies: 0, files: 0 }, c: { tasks: 0, timeline: 0, supplies: 0, files: 0 } });
  assert.deepEqual(r.map((x) => x.id), ['a', 'b', 'c'], '같은 유형·계절 > 다른 유형 > 내용 없는 캠프');
  assert.deepEqual(parseRank('[{"id":"a","reason":"x"},{"id":"zzz"},{"id":"a"}]', r), [{ id: 'a', reason: 'x' }]);
  const c = buildCandidates({ startDate: '2027-07-20' }, { startDate: '2026-07-20' }, { tasks: [{ title: 'T', priority: 'High', dueDate: '2026-07-01' }], timeline: [{ dayDate: '2026-07-20', startTime: '09:00', endTime: '', title: 'A', place: '' }], supplies: [], files: [] });
  assert.equal(c.tasks[0].dueDate, '2027-07-01'); assert.equal(c.timeline[0].dayDate, '2027-07-20');
  const n = buildCandidates({ startDate: null }, { startDate: '2026-07-20' }, { tasks: [{ title: 'T', dueDate: '2026-07-01' }], timeline: [{ dayDate: '2026-07-20', title: 'A' }], supplies: [], files: [] });
  assert.equal(n.tasks[0].dueDate, null, '시작일을 모르면 기한을 옮기지 않는다'); assert.equal(n.timeline.length, 0); assert.equal(n.timelineSkipped, 1);
});

test('시작 마법사: 후보를 보여 주고, 고른 것만 복사(담당자 제외·중복 건너뜀·없는 번호 무시)', async () => {
  const env = makeEnv(fakeD1()), ty = await typeId(env);
  await mkCamp(env, 'old', '지난 여름 캠프', '2026-07-20', ty, { year: 2026, season: 'summer' }); await mkCamp(env, 'new', '올해 여름 캠프', '2027-07-19', ty, { year: 2027, season: 'summer' });
  const ins = (sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  await ins(`INSERT INTO tasks (id,campId,title,ownerName,dueDate,status,priority,createdAt,updatedAt) VALUES ('t1','old','장소 예약','홍길동','2026-06-20','Completed','High','x','x'),('t2','old','보험 가입','','2026-07-01','Completed','Medium','x','x')`);
  await ins(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,title,createdAt,updatedAt) VALUES ('l1','old','2026-07-20','09:00','등록','x','x'),('l2','old','2026-07-21','10:00','게임','x','x')`);
  await ins(`INSERT INTO camp_supplies (id,campId,name,qty,status,createdAt,updatedAt) VALUES ('s1','old','생수','100병','ready','x','x')`);
  const list = await call(W.onRequestGet, env, U.dir, { qs: '?campId=new' }); assert.equal(list.body.sources[0].id, 'old');
  const cand = await call(W.onRequestGet, env, U.dir, { qs: '?campId=new&fromCampId=old' }); assert.equal(cand.body.offsetDays, 364); assert.equal(cand.body.tasks.length, 2); assert.equal(cand.body.tasks[0].dueDate, '2027-06-19'); assert.equal(cand.body.timeline[1].dayDate, '2027-07-20');
  assert.ok(!JSON.stringify(cand.body).includes('홍길동'), '담당자는 가져오지 않는다');
  const r = await call(W.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'apply', campId: 'new', fromCampId: 'old', tasks: [0, 99], timeline: [1], supplies: [0] } }); assert.equal(r.status, 201); assert.deepEqual(r.body.created, { tasks: 1, timeline: 1, supplies: 1, files: 0 });
  const t = await env.DB.prepare(`SELECT title, ownerName, dueDate, status FROM tasks WHERE campId = 'new'`).first(); assert.deepEqual({ ...t }, { title: '장소 예약', ownerName: '', dueDate: '2027-06-19', status: 'Not Started' });
  const again = await call(W.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'apply', campId: 'new', fromCampId: 'old', tasks: [0], timeline: [1], supplies: [0] } }); assert.deepEqual(again.body.created, { tasks: 0, timeline: 0, supplies: 0, files: 0 }, '두 번 눌러도 중복 없음');
  assert.equal((await call(W.onRequestPost, env, U.view, { method: 'POST', body: { action: 'apply', campId: 'new', fromCampId: 'old', tasks: [0] } })).status, 403);
  const rec = await call(W.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'recommend', campId: 'new' } }); assert.equal(rec.body.ai, false); assert.equal(rec.body.picks[0].id, 'old');
});

test('마감 마법사: 점검 목록 · 해당 없음 처리 · 후속 업무 추가 · 상태 완료, 금액은 권한자만', async () => {
  const env = makeEnv(fakeD1()), ty = await typeId(env); await mkCamp(env, 'c1', '끝난 캠프', '2026-07-20', ty);
  await env.DB.prepare(`INSERT INTO tasks (id,campId,title,status,priority,createdAt,updatedAt) VALUES ('o1','c1','남은 일','In Progress','Medium','x','x'),('o2','c1','끝난 일','Completed','Medium','x','x')`).run();
  const g = await call(C.onRequestGet, env, U.dir, { qs: '?campId=c1' }); assert.deepEqual(g.body.openTasks.map((x) => x.id), ['o1']); assert.equal(g.body.followups.length, 8);
  assert.ok(g.body.money === undefined || typeof g.body.money === 'object');
  const noMoney = await call(C.onRequestGet, env, U.view, { qs: '?campId=c1' }); assert.equal(noMoney.body.money, undefined);
  const r = await call(C.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'c1', markNA: ['o1', 'o2'], addFollowups: ['thanks', 'bogus'], setStatus: 'done' } }); assert.deepEqual(r.body, { markedNA: 1, added: 1, status: 'done' });
  assert.equal((await env.DB.prepare(`SELECT status FROM tasks WHERE id='o1'`).first()).status, 'Not Applicable'); assert.equal((await env.DB.prepare(`SELECT status FROM tasks WHERE id='o2'`).first()).status, 'Completed');
  assert.equal((await env.DB.prepare(`SELECT status FROM camps WHERE id='c1'`).first()).status, 'done');
  assert.equal((await call(C.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'c1', addFollowups: ['thanks'] } })).body.added, 0, '두 번 눌러도 중복 없음');
  assert.equal((await call(C.onRequestPost, env, U.view, { method: 'POST', body: { campId: 'c1', markNA: ['o1'] } })).status, 403);
});

test('설문 질문·답 정리와 요약', () => {
  const qs = cleanQuestions([{ type: 'rating', ko: '만족?' }, { type: 'choice', ko: '또?', options: ['예', '아니오'] }, { type: 'choice', ko: '보기 하나', options: ['예'] }, { type: 'x', ko: 'bad' }, { type: 'text', en: 'Why?' }]);
  assert.deepEqual(qs.map((q) => q.id + q.type), ['q1rating', 'q2choice', 'q3text']);
  assert.deepEqual(cleanAnswers(qs, { q1: 9, q2: 1, q3: ' 좋았어요 ', zz: 'x' }), { q2: 1, q3: '좋았어요' }); assert.equal(cleanAnswers(qs, { q1: 'x' }), null);
  const s = summarize(qs, [{ q1: 5, q2: 0 }, { q1: 3, q2: 1, q3: '굿' }]); assert.equal(s[0].avg, 4); assert.deepEqual(s[1].options.map((o) => o.n), [1, 1]); assert.deepEqual(s[2].texts, ['굿']);
});

test('설문: 만들기→링크 켜기→로그인 없이 답하기→결과는 담당자만, 닫기·링크 끄기·도배 막기', async () => {
  const env = makeEnv(fakeD1()), ty = await typeId(env); await mkCamp(env, 'c1', '캠프', '2026-07-20', ty);
  const c = await call(SV.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'c1', title: '평가' } }); assert.equal(c.status, 201);
  const list = (await call(SV.onRequestGet, env, U.dir, { qs: '?campId=c1' })).body.items[0]; assert.equal(list.questions.length, 6); assert.equal(list.hasLink, false); assert.equal(list.link, '');
  const on = await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + c.body.id, body: { link: true } }); assert.match(on.body.link, /\/portal\/campteam\/survey\/\?t=[a-f0-9]{64}/);
  const t = on.body.link.split('t=')[1], api = 'http://x/api/campteam/survey-answer';
  const form = await anon(SA.onRequestGet, env, api + '?t=' + t); assert.equal(form.status, 200); assert.equal(form.body.questions.length, 6); assert.ok(!JSON.stringify(form.body).includes('createdBy'));
  assert.equal((await anon(SA.onRequestPost, env, api, { t, answers: { q1: 5, q4: 0, q5: '좋았어요' } })).status, 201);
  assert.equal((await anon(SA.onRequestPost, env, api, { t, answers: {} })).status, 400); assert.equal((await anon(SA.onRequestPost, env, api, { t, answers: { q1: 4 }, hp: 'bot' })).body.ok, true);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM survey_responses').first()).n, 1, '자동 입력(hp)은 저장하지 않는다');
  for (let i = 0; i < 4; i++) await anon(SA.onRequestPost, env, api, { t, answers: { q1: 3 } });
  assert.equal((await anon(SA.onRequestPost, env, api, { t, answers: { q1: 3 } })).status, 429, '같은 주소 하루 5번');
  const res = await call(SR.onRequestGet, env, U.dir, { qs: '?id=' + c.body.id }); assert.equal(res.body.responses, 5); assert.equal(res.body.summary[0].avg, 3.4);
  assert.equal((await call(SR.onRequestGet, env, U.view, { qs: '?id=' + c.body.id })).status, 403, '결과는 담당자만');
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + c.body.id, body: { status: 'closed' } }); assert.equal((await anon(SA.onRequestGet, env, api + '?t=' + t)).status, 404, '닫으면 답할 수 없다');
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + c.body.id, body: { status: 'open' } }); await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + c.body.id, body: { link: false } }); assert.equal((await anon(SA.onRequestGet, env, api + '?t=' + t)).status, 404, '링크를 끄면 멈춘다');
  assert.equal((await anon(SA.onRequestGet, env, api + '?t=zzz')).status, 404);
});
