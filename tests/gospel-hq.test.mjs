import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import * as R from '../functions/api/portal/gospel-reporters.js';
import * as M from '../functions/api/portal/gospel-ministry.js';
import { GOSPEL_SECTIONS, GOSPEL_FIELD_IDS, SNAPSHOT_IDS, allowedFieldIds, mergeSummaries, summarize, emptyTotals, currentMonthKst, reportMonth } from '../functions/lib/gospelStats.js';
import { slimCrsChurches, ministryFromCrs, crsLocation } from '../functions/lib/crsMinistry.js';

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
  const call = async (mod, method, who, { path = 'gospel-stats', query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]);
    const request = new Request(`https://t.co/api/portal/${path}${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const handler = { GET: mod.onRequestGet, POST: mod.onRequestPost, DELETE: mod.onRequestDelete }[method];
    const res = await handler({ env, request });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, env, acc, stats: (m, w, o) => call(G, m, w, o), reporters: (m, w, o) => call(R, m, w, { path: 'gospel-reporters', ...o }), ministry: (m, w, o) => call(M, m, w, { path: 'gospel-ministry', ...o }) };
}
const master = ['admin@wolko.org', 'master'];
const anna = ['anna@wol.org', 'counselor'];
const ben = ['ben@wol.org', 'counselor'];
const month = reportMonth();
const zero = () => Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));

test('본부 양식 항목: 캠프 4 · 전도 행사 3 · 개인 전도(본부 외 영적 대화 표시) · 제자훈련 6 · 지역교회 7', () => {
  const ids = Object.fromEntries(GOSPEL_SECTIONS.map(s => [s.id, s.fields.map(f => f.id)]));
  assert.deepEqual(ids.camps, ['campCount', 'campAttendance', 'campSalvations', 'campDedications']);
  assert.deepEqual(ids.events, ['eeAttendance', 'eeSalvations', 'eeDedications']);
  assert.deepEqual(ids.discipleship, ['bibleInstitute', 'dtc', 'symeE4l', 'school', 'extension', 'conferences']);
  assert.deepEqual(ids.church, ['churchA', 'churchB', 'churchC', 'childrenClubs', 'youthClubs', 'leadershipTraining', 'weeklyClubAttendance']);
  assert.equal(GOSPEL_SECTIONS.flatMap(s => s.fields).find(f => f.id === 'preEvangelism').hq, false);
  assert.equal(new Set(GOSPEL_FIELD_IDS).size, GOSPEL_FIELD_IDS.length, '항목 id 가 겹치지 않는다');
});

test('쓸 수 있는 항목: 개인 전도와 전도 행사는 누구나, 캠프는 담당자의 개인/팀 보고, 제자훈련·지역교회는 담당자의 사역 현황 보고', () => {
  assert.deepEqual(allowedFieldIds('individual', false), ['preEvangelism', 'evangelism', 'salvation', 'literature', 'social', 'eeAttendance', 'eeSalvations', 'eeDedications']);
  assert.ok(allowedFieldIds('team', true).includes('campCount') && !allowedFieldIds('team', true).includes('dtc'));
  assert.ok(allowedFieldIds('ministry', true).includes('dtc') && !allowedFieldIds('ministry', true).includes('evangelism'));
  assert.deepEqual(allowedFieldIds('ministry', false), []);
});

test('담당자가 아니면: 팀·사역 현황 보고는 403, 개인 보고의 캠프·행사·제자훈련 칸은 저장되지 않는다', async () => {
  const t = setup(); await t.acc(anna[0]);
  const base = { month, location: 'mainland' };
  assert.equal((await t.stats('POST', anna, { body: { ...base, scope: 'team', teamName: 'x', values: {} } })).status, 403);
  assert.equal((await t.stats('POST', anna, { body: { ...base, scope: 'ministry', values: {} } })).status, 403);
  const r = await t.stats('POST', anna, { body: { ...base, scope: 'individual', values: { evangelism: 3, campCount: 9, dtc: 5, churchA: 2 } } });
  assert.equal(r.status, 200); assert.equal(r.report.values.evangelism, 3);
  assert.equal(r.report.values.campCount, 0); assert.equal(r.report.values.dtc, 0); assert.equal(r.report.values.churchA, 0);
  const me = await t.stats('GET', anna, { query: `?month=${month}` });
  assert.equal(me.me.designated, false); assert.equal(me.ministry, undefined); assert.equal(me.reporters, undefined);
});

test('마스터가 담당자를 지정하면 그 사람은 팀·사역 현황 보고를 쓸 수 있다 (마스터만 지정·열람)', async () => {
  const t = setup(); await t.acc(anna[0], 'counselor', 'Anna Lee'); await t.acc(ben[0]);
  assert.equal((await t.reporters('GET', anna)).status, 403);
  assert.equal((await t.reporters('POST', anna, { body: { emails: [anna[0]] } })).status, 403);
  const saved = await t.reporters('POST', master, { body: { emails: ['Anna@wol.org', 'anna@wol.org', 'not-an-email'] } });
  assert.deepEqual(saved.reporters, [{ email: 'anna@wol.org', name: 'Anna Lee' }], '대소문자·중복·잘못된 주소를 정리한다');
  assert.ok(saved.candidates.some(c => c.email === 'ben@wol.org'));
  const me = await t.stats('GET', anna, { query: `?month=${month}` });
  assert.equal(me.me.designated, true);
  assert.equal((await t.stats('POST', anna, { body: { month, location: 'mainland', scope: 'team', teamName: 'Camp Crew', values: { campCount: 2, campAttendance: 80 } } })).status, 200);
  assert.equal((await t.stats('GET', master, { query: `?month=${month}` })).me.designated, true, '마스터는 늘 담당자');
  assert.deepEqual((await t.stats('GET', master, { query: `?month=${month}` })).reporters, ['anna@wol.org']);
});

test('사역 현황 보고: 위치마다 한 건을 담당자들이 함께 고치고, 보고 건수에는 세지 않고, 담당자에게만 보인다', async () => {
  const t = setup(); await t.acc(anna[0]); await t.acc(ben[0]);
  await t.reporters('POST', master, { body: { emails: [anna[0], ben[0]] } });
  const post = (who, values, location = 'mainland') => t.stats('POST', who, { body: { month, location, scope: 'ministry', values } });
  const first = await post(anna, { dtc: 12, churchA: 3, churchB: 4, leadershipTraining: 7, conferences: 30, evangelism: 99 });
  assert.equal(first.status, 200); assert.equal(first.report.values.evangelism, 0, '사역 현황에는 개인 전도 칸이 없다');
  const second = await post(ben, { dtc: 15, churchA: 3 });
  assert.equal(second.updated, true, '다른 담당자가 같은 위치를 고치면 덮어쓴다');
  assert.equal(second.report.id, first.report.id);
  await post(ben, { dtc: 5 }, 'jeju');
  const asAnna = await t.stats('GET', anna, { query: `?month=${month}` });
  assert.equal(asAnna.ministry.length, 2);
  assert.equal(asAnna.summary.mainland.dtc, 15); assert.equal(asAnna.summary.jeju.dtc, 5); assert.equal(asAnna.summary.all.dtc, 20);
  assert.equal(asAnna.summary.counts.all, 0, '낸 보고 수에는 세지 않는다'); assert.equal(asAnna.summary.counts.ministry, 2);
  assert.equal(asAnna.mine.length, 0);
  // 담당자가 아닌 사람은 사역 현황 원본을 못 보지만 합계는 본다
  await t.acc('cara@wol.org');
  const asCara = await t.stats('GET', ['cara@wol.org', 'counselor'], { query: `?month=${month}` });
  assert.equal(asCara.ministry, undefined); assert.equal(asCara.summary.all.dtc, 20);
  // 삭제: 담당자는 남이 쓴 사역 현황도 지울 수 있고, 아닌 사람은 못 지운다
  assert.equal((await t.stats('DELETE', ['cara@wol.org', 'counselor'], { query: `?month=${month}&id=${first.report.id}` })).status, 403);
  assert.equal((await t.stats('DELETE', ben, { query: `?month=${month}&id=${first.report.id}` })).status, 200);
});

test('연간 합계: 달말 현재 수(등록 학생·교회 수·클럽)는 더하지 않고 가장 최근 값, 훈련 인원·행사 참석은 더한다', () => {
  assert.ok(['bibleInstitute', 'churchA', 'childrenClubs', 'weeklyClubAttendance'].every(id => SNAPSHOT_IDS.has(id)));
  assert.ok(!SNAPSHOT_IDS.has('leadershipTraining') && !SNAPSHOT_IDS.has('conferences') && !SNAPSHOT_IDS.has('evangelism'));
  const m = (v) => { const t = emptyTotals(); Object.assign(t, v); return { all: t, mainland: t, jeju: emptyTotals(), counts: { all: 1, mainland: 1, jeju: 0, individual: 1, team: 0, ministry: 1 } }; };
  const year = mergeSummaries([m({ bibleInstitute: 20, churchA: 5, leadershipTraining: 4, evangelism: 10 }), m({ bibleInstitute: 22, churchA: 6, leadershipTraining: 3, evangelism: 7 }), m({ evangelism: 1 })]);
  assert.equal(year.all.bibleInstitute, 22, '가장 최근 값'); assert.equal(year.all.churchA, 6);
  assert.equal(year.all.leadershipTraining, 7); assert.equal(year.all.evangelism, 18);
});

test('CRS 연동: 시/도가 제주면 제주, 아니면 평택 — 등급별 교회 수와 그 달 리더십 훈련 인원만 센다(이름은 내보내지 않는다)', () => {
  assert.equal(crsLocation({ region: '제주특별자치도' }), 'jeju'); assert.equal(crsLocation({ region: '경기도' }), 'mainland'); assert.equal(crsLocation({}), 'mainland');
  const slim = slimCrsChurches({
    a: { churchName: '평택교회', region: '경기도', grade: 'A', leaderTraining: { '2026-10': 3, '2026-09': 2 } },
    b: { churchName: '제주교회', region: '제주특별자치도', grade: 'b', leaderTraining: { '2026-10': 5, bad: 9 } },
    c: { churchName: '무등급', region: '서울', grade: 'Z' },
    d: { churchName: '평택B', region: '경기도', grade: 'B' },
  });
  assert.equal(JSON.stringify(slim).includes('교회'), false, '이름은 들어 있지 않다');
  const out = ministryFromCrs(slim, '2026-10');
  assert.deepEqual(out.mainland, { churchA: 1, churchB: 1, churchC: 0, leadershipTraining: 3 });
  assert.deepEqual(out.jeju, { churchA: 0, churchB: 1, churchC: 0, leadershipTraining: 5 });
  assert.equal(ministryFromCrs(slim, '2026-09').mainland.leadershipTraining, 2, '달마다 따로');
});

test('CRS 연동 API: 담당자만, CRS 설정이 없으면 configured:false 와 0', async () => {
  const t = setup(); await t.acc(anna[0]); await t.acc(ben[0]);
  await t.reporters('POST', master, { body: { emails: [anna[0]] } });
  assert.equal((await t.ministry('GET', null, { query: `?month=${month}` })).status, 401);
  assert.equal((await t.ministry('GET', ben, { query: `?month=${month}` })).status, 403);
  const r = await t.ministry('GET', anna, { query: `?month=${month}` });
  assert.equal(r.configured, false); assert.equal(r.crs.mainland.churchA, 0);
  assert.equal((await t.ministry('GET', anna, { query: '?month=oops' })).status, 400);
  // 저장해 둔 목록이 있으면 그것을 쓴다
  t.store.set('gospel:crs-slim', JSON.stringify({ list: [{ location: 'jeju', grade: 'C', leaders: { [month]: 4 } }] }));
  const hit = await t.ministry('GET', anna, { query: `?month=${month}` });
  assert.equal(hit.configured, true); assert.equal(hit.crs.jeju.churchC, 1); assert.equal(hit.crs.jeju.leadershipTraining, 4);
});

test('팀 보고는 누가 냈는지 남고(지정 담당자·관리자·마스터만 봄), 개인 보고자는 제출 현황으로 마스터에게만 보인다', async () => {
  const t = setup(); await t.acc(anna[0], 'counselor', 'Anna Lee'); await t.acc(ben[0], 'counselor', 'Ben Kim'); await t.acc('cara@wol.org', 'counselor', 'Cara Park'); await t.acc('hkim3@wol.org', 'admin', 'Adm');
  await t.reporters('POST', master, { body: { emails: [anna[0], ben[0]] } });
  await t.stats('POST', anna, { body: { month, location: 'mainland', scope: 'team', teamName: 'Camp Crew', values: { campCount: 1 } } });
  await t.stats('POST', ben, { body: { month, location: 'jeju', scope: 'ministry', values: { dtc: 3 } } });
  await t.stats('POST', ['cara@wol.org', 'counselor'], { body: { month, location: 'mainland', scope: 'individual', values: { evangelism: 2 } } });

  const asBen = await t.stats('GET', ben, { query: `?month=${month}` });
  const team = asBen.teamReports.find(r => r.scope === 'team');
  assert.equal(team.reporterName, 'Anna Lee'); assert.equal(team.reporterEmail, 'anna@wol.org'); assert.equal(team.teamName, 'Camp Crew');
  assert.equal(asBen.teamReports.find(r => r.scope === 'ministry').reporterName, 'Ben Kim');
  assert.equal(asBen.teamReports.length, 2, '개인 보고는 이 목록에 없다');
  assert.equal(JSON.stringify(asBen).includes('Cara'), false, '개인 보고자는 보고 담당자에게도 안 보인다');
  const master_ = await t.stats('GET', master, { query: `?month=${month}` });
  const cara = master_.submission.reports.find(r => r.name === 'Cara Park');
  assert.equal(cara.scope, 'individual'); assert.equal(cara.values.evangelism, 2); assert.equal(cara.email, 'cara@wol.org');
  assert.deepEqual(master_.submission.reports.map(r => r.scope).sort(), ['individual', 'ministry', 'team'], '개인·팀·사역 현황 보고가 모두 나온다');

  for (const who of [['hkim3@wol.org', 'admin'], master]) assert.equal((await t.stats('GET', who, { query: `?month=${month}` })).teamReports.length, 2);
  const asCara = await t.stats('GET', ['cara@wol.org', 'counselor'], { query: `?month=${month}` });
  assert.equal(asCara.teamReports, undefined); assert.equal(JSON.stringify(asCara).includes('Anna'), false);
  // 저장된 개인 보고에는 보고자 정보가 없다
  const stored = [...t.store.entries()].filter(([k]) => k.startsWith('gospel:rep:')).map(([, v]) => JSON.parse(v)).find(r => r.scope === 'individual');
  assert.equal(stored.reporterName, undefined); assert.equal(stored.reporterEmail, undefined);
});

test('복음 통계 화면 스크립트: render() 가 부르는 함수와 id 가 모두 있고, 월별이 기본이며, MRIC 는 새 창 버튼이고, 캠프 집계에 별도 버튼이 없다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../public/gospel-stats.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../src/pages/portal/gospel-stats/index.astro', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('  function render() {'), src.indexOf('  /** 교회별 행사'));
  const called = [...body.matchAll(/\b(render[A-Z]\w*)\(\)/g)].map(m => m[1]);
  assert.ok(called.includes('renderTeamReports') && called.includes('renderReporters'));
  for (const name of new Set(called)) assert.match(src, new RegExp(`function ${name}\\(`), `${name} 가 정의돼 있다`);
  // 코드가 $('id') 로 찾는 요소는 페이지에 있어야 한다(없으면 스크립트가 시작하다 멈춘다)
  for (const id of new Set([...src.matchAll(/\$\('([A-Za-z]\w*)'\)/g)].map(m => m[1]))) {
    if (['fMonth', 'fTeam', 'fSave', 'fWarn', 'fDelete', 'crsNote', 'churchRows', 'churchTotal', 'churchApply', 'churchSec', 'gsChurchList', 'repInput', 'fMonthSel'].includes(id) || /^(f_|ce_)/.test(id)) continue;   // 폼·표를 그릴 때 만들어지는 요소
    assert.ok(html.includes(`id="${id}"`), `#${id} 가 페이지에 있다`);
  }
  assert.match(src, /sessionStorage\.getItem\('gsView'\) === 'year' \? 'year' : 'month'/, '월별이 기본');
  assert.match(html, /id="mricBtn"/);
  assert.match(src, /window\.open\('\/portal\/gospel-stats\/mric\//);
  assert.doesNotMatch(src + html, /hqCopyAll|data-copy|copyText|id="hqWrap"|data-camp-scope|gospel-flip/);
});

test('MRIC 새 창 페이지: 월·위치(통합/평택/제주)를 받아 MRIC 입력 화면 순서로 보여 준다', async () => {
  const { readFileSync } = await import('node:fs');
  const js = readFileSync(new URL('../public/gospel-mric.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../src/pages/portal/gospel-stats/mric/index.astro', import.meta.url), 'utf8');
  for (const id of new Set([...js.matchAll(/\$\('([A-Za-z]\w*)'\)/g)].map(m => m[1]))) assert.ok(html.includes(`id="${id}"`), `#${id}`);
  for (const title of ['GOSPEL REACH', 'DISCIPLESHIP', 'LOCAL CHURCH MINISTRIES']) assert.ok(js.includes(title));
  assert.match(js, /qs\.get\('month'\)/); assert.match(js, /qs\.get\('place'\)/);
  assert.match(html, /data-place="all"[\s\S]*data-place="mainland"[\s\S]*data-place="jeju"/);
});

test('복음 통계 CSS: 중괄호가 짝이 맞는다 (하나가 빠지면 그 뒤 규칙이 전부 무시된다)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/gospel-stats.css', import.meta.url), 'utf8');
  let depth = 0;
  for (const ch of css) { depth += (ch === '{') - (ch === '}'); assert.ok(depth >= 0, '닫는 중괄호가 더 많다'); }
  assert.equal(depth, 0);
});

test('복음 통계 카드 그래프: 가로 막대 대신 도넛(원형) — 조각은 합이 100이 되는 pathLength 기준이고 이름·숫자 목록이 함께 나온다', async () => {
  const { readFileSync } = await import('node:fs');
  const js = readFileSync(new URL('../public/gospel-charts.js', import.meta.url), 'utf8');
  assert.match(js, /class="gc-donutsvg"/); assert.match(js, /pathLength="100"/);
  assert.doesNotMatch(js, /gc-track/);
  // 조각 길이 계산(복음 들은 인원 6 / 21 / 30): 모두 더하면 100 - 간격
  const total = 57, gap = 1.6, lens = [6, 21, 30].map(v => v / total * 100 - gap);
  assert.ok(Math.abs(lens.reduce((a, b) => a + b, 0) - (100 - 3 * gap)) < 1e-9);
});

test('복음 통계 숫자 카드 세 장은 같은 구조(라벨 · 숫자 · 도넛)라 높이가 같다 — 헌신도 캠프/월코 행사 도넛을 가진다, 참석 인원 카드는 없다', async () => {
  const { readFileSync } = await import('node:fs');
  const stats = readFileSync(new URL('../public/gospel-stats.js', import.meta.url), 'utf8');
  const charts = readFileSync(new URL('../public/gospel-charts.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/gospel-stats.css', import.meta.url), 'utf8');
  assert.match(stats, /'kDedTip', 'ded'\]\];/); assert.doesNotMatch(stats, /'kReachTip', 'reach'\]/);
  assert.match(charts, /ded: two\(\['campDedications', 'eeDedications'\]\)/);
  assert.match(charts, /reach: two\(\['campAttendance', 'eeAttendance'\]\)/);
  assert.match(css, /\.gs-kpi > span \{ min-height: 2\.9em/, '라벨 두 줄 자리를 늘 잡아 숫자 높이가 같다');
});

test('MRIC 창: 연·월을 누르면 연·월 선택기(일 없음)가 열리고, 좁은 화면에서도 글자가 겹치거나 접히지 않도록 CSS 가 막아 둔다', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../src/pages/portal/gospel-stats/mric/index.astro', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../public/gospel-mric.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/gospel-stats.css', import.meta.url), 'utf8');
  assert.match(html, /gospel-monthpick\.js/); assert.doesNotMatch(html, /data-cal-jump|mricPick/);
  assert.match(js, /GospelMonthPick\.open\(\$\('mricMonth'\)/);
  assert.match(js, /mode: 'month'/);
  // 도넛 옆 목록은 읽을 수 있는 폭 아래로 줄지 않고(아래 줄로 내려간다), 이름은 숫자를 덮지 않고 말줄임 처리
  assert.match(css, /\.gc-donutbox \.gc-legend \{[^}]*min-width: 128px/);
  assert.match(css, /\.gc-donutbox \.gc-legend span \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/);
  // MRIC 헤더의 30px 고정 규칙이 연·월 버튼에 적용되지 않는다
  assert.match(css, /\.gs-mricmonth \.gs-mricmonthbtn \{[^}]*width: auto !important/);
});

test('camp auto-count, church events and team report history are folded closed by default', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/gospel-stats/index.astro', import.meta.url), 'utf8');
  for (const id of ['campAuto', 'churchStats', 'teamBox']) {
    const fold = new RegExp(`<section class="log-panel gs-fold"[^>]*>\\s*<details>[\\s\\S]*?id="${id}"`);
    assert.match(page, fold, `${id} sits inside a closed <details> fold`);
  }
  assert.doesNotMatch(page, /<details[^>]*\sopen[\s>]/, 'no fold starts open');
  assert.match(page, /<section class="log-panel gs-fold" id="teamWrap" hidden>/, 'team report fold keeps its hidden-for-non-reporters switch');
});

test('열린 달(보고하는 달·이번 달)의 사역 현황은 CRS 지금 값으로 세고, 지난 달은 저장값을 쓰며, CRS 를 못 읽으면 저장값을 쓴다', async () => {
  const { shiftMonth } = await import('../functions/lib/gospelStats.js');
  const t = setup(); await t.acc(anna[0], 'counselor', 'Anna');
  await t.reporters('POST', master, { body: { emails: [anna[0]] } });
  const seed = list => t.store.set('gospel:crs-slim', JSON.stringify({ list }));
  const church = (location, grade, leaders = {}) => ({ location, grade, leaders });
  const view = async m => (await t.stats('GET', master, { query: `?month=${m}` })).summary;
  const old = shiftMonth(month, -3);

  // 사역 현황 보고가 아직 없어도 CRS 숫자는 센다
  seed([church('mainland', 'A', { [month]: 3 }), church('mainland', 'B'), church('jeju', 'C')]);
  let s = await view(month);
  assert.deepEqual([s.mainland.churchA, s.mainland.churchB, s.mainland.churchC, s.mainland.leadershipTraining], [1, 1, 0, 3]);
  assert.deepEqual([s.jeju.churchC, s.all.churchA + s.all.churchB + s.all.churchC], [1, 3]);

  // 저장된 보고에 옛 숫자가 있어도 CRS 지금 값이 이긴다 — 등급을 바꾸면 바로 반영
  await t.stats('POST', anna, { body: { month, location: 'mainland', scope: 'ministry', values: { churchA: 9, dtc: 4 } } });
  assert.equal((await view(month)).mainland.churchA, 1, '저장값 9 가 아니라 CRS 값');
  assert.equal((await view(month)).mainland.dtc, 4, 'CRS 와 연결되지 않은 항목은 저장값 그대로');
  seed([church('mainland', 'A'), church('mainland', 'A'), church('mainland', 'B')]);
  assert.equal((await view(month)).mainland.churchA, 2, 'CRS 에서 등급을 바꾸면 바로 반영');

  // 지난 달은 저장값을 그대로 쓴다(CRS 에는 등급 이력이 없다)
  await t.stats('POST', anna, { body: { month: old, location: 'mainland', scope: 'ministry', values: { churchA: 7 } } });
  assert.equal((await view(old)).mainland.churchA, 7);

  // CRS 를 읽을 수 없으면 저장값으로 돌아간다
  t.store.delete('gospel:crs-slim');
  assert.equal((await view(month)).mainland.churchA, 9);
});

test('항목별 통계 표: 설명은 이름 아래에 그대로 보이고, ⓘ 에는 월코 정의서(2026-10-16)의 각주만 들어간다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../public/gospel-stats.js', import.meta.url), 'utf8');
  assert.match(src, /gs-itemdesc/, '설명은 표 칸 안에 바로 나온다');
  assert.match(src, /var extra = tx\(f\.note\)/, 'ⓘ 문구는 각주(note)다');
  assert.doesNotMatch(src, /infoBtn\(tx\(f\.label\)\.split/, '설명을 다시 ⓘ 안에 넣지 않는다');
  assert.doesNotMatch(src, /tipCrs|tipSnap|tipNotHq|tipCamp/, '정의서에 없는 문구는 넣지 않는다');
  const withNote = GOSPEL_SECTIONS.flatMap(sec => sec.fields).filter(f => f.note).map(f => f.id).sort();
  assert.deepEqual(withNote, ['campDedications', 'eeAttendance', 'eeDedications', 'evangelism', 'preEvangelism'], '각주가 달린 항목만 ⓘ');
  const note = id => GOSPEL_SECTIONS.flatMap(sec => sec.fields).find(f => f.id === id).note;
  assert.match(note('evangelism').en, /‘Gospel conversation’ must clearly communicate #1 and #2/);
  assert.match(note('eeAttendance').en, /C\. Exception – Assisting Others/);
  assert.match(note('campDedications').en, /commits their whole life to the LORD \(ROM 12:1-2\)/);
  for (const id of withNote) assert.ok(note(id).ko && note(id).en, `${id} 는 한국어·영어 각주가 모두 있다`);
});
