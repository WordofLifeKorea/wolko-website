import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequestPost } from '../functions/api/hub/account-password.js';
import {
  createHubSessionToken, getAccount, hashPassword, putAccount, verifyPassword,
} from '../functions/lib/hubAccounts.js';

function memoryKv() {
  const values = new Map();
  return {
    async get(key, type) {
      const value = values.get(key);
      if (value == null) return null;
      return type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) { values.set(key, value); },
  };
}

async function setup() {
  const env = { CAMP_KV: memoryKv(), ADMIN_PASSWORD: 'session-secret' };
  const original = await hashPassword('OldPassword!1');
  await putAccount(env, {
    email: 'admin@wol.org', name: 'Admin', role: 'admin', status: 'approved',
    passwordHash: original.hash, passwordSalt: original.salt,
  });
  const token = await createHubSessionToken(env.ADMIN_PASSWORD, 'admin@wol.org', 'admin');
  return { env, token };
}

async function request(env, token, body) {
  return onRequestPost({
    env,
    request: new Request('https://wolko.org/api/hub/account-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  });
}

test('password change verifies the current password before replacing its hash', async () => {
  const { env, token } = await setup();
  const denied = await request(env, token, { currentPassword: 'WrongPassword!1', newPassword: 'NewPassword!2' });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, 'CURRENT_PASSWORD_INVALID');
  const before = await getAccount(env, 'admin@wol.org');
  assert.equal(await verifyPassword('OldPassword!1', before.passwordHash, before.passwordSalt), true);

  const changed = await request(env, token, { currentPassword: 'OldPassword!1', newPassword: 'NewPassword!2' });
  assert.equal(changed.status, 200);
  const after = await getAccount(env, 'admin@wol.org');
  assert.equal(await verifyPassword('OldPassword!1', after.passwordHash, after.passwordSalt), false);
  assert.equal(await verifyPassword('NewPassword!2', after.passwordHash, after.passwordSalt), true);
  assert.ok(after.passwordChangedAt);
});

test('password change rejects invalid sessions, weak passwords and password reuse', async () => {
  const { env, token } = await setup();
  assert.equal((await request(env, 'bad-token', { currentPassword: 'OldPassword!1', newPassword: 'NewPassword!2' })).status, 401);
  const weak = await request(env, token, { currentPassword: 'OldPassword!1', newPassword: 'short' });
  assert.equal((await weak.json()).code, 'PASSWORD_INVALID');
  const same = await request(env, token, { currentPassword: 'OldPassword!1', newPassword: 'OldPassword!1' });
  assert.equal((await same.json()).code, 'SAME_PASSWORD');
});

test('camp admin exposes equal-height mobile header controls and a password form', async () => {
  const { readFile } = await import('node:fs/promises');
  const page = await readFile(new URL('../src/pages/wolkoadmin.astro', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/wolkoadmin.css', import.meta.url), 'utf8');
  assert.match(page, /class="adm-header-control adm-account-button"[^>]+openAccountModal/);
  assert.match(page, /class="adm-account-icon"[^>]+viewBox="0 0 24 24"/);
  assert.doesNotMatch(page, />CAMP ADMIN</);
  assert.match(page, /id="currentPassword"[^>]+autocomplete="current-password"/);
  assert.match(page, /id="newPassword"[^>]+autocomplete="new-password"/);
  assert.match(page, /fetch\('\/api\/hub\/account-password'/);
  assert.match(page, /id="langToggleBtn"[^>]+toggleAdminLang\(\)[^>]+role="switch"/);
  assert.match(page, /function toggleAdminLang\(\) \{ setAdminLang\(adminLang === 'ko' \? 'en' : 'ko'\); \}/);
  assert.match(css, /\.adm-header-control,[\s\S]*\.adm-lang-switch \{[^}]*height: 36px;[^}]*min-height: 36px !important/);
  assert.match(css, /\.adm-lang-switch\[data-lang="en"\] \.adm-lang-thumb \{ transform:translateX\(100%\); \}/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.adm-lang-switch \{[^}]*height:34px;[^}]*min-height:34px !important/);
  assert.match(page, /wolkoadmin\.css\?v=83/);
});
