import assert from 'node:assert/strict';
import test from 'node:test';
import * as SV from '../functions/api/campteam/surveys.js';
import * as SA from '../functions/api/campteam/survey-answer.js';
import * as SR from '../functions/api/campteam/survey-results.js';
import * as ST from '../functions/api/campteam/survey-templates.js';
import * as AI from '../functions/api/campteam/survey-ai.js';
import * as SS from '../functions/api/campteam/survey-send.js';
import { cleanQuestions, cleanAnswers, summarize, missingRequired, maxQ, STARTERS, AUDIENCES } from '../functions/lib/campteamSurvey.js';
import { phonesIn, maskName, maskPhone, cleanPhone, hashPhone } from '../functions/lib/campteamSurveySend.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { url: 'http://localhost/api/campteam/x' + (o.qs || ''), method: o.method || 'GET', body: o.body }) }); return { status: r.status, body: await r.json() }; };
const anon = async (m, env, url, body) => { const r = await m({ env, request: new Request(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' } } : {}) }); return { status: r.status, body: await r.json() }; };
const API = 'http://x/api/campteam/survey-answer';

// ---------- 질문·답 정리 ----------
const NEW_QS = [
  { type: 'heading', ko: '1부', descKo: '먼저 캠프 전체에 대해 물을게요.' },
  { type: 'short', ko: '이름 대신 별명?', en: 'Nickname?' },
  { type: 'paragraph', ko: '느낀 점', required: true },
  { type: 'choice', ko: '하나만', options: ['가', '나'], other: true, required: true },
  { type: 'checkbox', ko: '여러 개', options: [{ ko: '말씀' }, { ko: '찬양' }, { ko: '식사' }], other: true },
  { type: 'dropdown', ko: '고르기', options: ['A', 'B'], other: true },
  { type: 'scale', ko: '추천 정도', max: 10, lowKo: '전혀', highKo: '꼭' },
  { type: 'rating', ko: '별점' },
];
test('새 질문 종류 정리: 제목 블록·필수·기타·배율, 번호 유지', () => {
  const qs = cleanQuestions(NEW_QS);
  assert.deepEqual(qs.map((q) => q.id + ':' + q.type), ['q1:heading', 'q2:short', 'q3:paragraph', 'q4:choice', 'q5:checkbox', 'q6:dropdown', 'q7:scale', 'q8:rating']);
  assert.equal(qs[0].descKo, '먼저 캠프 전체에 대해 물을게요.'); assert.equal(qs[2].required, true); assert.equal(qs[3].other, true); assert.equal(qs[5].other, undefined, '드롭다운에는 기타가 없다');
  assert.equal(qs[6].max, 10); assert.equal(qs[6].lowKo, '전혀'); assert.equal(cleanQuestions([{ type: 'scale', ko: 'x', max: 7 }])[0].max, 5, '배율은 5 또는 10');
  assert.equal(cleanQuestions([{ type: 'heading' }, { type: 'checkbox', ko: '보기 없음', options: [] }, { type: 'choice', ko: '보기 하나', options: ['가'] }]).length, 0);
  assert.equal(cleanQuestions([{ type: 'choice', ko: '하나 + 기타', options: ['가'], other: true }]).length, 1, '보기 하나 + 기타는 선택지 둘');
  // 번호 유지: 보낸 id 는 그대로, 새 질문은 minSeq 보다 큰 번호
  const kept = cleanQuestions([{ id: 'q5', type: 'rating', ko: '남은 질문' }, { type: 'rating', ko: '새 질문' }, { id: 'q5', type: 'rating', ko: '겹친 번호' }], 7);
  assert.deepEqual(kept.map((q) => q.id), ['q5', 'q8', 'q9']); assert.equal(maxQ(kept), 9);
});
test('새 답 정리·필수 확인·요약', () => {
  const qs = cleanQuestions(NEW_QS);
  const a = cleanAnswers(qs, { q2: '  별  ', q3: '길게\n쓰기', q4: { other: '직접' }, q5: ['2', 0, 0, 9, { other: '간식' }], q6: '1', q7: 10, q8: 6, q1: 'x', zz: 1 });
  assert.deepEqual(a, { q2: '별', q3: '길게\n쓰기', q4: { other: '직접' }, q5: [0, 2, { other: '간식' }], q6: 1, q7: 10 }, '범위 밖·제목 블록·없는 번호는 버린다');
  assert.equal(cleanAnswers(qs, { q4: { other: 'x' } }) .q4.other, 'x'); assert.equal(cleanAnswers(qs, { q7: 11 }), null);
  assert.deepEqual(cleanAnswers(qs, { q6: { other: '드롭다운 기타' } }), null, '기타가 없는 질문에는 직접 쓴 글을 받지 않는다');
  assert.deepEqual(missingRequired(qs, { q2: 'a' }), ['q3', 'q4']); assert.deepEqual(missingRequired(qs, a), []);
  const s = summarize(qs, [a, { q3: '굿', q4: 0, q5: [1], q7: 3 }, { q3: '또', q4: 1, q5: [0, 1], q7: 10 }]);
  assert.equal(s.some((x) => x.type === 'heading'), false, '제목 블록은 결과에 없다');
  const by = Object.fromEntries(s.map((x) => [x.id, x]));
  assert.deepEqual(by.q4.options.map((o) => o.n), [1, 1]); assert.deepEqual(by.q4.others, ['직접']);
  assert.deepEqual(by.q5.options.map((o) => o.n), [2, 2, 1]); assert.deepEqual(by.q5.others, ['간식']); assert.equal(by.q5.n, 3);
  assert.equal(by.q7.max, 10); assert.equal(by.q7.dist.length, 10); assert.equal(by.q7.avg, 7.7); assert.deepEqual(by.q3.texts, ['길게\n쓰기', '굿', '또']);
});
test('예전 모양(별점·선택·글, 필수·기타 없음)은 그대로 정리되고 요약된다', () => {
  const old = [{ id: 'q1', type: 'rating', ko: '만족?', en: '' }, { id: 'q2', type: 'choice', ko: '또?', en: '', options: [{ ko: '예', en: '' }, { ko: '아니오', en: '' }] }, { id: 'q3', type: 'text', ko: '의견', en: '' }];
  assert.deepEqual(cleanQuestions(old), old, '예전 질문은 한 글자도 바뀌지 않는다');
  assert.deepEqual(cleanAnswers(old, { q1: '4', q2: '1', q3: '굿' }), { q1: 4, q2: 1, q3: '굿' }, '예전 공개 페이지는 값을 문자열로 보낸다');
  assert.deepEqual(missingRequired(old, { q1: 1 }), []);
  const s = summarize(old, [{ q1: 5, q2: 0 }, { q1: 3, q2: 1, q3: '굿' }]);
  assert.deepEqual(s[0], { id: 'q1', type: 'rating', ko: '만족?', en: '', n: 2, avg: 4, dist: [0, 0, 1, 0, 1] });
  assert.deepEqual(s[1], { id: 'q2', type: 'choice', ko: '또?', en: '', n: 2, options: [{ ko: '예', en: '', n: 1 }, { ko: '아니오', en: '', n: 1 }] });
  assert.deepEqual(s[2].texts, ['굿']);
});
test('대상별 시작 질문: 모두 정리를 통과하고 다섯 대상이 모두 있다', () => {
  assert.deepEqual(AUDIENCES, ['staff', 'student', 'parent', 'church', 'other']);
  for (const a of AUDIENCES) { const raw = STARTERS[a].questions, qs = cleanQuestions(raw); assert.equal(qs.length, raw.length, a + ' 의 질문이 정리에서 빠지면 안 된다'); assert.ok(qs.every((q) => q.en), a + ' 영어 문구'); }
});

// ---------- 설문 API: 만들기·고치기·답하기 ----------
const mkCamp = (env) => env.DB.prepare("SELECT id FROM camps WHERE id = 'camp-w27'").first();
async function mkSurvey(env, body = {}) {
  assert.ok(await mkCamp(env)); const c = await call(SV.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'camp-w27', title: '평가', ...body } }); assert.equal(c.status, 201);
  const on = await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + c.body.id, body: { link: true } }); return { id: c.body.id, link: on.body.link, t: on.body.link.split('t=')[1] };
}
const list = async (env) => (await call(SV.onRequestGet, env, U.dir, { qs: '?campId=camp-w27' })).body.items;
test('설문 만들기: 대상을 고르면 그 대상의 시작 질문·설명이 들어가고, 대상이 없으면 예전 기본 6개', async () => {
  const env = makeEnv(fakeD1()), a = await mkSurvey(env, { audience: 'parent', titleEn: 'Parents' }), b = await mkSurvey(env);
  const items = await list(env), p = items.find((x) => x.id === a.id), d = items.find((x) => x.id === b.id);
  assert.equal(p.audience, 'parent'); assert.equal(p.questions.length, STARTERS.parent.questions.length); assert.match(p.description, /자녀/); assert.ok(p.descriptionEn);
  assert.equal(d.audience, 'other'); assert.equal(d.questions.length, 6);
  const c = await call(SV.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'camp-w27', title: '내 질문', audience: 'student', questions: [{ type: 'short', ko: '한 줄' }] } });
  assert.equal(c.status, 201); assert.equal((await list(env)).find((x) => x.id === c.body.id).questions.length, 1, '질문을 보내면 시작 질문을 덮어쓰지 않는다');
  assert.equal((await call(SV.onRequestPost, env, U.dir, { method: 'POST', body: { campId: 'camp-w27', title: 't', questions: [{ type: 'heading', ko: '제목만' }] } })).status, 400, '답할 질문이 하나도 없으면 안 된다');
  assert.equal((await call(SV.onRequestPost, env, U.view, { method: 'POST', body: { campId: 'camp-w27', title: 't' } })).status, 403);
});
test('질문을 고쳐도 번호가 유지되고, 지운 질문의 번호는 다시 쓰지 않는다', async () => {
  const env = makeEnv(fakeD1()), s = await mkSurvey(env, { questions: [{ type: 'rating', ko: '하나' }, { type: 'short', ko: '둘' }, { type: 'short', ko: '셋' }] });
  let qs = (await list(env))[0].questions; assert.deepEqual(qs.map((q) => q.id), ['q1', 'q2', 'q3']);
  await anon(SA.onRequestPost, env, API, { t: s.t, answers: { q3: '셋의 답' } });
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { questions: [qs[2], qs[0]] } });   // 순서 바꾸고 q2 삭제
  qs = (await list(env))[0].questions; assert.deepEqual(qs.map((q) => q.id), ['q3', 'q1']);
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { questions: [...qs.slice(0, 1), { type: 'short', ko: '새 질문' }] } });
  assert.deepEqual((await list(env))[0].questions.map((q) => q.id), ['q3', 'q4'], 'q1·q2 를 건너뛰고 가장 큰 번호 다음부터');
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { questions: [{ id: 'q3', type: 'short', ko: '셋' }] } });   // 마지막 번호 q4 를 지워도
  await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { questions: [{ id: 'q3', type: 'short', ko: '셋' }, { type: 'short', ko: '다시 새 질문' }] } });
  assert.deepEqual((await list(env))[0].questions.map((q) => q.id), ['q3', 'q5'], '지운 q4 를 새 질문이 다시 쓰지 않는다');
  const r = await call(SR.onRequestGet, env, U.dir, { qs: '?id=' + s.id }); assert.deepEqual(r.body.summary.find((x) => x.id === 'q3').texts, ['셋의 답'], '받은 답은 같은 질문에 그대로 붙어 있다');
});
test('공개 답하기: 모든 종류를 받고, 필수는 서버에서도 확인, 이름·연락처는 묻지도 받지도 않는다', async () => {
  const env = makeEnv(fakeD1()), s = await mkSurvey(env, { title: '새 설문', description: '안녕하세요', descriptionEn: 'Hello', questions: NEW_QS });
  const form = await anon(SA.onRequestGet, env, API + '?t=' + s.t); assert.equal(form.status, 200); assert.equal(form.body.description, '안녕하세요'); assert.equal(form.body.descriptionEn, 'Hello'); assert.equal(form.body.questions.length, 8);
  assert.ok(!JSON.stringify(form.body).match(/createdBy|email|phone|audience/));
  const miss = await anon(SA.onRequestPost, env, API, { t: s.t, answers: { q2: '별명' } }); assert.equal(miss.status, 400); assert.equal(miss.body.code, 'required'); assert.deepEqual(miss.body.missing, ['q3', 'q4']);
  assert.equal((await anon(SA.onRequestPost, env, API, { t: s.t, answers: { q3: '좋았어요', q4: { other: '직접' }, q5: [0, 2], q6: 1, q7: 8, q8: 5 } })).status, 201);
  assert.equal((await anon(SA.onRequestPost, env, API, { t: s.t, answers: { q3: '그래요', q4: 1, q5: [1, { other: '간식' }], q7: 2 } })).status, 201);
  const cols = Object.keys(env.DB.sqlite.prepare('SELECT * FROM survey_responses LIMIT 1').get()); assert.deepEqual(cols.sort(), ['answers', 'createdAt', 'id', 'ipHash', 'surveyId'], '답에는 이름·연락처 칸이 없다');
  const res = await call(SR.onRequestGet, env, U.dir, { qs: '?id=' + s.id }); assert.equal(res.body.responses, 2);
  const by = Object.fromEntries(res.body.summary.map((x) => [x.id, x])); assert.deepEqual(by.q4.others, ['직접']); assert.deepEqual(by.q5.options.map((o) => o.n), [1, 1, 1]); assert.equal(by.q7.avg, 5);
});
test('예전 설문(0034 이전 모양)이 그대로 열리고, 답을 받고, 결과를 보여 준다', async () => {
  const env = makeEnv(fakeD1()), now = '2026-10-01T00:00:00Z', qs = [{ id: 'q1', type: 'rating', ko: '만족?', en: '' }, { id: 'q2', type: 'choice', ko: '또?', en: '', options: [{ ko: '예', en: '' }, { ko: '아니오', en: '' }] }, { id: 'q3', type: 'text', ko: '의견', en: '' }];
  env.DB.sqlite.prepare("INSERT INTO surveys (id,campId,title,questions,status,publicToken,createdAt,updatedAt) VALUES ('old1','camp-w27','옛 설문',?1,'open',?2,?3,?3)").run(JSON.stringify(qs), 'a'.repeat(64), now);
  const it = (await list(env))[0]; assert.equal(it.audience, 'other'); assert.equal(it.description, ''); assert.deepEqual(it.questions, qs);
  const form = await anon(SA.onRequestGet, env, API + '?t=' + 'a'.repeat(64)); assert.equal(form.status, 200); assert.deepEqual(form.body.questions, qs);
  assert.equal((await anon(SA.onRequestPost, env, API, { t: 'a'.repeat(64), answers: { q1: '5', q2: '1', q3: '좋아요' } })).status, 201);
  const r = await call(SR.onRequestGet, env, U.dir, { qs: '?id=old1' }); assert.deepEqual(r.body.summary.map((x) => [x.id, x.n]), [['q1', 1], ['q2', 1], ['q3', 1]]); assert.equal(r.body.summary[0].avg, 5);
  assert.equal((await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=old1', body: { title: '제목만 고침' } })).status, 200); assert.deepEqual((await list(env))[0].questions, qs, '제목만 고쳐도 질문은 그대로');
});

// ---------- 템플릿 ----------
test('템플릿: 저장·불러오기·삭제(삭제 표시), 팀이 같이 쓰고 수정 권한이 있어야 저장', async () => {
  const env = makeEnv(fakeD1());
  const first = await call(ST.onRequestGet, env, U.mem); assert.equal(first.status, 200); assert.deepEqual(first.body.items, [], '처음엔 저장된 템플릿이 없다'); assert.deepEqual(Object.keys(first.body.starters).sort(), [...AUDIENCES].sort());
  assert.equal((await call(ST.onRequestPost, env, U.view, { method: 'POST', body: { name: 'x', questions: [{ type: 'short', ko: 'q' }] } })).status, 403, '보기만 가능한 계정은 저장 못 한다');
  assert.equal((await call(ST.onRequestPost, env, U.dir, { method: 'POST', body: { name: '', questions: [{ type: 'short', ko: 'q' }] } })).status, 400);
  assert.equal((await call(ST.onRequestPost, env, U.dir, { method: 'POST', body: { name: 'x', questions: [{ type: 'heading', ko: 'h' }] } })).status, 400);
  const c = await call(ST.onRequestPost, env, U.dir, { method: 'POST', body: { name: '학생 평가 틀', audience: 'student', questions: NEW_QS } }); assert.equal(c.status, 201);
  const got = (await call(ST.onRequestGet, env, U.view)).body.items; assert.equal(got.length, 1, '다른 팀원(보기만)도 불러올 수 있다'); assert.equal(got[0].audience, 'student'); assert.equal(got[0].questions.length, 8);
  assert.equal((await call(ST.onRequestDelete, env, U.view, { method: 'DELETE', qs: '?id=' + c.body.id })).status, 403);
  assert.equal((await call(ST.onRequestDelete, env, U.dir, { method: 'DELETE', qs: '?id=' + c.body.id })).status, 200);
  assert.deepEqual((await call(ST.onRequestGet, env, U.dir)).body.items, []); assert.ok(env.DB.sqlite.prepare('SELECT deletedAt FROM survey_templates').get().deletedAt, '지워도 행은 남고 표시만');
  assert.equal((await call(ST.onRequestGet, env, U.out)).status, 403, '명단 밖은 볼 수 없다');
});

// ---------- AI 영어 채우기 ----------
test('AI 채우기: 설문 문구만 보내고, 연락처 모양 글은 건너뛰며, 권한·한도·꺼짐을 지킨다', async () => {
  const env = makeEnv(fakeD1(), { ANTHROPIC_API_KEY: 'test-key' }), real = globalThis.fetch, calls = [];
  globalThis.fetch = async (u, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"title":"Camp evaluation","q1":"How was camp?","evil":"x"}' }] }), { status: 200 }); };
  try {
    const items = [{ key: 'title', from: '캠프 평가', lang: 'en' }, { key: 'q1', from: '캠프는 어땠나요?', lang: 'en' }, { key: 'q2', from: '문의 010-0000-1234 로 연락', lang: 'en' }, { key: 'bad key!', from: 'x', lang: 'en' }, { key: 'q3', from: 'x', lang: 'fr' }];
    const r = await call(AI.onRequestPost, env, U.dir, { method: 'POST', body: { items } });
    assert.equal(r.status, 200); assert.deepEqual(r.body.fills, { title: 'Camp evaluation', q1: 'How was camp?' }, '요청한 칸만 채워진다'); assert.deepEqual(r.body.skipped, ['q2']);
    assert.equal(calls.length, 1); const sent = JSON.parse(calls[0].messages[0].content); assert.deepEqual(sent.map((x) => x.key), ['title', 'q1']); assert.ok(!JSON.stringify(calls[0]).includes('0000-1234'), '번호는 AI 에 가지 않는다');
    const a = env.DB.sqlite.prepare("SELECT * FROM audit_log WHERE action = 'ai_survey'").get(); assert.ok(a); assert.ok(!JSON.stringify(a).includes('캠프'), '기록에는 글 내용이 없다');
    assert.equal((await call(AI.onRequestPost, env, U.view, { method: 'POST', body: { items } })).status, 403);
    assert.equal(calls.length, 1, '권한이 없으면 AI 를 부르지 않는다');
    assert.equal((await call(AI.onRequestPost, { ...env, CAMPTEAM_AI_PER_MIN: '1' }, U.dir, { method: 'POST', body: { items } })).status, 429, '루미와 같은 한도를 센다');
    assert.deepEqual((await call(AI.onRequestPost, env, U.dir, { method: 'POST', body: { items: [] } })).body.fills, {});
  } finally { globalThis.fetch = real; }
  assert.equal((await call(AI.onRequestPost, { ...env, ANTHROPIC_API_KEY: '' }, U.dir, { method: 'POST', body: { items: [{ key: 'a', from: '가', lang: 'en' }] } })).status, 503);
});

// ---------- 보내기 ----------
test('도우미: 가리기·번호 뽑기·해시', async () => {
  assert.equal(maskName('홍길동'), '홍*동'); assert.equal(maskName('홍길'), '홍*'); assert.equal(maskName('홍'), '*'); assert.equal(maskName('남궁민수'), '남**수');
  assert.equal(maskPhone('01012345678'), '010-****-5678'); assert.equal(maskPhone('0161234567'), '016-***-4567');
  assert.equal(cleanPhone('+82 10-0000-0001'), '01000000001'); assert.equal(cleanPhone('12345'), ''); assert.equal(cleanPhone('02-123-4567'), '', '일반 전화는 알림톡 대상이 아니다');
  assert.deepEqual(phonesIn('아버지 010-0000-0100 / 어머니 01000000200, 집 02-1234-5678, 010-0000-0100'), ['01000000100', '01000000200']);
  assert.deepEqual(phonesIn('학생번호 0100000000012345'), [], '더 긴 숫자 안의 조각은 번호로 보지 않는다');
  const h = await hashPhone({ ADMIN_PASSWORD: 'a' }, '01000000001'); assert.equal(h, await hashPhone({ ADMIN_PASSWORD: 'a' }, '01000000001')); assert.notEqual(h, await hashPhone({ ADMIN_PASSWORD: 'b' }, '01000000001')); assert.ok(!h.includes('0100000'));
});

const P = 'sample-winter', regs = {
  [`camp:${P}:reg:r1`]: { regId: 'r1', registrationType: 'individual', name: '가상캠퍼A', phone: '010-0000-0001', emergency: '아버지 010-0000-0100 / 본인 010-0000-0001', registeredAt: 'a' },
  [`camp:${P}:reg:r2`]: { regId: 'r2', registrationType: 'individual', name: '가상캠퍼B', phone: '010-0000-0002', emergency: '엄마 01000000200', status: 'confirmed', registeredAt: 'b' },
  [`camp:${P}:reg:r3`]: { regId: 'r3', registrationType: 'individual', name: '가상캠퍼C', phone: '010-0000-0003', registeredAt: 'c' },
  [`camp:${P}:reg:r4`]: { regId: 'r4', registrationType: 'group', name: '가상단체대표', phone: '010-0000-0004', groupCount: 2, participants: [{ name: '가상학생D', parentInfo: '가상보호자 010-0000-0040' }, { name: '가상학생E' }], registeredAt: 'd' },
  [`camp:${P}:reg:r5`]: { regId: 'r5', registrationType: 'individual', name: '가상대기자', phone: '010-0000-0005', isWaitlist: true, emergency: '010-0000-0500', registeredAt: 'e' },
  [`camp:${P}:reg:r6`]: { regId: 'r6', registrationType: 'individual', name: '번호오류', phone: '12345', registeredAt: 'f' },
  [`camp:${P}:reg:r7`]: { regId: 'r7', registrationType: 'individual', name: '가상캠퍼G', phone: '010-0000-0001', registeredAt: 'g' },   // r1 과 같은 번호
  [`camp:${P}:reg:s1`]: { regId: 's1', registrationType: 'staff', name: '가상스태프H', phone: '010-0000-0007', accepted: true },
  [`camp:${P}:reg:s2`]: { regId: 's2', registrationType: 'staff', name: '가상지원자I', phone: '010-0000-0008', accepted: false },
  [`camp:${P}:reg:s3`]: { regId: 's3', registrationType: 'staff', role: 'crew', name: '가상크루J', phone: '010-0000-0009', accepted: true, guardianName: '가상보호자K', guardianPhone: '010-0000-0090' },
  [`camp:other:reg:x1`]: { regId: 'x1', registrationType: 'individual', name: '다른캠프', phone: '010-0000-0099' },
};
const fakeKV = () => { const log = { writes: 0 }; return { log, async list({ prefix }) { return { keys: Object.keys(regs).filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; }, async get(k) { return regs[k] ? JSON.parse(JSON.stringify(regs[k])) : null; }, async put() { log.writes++; throw new Error('쓰면 안 된다'); }, async delete() { log.writes++; throw new Error('지우면 안 된다'); } }; };
const READY = { SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', KAKAO_PF_ID: 'pf', KAKAO_TEMPLATE_SURVEY: 'tpl-survey' };
const sendEnv = (extra = {}) => makeEnv(fakeD1(), { CAMP_KV: fakeKV(), ...READY, ...extra });
async function withFetch(fn, { fail = () => false } = {}) {
  const real = globalThis.fetch, calls = []; globalThis.fetch = async (u, init) => { const body = JSON.parse(init.body); calls.push({ u: String(u), body }); return fail(body) ? new Response('nope', { status: 400 }) : new Response('{}', { status: 200 }); };
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}
const send = (env, who, id, body) => call(SS.onRequestPost, env, who, { method: 'POST', qs: '?id=' + id, body });
const toOf = (calls) => calls.filter((c) => c.u.includes('solapi')).map((c) => c.body.message.to).sort();

test('보내기 미리보기: 아무것도 보내지 않고, 학생=접수된 모두(예비 대기자 제외·같은 번호 한 번), 가린 예시만', async () => {
  const env = sendEnv(), s = await mkSurvey(env, { audience: 'student' });
  await withFetch(async (calls) => {
    const r = await send(env, U.dir, s.id, { action: 'preview' }); assert.equal(r.status, 200);
    assert.deepEqual(r.body.counts, { total: 4, invalid: 1, dupes: 1, already: 0, willSend: 4, cap: 300, used: 0, capLeft: 300 }, 'r1·r2·r3·r4 (대기자·번호오류·같은 번호 제외)');
    assert.equal(r.body.ready, true); assert.equal(r.body.audience, 'student'); assert.match(r.body.notes.join(' '), /예비 대기자 제외/);
    assert.ok(r.body.sample.length <= 5 && r.body.sample.every((x) => /^\S\*+\S?$|^\S\*$/.test(x.name) && /^010-\*{4}-\d{4}$/.test(x.phone)), JSON.stringify(r.body.sample));
    assert.ok(!JSON.stringify(r.body).match(/010-0000|01000000/), '응답 어디에도 전체 번호가 없다');
    assert.equal(calls.length, 0, '미리보기는 아무것도 보내지 않는다'); assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM survey_sends').get().n, 0);
  });
  assert.equal(env.CAMP_KV.log.writes, 0, '홈페이지 신청 저장소는 읽기만');
});
test('보내기: 확인 단계 없이는 보내지 않고, 수가 다르면 막고, 맞으면 보내고, 두 번 눌러도 한 번만', async () => {
  const env = sendEnv(), s = await mkSurvey(env, { audience: 'student', title: '캠프 평가' });
  await withFetch(async (calls) => {
    assert.equal((await send(env, U.dir, s.id, { action: 'send' })).status, 400, '확인 수가 없으면 거절');
    assert.equal((await send(env, U.dir, s.id, { action: 'send', confirmCount: '4' })).status, 400, '숫자가 아니어도 거절');
    const wrong = await send(env, U.dir, s.id, { action: 'send', confirmCount: 3 }); assert.equal(wrong.status, 409); assert.equal(wrong.body.code, 'changed');
    assert.equal(calls.length, 0, '거절된 요청은 하나도 보내지 않는다');
    const ok = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(ok.status, 200); assert.deepEqual([ok.body.sent, ok.body.failed, ok.body.remaining], [4, 0, 0]);
    assert.deepEqual(toOf(calls), ['01000000001', '01000000002', '01000000003', '01000000004'], '대기자·오류·다른 캠프는 받지 않는다');
    const m = calls[0].body.message; assert.equal(m.kakaoOptions.templateId, 'tpl-survey'); assert.equal(m.kakaoOptions.pfId, 'pf'); assert.deepEqual(Object.keys(m.kakaoOptions.variables).sort(), ['#{링크}', '#{설문명}', '#{이름}']);
    assert.equal(m.kakaoOptions.variables['#{링크}'], s.link); assert.equal(m.kakaoOptions.variables['#{설문명}'], '캠프 평가'); assert.match(m.text, /월코/, '카카오가 안 될 때의 문자 문구도 준비');
    const again = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(again.status, 400, '이미 보낸 번호라 보낼 사람이 0명'); assert.equal(again.body.code, 'nobody');
    const pv = await send(env, U.dir, s.id, { action: 'preview' }); assert.equal(pv.body.counts.already, 4); assert.equal(pv.body.counts.willSend, 0);
    assert.equal(calls.length, 4, '두 번째에는 하나도 더 보내지 않는다');
    const rows = env.DB.sqlite.prepare('SELECT * FROM survey_sends').all(); assert.equal(rows.length, 4); assert.ok(rows.every((r) => r.status === 'sent' && /^[0-9a-f]{32}$/.test(r.phoneHash)));
    assert.ok(!JSON.stringify(rows).includes('0100000'), '번호는 저장하지 않고 해시만');
    const log = JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM audit_log').all()); assert.ok(log.includes('survey_send') && !log.match(/01000000|010-0000|가상캠퍼/), '기록에는 개수만 있고 번호·이름은 없다');
    // 같은 번호라도 다른 설문에는 보낼 수 있다
    const s2 = await mkSurvey(env, { audience: 'student' }); assert.equal((await send(env, U.dir, s2.id, { action: 'preview' })).body.counts.willSend, 4);
  });
});
test('보내기: 실패한 번호는 failed 로 남고 다음에 다시 보낼 수 있다', async () => {
  const env = sendEnv(), s = await mkSurvey(env, { audience: 'student' });
  await withFetch(async () => {
    const r = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(r.body.failed > 0 || r.body.sent < 4, true);
  }, { fail: (b) => ['01000000002'].includes(b.message.to) });
  const rows = env.DB.sqlite.prepare('SELECT status FROM survey_sends').all(); assert.ok(rows.some((x) => x.status === 'failed'));
  await withFetch(async (calls) => { const pv = await send(env, U.dir, s.id, { action: 'preview' }); const n = pv.body.counts.willSend; assert.ok(n >= 1); const r = await send(env, U.dir, s.id, { action: 'send', confirmCount: n }); assert.equal(r.status, 200); assert.ok(calls.length >= 1); });
});
test('보내기: 하루 한도를 넘으면 아무에게도 보내지 않고, 한 번에 보내는 수 제한이 있다', async () => {
  const env = sendEnv({ CAMPTEAM_SURVEY_DAILY_CAP: '3' }), s = await mkSurvey(env, { audience: 'student' });
  await withFetch(async (calls) => {
    const r = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(r.status, 429); assert.equal(r.body.code, 'cap'); assert.equal(calls.length, 0, '일부만 보내지 않는다'); assert.equal(r.body.counts.capLeft, 3);
  });
  const env2 = sendEnv({ CAMPTEAM_SURVEY_DAILY_CAP: '5' }), a = await mkSurvey(env2, { audience: 'student' }), b = await mkSurvey(env2, { audience: 'staff' });
  await withFetch(async (calls) => {
    assert.equal((await send(env2, U.dir, a.id, { action: 'send', confirmCount: 4 })).status, 200);
    const pv = await send(env2, U.dir, b.id, { action: 'preview' }); assert.equal(pv.body.counts.used, 4, '한도는 설문 전체 합계'); assert.equal(pv.body.counts.capLeft, 1);
    assert.equal((await send(env2, U.dir, b.id, { action: 'send', confirmCount: 2 })).status, 429);
    assert.equal(calls.length, 4);
  });
  const env3 = sendEnv({ CAMPTEAM_SURVEY_CHUNK: '2' }), c = await mkSurvey(env3, { audience: 'student' });
  await withFetch(async (calls) => {
    const r = await send(env3, U.dir, c.id, { action: 'send', confirmCount: 4 }); assert.equal(r.body.sent, 2); assert.equal(r.body.remaining, 2);
    const r2 = await send(env3, U.dir, c.id, { action: 'send', confirmCount: 2 }); assert.equal(r2.body.sent, 2); assert.equal(calls.length, 4); assert.equal(new Set(toOf(calls)).size, 4, '나눠 보내도 겹치지 않는다');
  });
});
test('보내기: 대상별 받는 사람 (스태프=수락된 사람, 부모님=글에서 뽑은 번호+크루 보호자, 교회·학교=고른 곳, 기타=없음)', async () => {
  const env = sendEnv(), staff = await mkSurvey(env, { audience: 'staff' }), parent = await mkSurvey(env, { audience: 'parent' }), church = await mkSurvey(env, { audience: 'church' }), other = await mkSurvey(env, { audience: 'other' });
  await withFetch(async (calls) => {
    const st = await send(env, U.dir, staff.id, { action: 'preview' }); assert.equal(st.body.counts.willSend, 2, '수락된 스태프 s1, 크루 s3 (지원만 한 s2 는 제외)'); assert.match(st.body.notes.join(' '), /3명 중 수락된 2명/);
    const pr = await send(env, U.dir, parent.id, { action: 'preview' }); assert.equal(pr.body.counts.willSend, 4, 'r1 아버지, r2 엄마, r4 보호자, 크루 보호자 (본인 번호·대기자 제외)'); assert.match(pr.body.notes.join(' '), /최선/);
    assert.ok(pr.body.sample.some((x) => x.name === '학부모'), '이름을 모르는 부모는 가리지 않고 「학부모」로');
    assert.equal((await send(env, U.dir, parent.id, { action: 'send', confirmCount: 4 })).status, 200); assert.deepEqual(toOf(calls), ['01000000040', '01000000090', '01000000100', '01000000200']);
    const ot = await send(env, U.dir, other.id, { action: 'preview' }); assert.equal(ot.body.problem.code, 'link_only'); assert.equal(ot.body.counts.willSend, 0);
    assert.equal((await send(env, U.dir, other.id, { action: 'send', confirmCount: 0 })).status, 409);
    // 교회·학교: 연락처 중 번호가 있는 곳을 보내는 사람이 고른다
    const ins = env.DB.sqlite.prepare("INSERT INTO contacts (id,kind,name,org,phone,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,'x','x')");
    ins.run('k1', 'church', '가상목사', '가상교회', '010-0000-0201'); ins.run('k2', 'school', '가상교사', '가상학교', '010-0000-0202'); ins.run('k3', 'vendor', '업체', '가상업체', '010-0000-0203'); ins.run('k4', 'church', '번호없음', '가상교회2', '');
    const c0 = await send(env, U.dir, church.id, { action: 'preview' }); assert.equal(c0.body.counts.willSend, 0, '고르기 전에는 0명'); assert.deepEqual(c0.body.contacts.map((c) => c.id).sort(), ['k1', 'k2'], '교회·학교 중 번호가 있는 곳만 후보'); assert.ok(c0.body.contacts.every((c) => /^010-\*{4}-\d{4}$/.test(c.phone)));
    const c1 = await send(env, U.dir, church.id, { action: 'preview', contactIds: ['k1', 'k3'] }); assert.equal(c1.body.counts.willSend, 1, '후보가 아닌 곳(k3 업체)은 골라도 제외');
    const before = calls.length; assert.equal((await send(env, U.dir, church.id, { action: 'send', confirmCount: 1, contactIds: ['k1', 'k3'] })).status, 200); assert.deepEqual(toOf(calls.slice(before)), ['01000000201']);
  });
});
test('보내기: 템플릿이 없으면 보내지 않고 안내만(문자로 몰래 보내지 않는다)', async () => {
  for (const missing of ['KAKAO_TEMPLATE_SURVEY', 'KAKAO_PF_ID', 'SOLAPI_API_KEY']) {
    const env = sendEnv({ [missing]: '' }), s = await mkSurvey(env, { audience: 'student' });
    await withFetch(async (calls) => {
      const pv = await send(env, U.dir, s.id, { action: 'preview' }); assert.equal(pv.status, 200); assert.equal(pv.body.ready, false); assert.match(pv.body.notReady, /템플릿|링크 복사/); assert.equal(pv.body.counts.willSend, 4, '미리보기 수는 그대로 보여 준다');
      const r = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(r.status, 409); assert.equal(r.body.code, 'template_missing'); assert.match(r.body.error, /링크 복사/);
      assert.equal(calls.length, 0, missing + ' 없음: 카카오도 문자도 보내지 않는다'); assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM survey_sends').get().n, 0);
    });
  }
});
test('보내기: 권한(보기만·명단 밖 거절)과 링크가 꺼진 설문·신청 연결 없음', async () => {
  const env = sendEnv(), s = await mkSurvey(env, { audience: 'student' });
  await withFetch(async (calls) => {
    for (const who of [U.view, U.out, null]) { const r = await send(env, who, s.id, { action: 'send', confirmCount: 4 }); assert.ok([401, 403].includes(r.status), String(who)); assert.equal((await send(env, who, s.id, { action: 'preview' })).status, r.status, '미리보기도 수정 권한이 필요'); }
    await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { link: false } });
    const off = await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 }); assert.equal(off.status, 409); assert.equal(off.body.code, 'link_off');
    await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { link: true } }); await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { status: 'closed' } });
    assert.equal((await send(env, U.dir, s.id, { action: 'send', confirmCount: 4 })).body.code, 'link_off', '닫힌 설문에도 보내지 않는다');
    assert.equal((await send(env, U.dir, 'nope', { action: 'preview' })).status, 404);
    env.DB.sqlite.prepare("UPDATE camps SET registrationCampId = '' WHERE id = 'camp-w27'").run(); await call(SV.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + s.id, body: { status: 'open' } });
    const nl = await send(env, U.dir, s.id, { action: 'preview' }); assert.equal(nl.body.problem.code, 'no_link');
    assert.equal(calls.length, 0);
  });
  const noKv = makeEnv(fakeD1(), READY), t = await mkSurvey(noKv, { audience: 'student' });
  assert.equal((await send(noKv, U.dir, t.id, { action: 'preview' })).body.problem.code, 'unavailable', 'CAMP_KV 가 없는 환경');
});
test('설문 목록에 대상·보낸 수가 나온다', async () => {
  const env = sendEnv(), s = await mkSurvey(env, { audience: 'staff' });
  await withFetch(async () => { await send(env, U.dir, s.id, { action: 'send', confirmCount: 2 }); });
  const it = (await list(env))[0]; assert.equal(it.audience, 'staff'); assert.equal(it.sent, 2);
});
