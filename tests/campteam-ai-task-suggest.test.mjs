import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Sug from '../functions/api/campteam/ai-task-suggest.js';
import * as Prefs from '../functions/api/campteam/ui-prefs.js';
import { parseSuggestions, normTitle, safeTitle, buildSuggestPrompt, usedToday, DAILY_LIMIT } from '../functions/lib/campteamAiTasks.js';
import { todayKST } from '../functions/lib/campteamDb.js';
import { fakeD1, makeEnv, req, root, U } from './helpers/campteam-fakes.mjs';

// 업무 AI 추천 (체크리스트 템플릿 탭의 「AI 추천 받기」) — 진짜 AI 는 부르지 않는다(가짜 fetch). 시험 자료는 모두 가상의 이름·example.org 주소다.
const origFetch = globalThis.fetch;
const sse = (obj) => new Response('event: content_block_delta\ndata: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: typeof obj === 'string' ? obj : JSON.stringify(obj) } }) + '\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
const isGen = (c) => /preparation checklist/.test(c.system || '');
/** 가짜 Claude: 추천 요청(isGen)에는 reply 를, 그 밖의 요청(번역)에는 빈 목록을 돌려준다. 받은 요청은 calls 에 모은다 */
function withAi(reply, fn) {
  const calls = []; globalThis.fetch = async (url, init) => {
    if (!String(url).startsWith('https://api.anthropic.com/')) throw new Error('진짜 네트워크 호출 금지: ' + url);
    const body = JSON.parse(init.body); calls.push(body); if (!isGen(body)) return sse('[]');
    const n = calls.filter(isGen).length; return typeof reply === 'function' ? reply(n, body) : sse(reply);
  };
  return fn(calls).finally(() => { globalThis.fetch = origFetch; });
}
const mk = (extra = {}) => makeEnv(fakeD1(), { ANTHROPIC_API_KEY: 'test-key-not-real', CAMPTEAM_AI_PER_MIN: '1000', ...extra });
const URL0 = 'http://localhost:8788/api/campteam/ai-task-suggest';
const get = async (env, who, qs = '') => Sug.onRequestGet({ env, request: await req(who, { url: URL0 + qs }) });
async function post(env, who, body) { const pending = []; const r = await Sug.onRequestPost({ env, request: await req(who, { method: 'POST', body, url: URL0 }), waitUntil: (p) => pending.push(p) }); await Promise.all(pending); return r; }
const J = (r) => r.json();
const gen = (env, who, campId = 'camp-w27', templateId = 'tpl-winter') => post(env, who, { action: 'generate', campId, templateId });
const items = (n, prefix = '새 업무') => ({ suggestions: Array.from({ length: n }, (_, i) => ({ title: `${prefix} ${i + 1}`, offsetDays: -10 - i, priority: 'High', section: '홍보', reason: '이유 ' + (i + 1) })) });
const rows = (env, where = '1=1') => env.DB.sqlite.prepare(`SELECT * FROM task_ai_suggestions WHERE ${where} ORDER BY rowid`).all();
/** 모델을 거치지 않고 추천 한 줄을 직접 넣는다 (결정 시험용) */
function seed(env, id, o = {}) { env.DB.sqlite.prepare(`INSERT INTO task_ai_suggestions (id,campId,templateId,batchId,title,offsetDays,priority,section,reason,status,createdAt,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, o.campId ?? 'camp-w27', o.templateId === undefined ? 'tpl-winter' : o.templateId, 'b1', o.title ?? '현수막 시안 확인', o.offsetDays === undefined ? -20 : o.offsetDays, o.priority ?? 'Medium', o.section ?? '홍보', o.reason ?? '모집 전에 확인해요', o.status ?? 'new', o.createdAt ?? '2026-11-01T00:00:00Z', 'seed'); }
const taskBySource = (env, key) => env.DB.sqlite.prepare('SELECT * FROM tasks WHERE sourceKey = ? AND deletedAt IS NULL').all(key);

test('0040 마이그레이션은 덧붙이기만 한다 (새 표 + 색인, 삭제·변경 없음)', () => {
  const sql = readFileSync(root + 'camp-team/db/0040_ai_task_suggestions.sql', 'utf8').replace(/--.*$/gm, '');
  assert.ok(/CREATE TABLE IF NOT EXISTS task_ai_suggestions/.test(sql)); assert.ok(/CREATE INDEX IF NOT EXISTS/.test(sql)); assert.equal(/\bDROP\s+(TABLE|INDEX|COLUMN)|\bDELETE\s+FROM|\bUPDATE\s|\bALTER\b/i.test(sql), false);
  for (const c of ['campId', 'templateId', 'batchId', 'title', 'offsetDays', 'priority', 'section', 'reason', 'status', 'createdAt', 'createdBy', 'decidedAt', 'decidedBy']) assert.ok(sql.includes(c), c);
});

test('처음 열었을 때: 추천은 비어 있고 오늘 20번 남았다 — 조회만 되는 계정은 볼 수만 있다', async () => {
  const env = mk(), a = await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'));
  assert.deepEqual(a.suggestions, { new: [], kept: [], dropped: [] }); assert.equal(a.remainingToday, 20); assert.equal(a.dailyLimit, 20); assert.equal(a.canWrite, true); assert.equal(a.aiOn, true); assert.equal(a.ready, true);
  const v = await J(await get(env, U.view, '?campId=camp-w27')); assert.equal(v.canWrite, false);
  assert.equal((await get(env, null)).status, 401);
  assert.equal((await J(await get(makeEnv(fakeD1()), U.mem))).aiOn, false, '키가 없으면 aiOn false');
});

test('추천 받기: 저장되고(new), 템플릿·캠프 별로 따로 보이며, 다시 읽어도 그대로 있다 — 횟수가 1 줄어든다', async () => {
  const env = mk();
  await withAi(items(3), async (calls) => {
    const r = await gen(env, U.mem); assert.equal(r.status, 200); const d = await J(r);
    assert.equal(d.added, 3); assert.equal(d.remainingToday, 19); assert.deepEqual(d.suggestions.new.map((x) => x.title), ['새 업무 1', '새 업무 2', '새 업무 3'], 'AI 가 적은 순서'); assert.deepEqual(d.suggestions.kept, []);
    assert.equal(calls.filter(isGen).length, 1);
    const saved = rows(env); assert.equal(saved.length, 3); assert.ok(saved.every((x) => x.status === 'new' && x.campId === 'camp-w27' && x.templateId === 'tpl-winter' && x.createdBy === U.mem && x.batchId === saved[0].batchId));
    assert.equal(saved[0].offsetDays, -10); assert.equal(saved[0].priority, 'High'); assert.equal(saved[0].section, '홍보');
    // 다른 기기·다시 열기: 같은 목록, 다른 템플릿/캠프에는 없음
    assert.equal((await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'))).suggestions.new.length, 3);
    assert.equal((await J(await get(env, U.dir, '?campId=camp-w27&templateId=tpl-winter'))).suggestions.new.length, 3, '다른 팀원도 같은 저장 목록');
    assert.equal((await J(await get(env, U.mem, '?campId=camp-w27'))).suggestions.new.length, 0); assert.equal((await J(await get(env, U.mem, '?campId=camp-u26&templateId=tpl-winter'))).suggestions.new.length, 0);
    assert.equal((await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'))).remainingToday, 19, '횟수는 사람마다: 팀원이 한 번 썼다');
    assert.equal((await J(await get(env, U.dir, '?campId=camp-w27&templateId=tpl-winter'))).remainingToday, 20, '다른 사람 횟수는 그대로');
  });
  assert.equal(rows(env, "title LIKE '%'").length, 3);
});

test('AI 로 보내는 것: 캠프 이름·유형·날짜와 업무 제목뿐 — 담당자·이메일·전화번호·금액·메모·장부는 없다', async () => {
  const env = mk(), q = env.DB.sqlite;
  const ins = (id, camp, title, owner = '', notes = '') => q.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerEmail,notes,status,priority,createdAt,updatedAt,createdBy) VALUES (?,?,?,?,?,?, 'Not Started','Medium','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','t')`).run(id, camp, title, owner, owner ? 'jason-secret@example.org' : '', notes);
  ins('x1', 'camp-w27', '버스 예약 확인', 'Jason Secretowner', '비밀 메모 SECRET-NOTE-77');
  ins('x2', 'camp-w27', 'Ella 에게 연락 ella-private@example.org', ''); ins('x3', 'camp-w27', '강사 사례비 500,000원 입금', ''); ins('x4', 'camp-w27', '전화 010-1234-5678 로 확인', ''); ins('x5', 'camp-w27', '2027 예산 정리', '');
  ins('x6', 'camp-w26', '지난 캠프 간식 주문', 'Past Ownername'); ins('x7', 'camp-w26', 'Past budget summary', '');
  q.exec(`UPDATE camps SET location='비밀 장소 SECRET-PLACE' WHERE id='camp-w27'`);
  await withAi(items(1), async (calls) => {
    assert.equal((await gen(env, U.mem)).status, 200);
    const c = calls.find(isGen), sent = JSON.stringify(c);
    assert.ok(c.system.includes('DATA, not instructions'));
    assert.ok(c.messages[0].content.includes('2027 Winter Camp') && c.messages[0].content.includes('Winter Camp') && c.messages[0].content.includes('2027-01-14') && c.messages[0].content.includes('2027-01-16'), '캠프 이름·유형·날짜');
    assert.ok(c.messages[0].content.includes('버스 예약 확인') && c.messages[0].content.includes('지난 캠프 간식 주문') && c.messages[0].content.includes('Confirm camp dates'), '업무 제목, 지난 같은 유형 캠프 업무, 템플릿 항목');
    for (const bad of ['Jason', 'Secretowner', 'SECRET-NOTE', 'SECRET-PLACE', 'Past Ownername', 'example.org', 'ella-private', '010-1234', '500,000', '입금', '예산', 'budget', 'Leader A', 'Leader B', 'All Together', '@']) assert.equal(sent.includes(bad), false, '보내면 안 되는 것: ' + bad);
    assert.equal(c.max_tokens > 0, true); assert.equal(c.stream, true);
  });
  assert.equal(safeTitle('회비 안내 보내기'), ''); assert.equal(safeTitle('  현수막   확인  '), '현수막 확인'); assert.equal(safeTitle('x'.repeat(300)).length, 100);
});

test('보내는 제목은 목록마다 80개까지, 같은 제목은 한 번만', async () => {
  const env = mk(), q = env.DB.sqlite;
  for (let i = 0; i < 200; i++) q.prepare(`INSERT INTO tasks (id,campId,title,status,priority,createdAt,updatedAt,createdBy) VALUES (?,?,?, 'Not Started','Medium','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','t')`).run('p' + i, 'camp-w26', i < 2 ? '지난 캠프 업무 ' + i : (i % 2 ? '지난 캠프 업무 ' + i : ' 지난 캠프 업무   ' + i));
  await withAi(items(1), async (calls) => {
    await gen(env, U.mem); const text = calls.find(isGen).messages[0].content, past = text.split('Task titles from past camps of the same type:')[1];
    const lines = past.split('\n').filter((l) => l.startsWith('- ')); assert.equal(lines.length, 80); assert.equal(new Set(lines.map(normTitle)).size, 80);
  });
  const p = buildSuggestPrompt({ camp: { nameKo: '캠프', nameEn: 'Camp', startDate: '2027-01-01', endDate: '2027-01-03' }, typeName: 'Winter' });
  assert.ok(p.user.includes('Start date: 2027-01-01') && p.user.includes('Camp type: Winter') && p.user.includes('(none)'));
});

test('중복은 걸러진다: 이 캠프의 업무·템플릿 항목·이미 받은 추천과 같은 제목(대소문자·공백 무시)은 버린다', async () => {
  const env = mk(); seed(env, 'old1', { title: '현수막 시안 확인', status: 'dropped' });
  await withAi({ suggestions: [
    { title: 'confirm  CAMP dates, theme & leadership', offsetDays: -90, priority: 'High', section: 'a', reason: 'r' },   // 이 캠프의 업무 (t01)
    { title: ' Prepare camp printed materials,  name tags and clothing ', offsetDays: -14 },                              // 템플릿 항목 (ci6)
    { title: '현수막   시안 확인' },                                                                                     // 이미 받았던 추천(넣지 않음 상태여도)
    { title: '응급 연락망 만들기', offsetDays: -7, priority: 'High', section: '안전', reason: '안전을 위해서예요' },
    { title: '응급 연락망 만들기' },                                                                                     // 같은 응답 안의 중복
  ] }, async () => {
    const d = await J(await gen(env, U.mem)); assert.equal(d.added, 1); assert.deepEqual(d.suggestions.new.map((x) => x.title), ['응급 연락망 만들기']);
  });
  assert.equal(normTitle('  A   b\tC '), 'a b c');
});

test('모델 응답 정리: 30개까지, 제목 100자, 숫자·우선순위 이상한 값은 안전하게, 마크다운으로 감싸도 읽는다', async () => {
  const many = items(45); many.suggestions[0].title = '가'.repeat(300); many.suggestions[1].offsetDays = 'abc'; many.suggestions[2].offsetDays = 99999; many.suggestions[3].offsetDays = '-14'; many.suggestions[4].priority = 'Urgent'; many.suggestions.push(null, 'str', { title: '' }, { notitle: 1 });
  const p = parseSuggestions('```json\n' + JSON.stringify(many) + '\n```');
  assert.equal(p.ok, true); assert.equal(p.items.length, 30); assert.equal(p.items[0].title.length, 100);
  assert.equal(p.items[1].offsetDays, null); assert.equal(p.items[2].offsetDays, null); assert.equal(p.items[3].offsetDays, -14); assert.equal(p.items[4].priority, 'Medium');
  assert.deepEqual(parseSuggestions('[{"title":"배열도 괜찮아요"}]').items.map((x) => x.title), ['배열도 괜찮아요']);
});

test('모델 응답이 이상하면: 안내만 하고 아무것도 저장하지 않는다 (지어낸 추천 없음)', async () => {
  const env = mk();
  for (const bad of ['죄송해요, 지금은 못 해요.', '{"suggestions": "x"}', '{ not json', '']) {
    await withAi(bad, async () => { const r = await gen(env, U.mem); assert.equal(r.status, 502); const d = await J(r); assert.equal(d.code, 'ai_unreadable'); assert.ok(d.error.includes('다시')); });
  }
  assert.equal(rows(env).length, 0);
  // 내용이 있지만 전부 중복이면 "새로 추천할 업무가 없어요"
  await withAi({ suggestions: [{ title: 'Confirm camp dates, theme & leadership' }] }, async () => { const d = await J(await gen(env, U.mem)); assert.equal(d.added, 0); assert.ok(d.note.includes('새로 추천할 업무가 없어요')); });
  assert.equal(rows(env).length, 0);
});

test('AI 키가 없으면: 켜지지 않았다는 안내(503), AI 호출도 횟수 사용도 없다', async () => {
  const env = makeEnv(fakeD1());
  await withAi(items(1), async (calls) => {
    const r = await gen(env, U.mem); assert.equal(r.status, 503); const d = await J(r); assert.equal(d.code, 'ai_off'); assert.ok(d.error.includes('켜지지 않았어요'));
    assert.equal(calls.length, 0);
  });
  assert.equal(await usedToday(env, U.mem), 0); assert.equal(rows(env).length, 0);
});

test('AI 서비스가 실패하면: 안내(502) + 횟수는 줄지 않고, 추천도 만들지 않는다', async () => {
  const env = mk();
  await withAi(() => new Response('{"error":{"message":"overloaded"}}', { status: 529 }), async () => {
    const r = await gen(env, U.mem); assert.equal(r.status, 502); const d = await J(r); assert.equal(d.code, 'ai_failed'); assert.equal(d.remainingToday, 20);
  });
  assert.equal(await usedToday(env, U.mem), 0); assert.equal(rows(env).length, 0);
});

test('하루 20번: 20번째까지 되고 21번째는 막힌다 (AI 호출 없음) · 사람마다 따로 · 한국 시간 하루 기준', async () => {
  const env = mk();
  await withAi((n) => sse(items(2, '묶음' + n + '-')), async (calls) => {
    for (let i = 1; i <= DAILY_LIMIT; i++) { const r = await gen(env, U.mem); assert.equal(r.status, 200, i + '번째'); assert.equal((await J(r)).remainingToday, DAILY_LIMIT - i); }
    assert.equal(calls.filter(isGen).length, 20);
    const r = await gen(env, U.mem); assert.equal(r.status, 429); const d = await J(r); assert.equal(d.code, 'limit'); assert.ok(d.error.includes('오늘') && d.error.includes('20번')); assert.equal(d.remainingToday, 0);
    assert.equal(calls.filter(isGen).length, 20, '21번째는 AI 를 부르지 않았다');
    assert.equal((await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'))).remainingToday, 0);
    assert.equal((await gen(env, U.dir)).status, 200, '다른 팀원은 자기 횟수가 따로 있다');
  });
  // 어제(한국 시간)의 기록은 세지 않는다
  const q = env.DB.sqlite, start = new Date(todayKST() + 'T00:00:00+09:00').getTime();
  q.prepare(`DELETE FROM audit_log WHERE action='ai_task_suggest' AND actor = ?`).run(U.mem);
  const aud = (at) => q.prepare(`INSERT INTO audit_log (id,at,actor,action,entity,entityId,detail) VALUES (?,?,?,?,?,?,?)`).run('a' + at, at, U.mem, 'ai_task_suggest', 'camp', 'camp-w27', '');
  aud(new Date(start - 60000).toISOString()); aud(new Date(start - 3600000).toISOString()); aud(new Date(start + 1000).toISOString());
  assert.equal(await usedToday(env, U.mem), 1, '오늘 0시(한국) 이후 한 번만');
  assert.equal((await J(await get(env, U.mem))).remainingToday, 19);
  // 운영에서 숫자를 바꿀 수 있다
  assert.equal((await J(await get(mk({ CAMPTEAM_AI_SUGGEST_DAILY: '5' }), U.mem))).remainingToday, 5);
});

test('권한: 업무 작성 권한이 있는 팀원만 추천 받기·결정 가능 (조회만·명단 밖 계정은 403, 아무것도 바뀌지 않음)', async () => {
  const env = mk(); seed(env, 's1');
  await withAi(items(2), async (calls) => {
    for (const who of [U.view, U.out]) {
      assert.equal((await gen(env, who)).status, 403, who + ' 추천 받기');
      assert.equal((await post(env, who, { action: 'decide', ids: ['s1'], decision: 'keep' })).status, 403, who + ' 결정');
    }
    assert.equal((await post(env, null, { action: 'generate', campId: 'camp-w27' })).status, 401);
    assert.equal(calls.length, 0);
  });
  assert.equal(rows(env)[0].status, 'new'); assert.equal(taskBySource(env, 'ai:s1').length, 0); assert.equal(await usedToday(env, U.view), 0);
  assert.equal((await get(env, U.out, '?campId=camp-w27')).status, 403, '업무를 볼 수 없는 계정은 읽기도 막힘');
});

test('입력 검사: 없는 캠프·템플릿, 이상한 action·decision', async () => {
  const env = mk();
  await withAi(items(1), async (calls) => {
    assert.equal((await post(env, U.mem, { action: 'generate', campId: 'nope' })).status, 400);
    assert.equal((await post(env, U.mem, { action: 'generate', campId: 'camp-w27', templateId: 'nope' })).status, 400);
    assert.equal((await post(env, U.mem, { action: 'zzz' })).status, 400);
    assert.equal((await post(env, U.mem, { action: 'decide', ids: [], decision: 'keep' })).status, 400);
    assert.equal((await post(env, U.mem, { action: 'decide', ids: ['x'], decision: 'delete' })).status, 400);
    assert.equal(calls.length, 0);
  });
  assert.equal(await usedToday(env, U.mem), 0);
});

test('템플릿 없이도 추천을 받을 수 있다 (템플릿 칸 비움)', async () => {
  const env = mk();
  await withAi(items(2), async () => { const d = await J(await post(env, U.mem, { action: 'generate', campId: 'camp-w27' })); assert.equal(d.added, 2); });
  assert.equal(rows(env)[0].templateId, null);
  assert.equal((await J(await get(env, U.mem, '?campId=camp-w27'))).suggestions.new.length, 2);
  assert.equal((await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'))).suggestions.new.length, 0);
});

test('✓ (keep): 그 캠프의 업무가 딱 한 번만 만들어진다 — 담당자 비움, 기한은 캠프 시작일 + 기준일, 두 번째 keep 은 아무 일도 없다', async () => {
  const env = makeEnv(fakeD1()); seed(env, 's1', { offsetDays: -20, title: '현수막 시안 확인', priority: 'High', section: '홍보', reason: '모집 전에 확인해요' });
  const before = env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  const r = await post(env, U.mem, { action: 'decide', ids: ['s1'], decision: 'keep' }); assert.equal(r.status, 200); const d = await J(r);
  assert.equal(d.created, 1); assert.deepEqual(d.results, [{ id: 's1', result: 'kept', inTemplate: false }]); assert.equal(d.suggestions.new.length, 0); assert.equal(d.suggestions.kept.length, 1);
  const t = taskBySource(env, 'ai:s1'); assert.equal(t.length, 1);
  assert.equal(t[0].campId, 'camp-w27'); assert.equal(t[0].title, '현수막 시안 확인'); assert.equal(t[0].ownerName, ''); assert.equal(t[0].ownerEmail, ''); assert.equal(t[0].dueDate, '2026-12-25', '2027-01-14 - 20일'); assert.equal(t[0].priority, 'High'); assert.equal(t[0].section, '홍보'); assert.equal(t[0].status, 'Not Started'); assert.equal(t[0].createdBy, U.mem); assert.ok(t[0].notes.includes('모집 전에 확인해요'));
  assert.equal(t[0].titleKo, '현수막 시안 확인', '제목 언어 칸도 채워진다');
  const again = await J(await post(env, U.mem, { action: 'decide', ids: ['s1'], decision: 'keep' })); assert.equal(again.created, 0); assert.equal(again.results[0].result, 'noop');
  // 거의 동시에 두 번 눌러도 업무는 하나
  seed(env, 's2', { title: '응급 연락망' });
  const [a, b] = await Promise.all([1, 2].map(() => post(env, U.dir, { action: 'decide', ids: ['s2'], decision: 'keep' })));
  assert.equal((await J(a)).created + (await J(b)).created, 1); assert.equal(taskBySource(env, 'ai:s2').length, 1);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM tasks').get().n, before + 2);
  // 기록
  const acts = env.DB.sqlite.prepare(`SELECT action FROM audit_log WHERE action LIKE 'ai_suggest_%'`).all().map((x) => x.action); assert.ok(acts.includes('ai_suggest_keep'));
});

test('날짜 없는 캠프나 기준일이 없는 추천은 기한 없이 만든다 (임의로 채우지 않는다)', async () => {
  const env = makeEnv(fakeD1()); seed(env, 'n1', { campId: 'camp-u26', offsetDays: -10, templateId: null }); seed(env, 'n2', { offsetDays: null, title: '기준일 없는 추천' });
  await post(env, U.mem, { action: 'decide', ids: ['n1', 'n2'], decision: 'keep' });
  assert.equal(taskBySource(env, 'ai:n1')[0].dueDate, null); assert.equal(taskBySource(env, 'ai:n2')[0].dueDate, null); assert.equal(taskBySource(env, 'ai:n1')[0].campId, 'camp-u26');
});

test('「템플릿에도 저장」: 켜면 템플릿 항목으로도 들어가고(같은 제목은 건너뜀), 끄거나 템플릿이 없으면 들어가지 않는다', async () => {
  const env = makeEnv(fakeD1()); const items0 = () => env.DB.sqlite.prepare(`SELECT * FROM checklist_items WHERE templateId='tpl-winter' AND deletedAt IS NULL ORDER BY sortOrder`).all();
  const n0 = items0().length; seed(env, 'a1', { title: '현수막 시안 확인', offsetDays: -20, priority: 'High', section: '홍보' }); seed(env, 'a2', { title: '기본 항목만', templateId: 'tpl-winter' }); seed(env, 'a3', { title: '템플릿 없는 추천', templateId: null }); seed(env, 'a4', { title: ' confirm camp DATES, theme & leadership ' });
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['a2'], decision: 'keep', alsoTemplate: false }))).templateAdded, 0); assert.equal(items0().length, n0, '기본값(끔): 템플릿은 그대로');
  const d = await J(await post(env, U.mem, { action: 'decide', ids: ['a1'], decision: 'keep', alsoTemplate: true })); assert.equal(d.templateAdded, 1); assert.deepEqual(d.results[0], { id: 'a1', result: 'kept', inTemplate: true });
  const it = items0(); assert.equal(it.length, n0 + 1); const added = it[it.length - 1];
  assert.equal(added.title, '현수막 시안 확인'); assert.equal(added.offsetDays, -20); assert.equal(added.priority, 'High'); assert.equal(added.section, '홍보'); assert.equal(added.ownerSuggestion, ''); assert.equal(added.createdBy, U.mem); assert.equal(added.sortOrder, Math.max(...it.slice(0, -1).map((x) => x.sortOrder)) + 1);
  assert.equal(taskBySource(env, 'ai:a1').length, 1, '업무도 만들어졌다');
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['a3'], decision: 'keep', alsoTemplate: true }))).templateAdded, 0, '템플릿 없이 받은 추천은 템플릿에 못 넣는다'); assert.equal(taskBySource(env, 'ai:a3').length, 1);
  const dup = await J(await post(env, U.mem, { action: 'decide', ids: ['a4'], decision: 'keep', alsoTemplate: true })); assert.equal(dup.templateAdded, 0, '이미 있는 항목은 또 넣지 않는다'); assert.equal(items0().length, n0 + 1);
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['a1'], decision: 'keep', alsoTemplate: true }))).templateAdded, 0, '두 번째 keep 은 템플릿도 건드리지 않는다'); assert.equal(items0().length, n0 + 1);
});

test('✕ (drop) → 「넣지 않은 추천」, 「다시 넣기」(restore) → 추천 목록으로 · 넣지 않은 것은 업무가 되지 않는다', async () => {
  const env = makeEnv(fakeD1()); seed(env, 'd1'); seed(env, 'd2', { title: '둘째 추천' });
  const d = await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'drop' })); assert.deepEqual(d.suggestions.dropped.map((x) => x.id), ['d1']); assert.deepEqual(d.suggestions.new.map((x) => x.id), ['d2']);
  assert.equal(taskBySource(env, 'ai:d1').length, 0);
  // 넣지 않은 것에 keep 을 보내도 업무는 안 만들어진다 (먼저 다시 넣어야 한다)
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'keep' }))).results[0].result, 'noop'); assert.equal(taskBySource(env, 'ai:d1').length, 0);
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'drop' }))).results[0].result, 'noop');
  const r = await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'restore' })); assert.deepEqual(r.suggestions.new.map((x) => x.id).sort(), ['d1', 'd2']); assert.deepEqual(r.suggestions.dropped, []);
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'restore' }))).results[0].result, 'noop');
  await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'keep' }); assert.equal(taskBySource(env, 'ai:d1').length, 1);
  // 업무로 만든 것은 ✕/다시 넣기로 되돌려지지 않는다
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['d1'], decision: 'drop' }))).results[0].result, 'noop'); assert.equal(rows(env, "id='d1'")[0].status, 'kept');
  assert.equal((await J(await post(env, U.mem, { action: 'decide', ids: ['nope'], decision: 'keep' }))).results[0].result, 'missing');
  const acts = env.DB.sqlite.prepare(`SELECT action, actor FROM audit_log WHERE action LIKE 'ai_suggest_%'`).all(); for (const a of ['ai_suggest_drop', 'ai_suggest_restore', 'ai_suggest_keep']) assert.ok(acts.some((x) => x.action === a && x.actor === U.mem), a);
  assert.equal(rows(env, "id='d1'")[0].decidedBy, U.mem);
});

test('지워진 캠프의 추천은 업무로 만들지 않는다', async () => {
  const env = makeEnv(fakeD1()); seed(env, 'g1'); env.DB.sqlite.exec(`UPDATE camps SET deletedAt='x' WHERE id='camp-w27'`);
  const r = await J(await post(env, U.mem, { action: 'decide', ids: ['g1'], decision: 'keep' })); assert.equal(r.results[0].result, 'camp_missing'); assert.equal(rows(env)[0].status, 'new'); assert.equal(taskBySource(env, 'ai:g1').length, 0);
});

test('추천 받기 → ✓ 전체 흐름: 받은 추천을 고르면 실제 업무 목록에 나타난다', async () => {
  const env = mk();
  await withAi(items(2), async () => {
    const g = await J(await gen(env, U.mem)); const id = g.suggestions.new[0].id;
    const k = await J(await post(env, U.mem, { action: 'decide', ids: [id], decision: 'keep', alsoTemplate: false })); assert.equal(k.created, 1);
    assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE campId='camp-w27' AND title='새 업무 1' AND deletedAt IS NULL`).get().n, 1);
    assert.equal((await J(await get(env, U.mem, '?campId=camp-w27&templateId=tpl-winter'))).suggestions.new.length, 1);
  });
});

test('표(0040)가 아직 없는 상태: 읽기는 빈 목록, 추천 받기는 안내(503)만 한다 — AI 도 부르지 않는다', async () => {
  const env = mk(); env.DB.sqlite.exec('DROP TABLE task_ai_suggestions');
  const d = await J(await get(env, U.mem, '?campId=camp-w27')); assert.equal(d.ready, false); assert.deepEqual(d.suggestions, { new: [], kept: [], dropped: [] });
  await withAi(items(1), async (calls) => { const r = await gen(env, U.mem); assert.equal(r.status, 503); assert.equal((await J(r)).code, 'not_ready'); assert.equal(calls.length, 0); });
  assert.equal(await usedToday(env, U.mem), 0);
});

test('칸을 펼쳐 둘지(ai-suggest-open)는 본인 설정으로 저장된다 — 다른 키는 여전히 안 받는다', async () => {
  const env = makeEnv(fakeD1());
  const put = async (key, value) => Prefs.onRequestPut({ env, request: await req(U.mem, { method: 'PUT', body: { key, value }, url: 'http://localhost:8788/api/campteam/ui-prefs' }) });
  assert.equal((await put('ai-suggest-open', '0')).status, 200);
  const g = await J(await Prefs.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost:8788/api/campteam/ui-prefs' }) })); assert.equal(g.prefs['ai-suggest-open'], '0');
  assert.equal((await put('howto:tasks', '1')).status, 200); assert.equal((await put('anything-else', '1')).status, 400);
});

test('화면 파일: tasks-ai.js 가 문법에 맞고, 한국어·영어 문구와 접기·✓·✕·다시 넣기·템플릿에도 저장이 있다 (tasks.astro 에서 불러온다)', () => {
  const js = readFileSync(root + 'public/portal/campteam/tasks-ai.js', 'utf8'), astro = readFileSync(root + 'src/pages/portal/campteam/tasks.astro', 'utf8'), css = readFileSync(root + 'public/portal/campteam/campteam.css', 'utf8');
  assert.ok(astro.includes('/portal/campteam/tasks-ai.js'));
  for (const s of ['AI 추천 받기', '오늘 {n}번 남았어요', 'AI가 만든 추천이에요. ✓를 눌러야 업무가 만들어져요.', '템플릿에도 저장', '넣지 않은 추천', '다시 넣기', '접기', '펼치기', 'ai-suggest-open', 'ai-task-suggest']) assert.ok(js.includes(s), s);
  for (const s of ['Get AI suggestions', 'Also save to template', 'Dropped suggestions', '{n} left today']) assert.ok(js.includes(s), s);
  assert.ok(css.includes('/* ==== batch-D ai-suggest ==== */') && css.includes('/* ==== /batch-D ai-suggest ==== */'));
  assert.match(css, /\.aisg-ok,\.aisg-no\{width:44px;height:44px/, '✓ ✕ 버튼은 40px 이상');
});
