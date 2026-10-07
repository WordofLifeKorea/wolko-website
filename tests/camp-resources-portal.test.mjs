import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import * as PLogin from '../functions/api/teach/portal-login.js';
import * as Data from '../functions/api/teach/data.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';

const root = new URL('..', import.meta.url).pathname;
function setup() {
  const values = new Map();
  return { ADMIN_PASSWORD: 'secret', CAMP_KV: {
    async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
    async put(k, v) { values.set(k, v); }, async delete(k) { values.delete(k); },
    async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  } };
}
const post = (env, token) => PLogin.onRequestPost({ env, request: new Request('https://wolko.org/api/teach/portal-login', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }) });

test('캠프 자료실: 승인된 포탈 멤버만 자료실 토큰을 받고, 그 토큰을 기존 자료 API가 인식한다', async () => {
  const env = setup();
  await putAccount(env, { email: 'm@x.com', name: 'M', role: 'counselor', status: 'approved' });
  await putAccount(env, { email: 'w@x.com', name: 'W', role: 'counselor', status: 'pending' });
  const tok = e => createHubSessionToken(env.ADMIN_PASSWORD, e, 'counselor');
  assert.equal((await post(env, null)).status, 401);
  assert.equal((await post(env, await tok('w@x.com'))).status, 401, '승인 대기');
  const ok = await post(env, await tok('m@x.com'));
  assert.equal(ok.status, 200);
  const { token } = await ok.json();
  const noAuth = await Data.onRequestGet({ env, request: new Request('https://wolko.org/api/teach/data') });
  const withAuth = await Data.onRequestGet({ env, request: new Request('https://wolko.org/api/teach/data', { headers: { Authorization: `Bearer ${token}` } }) });
  assert.equal(noAuth.status, 401);
  assert.notEqual(withAuth.status, 401);
  assert.equal(existsSync(root + 'functions/api/teach/auth.js'), false, '공유 비밀번호 로그인은 없앴다');
});

test('캠프 자료실 화면: 포탈 도구 페이지(공용 머리글·왼쪽 메뉴), 비밀번호 칸 없음, 캠프 그룹 메뉴에 들어 있다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.doesNotMatch(page, /BaseLayout|passwordInput|loginScreen|api\/teach\/auth/);
  assert.match(page, /wolko-rail\.js/);
  assert.match(page, /\/api\/teach\/portal-login/);
  assert.match(page, /const LANG_KEY = 'wolko-lang'/);
  const rail = readFileSync(root + 'public/wolko-rail.js', 'utf8');
  assert.match(rail, /group: 'camp', href: '\/camp-resources'/);
  const portal = readFileSync(root + 'src/pages/portal.astro', 'utf8');
  assert.match(portal, /group: 'camp', href: '\/camp-resources'/);
});
