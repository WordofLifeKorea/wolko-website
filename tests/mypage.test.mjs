import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Links from '../functions/api/newsletter/links.js';
import * as Prof from '../functions/api/newsletter/profile.js';
import * as PLogin from '../functions/api/team/portal-login.js';
import * as TeamUpdate from '../functions/api/team/update.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';

function setup() {
  const values = new Map();
  const env = {
    ADMIN_PASSWORD: 'secret', TEAM_PASSWORD: 'tp',
    CAMP_KV: {
      async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
      async put(k, v) { values.set(k, v); },
      async delete(k) { values.delete(k); },
      async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
  const call = (mod, method, path, token, body) => mod['onRequest' + method[0] + method.slice(1).toLowerCase()]({
    env, request: new Request('https://wolko.org' + path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined }),
  });
  return { env, call };
}
async function people(env) {
  await putAccount(env, { email: 'aiden@wol.org', name: 'Aiden', role: 'counselor', status: 'approved' });
  await putAccount(env, { email: 'other@wol.org', name: 'Other', role: 'counselor', status: 'approved' });
  const t = e => createHubSessionToken(env.ADMIN_PASSWORD, e, 'counselor');
  return { me: await t('aiden@wol.org'), other: await t('other@wol.org'), master: await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master') };
}

test('마스터만 계정↔소개 페이지를 연결하고, 연결 계정 목록(드롭다운용)은 마스터/관리자에게만 내려간다', async () => {
  const { env, call } = setup(); const t = await people(env);
  assert.equal((await call(Links, 'PUT', '/api/newsletter/links', t.me, { email: 'aiden@wol.org', slug: 'aiden' })).status, 403);
  assert.equal((await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: '../x' })).status, 400);
  assert.equal((await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' })).status, 200);
  const adminView = await (await call(Links, 'GET', '/api/newsletter/links', t.master)).json();
  assert.ok(adminView.accounts.some(a => a.email === 'aiden@wol.org'));
  assert.equal(adminView.links[0].slug, 'aiden');
  const mine = await (await call(Links, 'GET', '/api/newsletter/links', t.me)).json();
  assert.equal(mine.me.slug, 'aiden'); assert.equal(mine.accounts, undefined);
  assert.equal((await call(Links, 'DELETE', '/api/newsletter/links?email=aiden@wol.org', t.me)).status, 403);
  assert.equal((await call(Links, 'DELETE', '/api/newsletter/links?email=aiden@wol.org', t.master)).status, 200);
  assert.equal((await (await call(Links, 'GET', '/api/newsletter/links', t.me)).json()).me, null);
});

test('뉴스레터 링크: 연결된 계정만 바꾸고, http(s)만 받으며, 공개 응답은 로그인 없이 읽힌다', async () => {
  const { env, call } = setup(); const t = await people(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden' });
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile', t.other, { url: 'https://x.com' })).status, 403);
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile', t.me, { url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile', t.me, { url: 'mailto:a@b.com' })).status, 400);
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile', t.me, { url: 'https://mailchi.mp/abc/letter' })).status, 200);
  assert.equal((await (await call(Prof, 'GET', '/api/newsletter/profile', t.me)).json()).url, 'https://mailchi.mp/abc/letter');
  const pub = await (await call(Prof, 'GET', '/api/newsletter/profile?slug=aiden')).json();
  assert.deepEqual([pub.enabled, pub.url], [true, 'https://mailchi.mp/abc/letter']);
  assert.equal((await (await call(Prof, 'GET', '/api/newsletter/profile?slug=nobody')).json()).enabled, false);
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile?slug=aiden', t.master, { url: 'https://example.com/n' })).status, 200, '마스터 대리 관리');
  assert.equal((await call(Prof, 'PUT', '/api/newsletter/profile?slug=aiden', t.other, { url: 'https://evil.com' })).status, 403);
  await call(Prof, 'PUT', '/api/newsletter/profile', t.me, { url: '' });
  assert.equal((await (await call(Prof, 'GET', '/api/newsletter/profile?slug=aiden')).json()).url, '');
});

test('소개 페이지 편집: 포탈 로그인으로 기존 편집 토큰을 받고, 연결되지 않은 페이지는 거절한다', async () => {
  const { env, call } = setup(); const t = await people(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden' });
  assert.equal((await call(PLogin, 'POST', '/api/team/portal-login', null, { slug: 'aiden' })).status, 401);
  assert.equal((await call(PLogin, 'POST', '/api/team/portal-login', t.other, { slug: 'aiden' })).status, 403, '연결 안 된 계정');
  assert.equal((await call(PLogin, 'POST', '/api/team/portal-login', t.me, { slug: 'kim' })).status, 403, '남의 페이지');
  const ok1 = await call(PLogin, 'POST', '/api/team/portal-login', t.me, { slug: 'aiden' });
  assert.equal(ok1.status, 200);
  const { token } = await ok1.json();
  // 기존 편집 API 가 이 토큰을 그대로 인식한다 (GitHub 설정이 없어서 인증 이후 단계에서 막히면 401 이 아니다)
  const upd = await TeamUpdate.onRequestPost({ env, request: new Request('https://wolko.org/api/team/update', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }) }) });
  assert.notEqual(upd.status, 401);
  assert.equal((await call(PLogin, 'POST', '/api/team/portal-login', t.master, { slug: 'kim' })).status, 200, '마스터는 모든 페이지');
});

test('화면: 소개 페이지 편집 화면은 포탈 로그인으로 자동 입장하고, 소개 페이지에는 가입 폼 없이 링크 덮어쓰기만 있다', () => {
  const edit = readFileSync(new URL('../src/pages/team-edit/[slug].astro', import.meta.url), 'utf8');
  assert.match(edit, /\/api\/team\/portal-login/);
  const team = readFileSync(new URL('../src/pages/team/[slug].astro', import.meta.url), 'utf8');
  assert.match(team, /\/api\/newsletter\/profile\?slug=/);
  assert.doesNotMatch(team, /mpSubForm|\/api\/newsletter\/subscribe/);
  const page = readFileSync(new URL('../src/pages/mypage/index.astro', import.meta.url), 'utf8');
  assert.match(page, /\/team-edit\//);
  assert.match(page, /\/api\/newsletter\/profile/);
  assert.match(page, /\/api\/team\/upload/);
  assert.match(page, /field', 'report_url'/);
});
