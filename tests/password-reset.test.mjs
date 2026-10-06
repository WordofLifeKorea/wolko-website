import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost as reset } from '../functions/api/hub/password-reset.js';
import { onRequestPost as login } from '../functions/api/hub/account-login.js';
import { getAccount, hashPassword, putAccount, verifyPassword } from '../functions/lib/hubAccounts.js';

function memoryKv() {
  const values = new Map();
  return { values,
    async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
    async put(k, v) { values.set(k, v); },
    async delete(k) { values.delete(k); } };
}
async function setup() {
  const env = { CAMP_KV: memoryKv(), ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'rk' };
  const old = await hashPassword('Forgotten!99');
  await putAccount(env, { email: 'estelle@wol.org', name: 'Estelle', role: 'counselor', status: 'approved', passwordHash: old.hash, passwordSalt: old.salt, mustChangePassword: true });
  await putAccount(env, { email: 'wait@x.com', name: 'W', role: 'counselor', status: 'pending' });
  return env;
}
const post = (env, body, sent) => reset({ env, waitUntil: p => p, request: new Request('https://wolko.org/api/hub/password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });

test('forgot password: link by e-mail, new password once, old password stops working', async () => {
  const env = await setup();
  const mails = [];
  globalThis.fetch = async (url, o) => { mails.push(JSON.parse(o.body)); return { ok: true, text: async () => '' }; };

  const r1 = await post(env, { action: 'request', email: 'Estelle@wol.org' });
  assert.equal(r1.status, 200);
  assert.equal(mails.length, 1);
  assert.deepEqual(mails[0].to, ['estelle@wol.org']);
  const token = /portal\/\?reset=([\w-]+)/.exec(mails[0].html)[1];
  assert.ok(token.length >= 40);
  assert.ok(![...env.CAMP_KV.values.keys()].some(k => k.includes(token)), '토큰 원문은 저장하지 않는다');

  // 1분 안에 다시 요청해도 새 메일은 가지 않지만 응답은 같다
  assert.equal((await post(env, { action: 'request', email: 'estelle@wol.org' })).status, 200);
  assert.equal(mails.length, 1);
  // 없는 계정·승인 대기 계정도 같은 응답, 메일은 없음
  assert.deepEqual(await (await post(env, { action: 'request', email: 'ghost@x.com' })).json(), { ok: true });
  assert.deepEqual(await (await post(env, { action: 'request', email: 'wait@x.com' })).json(), { ok: true });
  assert.equal(mails.length, 1);

  assert.equal((await post(env, { action: 'confirm', token: 'bad', newPassword: 'NewPass#2026' })).status, 400);
  assert.equal((await post(env, { action: 'confirm', token, newPassword: 'short' })).status, 400, '8자 이상');
  assert.equal((await post(env, { action: 'confirm', token, newPassword: 'NewPass#2026' })).status, 200);
  const a = await getAccount(env, 'estelle@wol.org');
  assert.equal(await verifyPassword('NewPass#2026', a.passwordHash, a.passwordSalt), true);
  assert.equal(await verifyPassword('Forgotten!99', a.passwordHash, a.passwordSalt), false);
  assert.equal(a.mustChangePassword, undefined, '임시 비밀번호 표시도 지워진다');
  assert.equal((await post(env, { action: 'confirm', token, newPassword: 'Another#2026' })).status, 400, '링크는 한 번만');

  const res = await login({ env, request: new Request('https://wolko.org/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'estelle@wol.org', password: 'NewPass#2026' }) }) });
  assert.equal(res.status, 200);
});

test('a newer request invalidates the older link', async () => {
  const env = await setup();
  const mails = [];
  globalThis.fetch = async (url, o) => { mails.push(JSON.parse(o.body)); return { ok: true, text: async () => '' }; };
  await post(env, { action: 'request', email: 'estelle@wol.org' });
  const t1 = /reset=([\w-]+)/.exec(mails[0].html)[1];
  env.CAMP_KV.values.delete('hub:pwreset-cd:estelle@wol.org'); // 1분이 지났다고 가정
  await post(env, { action: 'request', email: 'estelle@wol.org' });
  const t2 = /reset=([\w-]+)/.exec(mails[1].html)[1];
  assert.notEqual(t1, t2);
  assert.equal((await post(env, { action: 'confirm', token: t1, newPassword: 'NewPass#2026' })).status, 400);
  assert.equal((await post(env, { action: 'confirm', token: t2, newPassword: 'NewPass#2026' })).status, 200);
});
