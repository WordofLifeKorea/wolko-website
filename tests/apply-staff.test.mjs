import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as H from '../functions/lib/hubAccounts.js';
import * as ACC from '../functions/api/apply/account.js';
import * as STAFF from '../functions/api/apply/staff.js';
import * as REF from '../functions/api/apply/reference.js';
import * as A from '../functions/api/portal/serve-applications.js';
import { makeTempPassword, normalizeTempPassword, ACCOUNT_IDLE_DAYS } from '../functions/lib/applicantAccount.js';

const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

function setup() {
  const store = new Map(), ttl = new Map(), mails = [];
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v, o) { store.set(k, v); ttl.set(k, o?.expirationTtl); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x', SERVE_APP_KEY: KEY };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (String(url).includes('resend')) mails.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); };
  const call = async (mod, method, { body, token, query = '', ip = '1.1.1.1' } = {}) => {
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
    if (token) headers.Authorization = 'Bearer ' + token;
    const req = new Request('https://wolko.org/api/apply/x' + query, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const fn = { GET: mod.onRequestGet, POST: mod.onRequestPost, PUT: mod.onRequestPut }[method];
    const res = await fn({ env, request: req });
    return { ...(await res.json()), status: res.status };
  };
  const portal = async (query) => {
    const req = new Request('https://wolko.org/api/portal/serve-applications' + query, { headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', 'admin@wolko.org', 'master') } });
    const res = await A.onRequestGet({ env, request: req });
    return { ...(await res.json()), status: res.status };
  };
  const passwordFrom = mail => /letter-spacing:\.12em[^>]*>([A-Z0-9-]{9})</.exec(mail.html)[1];
  const signIn = async (email = 'anna@x.com') => {
    await call(ACC, 'POST', { body: { action: 'issue', email, name: 'Anna Lee', lang: 'en' } });
    const pw = passwordFrom(mails.filter(m => m.to[0] === email).at(-1));
    return call(ACC, 'POST', { body: { action: 'login', email, password: pw.toLowerCase().replace('-', '') } });
  };
  return { env, store, ttl, mails, call, portal, signIn, passwordFrom, restore: () => { globalThis.fetch = realFetch; } };
}

const FULL = {
  prefix: 'Ms.', firstName: 'Anna', lastName: 'Lee', gender: 'female', birthDate: '1995-04-12', phone: '010-1234-5678', email: 'someone-else@x.com',
  maritalStatus: 'single', divorced: 'no', criminal: 'no', abuse: 'no', hasChildren: 'no', occupation: 'Teacher', heardFrom: 'friend',
  spiritualHabits: 'daily', testimony: 'My testimony', serviceHistory: 'youth group', gifts: 'teaching', servingWays: 'camp', education: 'BA',
  health: 'SECRET-HEALTH', allergies: 'none',
  ref1FirstName: 'Paul', ref1LastName: 'Kim', ref1NameKo: '김바울', ref1Relationship: 'Pastor', ref1Email: 'pastor@x.com', ref1Phone: '010', ref1Years: '5',
  ref2FirstName: 'Mary', ref2LastName: 'Park', ref2NameKo: '박마리아', ref2Relationship: 'Friend', ref2Email: 'mary@x.com', ref2Phone: '010', ref2Years: '3',
};
const ANSWERS = {
  capacity: 'pastor', yearsKnown: '3-5', churchMember: 'yes',
  rSpiritual: 'excellent', rCharacter: 'excellent', rYouth: 'good', rTeam: 'good', rReliable: 'excellent', rTeachable: 'good',
  strengths: 'Faithful', growth: 'Patience', concern: 'no', recommendation: 'highly',
  refName: 'Paul Kim', refTitle: 'Senior Pastor', refOrg: 'Grace Church', refPhone: '010', certify: true, signature: 'Paul Kim',
};

test('임시 비밀번호: 헷갈리는 글자 없이 XXXX-XXXX, 입력은 대시·대소문자 무시', () => {
  for (let i = 0; i < 50; i++) assert.match(makeTempPassword(), /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  assert.equal(normalizeTempPassword(' ab3d-ef9h '), 'AB3DEF9H');
});

test('임시 계정: 메일로 받은 비밀번호로 로그인, 계정·작성 내용은 30일 기한(로그인하면 다시 30일)', async () => {
  const t = setup();
  try {
    const login = await t.signIn();
    assert.equal(login.status, 200);
    assert.ok(login.token);
    assert.equal(login.account.email, 'anna@x.com');
    assert.equal(t.ttl.get('apply:acct:anna@x.com'), ACCOUNT_IDLE_DAYS * 86400);
    assert.ok(!t.store.get('apply:acct:anna@x.com').includes(t.passwordFrom(t.mails[0])), '비밀번호 평문은 저장하지 않는다');

    // 작성 중인 내용 저장 → 암호화 → 다시 로그인하면 그대로
    const put = await t.call(ACC, 'PUT', { token: login.token, body: { values: { ...FULL, bogus: 'x' }, step: 3 } });
    assert.equal(put.status, 200);
    assert.ok(!t.store.get('apply:draft:anna@x.com').includes('SECRET-HEALTH'));
    assert.equal(t.ttl.get('apply:draft:anna@x.com'), ACCOUNT_IDLE_DAYS * 86400);
    const me = await t.call(ACC, 'GET', { token: login.token });
    assert.equal(me.draft.step, 3);
    assert.equal(me.draft.values.health, 'SECRET-HEALTH');
    assert.equal(me.draft.values.email, 'anna@x.com', '지원서 이메일은 로그인 이메일로 고정');
    assert.equal(me.draft.values.bogus, undefined);

    // 세션 없이는 아무것도 못 한다
    assert.equal((await t.call(ACC, 'GET', {})).status, 401);
    assert.equal((await t.call(ACC, 'PUT', { token: 'x'.repeat(43), body: { values: {} } })).status, 401);

    // 로그아웃하면 그 토큰은 끝
    await t.call(ACC, 'POST', { token: login.token, body: { action: 'logout' } });
    assert.equal((await t.call(ACC, 'GET', { token: login.token })).status, 401);
  } finally { t.restore(); }
});

test('임시 계정: 틀린 비밀번호 5번이면 잠금, 새 비밀번호를 받으면 예전 것은 못 쓴다, 가입 여부는 알려 주지 않는다', async () => {
  const t = setup();
  try {
    await t.call(ACC, 'POST', { body: { action: 'issue', email: 'anna@x.com', lang: 'en' } });
    const first = t.passwordFrom(t.mails[0]);
    for (let i = 0; i < 4; i++) assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'anna@x.com', password: 'WRONG-PASS' } })).status, 401);
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'anna@x.com', password: 'WRONG-PASS' } })).status, 429);
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'anna@x.com', password: first } })).status, 429, '잠긴 동안은 맞는 비밀번호도 거절');

    await t.call(ACC, 'POST', { body: { action: 'issue', email: 'anna@x.com', lang: 'en' } });   // 새로 받으면 잠금도 풀린다
    const second = t.passwordFrom(t.mails.at(-1));
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'anna@x.com', password: first } })).status, 401);
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'anna@x.com', password: second } })).status, 200);

    // 없는 계정 로그인도 같은 답, 함정 칸을 채우면 메일을 보내지 않는다, 같은 이메일로 1시간에 3번까지
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'login', email: 'nobody@x.com', password: 'AAAA-BBBB' } })).status, 401);
    const before = t.mails.length;
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'issue', email: 'bot@x.com', website: 'http://spam' } })).status, 200);
    assert.equal(t.mails.length, before);
    await t.call(ACC, 'POST', { body: { action: 'issue', email: 'anna@x.com' } });
    assert.equal((await t.call(ACC, 'POST', { body: { action: 'issue', email: 'anna@x.com' } })).status, 429);
  } finally { t.restore(); }
});

test('제출: 로그인해야 하고, 저장 → 추천인 2명에게 메일 → 작성 내용 삭제 → 다시 제출 못 함 → 진행 상황 보기', async () => {
  const t = setup();
  try {
    assert.equal((await t.call(STAFF, 'POST', { body: { lang: 'en', values: FULL, consent: true } })).status, 401);
    const { token } = await t.signIn();
    await t.call(ACC, 'PUT', { token, body: { values: FULL, step: 2 } });

    assert.equal((await t.call(STAFF, 'POST', { token, body: { lang: 'en', values: FULL } })).status, 400, '동의 없이는 못 낸다');
    const own = await t.call(STAFF, 'POST', { token, body: { lang: 'en', values: { ...FULL, ref2Email: 'anna@x.com' }, consent: true } });
    assert.deepEqual(own.missing, ['ref2Email'], '추천인 이메일이 본인 이메일이면 안 된다');

    const res = await t.call(STAFF, 'POST', { token, body: { lang: 'en', values: FULL, consent: true } });
    assert.equal(res.status, 200);
    assert.match(res.ref, /^WOLKO-\d{4}-[A-Z0-9]{5}$/);
    assert.deepEqual(res.references.map(r => r.status), ['sent', 'sent']);
    const refMails = t.mails.filter(m => /Reference request/.test(m.subject));
    assert.deepEqual(refMails.map(m => m.to[0]).sort(), ['mary@x.com', 'pastor@x.com']);
    assert.equal(t.store.has('apply:draft:anna@x.com'), false);

    const app = [...t.store.entries()].find(([k]) => k.startsWith('serve:app:'))[1];
    assert.equal(JSON.parse(app).values.email, 'anna@x.com', '저장된 이메일은 로그인 이메일');
    assert.ok(!app.includes('SECRET-HEALTH'));

    assert.equal((await t.call(STAFF, 'POST', { token, body: { lang: 'en', values: FULL, consent: true } })).status, 409);
    assert.equal((await t.call(ACC, 'PUT', { token, body: { values: FULL } })).status, 409);
    const me = await t.call(ACC, 'GET', { token });
    assert.equal(me.draft, null);
    assert.equal(me.account.submitted, true);
    assert.equal(me.application.refNo, res.ref);
    assert.equal(me.application.stage, 'received');
    assert.deepEqual(me.application.references.map(r => [r.n, r.status]), [[1, 'sent'], [2, 'sent']]);
    assert.ok(!JSON.stringify(me).includes('pastor@x.com'), '추천인 이메일은 지원자 화면에 다시 보내지 않는다');
  } finally { t.restore(); }
});

test('추천서: 메일 링크로 열고 한 번만 제출, 답변은 암호화 · 포탈과 지원자 진행 상황에 반영', async () => {
  const t = setup();
  try {
    const { token } = await t.signIn();
    await t.call(STAFF, 'POST', { token, body: { lang: 'en', values: FULL, consent: true } });
    const link = /\/reference\/\?t=([A-Za-z0-9_-]+)/.exec(t.mails.find(m => m.to[0] === 'pastor@x.com').html)[1];

    assert.equal((await t.call(REF, 'GET', { query: '?t=nope' })).status, 404);
    const form = await t.call(REF, 'GET', { query: `?t=${link}` });
    assert.equal(form.status, 200);
    assert.match(form.applicant, /Anna Lee/);
    assert.equal(form.n, 1);
    assert.ok(form.sections.some(s => s.fields.some(f => f.type === 'rating')));

    const missing = await t.call(REF, 'POST', { body: { t: link, answers: { ...ANSWERS, certify: false } } });
    assert.ok(missing.missing.includes('certify'));
    assert.equal((await t.call(REF, 'POST', { body: { t: link, answers: ANSWERS } })).status, 200);
    assert.equal((await t.call(REF, 'POST', { body: { t: link, answers: ANSWERS } })).status, 409);
    const again = await t.call(REF, 'GET', { query: `?t=${link}` });
    assert.equal(again.completedAt != null, true, '다시 열면 이미 제출됨으로 보인다');

    const sealed = [...t.store.entries()].find(([k]) => k.startsWith('serve:refans:'))[1];
    assert.ok(!sealed.includes('Faithful'));

    const id = (await t.portal('')).applications[0].id;
    const one = await t.portal(`?id=${id}`);
    assert.equal(one.application.referenceAnswers[1].strengths, 'Faithful');
    assert.equal(one.application.values.ref1Status, 'received');
    assert.ok(one.referenceSchema.length >= 3);

    const me = await t.call(ACC, 'GET', { token });
    assert.deepEqual(me.application.references.map(r => [r.n, r.status]), [[1, 'completed'], [2, 'sent']]);
  } finally { t.restore(); }
});

test('화면: 비공개 지원서·추천서 페이지는 검색 제외, 로그인 화면과 진행 상황 자리가 있다', () => {
  const page = readFileSync(new URL('../src/pages/apply/wolko-staff-k7m2q9.astro', import.meta.url), 'utf8');
  const ref = readFileSync(new URL('../src/pages/reference/index.astro', import.meta.url), 'utf8');
  for (const html of [page, ref]) assert.match(html, /noindex, nofollow/);
  for (const id of ['apGate', 'apIssueForm', 'apLoginForm', 'apLoginPw', 'apAcct', 'apLogout', 'apRefList', 'apHoney', 'apMain', 'apDone']) assert.ok(page.includes(`id="${id}"`), id);
  const js = readFileSync(new URL('../public/apply.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage\.setItem\(DRAFT/.test(js), '작성 내용은 기기에 저장하지 않는다');
  const css = readFileSync(new URL('../public/apply.css', import.meta.url), 'utf8') + readFileSync(new URL('../public/reference.css', import.meta.url), 'utf8');
  assert.ok(!/border-left:\s*[2-9]px/.test(css), '왼쪽 강조선 금지(AGENTS.md)');
});
