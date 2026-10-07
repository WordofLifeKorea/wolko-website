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

test('캠프 관리 창: 계절은 하나만 고르는 체크박스(라디오) 방식이고, 목록은 이름 + 연도·계절 두 줄로 정리된다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /<input type="radio" name="newCampSeason" value="summer" checked>/);
  assert.match(page, /<input type="radio" name="newCampSeason" value="winter">/);
  assert.doesNotMatch(page, /newCampSeasonToggle/);
  assert.match(page, /input\[name="newCampSeason"\]:checked/);
  assert.match(page, /camp-manage-row-name/);
});

test('캠프 관리 창 추가 폼: Safari 에서 입력 칸 기본 폭 때문에 오른쪽이 잘리지 않도록 격자 칸이 minmax(0,1fr) 이다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /\.camp-add-grid \{ display:grid; grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\);/);
  assert.match(page, /\.field \{ display:grid; grid-template-columns:minmax\(0,1fr\);/);
  assert.match(page, /\.season-check \{ position:relative;/);
});

test('캠프 관리 목록의 작은 버튼(기본 설정·삭제)은 모바일 공용 44px 규칙에 늘어나지 않고 낮게 고정된다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /:root:root \.camp-manage-row button[^{]*\{[^}]*min-height:0 !important; height:28px !important;/);
});
