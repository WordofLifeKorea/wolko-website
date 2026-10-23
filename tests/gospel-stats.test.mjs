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
