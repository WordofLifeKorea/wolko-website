import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import * as H from '../functions/lib/hubAccounts.js';
import * as S from '../functions/api/hub/signup.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import * as R from '../functions/api/portal/gospel-reporters.js';
import * as X from '../functions/api/portal/gospel-exempt.js';
import { personsOf, rosterKeys, matchesMissionary, resetMissionaryCache } from '../functions/lib/fulltimeMissionaries.js';
import { allowedFieldIds, reportMonth } from '../functions/lib/gospelStats.js';

// 실제 인원 소개(src/content/team)에서 풀타임 선교사 명단을 읽는다 — 홈페이지 빌드가 만드는 /team-roster.json 과 같은 규칙
function teamRoster() {
  const dir = new URL('../src/content/team/', import.meta.url);
  const field = (text, key) => (new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm').exec(text) || [])[1]?.trim() || '';
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => readFileSync(new URL(f, dir), 'utf8'))
    .filter(text => field(text, 'category') === 'missionary' && field(text, 'active') !== 'false')
    .map(text => ({ nameEn: field(text, 'name_en'), nameKo: field(text, 'name_ko') }));
}

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const roster = teamRoster();
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'rk', ASSETS: { fetch: async () => new Response(JSON.stringify(roster)) } };
  resetMissionaryCache();
  const acc = (email, name, extra = {}) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role: 'counselor', status: 'approved', passwordHash: 'h', passwordSalt: 's', campus: 'wolko', ...extra }));
  const call = async (mod, method, who, { path = 'gospel-stats', query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]) };
    const res = await { GET: mod.onRequestGet, POST: mod.onRequestPost }[method]({ env, request: new Request(`https://t.co/api/portal/${path}${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }) });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, env, acc, roster, call };
}

test('인원 소개 명단: 풀타임 선교사(missionary)만, 단기 사역자(stw)는 빠진다', () => {
  const names = teamRoster().map(r => r.nameEn);
  assert.ok(names.includes('Jacob & Crystal Morse') && names.includes('Samuel Song') && names.includes('Steve & Rhonda Nicholes'));
  assert.ok(!names.some(n => /Estelle Sooy|Hyunji Im|Zach Frazier|Joanna Jung|Aiden Park/.test(n)), '단기 사역자는 없다');
});

test('이름 나누기: 부부는 두 사람으로, 성이 한 사람에게만 있으면 이어받는다', () => {
  assert.deepEqual(personsOf('Jacob & Crystal Morse'), [['jacob', 'morse'], ['crystal', 'morse']]);
  assert.deepEqual(personsOf('Namkyu Baek & Joanna'), [['namkyu', 'baek'], ['joanna', 'baek']]);
  assert.deepEqual(personsOf('Byungkook Chae & Miyoung Kim'), [['byungkook', 'chae'], ['miyoung', 'kim']]);
  assert.deepEqual(personsOf('채병국 & 김미영'), [['채병국'], ['김미영']]);
  assert.deepEqual(personsOf('제이콥 & 크리스탈 몰스'), [['제이콥', '몰스'], ['크리스탈', '몰스']]);
  assert.deepEqual(personsOf('Samuel Song'), [['samuel', 'song']]);
});

test('계정 맞춰 보기: 영어·한글 이름, 순서·띄어쓰기 무시, 이메일 앞부분, 같은 이름의 단기 사역자는 제외', () => {
  const keys = rosterKeys(teamRoster());
  const yes = [
    { name: 'Jacob Morse', email: 'x@wol.org' }, { name: 'Crystal Morse', email: 'x@wol.org' }, { name: 'Morse Jacob', email: 'x@wol.org' },
    { name: 'JACOB  MORSE', email: 'x@wol.org' }, { name: '', email: 'jacobmorse@wol.org' }, { name: '', email: 'samuelsong@wol.org' },
    { name: 'Joanna Baek', email: 'x@wol.org' }, { name: '채병국', email: 'x@wol.org' }, { name: '김환규', email: 'x@wol.org' }, { name: '제이슨 앤더슨', email: 'x@wol.org' },
    { name: 'Jeremy Rodgers', email: 'x@wol.org' }, { name: 'HwanKyu Kim', email: 'x@wol.org' }, { name: '송승현', email: 'x@wol.org' },
  ];
  for (const a of yes) assert.equal(matchesMissionary(keys, a), true, JSON.stringify(a));
  const no = [
    { name: 'Joanna Jung', email: 'joanna@wol.org' }, { name: 'Estelle Sooy', email: 'esooy@wol.org' }, { name: 'Hyunji Im', email: 'hlim@wol.org' },
    { name: 'Jacob', email: 'j@wol.org' }, { name: 'Morse', email: 'm@wol.org' }, { name: '', email: 'a@wol.org' }, { name: '홍길동', email: 'hong@wol.org' },
  ];
  for (const a of no) assert.equal(matchesMissionary(keys, a), false, JSON.stringify(a));
  assert.equal(matchesMissionary(new Set(), { name: 'Jacob Morse' }), false, '명단이 없으면 아무도 풀타임이 아니다');
});

test('풀타임 선교사는 직접 지정하지 않아도 팀 보고를 쓰고, 단기 사역자는 못 쓴다', async () => {
  const t = setup();
  await t.acc('anderson@wol.org', 'Jason Anderson'); await t.acc('estelle@wol.org', 'Estelle Sooy', { campus: 'wolko' });
  const month = reportMonth();
  const team = who => t.call(G, 'POST', who, { body: { month, location: 'mainland', scope: 'team', teamName: 'Crew', values: { campCount: 1 } } });
  assert.equal((await team(['anderson@wol.org', 'counselor'])).status, 200, '풀타임 선교사');
  assert.equal((await team(['estelle@wol.org', 'counselor'])).status, 403, '단기 사역자');
  const me = await t.call(G, 'GET', ['anderson@wol.org', 'counselor'], { query: `?month=${month}` });
  assert.equal(me.me.designated, true); assert.ok(Array.isArray(me.teamReports), '팀 보고 내역을 본다');
  // 명단을 못 읽으면 직접 지정한 사람만 남는다
  t.env.ASSETS = { fetch: async () => new Response('x', { status: 500 }) }; resetMissionaryCache();
  assert.equal((await team(['anderson@wol.org', 'counselor'])).status, 403, '명단 없음 → 풀타임 판정 안 함');
});

test('전도 행사 칸은 모든 사람에게 열려 있다(개인 보고에도)', async () => {
  assert.deepEqual(allowedFieldIds('individual', false), ['preEvangelism', 'evangelism', 'salvation', 'literature', 'social', 'eeAttendance', 'eeSalvations', 'eeDedications']);
  assert.ok(!allowedFieldIds('individual', false).includes('campCount'), '캠프는 담당자만');
  const t = setup(); await t.acc('amy@wol.org', 'Amy Short');
  const r = await t.call(G, 'POST', ['amy@wol.org', 'counselor'], { body: { month: reportMonth(), location: 'jeju', scope: 'individual', values: { evangelism: 3, eeAttendance: 40, eeSalvations: 2, eeDedications: 1, campCount: 9 } } });
  assert.equal(r.status, 200);
  assert.deepEqual([r.report.values.eeAttendance, r.report.values.eeSalvations, r.report.values.eeDedications, r.report.values.campCount], [40, 2, 1, 0]);
});

test('Jacob Morse: 마스터와 같은 권한 — 보고 담당자 지정·보고 제외·제출 현황', async () => {
  const t = setup(); await t.acc('jacobmorse@wol.org', 'Jacob Morse', { role: 'admin' }); await t.acc('bob@wol.org', 'Bob');
  const jacob = ['jacobmorse@wol.org', 'admin'];   // 토큰에 admin 으로 적혀 있어도 코드의 목록이 기준
  assert.equal((await t.call(R, 'POST', jacob, { path: 'gospel-reporters', body: { emails: ['bob@wol.org'] } })).status, 200, '보고 담당자 지정은 마스터만 → Jacob 도 가능');
  assert.equal((await t.call(X, 'POST', jacob, { path: 'gospel-exempt', body: { email: 'bob@wol.org', exempt: true } })).status, 200, '보고 제외');
  const stats = await t.call(G, 'GET', jacob, { query: `?month=${reportMonth()}` });
  assert.equal(stats.me.role, 'master'); assert.ok(stats.submission, '제출 현황');
  assert.equal(stats.me.designated, true);
});

test('Jacob 계정은 마스터 특례(가입 화면으로 비밀번호 덮어쓰기)를 받지 않는다', async () => {
  const t = setup(); await t.acc('jacobmorse@wol.org', 'Jacob Morse', { role: 'admin', passwordHash: 'ORIGINAL', passwordSalt: 'S' });
  const realFetch = globalThis.fetch; globalThis.fetch = async () => ({ ok: true, text: async () => '' });
  try {
    for (const requestedRole of ['member', 'admin']) {
      const res = await S.onRequestPost({ env: t.env, waitUntil: p => p, request: new Request('https://wolko.org/api/hub/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Attacker', phone: '010-1234-5678', email: 'jacobmorse@wol.org', password: 'Passw0rd!x', campus: 'wolko', requestedRole }) }) });
      const account = await H.getAccount(t.env, 'jacobmorse@wol.org');
      assert.equal(account.passwordHash, 'ORIGINAL', `${requestedRole}: 남이 가입 화면으로 Jacob 의 비밀번호를 바꿀 수 없다 (응답 ${res.status})`);
      assert.equal(account.name, 'Jacob Morse');
    }
  } finally { globalThis.fetch = realFetch; }
  assert.equal(H.isMasterEmail('jacobmorse@wol.org'), false);
});

test('보고 담당자 화면(마스터): 풀타임 선교사로 자동 판정된 계정 목록(auto)을 함께 준다', async () => {
  const t = setup();
  await t.acc('admin@wolko.org', 'Master', { role: 'master' });
  await t.acc('jacobmorse@wol.org', 'Jacob Morse'); await t.acc('anderson@wol.org', '제이슨 앤더슨'); await t.acc('estelle@wol.org', 'Estelle Sooy');
  const r = await t.call(R, 'GET', ['admin@wolko.org', 'master'], { path: 'gospel-reporters' });
  assert.deepEqual(r.auto.map(p => p.email).sort(), ['anderson@wol.org', 'jacobmorse@wol.org']);
  assert.ok(!r.auto.some(p => p.email === 'estelle@wol.org'), '단기 사역자는 자동 담당자가 아니다');
  assert.deepEqual(r.reporters, [], '직접 지정한 담당자와는 따로 보여 준다');
});
