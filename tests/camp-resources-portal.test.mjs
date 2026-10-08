import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as PLogin from '../functions/api/teach/portal-login.js';
import * as Data from '../functions/api/teach/data.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';
import { generateTeachToken, teachSession } from '../functions/lib/teachAuth.js';

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

test('자료실 업로더 신원은 서명으로 보호하고 기존 토큰도 인식한다', async () => {
  const env = setup();
  const req = token => new Request('https://wolko.org', { headers: { Authorization: `Bearer ${token}` } });
  const legacy = await generateTeachToken(env.ADMIN_PASSWORD);
  assert.equal((await teachSession(req(legacy), env)).role, 'member');
  const signed = await generateTeachToken(env.ADMIN_PASSWORD, 'member', { name: '김', email: 'u@x.com' });
  const forged = btoa(atob(signed).replace(encodeURIComponent('김'), encodeURIComponent('박')));
  assert.equal(await teachSession(req(forged), env), null);
});

test('자료 업로더 이름은 로그인 계정에서 정하고 수정 후에도 보존한다', async () => {
  const env = setup();
  await putAccount(env, { email: 'u@x.com', name: '김업로드', role: 'counselor', status: 'approved' });
  await putAccount(env, { email: 'a@x.com', name: '관리자', role: 'counselor', status: 'approved' });
  await env.CAMP_KV.put('teach:managers', JSON.stringify(['a@x.com']));
  const login = async email => (await (await post(env, await createHubSessionToken(env.ADMIN_PASSWORD, email, 'counselor'))).json());
  const user = await login('u@x.com'), admin = await login('a@x.com');
  const request = (method, token, item) => new Request('https://wolko.org/api/teach/data', { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ item }) });
  const item = { tab: 'teacher', team: 'WOLKO', person: '다른사람', uploaderName: '위조', campIds: ['camp-1'], title: '자료', url: 'https://example.com/a.pdf' };
  const added = await Data.onRequestPost({ env, request: request('POST', user.token, item) });
  assert.equal(added.status, 200);
  const saved = (await added.json()).items[0];
  assert.equal(saved.uploaderName, '김업로드');
  assert.equal(saved.person, '김업로드');
  const updated = await Data.onRequestPut({ env, request: request('PUT', admin.token, { ...saved, title: '수정', uploaderName: '위조' }) });
  assert.equal((await updated.json()).items[0].uploaderName, '김업로드');
});

test('업로드한 사람만 카드를 만들고 빈 목록은 안내 한 칸만 표시한다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.doesNotMatch(page, /WOLKO_PINNED_PEOPLE/);
  const start = page.indexOf('function groupByPerson(');
  const end = page.indexOf('function groupByTeam(', start);
  const render = runInNewContext(page.slice(start, end) + '\nwolkoTeamHtml;', {
    currentLang: 'ko', TEAM_WOLKO: 'WOLKO', editMode: false,
    escapeHtml: value => String(value), tr: () => '등록된 자료가 없습니다.',
    personGroupHtml: (name, items) => `<person>${name}:${items.length}</person>`,
    presentCardHtml: () => '<card>',
  });
  const empty = render([]);
  assert.equal(empty.match(/등록된 자료가 없습니다\./g).length, 1);
  assert.doesNotMatch(empty, /person-columns|<person>/);
  const grouped = render([{ uploaderName: '홍길동', person: 'Zach' }, { uploaderName: '홍길동' }, { person: '기존 이름' }]);
  assert.match(grouped, /홍길동:2/);
  assert.match(grouped, /기존 이름:1/);
  assert.doesNotMatch(grouped, /Zach/);
});

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

test('캠프 자료실: 연도 · 계절 · 캠프 선택 줄이 수업자료 / 프로그램팀 / 상담자… 탭 위에 있다', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  const filter = page.indexOf('id="campFilterWrap"');
  const tabs = page.indexOf('id="mainTabs"');
  assert.ok(filter > 0 && tabs > 0 && filter < tabs, '캠프 선택 줄이 탭보다 먼저 나온다');
});

test('숨긴(hidden) 버튼은 실제로 안 보인다 — 관리자 지정은 마스터에게만, 캠프 관리·이름 수정은 관리자에게만', () => {
  const page = readFileSync(root + 'src/pages/camp-resources/index.astro', 'utf8');
  assert.match(page, /\[hidden\] \{ display:none !important; \}/);
  assert.match(page, /id="managersBtn" type="button" hidden/);
  assert.match(page, /els\.managersBtn\.hidden = !editMode \|\| !isMaster;/);
});

test('연도·시즌을 바꿀 때 기본 캠프로 되돌아가지 않는다 — 기본 캠프는 첫 화면에서만 적용', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/camp-resources/index.astro', import.meta.url), 'utf8');
  // 연도 선택은 selectedCampId 를 비운 채 다시 그리므로, 이미 연도가 정해진 뒤에는 기본 캠프를 다시 적용하면 안 된다
  assert.match(page, /if \(!selectedCampId && !selectedYear && applyDefaultCampSelection\(\)\)/);
  assert.doesNotMatch(page, /if \(!selectedCampId && applyDefaultCampSelection\(\)\)/);
  const handler = page.slice(page.indexOf("els.yearSelect.addEventListener('change'"), page.indexOf("els.seasonToggle.addEventListener('click'"));
  assert.match(handler, /selectedYear = els\.yearSelect\.value;/);
  assert.match(handler, /selectedSeason = '';/);
  assert.match(handler, /selectedCampId = '';/);
});
