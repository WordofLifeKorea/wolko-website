import assert from 'node:assert/strict';
import test from 'node:test';
import * as S from '../functions/api/hub/signup.js';
import * as V from '../functions/api/hub/verify-email.js';
import * as L from '../functions/api/hub/account-login.js';
import * as P from '../functions/api/hub/pending.js';
import * as A from '../functions/api/hub/approve.js';
import * as H from '../functions/lib/hubAccounts.js';

function memoryKv() {
  const values = new Map();
  return { values,
    async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
    async put(k, v) { values.set(k, v); },
    async delete(k) { values.delete(k); },
    async list({ prefix }) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } };
}
function setup() {
  const env = { CAMP_KV: memoryKv(), ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'rk' };
  const mails = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, o) => { if (String(url).includes('resend.com')) mails.push(JSON.parse(o.body)); return { ok: true, text: async () => '' }; };
  const json = async res => { const body = await res.json(); return { ...body, state: body.status, status: res.status }; }; // status = HTTP 코드, state = 응답 본문의 status
  const post = (handler, path, body, headers = {}) => handler({ env, waitUntil: p => p, request: new Request(`https://wolko.org${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) }).then(json);
  return {
    env, mails, restore: () => { globalThis.fetch = realFetch; },
    signup: (email, over = {}) => post(S.onRequestPost, '/api/hub/signup', { name: '홍길동', phone: '010-1234-5678', email, password: 'Passw0rd!x', campus: 'wolko', requestedRole: 'member', ...over }),
    verify: body => post(V.onRequestPost, '/api/hub/verify-email', body),
    login: (email, password) => post(L.onRequestPost, '/api/hub/account-login', { email, password }),
    approve: async body => post(A.onRequestPost, '/api/hub/approve', body, { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', 'admin@wolko.org', 'master') }),
    pending: async () => json(await P.onRequestGet({ env, request: new Request('https://wolko.org/api/hub/pending', { headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', 'admin@wolko.org', 'master') } }) })),
    account: email => H.getAccount(env, email),
  };
}
const tokenOf = mail => /portal\/\?verify=([\w-]+)/.exec(mail.html)[1];

test('wol.org/wolko.org 일반 멤버: 메일 인증 → 비밀번호 정하기 → 승인 없이 바로 멤버', async () => {
  const t = setup();
  try {
    const r = await t.signup('Newbie@WOL.org');
    assert.deepEqual([r.status, r.state], [200, 'verify']);
    assert.equal((await t.signup('x@wolko.org')).status, 200);
    const a = await t.account('newbie@wol.org');
    assert.equal(a.status, 'unverified'); assert.equal(a.role, null); assert.equal(a.passwordHash, undefined, '가입 칸에서는 비밀번호를 받지 않는다');
    const mail = t.mails.find(m => m.to.includes('newbie@wol.org'));
    assert.ok(mail, '인증 메일이 그 주소로 간다');
    assert.ok(!t.mails.some(m => (m.to || []).includes('admin@wolko.org')), '마스터에게 승인 요청은 가지 않는다');
    const token = tokenOf(mail);
    assert.ok(![...t.env.CAMP_KV.values.keys()].some(k => k.includes(token)), '토큰 원문은 저장하지 않는다');

    // 인증 전에는 로그인할 수 없다
    const before = await t.login('newbie@wol.org', 'Passw0rd!x');
    assert.equal(before.status, 403); assert.equal(before.status === 403 && before.error.includes('인증'), true);

    assert.equal((await t.verify({ token: 'nope', newPassword: 'NewPass#2026' })).status, 400, '틀린 링크');
    assert.equal((await t.verify({ token, newPassword: 'short' })).status, 400, '8자 이상');
    assert.equal((await t.verify({ token, newPassword: 'NewPass#2026' })).status, 200);
    const done = await t.account('newbie@wol.org');
    assert.deepEqual([done.status, done.role, done.approvedBy], ['approved', 'counselor', 'auto:email-verified']);
    assert.equal((await t.verify({ token, newPassword: 'Another#2026' })).status, 400, '링크는 한 번만');

    const login = await t.login('newbie@wol.org', 'NewPass#2026');
    assert.equal(login.status, 200); assert.equal(login.role, 'counselor');
    const session = await H.parseHubSessionToken('secret', login.hubToken);
    assert.equal(session.email, 'newbie@wol.org');
  } finally { t.restore(); }
});

test('인증 전 가입을 남이 먼저 해 두어도(비밀번호를 모르니) 주소 주인이 링크에서 정한 비밀번호만 쓸 수 있다', async () => {
  const t = setup();
  try {
    await t.signup('victim@wol.org', { password: 'AttackerPass#1' });   // 공격자가 남의 주소로 먼저 가입
    assert.equal((await t.account('victim@wol.org')).passwordHash, undefined);
    assert.equal((await t.login('victim@wol.org', 'AttackerPass#1')).status, 403);
    const token = tokenOf(t.mails[0]);
    await t.verify({ token, newPassword: 'OwnerChosen#9' });            // 주소 주인이 메일에서 비밀번호를 정함
    assert.equal((await t.login('victim@wol.org', 'AttackerPass#1')).status, 401);
    assert.equal((await t.login('victim@wol.org', 'OwnerChosen#9')).status, 200);
  } finally { t.restore(); }
});

test('인증 메일 다시 받기: 1분 안에는 새 메일이 가지 않고, 새로 받으면 이전 링크는 못 쓴다', async () => {
  const t = setup();
  try {
    await t.signup('again@wolko.org'); await t.signup('again@wolko.org');
    assert.equal(t.mails.length, 1, '1분 안 재요청은 메일을 또 보내지 않는다');
    // 쿨다운을 지우고 다시 요청
    for (const k of [...t.env.CAMP_KV.values.keys()]) if (k.startsWith('hub:verify-cd:')) t.env.CAMP_KV.values.delete(k);
    await t.signup('again@wolko.org');
    assert.equal(t.mails.length, 2);
    const [oldToken, newToken] = t.mails.map(tokenOf);
    assert.equal((await t.verify({ token: oldToken, newPassword: 'NewPass#2026' })).status, 400, '이전 링크는 무효');
    assert.equal((await t.verify({ token: newToken, newPassword: 'NewPass#2026' })).status, 200);
  } finally { t.restore(); }
});

test('다른 도메인: 가입은 받되 마스터 승인 전에는 로그인할 수 없고, 승인하면 쓸 수 있다', async () => {
  const t = setup();
  try {
    const r = await t.signup('friend@gmail.com');
    assert.deepEqual([r.status, r.state], [200, 'pending']);
    assert.equal((await t.account('friend@gmail.com')).status, 'pending');
    assert.ok(t.mails.some(m => (m.to || []).includes('admin@wolko.org')), '마스터에게 승인 요청 메일');
    assert.equal((await t.login('friend@gmail.com', 'Passw0rd!x')).status, 403, '승인 대기');
    assert.ok((await t.pending()).accounts.some(a => a.email === 'friend@gmail.com'));
    assert.equal((await t.approve({ email: 'friend@gmail.com', action: 'approve', role: 'counselor' })).status, 200);
    const login = await t.login('friend@gmail.com', 'Passw0rd!x');
    assert.equal(login.status, 200);
    const session = await H.portalSession(new Request('https://wolko.org/x', { headers: { Authorization: 'Bearer ' + login.hubToken } }), t.env);
    assert.equal(session.email, 'friend@gmail.com', '다른 도메인 계정도 승인되면 포탈 세션이 통한다');
    assert.equal(session.role, 'counselor');
  } finally { t.restore(); }
});

test('wol.org 관리자 신청은 자동 승인되지 않는다 · 비슷한 도메인은 자동 대상이 아니다 · 인증 전 계정은 승인 목록에 없다', async () => {
  const t = setup();
  try {
    await t.signup('adminwannabe@wol.org', { requestedRole: 'admin' });
    assert.equal((await t.account('adminwannabe@wol.org')).status, 'pending');
    await t.signup('fake@wol.org.evil.com');
    assert.equal((await t.account('fake@wol.org.evil.com')).status, 'pending');
    await t.signup('unverified@wol.org');
    const list = (await t.pending()).accounts.map(a => a.email);
    assert.ok(list.includes('adminwannabe@wol.org') && list.includes('fake@wol.org.evil.com'));
    assert.ok(!list.includes('unverified@wol.org'), '인증 전 계정은 목록에 없다');
    assert.equal((await t.approve({ email: 'unverified@wol.org', action: 'approve', role: 'counselor' })).status, 409, '마스터도 인증 전 계정은 승인할 수 없다');
  } finally { t.restore(); }
});

test('예전에 승인됐지만 비밀번호가 없는 wol.org 계정은 메일 인증으로 비밀번호를 정한다(권한은 그대로)', async () => {
  const t = setup();
  try {
    await H.putAccount(t.env, { email: 'old@wol.org', name: '옛', role: 'counselor', status: 'approved' });
    assert.equal((await t.signup('old@wol.org')).status, 200);
    const token = tokenOf(t.mails[0]);
    assert.equal((await t.verify({ token, newPassword: 'OldPass#2026' })).status, 200);
    const a = await t.account('old@wol.org');
    assert.deepEqual([a.status, a.role], ['approved', 'counselor']);
    assert.equal((await t.login('old@wol.org', 'OldPass#2026')).status, 200);
  } finally { t.restore(); }
});

test('이미 가입된(비밀번호 있는) 계정은 다시 가입할 수 없다', async () => {
  const t = setup();
  try {
    const pw = await H.hashPassword('Existing#2026');
    await H.putAccount(t.env, { email: 'have@wol.org', name: '있음', role: 'counselor', status: 'approved', passwordHash: pw.hash, passwordSalt: pw.salt });
    assert.equal((await t.signup('have@wol.org')).status, 409);
    assert.equal(t.mails.length, 0);
    assert.equal((await t.signup('')).status, 400);
  } finally { t.restore(); }
});
