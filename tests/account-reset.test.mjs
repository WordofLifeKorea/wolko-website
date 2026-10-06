import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequestPost as reset } from '../functions/api/hub/reset-password.js';
import { onRequestPost as login } from '../functions/api/hub/account-login.js';
import { onRequestPost as changePassword } from '../functions/api/hub/account-password.js';
import { onRequestGet as me } from '../functions/api/hub/me.js';
import { createHubSessionToken, getAccount, hashPassword, putAccount, verifyPassword } from '../functions/lib/hubAccounts.js';

function memoryKv() {
  const values = new Map();
  return {
    async get(key, type) { const v = values.get(key); return v == null ? null : (type === 'json' ? JSON.parse(v) : v); },
    async put(key, value) { values.set(key, value); },
  };
}
const post = (fn, env, path, token, body) => fn({
  env,
  request: new Request('https://wolko.org' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }),
});

async function setup() {
  const env = { CAMP_KV: memoryKv(), ADMIN_PASSWORD: 'secret' };
  const old = await hashPassword('Forgotten!99');
  await putAccount(env, { email: 'estelle@wol.org', name: 'Estelle', role: 'counselor', status: 'approved', passwordHash: old.hash, passwordSalt: old.salt });
  await putAccount(env, { email: 'wolkorea1@gmail.com', name: 'Master', role: 'master', status: 'approved', passwordHash: old.hash, passwordSalt: old.salt });
  const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  const admin = await createHubSessionToken(env.ADMIN_PASSWORD, 'hkim3@wol.org', 'admin');
  return { env, master, admin };
}

test('only the master can reset a password, and the temporary password may be short', async () => {
  const { env, master, admin } = await setup();
  assert.equal((await post(reset, env, '/api/hub/reset-password', admin, { email: 'estelle@wol.org', tempPassword: '1234' })).status, 403);
  assert.equal((await post(reset, env, '/api/hub/reset-password', null, { email: 'estelle@wol.org', tempPassword: '1234' })).status, 403);
  assert.equal((await post(reset, env, '/api/hub/reset-password', master, { email: 'estelle@wol.org', tempPassword: '123' })).status, 400);
  assert.equal((await post(reset, env, '/api/hub/reset-password', master, { email: 'nobody@wol.org', tempPassword: '1234' })).status, 404);
  assert.equal((await post(reset, env, '/api/hub/reset-password', master, { email: 'wolkorea1@gmail.com', tempPassword: '1234' })).status, 400, '마스터 계정은 제외');
  const ok = await post(reset, env, '/api/hub/reset-password', master, { email: 'estelle@wol.org', tempPassword: '1234' });
  assert.equal(ok.status, 200);
  const a = await getAccount(env, 'estelle@wol.org');
  assert.equal(await verifyPassword('1234', a.passwordHash, a.passwordSalt), true);
  assert.equal(await verifyPassword('Forgotten!99', a.passwordHash, a.passwordSalt), false);
  assert.equal(a.mustChangePassword, true);
});

test('after a reset the login flags the account and the new password clears the flag', async () => {
  const { env, master } = await setup();
  await post(reset, env, '/api/hub/reset-password', master, { email: 'estelle@wol.org', tempPassword: '1234' });
  const res = await post(login, env, '/api/hub/account-login', null, { email: 'estelle@wol.org', password: '1234' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.mustChangePassword, true);
  const profile = await me({ env, request: new Request('https://wolko.org/api/hub/me', { headers: { Authorization: `Bearer ${data.hubToken}` } }) });
  assert.equal((await profile.json()).mustChangePassword, true);

  assert.equal((await post(changePassword, env, '/api/hub/account-password', data.hubToken, { currentPassword: '1234', newPassword: '1234' })).status, 400);
  assert.equal((await post(changePassword, env, '/api/hub/account-password', data.hubToken, { currentPassword: '1234', newPassword: 'short' })).status, 400, '새 비밀번호는 8자 이상');
  assert.equal((await post(changePassword, env, '/api/hub/account-password', data.hubToken, { currentPassword: '1234', newPassword: 'MyNewPass#1' })).status, 200);
  const after = await getAccount(env, 'estelle@wol.org');
  assert.equal(after.mustChangePassword, undefined);
  const again = await (await post(login, env, '/api/hub/account-login', null, { email: 'estelle@wol.org', password: 'MyNewPass#1' })).json();
  assert.equal(again.mustChangePassword, false);
});

test('resetting also re-activates the counselor-page account and lets the short temporary password sign in there', async () => {
  const { onRequestPost: campAuth } = await import('../functions/api/camp-progress/auth.js');
  const { env, master } = await setup();
  // 비활성화된 카운슬러 계정 (예전 비밀번호)
  await env.CAMP_KV.put('camp-progress:account:estelle@wol.org', JSON.stringify({ email: 'estelle@wol.org', name: 'Estelle', salt: 'ab', passwordHash: 'old', disabled: true }));
  const camp = (body) => campAuth({ env, request: new Request('https://wolko.org/api/camp-progress/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  assert.equal((await camp({ mode: 'login', email: 'estelle@wol.org', password: '1234' })).status, 401, '비활성화 상태에서는 로그인 불가');

  const res = await post(reset, env, '/api/hub/reset-password', master, { email: 'estelle@wol.org', tempPassword: '1234' });
  assert.equal((await res.json()).counselorAccount, 'reactivated');

  const ok = await camp({ mode: 'login', email: 'estelle@wol.org', password: '1234' });
  assert.equal(ok.status, 200);
  const data = await ok.json();
  assert.equal(data.mustChangePassword, true);

  assert.equal((await camp({ mode: 'changePassword', email: 'estelle@wol.org', password: 'wrong', newPassword: 'BrandNew#2026' })).status, 401);
  assert.equal((await camp({ mode: 'changePassword', email: 'estelle@wol.org', password: '1234', newPassword: '1234' })).status, 400);
  assert.equal((await camp({ mode: 'changePassword', email: 'estelle@wol.org', password: '1234', newPassword: 'BrandNew#2026' })).status, 200);
  const after = await (await camp({ mode: 'login', email: 'estelle@wol.org', password: 'BrandNew#2026' })).json();
  assert.equal(after.mustChangePassword, false);
  assert.equal((await camp({ mode: 'login', email: 'estelle@wol.org', password: '1234' })).status, 401, '임시 비밀번호는 더 이상 쓸 수 없다');
  // 가입은 여전히 6자 이상 규칙
  assert.equal((await camp({ mode: 'signup', email: 'new@wol.org', password: '1234' })).status, 400);
});

test('with no counselor-page account, the reset reports that none exists', async () => {
  const { env, master } = await setup();
  const res = await post(reset, env, '/api/hub/reset-password', master, { email: 'estelle@wol.org', tempPassword: '1234' });
  assert.equal((await res.json()).counselorAccount, 'none');
});

test('master deletes an account (and its counselor-page account) after typing the email; protected accounts stay', async () => {
  const { onRequestPost: del } = await import('../functions/api/hub/delete-account.js');
  const { env, master, admin } = await setup();
  env.CAMP_KV.delete = async function () {}; // 아래에서 실제 삭제를 흉내
  const store = new Map();
  const kv = memoryKv(); const realPut = kv.put;
  env.CAMP_KV = { ...kv, put: async (k, v) => { store.set(k, v); return realPut(k, v); }, get: kv.get, delete: async (k) => { store.set('__deleted__' + k, true); } };
  await putAccount(env, { email: 'estelle@wol.org', name: 'Estelle', role: 'counselor', status: 'approved' });
  await env.CAMP_KV.put('camp-progress:account:estelle@wol.org', JSON.stringify({ email: 'estelle@wol.org' }));
  assert.equal((await post(del, env, '/api/hub/delete-account', admin, { email: 'estelle@wol.org', confirm: 'estelle@wol.org' })).status, 403);
  assert.equal((await post(del, env, '/api/hub/delete-account', master, { email: 'estelle@wol.org', confirm: 'wrong@wol.org' })).status, 400);
  assert.equal((await post(del, env, '/api/hub/delete-account', master, { email: 'wolkorea1@gmail.com', confirm: 'wolkorea1@gmail.com' })).status, 400);
  const ok = await post(del, env, '/api/hub/delete-account', master, { email: 'estelle@wol.org', confirm: 'Estelle@wol.org' });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).counselorAccount, true);
  assert.ok(store.has('__deleted__hub:account:estelle@wol.org'));
  assert.ok(store.has('hub:account-trash:estelle@wol.org'), '복구용 사본');
});
