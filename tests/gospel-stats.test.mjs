import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import { cleanValues, summarize, toCsv, shiftMonth, reportableMonth, currentMonthKst, GOSPEL_FIELD_IDS } from '../functions/lib/gospelStats.js';

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor', name = email) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role, status: 'approved' }));
  const call = async (method, who, { query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]);
    const request = new Request(`https://t.co/api/portal/gospel-stats${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const handler = { GET: G.onRequestGet, POST: G.onRequestPost, DELETE: G.onRequestDelete }[method];
    const res = await handler({ env, request });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, ...(type.includes('json') ? await res.json() : { text: await res.text() }) };
  };
  return { store, acc, call };
}
const master = ['admin@wolko.org', 'master'];
const admin = ['hkim3@wol.org', 'admin'];
const anna = ['anna@wol.org', 'counselor'];
const ben = ['ben@wol.org', 'counselor'];
const month = currentMonthKst();
const report = (over = {}) => ({ month, scope: 'individual', location: 'mainland', values: { evangelism: 5, salvation: 2 }, ...over });

test('값 정리: 비어 있으면 0, 쉼표·공백 제거, 음수·소수·글자는 거부', () => {
  const v = cleanValues({ evangelism: '1,200', salvation: ' 3 ', literature: '' });
  assert.equal(v.evangelism, 1200); assert.equal(v.salvation, 3); assert.equal(v.literature, 0); assert.equal(v.social, 0);
  assert.equal(Object.keys(v).length, GOSPEL_FIELD_IDS.length);
  for (const bad of ['-1', '1.5', 'abc', '2000000']) assert.throws(() => cleanValues({ evangelism: bad }), /INVALID/);
});

test('달 계산: 이번 달부터 12개월 전까지만 보고할 수 있다', () => {
  const now = Date.UTC(2026, 9, 23);
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(reportableMonth('2026-10', now), true);
  assert.equal(reportableMonth('2025-10', now), true);
  assert.equal(reportableMonth('2025-09', now), false);
  assert.equal(reportableMonth('2026-11', now), false, '미래 달은 안 된다');
  assert.equal(reportableMonth('2026-13', now), false);
});

test('집계: 월코(본토) · 제주 · 통합을 따로 더하고 건수를 센다', () => {
  const s = summarize([
    { scope: 'individual', location: 'mainland', values: { evangelism: 5, salvation: 1 } },
    { scope: 'team', location: 'jeju', values: { evangelism: 7, campCount: 2 } },
    { scope: 'individual', location: 'jeju', values: { evangelism: 1 } },
  ]);
  assert.equal(s.all.evangelism, 13); assert.equal(s.mainland.evangelism, 5); assert.equal(s.jeju.evangelism, 8);
  assert.equal(s.jeju.campCount, 2); assert.equal(s.all.salvation, 1);
  assert.deepEqual(s.counts, { all: 3, mainland: 1, jeju: 2, individual: 2, team: 1 });
});

test('보고 저장: 같은 달·같은 단위는 고쳐 쓰고, 팀은 이름이 필요하며, 개인과 팀은 따로 센다', async () => {
  const t = setup(); await t.acc(anna[0], 'counselor', 'Anna Lee');
  let r = await t.call('POST', anna, { body: report() });
  assert.equal(r.status, 200); assert.equal(r.updated, false); assert.equal(r.report.name, 'Anna Lee');
  r = await t.call('POST', anna, { body: report({ values: { evangelism: 9 } }) });
  assert.equal(r.updated, true, '같은 단위는 덮어쓴다');
  assert.equal((await t.call('GET', anna, { query: `?month=${month}` })).mine.length, 1);
  assert.equal((await t.call('POST', anna, { body: report({ scope: 'team' }) })).status, 400, '팀 이름 없음');
  assert.equal((await t.call('POST', anna, { body: report({ scope: 'team', teamName: 'Camp Crew' }) })).status, 200);
  assert.equal((await t.call('POST', anna, { body: report({ scope: 'team', teamName: 'Camp Crew', values: { evangelism: 4 } }) })).updated, true);
  assert.equal((await t.call('GET', anna, { query: `?month=${month}` })).mine.length, 2, '개인 1 + 팀 1');
});

test('보고 저장: 잘못된 달 · 위치 · 숫자는 거부, 로그인 없으면 401', async () => {
  const t = setup(); await t.acc(anna[0]);
  assert.equal((await t.call('POST', null, { body: report() })).status, 401);
  assert.equal((await t.call('POST', anna, { body: report({ month: '2020-01' }) })).status, 400);
  assert.equal((await t.call('POST', anna, { body: report({ month: shiftMonth(month, 1) }) })).status, 400);
  assert.equal((await t.call('POST', anna, { body: report({ location: 'seoul' }) })).status, 400);
  assert.equal((await t.call('POST', anna, { body: report({ values: { evangelism: -3 } }) })).status, 400);
  assert.equal((await t.call('GET', anna, { query: '?month=oops' })).status, 400);
});

test('열람 권한: 합계는 모두가, 이름·이메일이 있는 목록과 CSV 는 마스터·관리자만', async () => {
  const t = setup(); await t.acc(anna[0], 'counselor', 'Anna Lee'); await t.acc(ben[0], 'counselor', 'Ben Kim'); await t.acc(admin[0], 'admin', 'Admin Kim');
  await t.call('POST', anna, { body: report({ values: { evangelism: 5 } }) });
  await t.call('POST', ben, { body: report({ location: 'jeju', values: { evangelism: 8 } }) });

  const asBen = await t.call('GET', ben, { query: `?month=${month}` });
  assert.equal(asBen.summary.all.evangelism, 13);
  assert.equal(asBen.summary.mainland.evangelism, 5); assert.equal(asBen.summary.jeju.evangelism, 8);
  assert.equal(asBen.rows, undefined, '일반 계정에는 보고별 목록이 없다');
  assert.equal(asBen.mine.length, 1); assert.equal(asBen.mine[0].email, ben[0], '내 보고만');
  assert.ok(!JSON.stringify(asBen).includes('anna@wol.org'), '다른 사람의 이메일은 응답 어디에도 없다');
  assert.equal(asBen.me.canReview, false);
  assert.equal((await t.call('GET', ben, { query: `?month=${month}&format=csv` })).status, 403);

  for (const who of [admin, master]) {
    const r = await t.call('GET', who, { query: `?month=${month}` });
    assert.equal(r.rows.length, 2); assert.ok(r.rows.some(x => x.name === 'Anna Lee' && x.email === 'anna@wol.org'));
    assert.equal(r.me.canReview, true);
  }
  const csv = await t.call('GET', admin, { query: `?month=${month}&format=csv` });
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-disposition'), /gospel-stats-\d{4}-\d{2}\.csv/);
  assert.ok(csv.text.includes('Anna Lee') && csv.text.split('\r\n').length === 3);
});

test('추이: 선택한 달까지 최근 6개월 합계', async () => {
  const t = setup(); await t.acc(anna[0]);
  await t.call('POST', anna, { body: report({ month: shiftMonth(month, -2), values: { evangelism: 3 } }) });
  await t.call('POST', anna, { body: report({ values: { evangelism: 4 } }) });
  const r = await t.call('GET', anna, { query: `?month=${month}` });
  assert.equal(r.trend.length, 6); assert.equal(r.trend[5].month, month);
  assert.equal(r.trend[5].all.evangelism, 4); assert.equal(r.trend[3].all.evangelism, 3);
});

test('삭제: 내 보고는 내가, 남의 보고는 마스터만', async () => {
  const t = setup(); await t.acc(anna[0]); await t.acc(ben[0]); await t.acc(admin[0], 'admin');
  const saved = (await t.call('POST', anna, { body: report() })).report;
  const q = `?month=${month}&id=${saved.id}`;
  assert.equal((await t.call('DELETE', ben, { query: q })).status, 403);
  assert.equal((await t.call('DELETE', admin, { query: q })).status, 403, '관리자도 남의 보고는 지우지 못한다');
  assert.equal((await t.call('DELETE', anna, { query: q })).status, 200);
  assert.equal((await t.call('DELETE', anna, { query: q })).status, 404);
  const again = (await t.call('POST', anna, { body: report() })).report;
  assert.equal((await t.call('DELETE', master, { query: `?month=${month}&id=${again.id}` })).status, 200);
});

test('CSV: 엑셀 수식으로 읽히는 글자는 막고, 쉼표·따옴표는 감싼다', () => {
  const csv = toCsv('2026-10', [{ location: 'jeju', scope: 'team', teamName: '=HYPERLINK("x")', name: 'A, B', email: 'a@wol.org', values: { evangelism: 3 } }]);
  assert.ok(csv.startsWith('﻿month,location,type'));
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\")\""), '수식 시작 글자 앞에 작은따옴표');
  assert.ok(csv.includes('"A, B"'));
});

test('모든 숫자가 0(또는 비어 있어도) 보고를 낼 수 있다', async () => {
  const { acc, call } = setup();
  await acc(anna[0]);
  const month = currentMonthKst();
  const zeros = Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, '0']));
  const a = await call('POST', anna, { body: { month, scope: 'individual', location: 'mainland', values: zeros } });
  assert.equal(a.status, 200);
  assert.ok(Object.values(a.report.values).every(v => v === 0));
  const b = await call('POST', anna, { body: { month, scope: 'individual', location: 'mainland', values: {} } });
  assert.equal(b.status, 200, '값을 하나도 보내지 않아도 0 으로 저장');
  assert.equal(b.updated, true, '같은 단위는 고쳐 쓴다');
});

/* ───────── 교회 행사 기록 ───────── */
import * as GC from '../functions/api/portal/gospel-churches.js';
import { cleanChurchEntries, parseCrsChurches } from '../functions/lib/gospelStats.js';

test('교회 행사 정리: 빈 줄은 건너뛰고, 숫자·날짜·길이를 검증한다', () => {
  assert.deepEqual(cleanChurchEntries(undefined), []);
  assert.deepEqual(cleanChurchEntries([{}, { churchName: '  ' }]), [], '아무것도 안 쓴 줄은 건너뛴다');
  const [e] = cleanChurchEntries([{ churchName: '평택중앙교회', churchId: 'c1', event: '겨울 집회', date: '2026-10-12', students: '1,200', salvations: '8', note: '메모' }]);
  assert.equal(e.students, 1200); assert.equal(e.salvations, 8); assert.equal(e.dedications, 0); assert.equal(e.date, '2026-10-12');
  assert.match(e.id, /^[a-z0-9-]+$/);
  assert.equal(cleanChurchEntries([{ churchName: 'A', date: '10/12' }])[0].date, '', '날짜 형식이 아니면 비운다');
  assert.throws(() => cleanChurchEntries([{ event: '이름 없음', students: 3 }]), /churchName/);
  assert.throws(() => cleanChurchEntries([{ churchName: 'A', students: -1 }]), /students/);
  assert.throws(() => cleanChurchEntries([{ churchName: 'A', salvations: '1.5' }]), /salvations/);
  assert.throws(() => cleanChurchEntries('x'), /churchEntries/);
  assert.equal(cleanChurchEntries(Array.from({ length: 50 }, () => ({ churchName: 'A' }))).length, 30, '한 보고에 최대 30건');
});

test('CRS 교회 목록은 이름만 꺼내고, 이름 없는 레코드는 뺀다', () => {
  const list = parseCrsChurches({ b: { churchName: '나교회', phone: '010-0000-0000', pastor: '비밀' }, a: { churchName: '가교회' }, c: { note: '이름 없음' } });
  assert.deepEqual(list, [{ id: 'a', name: '가교회' }, { id: 'b', name: '나교회' }]);
});

test('교회 행사 저장: 합계 화면에는 행사·숫자만, 메모는 보고자·관리자에게만', async () => {
  const { acc, call } = setup();
  await acc(anna[0]); await acc(admin[0], 'admin'); await acc('bob@wol.org');
  const month = currentMonthKst();
  const values = Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));
  const entries = [{ churchName: '평택중앙교회', churchId: 'c1', event: '겨울 집회', date: `${month}-12`, students: 40, salvations: 6, dedications: 2, note: '비공개 메모' }];
  assert.equal((await call('POST', anna, { body: { month, scope: 'individual', location: 'mainland', values, churchEntries: entries } })).status, 200);
  const bad = await call('POST', anna, { body: { month, scope: 'individual', location: 'mainland', values, churchEntries: [{ event: '교회 없음', students: 1 }] } });
  assert.equal(bad.status, 400); assert.match(bad.error, /교회 이름/);
  const other = await call('GET', ['bob@wol.org', 'counselor'], { query: `?month=${month}` });
  assert.equal(other.churchEvents.length, 1);
  assert.deepEqual(Object.keys(other.churchEvents[0]).sort(), ['churchId', 'churchName', 'date', 'dedications', 'event', 'location', 'salvations', 'students']);
  assert.equal(JSON.stringify(other).includes('비공개 메모'), false, '다른 사람 화면에는 메모가 없다');
  const mine = await call('GET', anna, { query: `?month=${month}` });
  assert.equal(mine.mine[0].churchEntries[0].note, '비공개 메모');
  const adm = await call('GET', admin, { query: `?month=${month}` });
  assert.equal(adm.rows[0].churchEntries[0].note, '비공개 메모');
});

test('교회 목록 API: 로그인 필요, 설정이 없으면 빈 목록, 캐시가 있으면 Firebase 를 부르지 않는다', async () => {
  const { store, acc } = setup();
  const kv = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); } };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  await acc(anna[0]);
  const req = async who => new Request('https://t.co/api/portal/gospel-churches', { headers: who ? { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]) } : {} });
  assert.equal((await GC.onRequestGet({ env, request: await req(null) })).status, 401);
  const none = await (await GC.onRequestGet({ env, request: await req(anna) })).json();
  assert.deepEqual(none, { churches: [], configured: false });
  await kv.put(GC.CHURCH_CACHE_KEY, JSON.stringify({ list: [{ id: 'c1', name: '평택중앙교회' }] }));
  const cached = await (await GC.onRequestGet({ env: { ...env, FIREBASE_CRS_SERVICE_ACCOUNT: '{"broken":true}' }, request: await req(anna) })).json();
  assert.deepEqual(cached, { churches: [{ id: 'c1', name: '평택중앙교회' }], configured: true });
});

test('연간 보기: 그 해의 모든 달을 더하고 다른 해는 섞이지 않는다 · 미래의 해는 거절', async () => {
  const { store, acc, call } = setup();
  await acc(anna[0]);
  const put = (month, id, location, evangelism, salvation) => store.set(`gospel:rep:${month}:${id}`, JSON.stringify({ id, month, email: 'x@wol.org', scope: 'individual', location, values: { ...Object.fromEntries(GOSPEL_FIELD_IDS.map(k => [k, 0])), evangelism, salvation } }));
  put('2024-12', 'prev', 'mainland', 100, 50);        // 전해
  put('2025-01', 'a', 'mainland', 10, 1);
  put('2025-02', 'b', 'jeju', 20, 2);
  put('2025-03', 'c', 'mainland', 30, 3);
  const y25 = await call('GET', anna, { query: '?view=year&year=2025' });
  assert.equal(y25.view, 'year'); assert.equal(y25.year, '2025');
  assert.deepEqual([y25.ytd.from, y25.ytd.to], ['2025-01', '2025-12']);
  assert.equal(y25.summary.all.evangelism, 60, '2025년 전체 합');
  assert.equal(y25.summary.mainland.evangelism, 40); assert.equal(y25.summary.jeju.evangelism, 20);
  assert.equal(y25.summary.all.salvation, 6); assert.equal(y25.summary.counts.all, 3);
  assert.equal(y25.trend.length, 12, '달마다 한 줄'); assert.equal(y25.trend[1].all.evangelism, 20);
  assert.deepEqual(y25.mine, []); assert.equal('rows' in y25, false); assert.equal('submission' in y25, false, '연간 보기에는 달 단위 화면 데이터가 없다');
  const y24 = await call('GET', anna, { query: '?view=year&year=2024' });
  assert.equal(y24.summary.all.evangelism, 100, '2024년은 12월 보고만 — 2025년이 섞이지 않는다');
  const thisYear = await call('GET', anna, { query: '?view=year' });
  assert.equal(thisYear.year, currentMonthKst().slice(0, 4), 'year 를 안 주면 올해');
  assert.equal((await call('GET', anna, { query: '?view=year&year=2999' })).status, 400, '아직 오지 않은 해');
});

test('집계 저장(캐시): 한 번 계산한 달은 저장해 두고, 보고를 저장하거나 지우면 그 달 저장값을 지운다', async () => {
  const { store, acc, call } = setup();
  await acc(anna[0]);
  const month = '2025-03';
  const put = (id, ev) => store.set(`gospel:rep:${month}:${id}`, JSON.stringify({ id, month, email: 'x@wol.org', scope: 'individual', location: 'mainland', values: { ...Object.fromEntries(GOSPEL_FIELD_IDS.map(k => [k, 0])), evangelism: ev } }));
  put('a', 10);
  const first = await call('GET', anna, { query: '?view=year&year=2025' });
  assert.equal(first.summary.all.evangelism, 10);
  assert.ok(store.has(`gospel:agg:${month}`), '계산한 달의 집계가 저장된다');
  assert.equal(JSON.stringify(JSON.parse(store.get(`gospel:agg:${month}`))).includes('x@wol.org'), false, '저장값에는 이메일 같은 개인정보가 없다');
  put('b', 5);                                         // 우회로 바뀐 데이터는 저장값이 있는 동안 보이지 않는다(= 저장값을 쓴다는 증거)
  assert.equal((await call('GET', anna, { query: '?view=year&year=2025' })).summary.all.evangelism, 10);
  assert.equal((await call('GET', anna, { query: '?view=year&year=2025&fresh=1' })).summary.all.evangelism, 15, 'fresh=1 은 저장값을 건너뛰고 다시 계산');
  // 보고를 저장하면 그 달 저장값이 지워져 곧바로 반영된다
  const cur = currentMonthKst();
  const values = Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0])); values.evangelism = 7;
  assert.equal((await call('POST', anna, { body: { month: cur, scope: 'individual', location: 'jeju', values } })).status, 200);
  assert.equal(store.has(`gospel:agg:${cur}`), false, '저장하면 그 달 저장값이 지워진다');
  const afterSave = await call('GET', anna, { query: '?view=year' });
  assert.equal(afterSave.summary.all.evangelism >= 7, true);
  const mine = (await call('GET', anna, { query: `?month=${cur}` })).mine[0];
  assert.ok(store.has(`gospel:agg:${cur}`), '달 화면을 열면 고른 달 집계도 갱신 저장된다');
  assert.equal((await call('DELETE', anna, { query: `?month=${cur}&id=${mine.id}` })).status, 200);
  assert.equal(store.has(`gospel:agg:${cur}`), false, '지우면 그 달 저장값이 지워진다');
});
