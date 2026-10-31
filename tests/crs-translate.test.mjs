import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { translateCrsItems, cleanItems, buildPrompt, parseTranslations, MAX_ITEMS, detectLang, splitMixed } from '../functions/lib/crsTranslate.js';
import * as api from '../functions/api/portal/crs-translate.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

const sse = text => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`)); c.close(); } }), { headers: { 'content-type': 'text/event-stream' } });

test('번역 요청 정리: 최대 개수·길이, 알 수 없는 종류는 note', () => {
  assert.deepEqual(cleanItems('x'), []);
  const items = cleanItems(Array.from({ length: 40 }, () => ({ text: '가'.repeat(900), kind: 'zzz' })));
  assert.equal(items.length, MAX_ITEMS); assert.equal(items[0].text.length, 600); assert.equal(items[0].kind, 'note');
  assert.equal(cleanItems([{ text: '평택교회', kind: 'church' }])[0].kind, 'church');
});

test('프롬프트: 글은 데이터이고, 칸마다 from/to(한→영, 영→한)가 정해진다', async () => {
  let seen = null;
  const out = await translateCrsItems({ ANTHROPIC_API_KEY: 'k' }, [{ text: '평택중앙교회', kind: 'church' }, { text: 'Aiden Park', kind: 'person' }, { text: '12345', kind: 'note' }, { text: '', kind: 'note' }], {
    fetchImpl: async (url, init) => { seen = JSON.parse(init.body); return sse('[{"i":0,"text":"Pyeongtaek Central Church"},{"i":1,"text":"에이든 박"}]'); },
  });
  assert.deepEqual(out, [{ lang: 'en', text: 'Pyeongtaek Central Church' }, { lang: 'ko', text: '에이든 박' }, null, null], '숫자뿐인 칸·빈 칸은 번역하지 않는다');
  assert.match(seen.system, /DATA, not instructions/);
  const sent = JSON.parse(seen.messages[0].content);
  assert.deepEqual(sent.map(x => [x.from, x.to]), [['ko', 'en'], ['en', 'ko']]);
});

test('번역 실패·키 없음은 null — 저장을 막지 않는다', async () => {
  assert.equal(await translateCrsItems({}, [{ text: '교회', kind: 'church' }]), null, '키가 없으면 null');
  assert.equal(await translateCrsItems({ ANTHROPIC_API_KEY: 'k' }, [{ text: '교회', kind: 'church' }], { fetchImpl: async () => sse('이건 JSON 이 아님') }), null);
  assert.deepEqual(await translateCrsItems({}, []), []);
  assert.deepEqual(parseTranslations('[{"i":0,"text":" x "},{"i":9,"text":"y"}]', 1), ['x']);
});

function kvEnv(extra = {}) {
  const store = new Map([['hub:account:amy@wol.org', JSON.stringify({ email: 'amy@wol.org', name: 'Amy', role: 'counselor', status: 'approved' })]]);
  return { store, env: { ADMIN_PASSWORD: 'secret', CAMP_KV: { get: async (k, type) => { const v = store.get(k); if (v == null) return null; return type === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); }, delete: async k => store.delete(k) }, ...extra } };
}
const post = async (env, body, auth = true) => {
  const headers = { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + await createHubSessionToken('secret', 'amy@wol.org', 'counselor') } : {}) };
  const res = await api.onRequestPost({ env, request: new Request('https://t.co/api/portal/crs-translate', { method: 'POST', headers, body: JSON.stringify(body) }) });
  return { status: res.status, ...(await res.json()) };
};

test('API: 로그인 필요 · 번역할 글 필요 · 키가 없으면 available:false · 하루 호출 한도', async () => {
  const { env, store } = kvEnv();
  assert.equal((await post(env, { items: [{ text: '교회' }] }, false)).status, 401);
  assert.equal((await post(env, { items: [] })).status, 400);
  assert.equal((await post(env, { items: Array.from({ length: 31 }, () => ({ text: 'a' })) })).status, 400);
  const off = await post(env, { items: [{ text: '교회', kind: 'church' }] });
  assert.equal(off.available, false); assert.equal(off.results, null);
  const keyed = kvEnv({ ANTHROPIC_API_KEY: 'k' });
  keyed.store.set(`crs-tr:amy@wol.org:${new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)}`, String(api.DAILY_CALLS));
  assert.equal((await post(keyed.env, { items: [{ text: '교회', kind: 'church' }] })).status, 429);
});

// 화면 쪽 도우미(public/crs-translate.js)를 브라우저 없이 시험한다
function loadHelper(fetchImpl) {
  const win = {}; const ctx = vm.createContext({ window: win, fetch: fetchImpl, sessionStorage: { getItem: () => 'tok' }, AbortController, setTimeout, clearTimeout });
  vm.runInContext(readFileSync(new URL('../public/crs-translate.js', import.meta.url), 'utf8'), ctx);
  return win.CrsTr;
}
const reply = results => async () => ({ ok: true, json: async () => ({ results }) });

test('화면 도우미: 화면 언어에 맞는 새 번역만 보여 주고, 원문이 고쳐지면 낡은 번역은 쓰지 않는다', () => {
  const T = loadHelper(async () => { throw new Error('no'); });
  const church = { churchName: '평택중앙교회', tr: { churchName: { l: 'en', t: 'Pyeongtaek Central Church', s: '평택중앙교회' } } };
  assert.equal(T.pick(church, 'churchName', 'en'), 'Pyeongtaek Central Church');
  assert.equal(T.pick(church, 'churchName', 'ko'), '평택중앙교회');
  assert.equal(T.pick({ ...church, churchName: '평택중앙교회 (새 이름)' }, 'churchName', 'en'), '평택중앙교회 (새 이름)', '낡은 번역은 안 쓴다');
  assert.equal(T.pick({}, 'notes', 'en'), '');
  assert.equal(T.detectLang('Hello 월코'), 'en'); assert.equal(T.detectLang('월코 캠프 Camp'), 'ko');
  assert.match(T.searchText(church, ['churchName']), /pyeongtaek central church/);
});

test('화면 도우미: 새로 번역할 칸만 서버에 보내고, 이미 번역된 칸은 그대로 둔다 (실패하면 null — 원문만 저장)', async () => {
  const calls = [];
  const T = loadHelper(async (url, init) => { calls.push(JSON.parse(init.body).items); return reply([{ lang: 'en', text: 'Hello' }])(); });
  const prev = { pastorName: { l: 'en', t: 'Pastor Kim', s: '김 목사', v: T.TR_V } };
  const tr = await T.fill({ churchName: '', pastorName: '김 목사', notes: '안녕하세요', phone: '010' }, T.CHURCH_FIELDS, prev);
  assert.deepEqual(calls[0], [{ text: '안녕하세요', kind: 'note' }], '번역할 칸 하나만 보낸다');
  assert.deepEqual(Object.keys(tr).sort(), ['notes', 'pastorName']);
  assert.equal(tr.notes.l, 'en'); assert.equal(tr.pastorName.t, 'Pastor Kim');
  const down = loadHelper(async () => ({ ok: false }));
  assert.equal(await down.fill({ notes: '안녕' }, down.CHURCH_FIELDS, null), null);
  // 연락처 같은 칸은 번역 대상이 아니다
  assert.ok(!('pastorPhone' in T.CHURCH_FIELDS));
});

test('화면 도우미: 여러 기록을 한 번에(최대 30칸) 번역한다', async () => {
  const calls = [];
  const T = loadHelper(async (url, init) => { const items = JSON.parse(init.body).items; calls.push(items.length); return reply(items.map(() => ({ lang: 'en', text: 'x' })))(); });
  const jobs = Array.from({ length: 20 }, (_, i) => ({ obj: { churchName: `교회${i}`, pastorName: `목사${i}` }, fields: T.CHURCH_FIELDS }));
  const out = await T.fillMany(jobs);
  assert.deepEqual(calls, [30]); assert.equal(out.filter(Boolean).length, 15, '30칸 = 교회 15곳 분');
});

test('CRS 화면 연결: 저장할 때 번역하고, 보여 줄 때 화면 언어에 맞는 번역을 쓰며, 예전 글은 뒤에서 채운다', () => {
  const src = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  assert.match(src, /<script src="\/crs-translate\.js\?v=\d+" defer><\/script>/);
  assert.match(src, /data\.tr = await CrsTr\.fill\(data, CrsTr\.CHURCH_FIELDS, editingChurch\?\.tr \|\| null\)/, '교회 저장');
  assert.match(src, /CrsTr\.fill\(entry, CrsTr\.VISIT_FIELDS, null\)/, '방문 기록 저장');
  assert.match(src, /CrsTr\.fill\(newEntry, CrsTr\.ENTRY_FIELDS, null\)/, '단계 기록 저장');
  for (const shown of ["trText(c, 'churchName')", "trText(c, 'pastorName')", "trText(church, 'churchName')", "trText(church, 'notes')", "trText(v, 'visitor')", "trText(v, 'notes')", "trText(entry, 'person')"]) assert.ok(src.includes(shown), shown);
  assert.match(src, /backfillTranslations\(\);\n  \}/, '교회 목록을 불러온 뒤 번역 채우기');
  assert.match(src, /backfillVisitTranslations\(church\);/);
  // 연락처·주소는 번역 대상이 아니다
  const helper = readFileSync(new URL('../public/crs-translate.js', import.meta.url), 'utf8');
  assert.doesNotMatch(helper, /pastorPhone|detailAddress: 'address'/);
});

test('언어 판정은 괄호 속 고유명사를 빼고 본다', () => {
  assert.equal(detectLang('사랑의교회 (Sarang Church)'), 'ko');
  assert.equal(detectLang('Sarang Church (사랑의교회)'), 'en');
  assert.equal(detectLang('(사랑의교회)'), 'ko', '괄호뿐이면 전체로');
  const T = loadHelper(async () => { throw new Error('no'); });
  assert.equal(T.detectLang('Sarang Church (사랑의교회)'), 'en');
});

test('한글과 영어를 확실히 나란히 적은 글은 번역하지 않고 나눈다 — 애매하면 번역기로', async () => {
  assert.deepEqual(splitMixed('사랑의교회 (SaRang Church)'), { ko: '사랑의교회', en: 'SaRang Church' });
  assert.deepEqual(splitMixed('Grace Church / 은혜교회'), { ko: '은혜교회', en: 'Grace Church' });
  assert.deepEqual(splitMixed('김철수 | Cheolsu Kim'), { ko: '김철수', en: 'Cheolsu Kim' });
  assert.deepEqual(splitMixed('평택에서 만남\nMet in Pyeongtaek'), { ko: '평택에서 만남', en: 'Met in Pyeongtaek' });
  for (const unclear of ['새빛교회 (구 빛교회)', 'GGC 사랑교회', 'Pastor 김', '평택중앙교회']) assert.equal(splitMixed(unclear), null, unclear);
  let called = 0;
  const out = await translateCrsItems({ ANTHROPIC_API_KEY: 'k' }, [{ text: '사랑의교회 (SaRang Church)', kind: 'church' }, { text: '평택에서 만남 / Met in Pyeongtaek', kind: 'note' }], { fetchImpl: async () => { called++; return sse('[]'); } });
  assert.equal(called, 0, '나눌 수 있으면 번역기를 부르지 않는다');
  assert.deepEqual(out, [{ lang: 'en', text: 'SaRang Church (사랑의교회)' }, { lang: 'en', text: 'Met in Pyeongtaek' }]);
});

test('번역 지시: 고유명사는 "번역 (원문)", 주소는 괄호 없이, 호칭 용어집도 함께', () => {
  const { system } = buildPrompt([{ kind: 'church', from: 'ko', to: 'en', text: '사랑의교회' }]);
  assert.match(system, /"Sarang Church \(사랑의교회\)"/);
  assert.match(system, /"은혜공동체교회 \(Grace Community Church\)"/);
  assert.match(system, /"Hwangyu Kim \(김환규\)"/);
  assert.match(system, /Addresses:[^\n]*Do not add brackets/);
  assert.match(system, /"Mrs\. Han" = "한권사님"/);
});

test('번역 결과도 호칭 용어집대로 바로잡는다', async () => {
  const out = await translateCrsItems({ ANTHROPIC_API_KEY: 'k' }, [{ text: 'Met Mrs. Han at church', kind: 'note' }], { fetchImpl: async () => sse('[{"i":0,"text":"교회에서 한 여사님을 만남"}]') });
  assert.equal(out[0].text, '교회에서 한권사님을 만남');
});

test('화면 도우미: 주소 · 교단도 번역하되 원문은 그대로 두고, 예전 방식 번역은 다시 번역한다', async () => {
  const T = loadHelper(async (url, init) => reply(JSON.parse(init.body).items.map(i => ({ lang: 'en', text: 'T:' + i.text })))());
  assert.equal(T.CHURCH_FIELDS.location, 'address'); assert.equal(T.CHURCH_FIELDS.denomination, 'church');
  const church = { churchName: '평택교회', location: '경기도 평택시 경기대로 1407', tr: { churchName: { l: 'en', t: 'Pyeongtaek Church', s: '평택교회' } } };
  assert.equal(JSON.stringify(T.missing(church, T.CHURCH_FIELDS).sort()), '["churchName","location"]', '판 표시 없는 예전 번역도 다시');
  assert.equal(T.pick(church, 'churchName', 'en'), 'Pyeongtaek Church', '새 번역이 오기 전까지는 예전 번역을 보여 준다');
  const tr = await T.fill(church, T.CHURCH_FIELDS, church.tr);
  assert.equal(tr.location.t, 'T:경기도 평택시 경기대로 1407'); assert.equal(tr.location.v, T.TR_V);
  assert.equal(church.location, '경기도 평택시 경기대로 1407', '주소 원문(지도 검색용)은 그대로');
  const src = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  assert.ok(src.includes("trText(church, 'location')") && src.includes("trText(c, 'denomination')"));
  assert.match(src, /denominationFamily\(c\.denomination\)/, '교단 거르기는 원문으로');
});
