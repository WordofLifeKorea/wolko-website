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

test('개인 보고 항목: 평택 일반 멤버는 개인 전도만, 제주 멤버와 풀타임 선교사는 전도 행사·교회 행사 기록까지', async () => {
  assert.deepEqual(allowedFieldIds('individual', false), ['preEvangelism', 'evangelism', 'salvation', 'literature', 'social']);
  assert.ok(allowedFieldIds('individual', false, true).includes('eeAttendance'));
  assert.ok(!allowedFieldIds('individual', false, true).includes('campCount'), '캠프는 담당자만');
  const t = setup(); await t.acc('amy@wol.org', 'Amy Short', { campus: 'wolko' }); await t.acc('jj@wol.org', 'Jeju Member', { campus: 'jeju' }); await t.acc('anderson@wol.org', 'Jason Anderson');
  const values = { evangelism: 3, eeAttendance: 40, eeSalvations: 2, eeDedications: 1, campCount: 9 };
  const entries = [{ id: 'e1', churchName: '평택중앙교회', event: '집회', date: reportMonth() + '-05', students: 10, salvations: 1, dedications: 0 }];
  const post = who => t.call(G, 'POST', [who, 'counselor'], { body: { month: reportMonth(), location: 'jeju', scope: 'individual', values, churchEntries: entries } });
  const amy = await post('amy@wol.org');
  assert.equal(amy.status, 200); assert.deepEqual([amy.report.values.evangelism, amy.report.values.eeAttendance, amy.report.values.campCount], [3, 0, 0], '평택 일반 멤버: 전도 행사는 저장되지 않는다');
  assert.equal((amy.report.churchEntries || []).length, 0, '교회 행사 기록도 없다');
  const jj = await post('jj@wol.org');
  assert.deepEqual([jj.report.values.eeAttendance, jj.report.values.eeSalvations, jj.report.values.campCount], [40, 2, 0], '제주 멤버: 전도 행사까지(캠프는 아님)');
  assert.equal(jj.report.churchEntries.length, 1, '제주 멤버: 교회 행사 기록');
  const ft = await post('anderson@wol.org');
  assert.deepEqual([ft.report.values.eeAttendance, ft.report.churchEntries.length], [40, 1], '풀타임 선교사: 전도 행사·교회 행사');
  const me = async who => (await t.call(G, 'GET', [who, 'counselor'], { query: `?month=${reportMonth()}` })).me;
  assert.deepEqual([(await me('amy@wol.org')).extended, (await me('jj@wol.org')).extended, (await me('anderson@wol.org')).extended], [false, true, true]);
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

// ── wolkorea1@gmail.com — 임시로 마스터 복구(원복은 MASTER_EQUIVALENT_EMAILS 에서 한 줄 삭제) ──
import * as L from '../functions/api/hub/account-login.js';

async function loginSetup() {
  const t = setup();
  const pw = await H.hashPassword('GmailMaster1!');
  await t.acc('wolkorea1@gmail.com', 'WOLKO', { role: 'master', passwordHash: pw.hash, passwordSalt: pw.salt });
  const login = async (email, password) => L.onRequestPost({ env: t.env, request: new Request('https://wolko.org/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }) });
  return { ...t, login };
}

test('wolkorea1@gmail.com: 로그인되고 마스터 권한(보고 담당자 지정 등)을 쓴다', async () => {
  const t = await loginSetup();
  const res = await t.login('wolkorea1@gmail.com', 'GmailMaster1!');
  const body = await res.json();
  assert.equal(res.status, 200); assert.equal(body.role, 'master');
  assert.equal((await H.parseHubSessionToken('secret', body.hubToken)).role, 'master');
  assert.equal(H.isMasterEmail('wolkorea1@gmail.com'), false, '가입 우회·계정 없이 로그인 특례는 받지 않는다');
  const r = await t.call(R, 'POST', ['wolkorea1@gmail.com', 'counselor'], { path: 'gospel-reporters', body: { emails: [] } });
  assert.equal(r.status, 200, '토큰에 일반 멤버로 적혀 있어도 코드의 목록이 기준');
});

test('wolkorea1@gmail.com: 가입 화면으로는 비밀번호를 덮어쓸 수 없다 (마스터 이메일 admin@wolko.org 도 이미 비밀번호가 있으면 덮어쓰지 못한다)', async () => {
  const t = await loginSetup();
  const real = await H.hashPassword('RealMaster1!');
  await t.acc('admin@wolko.org', 'Real Master', { role: 'master', passwordHash: real.hash, passwordSalt: real.salt });
  const realFetch = globalThis.fetch; globalThis.fetch = async () => ({ ok: true, text: async () => '' });
  const signup = (email, over = {}) => S.onRequestPost({ env: t.env, waitUntil: p => p, request: new Request('https://wolko.org/api/hub/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Attacker', phone: '010-1234-5678', email, password: 'Attacker1!x', campus: 'wolko', requestedRole: 'member', ...over }) }) });
  try {
    for (const email of ['admin@wolko.org', 'wolkorea1@gmail.com']) {
      const res = await signup(email);
      assert.equal(res.status, 409, email);
      const account = await H.getAccount(t.env, email);
      assert.equal(await H.verifyPassword('Attacker1!x', account.passwordHash, account.passwordSalt), false, `${email}: 공격자 비밀번호가 먹히면 안 된다`);
      assert.notEqual(account.name, 'Attacker');
    }
    assert.equal((await t.login('admin@wolko.org', 'RealMaster1!')).status, 200, '진짜 마스터 비밀번호는 그대로');
    // 비밀번호가 없는 상태의 gmail 마스터급 계정도 본인 확인 없이는 누가 정하게 두지 않는다
    await t.acc('wolkorea1@gmail.com', 'WOLKO', { role: 'master', passwordHash: undefined, passwordSalt: undefined });
    assert.equal((await signup('wolkorea1@gmail.com')).status, 409);
    assert.equal((await H.getAccount(t.env, 'wolkorea1@gmail.com')).passwordHash, undefined);
    // 처음 만드는 마스터(계정이 아직 없음)는 예전처럼 비밀번호를 정하고 들어온다
    const first = await signup('admin@wolko.org', { password: 'FirstMaster1!' }); void first;
  } finally { globalThis.fetch = realFetch; }
});

test('원복: MASTER_EQUIVALENT_EMAILS 에서 한 줄을 지우면 계정은 그대로 두고 등급만 일반 멤버로 돌아간다 (이미 받은 토큰도 바로)', async () => {
  const t = await loginSetup();
  const token = (await (await t.login('wolkorea1@gmail.com', 'GmailMaster1!')).json()).hubToken;
  const asMaster = () => t.call(R, 'GET', ['wolkorea1@gmail.com', 'master'], { path: 'gospel-reporters' });
  assert.equal((await asMaster()).status, 200);
  const i = H.MASTER_EQUIVALENT_EMAILS.indexOf('wolkorea1@gmail.com');
  assert.ok(i >= 0);
  H.MASTER_EQUIVALENT_EMAILS.splice(i, 1);                       // 원복
  try {
    assert.equal(H.effectiveRole('wolkorea1@gmail.com', 'master'), 'counselor');
    assert.equal((await H.parseHubSessionToken('secret', token)).role, 'counselor', '이미 받은 토큰도 일반 멤버 권한');
    assert.equal((await asMaster()).status, 403, '마스터 전용 기능은 바로 막힌다');
    assert.equal((await t.login('wolkorea1@gmail.com', 'GmailMaster1!')).status, 200, '계정은 그대로 — 일반 멤버로 로그인');
  } finally { H.MASTER_EQUIVALENT_EMAILS.splice(i, 0, 'wolkorea1@gmail.com'); }
  assert.equal(H.effectiveRole('wolkorea1@gmail.com', 'counselor'), 'master');
});

test('esooy@wol.org 는 단기 사역자지만 늘 보고 담당자다(팀·사역 현황 보고)', async () => {
  const t = setup(); await t.acc('esooy@wol.org', 'Estelle Sooy');
  const month = reportMonth();
  const r = await t.call(G, 'POST', ['esooy@wol.org', 'counselor'], { body: { month, location: 'mainland', scope: 'team', teamName: 'Crew', values: { campCount: 1 } } });
  assert.equal(r.status, 200);
  assert.equal((await t.call(G, 'GET', ['esooy@wol.org', 'counselor'], { query: `?month=${month}` })).me.designated, true);
});
