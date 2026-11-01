import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../functions/api/campteam/translate.js';
import { parseUnitArray, buildDocPrompt, translateUnits } from '../functions/lib/campteamTranslateDoc.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const ai = (env) => ({ ...env, ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' });
const post = async (env, who, body) => T.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/translate', body }) });
const doc = (env, who, units, extra = {}) => post(env, who, { action: 'doc', units, to: 'en', ...extra });
// reply(요청 본문 → 모델 답 글)
async function withFetch(reply, fn) { const real = globalThis.fetch, calls = []; globalThis.fetch = async (url, init) => { const b = JSON.parse(init.body); calls.push(b); return new Response(JSON.stringify({ content: [{ type: 'text', text: typeof reply === 'function' ? reply(b, calls.length) : reply }] }), { status: 200 }); }; try { return await fn(calls); } finally { globalThis.fetch = real; } }
const unitsOf = (b) => JSON.parse(/<units>\n([\s\S]*)\n<\/units>/.exec(b.messages[0].content)[1]);
const echo = (b) => (b.messages[0].content.startsWith('<units>') ? JSON.stringify(unitsOf(b).map((u) => 'EN:' + u)) : 'ok'); // 글 번역 요청(<text>)에는 그냥 ok

test('문서 조각: 같은 순서로 돌려주고, 용어집·형식 지시가 들어가며, 글 내용은 기록하지 않는다', async () => {
  const env = ai(makeEnv(fakeD1()));
  await env.DB.prepare("INSERT INTO glossary (id, termKo, termEn, keep, notes, createdAt, updatedAt) VALUES ('g1','수련회','Retreat',0,'','x','x'),('g2','월코','WOLKO',1,'','x','x')").run().catch(() => {});
  await withFetch(echo, async (calls) => {
    const r = await doc(env, U.mem, ['안녕하세요', '   ', '수련회 일정', '12:30'], { kind: 'notice', name: '캠프 안내.docx' }), d = await r.json();
    assert.equal(r.status, 200); assert.deepEqual(d.out, ['EN:안녕하세요', '   ', 'EN:수련회 일정', 'EN:12:30'], '빈 조각은 그대로 두고 순서 유지'); assert.equal(d.to, 'en'); assert.equal(d.kept, undefined);
    assert.equal(calls.length, 1); assert.deepEqual(unitsOf(calls[0]), ['안녕하세요', '수련회 일정', '12:30']);
    const sys = calls[0].system; assert.ok(sys.includes('JSON array of exactly 3 strings') && sys.includes('DATA') && sys.includes('Never merge') && sys.includes('Korean and English'));
    const log = await env.DB.prepare("SELECT detail FROM audit_log WHERE action = 'translate_doc_chunk'").first();
    assert.ok(log && !/안녕|수련회/.test(log.detail), '글 내용은 저장하지 않는다'); assert.match(log.detail, /^en 4 /);
    const d2 = await (await doc(env, U.mem, ['Hello team'], { to: undefined })).json(); assert.equal(d2.to, 'ko', '방향을 안 주면 글 언어의 반대');
  });
  const p = buildDocPrompt({ kind: 'sermon', to: 'ko', glossary: [{ termKo: '수련회', termEn: 'Retreat', keep: 0 }, { termKo: '월코', termEn: 'WOLKO', keep: 1 }], n: 2 });
  assert.ok(p.includes('수련회 → Retreat') && p.includes('월코 = WOLKO') && p.includes('into Korean') && p.includes('Bible'));
});

test('문서 조각: 팀원만 · 키 없으면 503 · 모양 검사 · 크기 한도 · 글 번역 계약은 그대로', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch(echo, async (calls) => {
    assert.equal((await doc(env, U.out, ['a'])).status, 403);
    assert.equal((await doc({ ...env, ANTHROPIC_API_KEY: '' }, U.mem, ['a'])).status, 503);
    for (const bad of [undefined, [], 'x', [1], ['a', null], {}]) assert.equal((await doc(env, U.mem, bad)).status, 400);
    assert.equal((await doc(env, U.mem, Array.from({ length: 41 }, () => 'a'))).status, 413);
    assert.equal((await doc(env, U.mem, Array.from({ length: 40 }, () => 'a'))).status, 200);
    assert.equal((await doc(env, U.mem, ['가'.repeat(6001)])).status, 413);
    assert.equal((await doc(env, U.mem, ['가'.repeat(3000), '나'.repeat(3000)])).status, 200);
    assert.equal(calls.length, 2);
    assert.equal((await (await doc(env, U.mem, ['  ', ''])).json()).out.length, 2, '글이 하나도 없으면 AI 를 부르지 않는다'); assert.equal(calls.length, 2);
  });
  // 예전 글 번역 POST 는 그대로
  await withFetch('Hello, team.', async () => { const r = await post(env, U.mem, { text: '안녕하세요, 팀 여러분.' }), d = await r.json(); assert.equal(d.text, 'Hello, team.'); });
  const g = await (await T.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost/api/campteam/translate' }) })).json(); assert.equal(g.member, true); assert.equal(g.max, 8000); assert.equal(g.doc.maxUnits, 40);
});

test('돈 문서는 서버도 거절한다 (AI 에 보내지 않음)', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch(echo, async (calls) => {
    let r = await doc(env, U.mem, ['안녕'], { name: '2027 예산안.xlsx' }); assert.equal(r.status, 422); assert.equal((await r.json()).code, 'finance');
    r = await doc(env, U.mem, ['영수증 첨부', '결산 보고']); assert.equal(r.status, 422);
    r = await doc(env, U.mem, Array.from({ length: 12 }, (_, i) => `${i + 1}번 항목 12,000원`)); assert.equal(r.status, 422, '금액이 많은 글');
    assert.equal(calls.length, 0);
    assert.equal((await doc(env, U.mem, ['참가비는 50,000원이에요.'], { name: '캠프 안내.docx' })).status, 200);
  });
});

test('모델이 모양을 틀리면 쪼개서 다시 · 끝내 안 되면 원문을 두고 kept 로 알린다', async () => {
  const env = ai(makeEnv(fakeD1()));
  // 4개를 보냈는데 3개만 오면: 2+2 로 쪼개 다시 → 성공
  await withFetch((b, n) => { const u = unitsOf(b); return n === 1 ? JSON.stringify(['a', 'b', 'c']) : JSON.stringify(u.map((x) => 'EN:' + x)); }, async (calls) => {
    const d = await (await doc(env, U.mem, ['하나', '둘', '셋', '넷'])).json();
    assert.deepEqual(d.out, ['EN:하나', 'EN:둘', 'EN:셋', 'EN:넷']); assert.equal(calls.length, 3); assert.equal(d.kept, undefined);
  });
  // 코드 울타리·앞뒤 말이 붙어도 읽는다
  await withFetch((b) => '```json\n' + echo(b) + '\n```', async () => { assert.deepEqual((await (await doc(env, U.mem, ['가', '나'])).json()).out, ['EN:가', 'EN:나']); });
  // 한 조각만 영 안 되는 경우: 그 조각만 kept
  await withFetch((b) => { const u = unitsOf(b); return u.includes('나쁜') && u.length === 1 ? '[깨진 답' : u.length > 1 ? 'nonsense' : JSON.stringify(['EN:' + u[0]]); }, async () => {
    const r = await doc(env, U.mem, ['좋은', '나쁜']), d = await r.json();
    assert.equal(r.status, 200); assert.deepEqual(d.out, ['EN:좋은', '나쁜']); assert.deepEqual(d.kept, [1]);
  });
  // 전부 실패하면 오류(사용자가 그 조각만 다시 시도)
  await withFetch('[garbage', async () => { const r = await doc(env, U.mem, ['가', '나']); assert.equal(r.status, 502); assert.equal((await r.json()).code, 'empty'); });
  // 모델 호출은 한 요청에 6번까지
  await withFetch('garbage', async (calls) => { await doc(env, U.mem, Array.from({ length: 40 }, (_, i) => '글' + i)); assert.ok(calls.length <= 6); });
  // 네트워크 오류는 502 이고 한도에 세지 않는다
  const real = globalThis.fetch; globalThis.fetch = async () => { throw new Error('down'); };
  try { const e2 = ai(makeEnv(fakeD1())); assert.equal((await doc(e2, U.mem, ['가'])).status, 502); assert.equal((await e2.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='translate_doc_chunk'").first()).n, 0); } finally { globalThis.fetch = real; }
  assert.deepEqual(parseUnitArray('앞말 ["a","b"] 뒷말', 2), ['a', 'b']); assert.equal(parseUnitArray('["a"]', 2), null); assert.equal(parseUnitArray('[1]', 1), null);
  assert.deepEqual(await translateUnits(['x'], async () => 'plain'), ['plain']);
});

test('한도: 1분 30번 · 하루 400번(변수로 바꿈) — 글 번역 한도와 서로 세지 않는다', async () => {
  const env = ai(makeEnv(fakeD1()));
  await withFetch(echo, async () => {
    for (let i = 0; i < 30; i++) assert.equal((await doc(env, U.mem, ['가' + i])).status, 200, '#' + i);
    const r = await doc(env, U.mem, ['가']); assert.equal(r.status, 429); assert.equal((await r.json()).code, 'limit');
    // 문서 조각을 30번 썼어도 글 번역(공유 AI 한도: 1분 12번)은 막히지 않는다
    assert.equal((await post(env, U.mem, { text: '안녕하세요' })).status, 200);
    // 다른 사람은 따로
    assert.equal((await doc(env, U.dir, ['가'])).status, 200);
  });
  // 글 번역을 12번 써서 공유 한도가 찼어도 문서 조각은 된다
  const e2 = ai(makeEnv(fakeD1()));
  await withFetch(echo, async () => {
    for (let i = 0; i < 12; i++) await post(e2, U.mem, { text: 'hello ' + i });
    assert.equal((await post(e2, U.mem, { text: 'hello' })).status, 429);
    assert.equal((await doc(e2, U.mem, ['가'])).status, 200);
  });
  // 하루: 변수 CAMPTEAM_DOC_DAILY (과거 기록으로 채워서 확인)
  const e3 = ai(makeEnv(fakeD1(), { CAMPTEAM_DOC_DAILY: '3' })), old = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  for (let i = 0; i < 3; i++) await e3.DB.prepare("INSERT INTO audit_log (id, at, actor, action, entity, entityId, detail) VALUES (?1,?2,?3,'translate_doc_chunk','translate','','en 1 1')").bind('o' + i, old, U.mem).run();
  await withFetch(echo, async () => { const r = await doc(e3, U.mem, ['가']); assert.equal(r.status, 429); assert.match((await r.json()).error, /오늘/); });
  // 1분 한도 변수
  const e4 = ai(makeEnv(fakeD1(), { CAMPTEAM_DOC_PER_MIN: '2' }));
  await withFetch(echo, async () => { assert.equal((await doc(e4, U.mem, ['가'])).status, 200); assert.equal((await doc(e4, U.mem, ['가'])).status, 200); assert.equal((await doc(e4, U.mem, ['가'])).status, 429); });
});
