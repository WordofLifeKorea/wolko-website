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

test('캠프 추가 폼의 계절 체크박스와 입력 칸은 같은 낮은 높이(38px)로 맞춰진다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /\.season-check \{[^}]*height:38px;/);
  assert.match(page, /\.camp-manage-add-row input\[type=text\] \{[^}]*height:38px !important;/);
});

test('캠프 관리 창: 이름이 한 줄에 들어오게 넓히되(540px) 좁은 화면(480px 이하, 340px 이하)은 따로 정리한다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /#campManageBackdrop \.tch-dialog, #managersBackdrop \.tch-dialog \{ max-width:540px; \}/);
  assert.match(page, /@media \(max-width:480px\) \{\s*#campManageBackdrop \{ padding:12px; \}/);
  assert.match(page, /@media \(max-width:340px\)/);
});

import * as Camps from '../functions/api/teach/camps.js';
import * as Managers from '../functions/api/teach/managers.js';
import * as Upload from '../functions/api/teach/upload.js';

test('캠프 자료실 권한: 일반 멤버는 보기·추가만, 마스터가 지정한 관리자(와 마스터)만 수정·삭제·캠프 관리', async () => {
  const env = setup();
  await putAccount(env, { email: 'm@x.com', name: 'Member', role: 'counselor', status: 'approved' });
  await putAccount(env, { email: 'ella@wol.org', name: 'Ella', role: 'counselor', status: 'approved' });
  const sess = (e, r = 'counselor') => createHubSessionToken(env.ADMIN_PASSWORD, e, r);
  const master = await sess('wolkorea1@gmail.com', 'master'), member = await sess('m@x.com'), ella = await sess('ella@wol.org');
  const req = (path, method, token, body) => new Request('https://wolko.org' + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const login = async t => (await (await PLogin.onRequestPost({ env, request: req('/api/teach/portal-login', 'POST', t) })).json());
  const item = { tab: 'general', title: '자료', url: 'https://example.com/a', campIds: ['camp-1'] };

  // 관리자 지정은 마스터만, 지정 전에는 Ella 도 일반 멤버
  let m = await login(member); let e = await login(ella);
  assert.deepEqual([m.role, m.isManager, e.role], ['member', false, 'member']);
  assert.equal((await Managers.onRequestPut({ env, request: req('/api/teach/managers', 'PUT', member, { emails: ['m@x.com'] }) })).status, 403);
  assert.equal((await Managers.onRequestPut({ env, request: req('/api/teach/managers', 'PUT', master, { emails: ['Ella@wol.org', 'bad', 'ella@wol.org'] }) })).status, 200);
  const list = await (await Managers.onRequestGet({ env, request: req('/api/teach/managers', 'GET', master) })).json();
  assert.deepEqual(list.managers.map(x => x.email), ['ella@wol.org']);
  assert.ok(list.accounts.some(a => a.email === 'm@x.com'));
  assert.equal((await (await Managers.onRequestGet({ env, request: req('/api/teach/managers', 'GET', member) })).json()).managers, undefined, '일반 멤버에게는 명단을 주지 않는다');

  m = await login(member); e = await login(ella); const ms = await login(master);
  assert.deepEqual([m.role, e.role, e.isManager, ms.role, ms.isMaster], ['member', 'admin', true, 'admin', true]);

  // 일반 멤버: 읽기 · 추가 O, 수정 · 삭제 · 순서 · 캠프 관리 X
  assert.equal((await Data.onRequestGet({ env, request: req('/api/teach/data', 'GET', m.token) })).status, 200);
  const added = await Data.onRequestPost({ env, request: req('/api/teach/data', 'POST', m.token, { item }) });
  assert.equal(added.status, 200);
  const id = (await added.json()).items[0].id;
  assert.equal((await Data.onRequestPut({ env, request: req('/api/teach/data', 'PUT', m.token, { item: { ...item, id, title: '바꿈' } }) })).status, 403);
  assert.equal((await Data.onRequestPatch({ env, request: req('/api/teach/data', 'PATCH', m.token, { ids: [id] }) })).status, 403);
  assert.equal((await Data.onRequestDelete({ env, request: req(`/api/teach/data?id=${id}`, 'DELETE', m.token) })).status, 403);
  assert.equal((await Camps.onRequestGet({ env, request: req('/api/teach/camps', 'GET', m.token) })).status, 200);
  assert.equal((await Camps.onRequestPost({ env, request: req('/api/teach/camps', 'POST', m.token, { year: '2027', season: 'summer', name: 'A' }) })).status, 403);

  // 관리자(Ella)와 마스터: 수정 · 삭제 · 캠프 관리 O
  assert.equal((await Data.onRequestPut({ env, request: req('/api/teach/data', 'PUT', e.token, { item: { ...item, id, title: '바꿈' } }) })).status, 200);
  assert.equal((await Camps.onRequestPost({ env, request: req('/api/teach/camps', 'POST', e.token, { year: '2027', season: 'summer', name: 'A' }) })).status, 200);
  assert.equal((await Data.onRequestDelete({ env, request: req(`/api/teach/data?id=${id}`, 'DELETE', ms.token) })).status, 200);
  // 로그인 없이는 아무것도 안 된다
  assert.equal((await Data.onRequestPost({ env, request: new Request('https://wolko.org/api/teach/data', { method: 'POST', body: '{}' }) })).status, 401);
});

test('캠프 자료실 화면: 수정·삭제·순서·캠프 관리는 관리자에게만 보이고, 관리자 지정은 마스터에게만 보인다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /isManager = !!data\.isManager;/);
  assert.match(page, /\$\{editMode && isManager \? `<button class="drag-handle"/);
  assert.match(page, /\$\{editMode && isManager \? `\s*<div class="present-card-actions" data-stop>/);
  assert.match(page, /els\.campManageBtn\.hidden = !editMode \|\| !isManager;/);
  assert.match(page, /els\.managersBtn\.hidden = !editMode \|\| !isMaster;/);
  assert.match(page, /\/api\/teach\/managers/);
});
