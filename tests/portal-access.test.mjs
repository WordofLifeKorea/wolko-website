import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as H from '../functions/lib/hubAccounts.js';
import { allowedTools, canUseTool, toolOfApi, JEJU_MEMBER_TOOLS, FULL_ACCESS_EMAILS } from '../functions/lib/portalAccess.js';
import { onRequest as middleware } from '../functions/api/_middleware.js';
import * as Me from '../functions/api/hub/me.js';
import * as Dash from '../functions/api/portal/dashboard.js';
import { reporterRoster } from '../functions/lib/gospelReminder.js';

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  const acc = (email, campus, role = 'counselor', name = email.split('@')[0]) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role, campus, status: 'approved', phone: '010-1234-5678' }));
  const bearer = async (email, role = 'counselor') => ({ Authorization: 'Bearer ' + await H.createHubSessionToken('secret', email, role) });
  return { env, acc, bearer };
}
const ALL_TOOLS = ['/portal/schedule', '/portal/crs', '/portal/wolkoevents', '/portal/resource', '/portal/gospel-stats', '/portal/prayers', '/portal/wolkoadmin', '/portal/campstaff', '/portal/camp-resources', '/portal/campteam', '/portal/expense', '/portal/car-drive', '/portal/kitchen', '/portal/mypage'];

test('제주팀 일반 멤버는 CRS · Resource & Media · 기도제목 · 캠프 관리자 · 경비 리포트 · 내 페이지만', () => {
  assert.deepEqual(JEJU_MEMBER_TOOLS, ['/portal/crs', '/portal/resource', '/portal/prayers', '/portal/wolkoadmin', '/portal/expense', '/portal/mypage']);
  assert.deepEqual(allowedTools({ role: 'counselor', campus: 'jeju', email: 'a@wol.org' }), JEJU_MEMBER_TOOLS);
  for (const campus of ['wolko', undefined, '']) assert.equal(allowedTools({ role: 'counselor', campus, email: 'a@wol.org' }), null, `평택(${campus})은 전체 메뉴`);
  for (const role of ['admin', 'master']) assert.equal(allowedTools({ role, campus: 'jeju', email: 'a@wol.org' }), null, `제주 ${role} 는 전체 메뉴`);
  assert.ok(JEJU_MEMBER_TOOLS.every(t => ALL_TOOLS.includes(t)), '목록의 주소가 실제 도구 주소다');
  const blocked = ALL_TOOLS.filter(t => !JEJU_MEMBER_TOOLS.includes(t));
  assert.deepEqual(blocked.sort(), ['/portal/campstaff', '/portal/camp-resources', '/portal/campteam', '/portal/car-drive', '/portal/gospel-stats', '/portal/kitchen', '/portal/schedule', '/portal/wolkoevents'].sort());
  assert.equal(canUseTool(null, '/portal/kitchen'), true); assert.equal(canUseTool(JEJU_MEMBER_TOOLS, '/portal/kitchen'), false);
});

test('제주팀 매니저급(FULL_ACCESS_EMAILS)은 관리자가 아니어도 전체 메뉴', () => {
  FULL_ACCESS_EMAILS.push('Dean@WOL.org');
  try {
    assert.equal(allowedTools({ role: 'counselor', campus: 'jeju', email: 'dean@wol.org' }), null);
    assert.deepEqual(allowedTools({ role: 'counselor', campus: 'jeju', email: 'other@wol.org' }), JEJU_MEMBER_TOOLS);
  } finally { FULL_ACCESS_EMAILS.pop(); }
});

test('도구 목록의 주소는 레일(wolko-rail.js)과 포탈 첫 화면(portal.astro)의 도구 주소와 같다', () => {
  const rail = readFileSync(new URL('../public/wolko-rail.js', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');
  for (const href of ALL_TOOLS) { assert.ok(rail.includes(`href: '${href}'`), `rail ${href}`); assert.ok(home.includes(`href: '${href}'`), `home ${href}`); }
});

test('/api/hub/me 와 대시보드가 쓸 수 있는 도구를 알려 준다', async () => {
  const t = setup();
  await t.acc('jj@wol.org', 'jeju'); await t.acc('pt@wol.org', 'wolko'); await t.acc('samuelsong@wol.org', 'jeju', 'admin'); await t.acc('jacobmorse@wol.org', 'jeju', 'admin');
  const me = async email => (await (await Me.onRequestGet({ env: t.env, request: new Request('https://t.co/api/hub/me', { headers: await t.bearer(email) }) })).json());
  assert.deepEqual((await me('jj@wol.org')).tools, JEJU_MEMBER_TOOLS);
  assert.equal((await me('pt@wol.org')).tools, null);
  assert.equal((await me('samuelsong@wol.org')).tools, null, '관리자는 제주팀이어도 전체');
  assert.equal((await me('jacobmorse@wol.org')).tools, null, 'Jacob(마스터와 같은 권한)도 전체');
  const dash = async email => (await (await Dash.onRequestGet({ env: t.env, request: new Request('https://t.co/api/portal/dashboard', { headers: await t.bearer(email) }) })).json());
  const d = await dash('jj@wol.org');
  assert.deepEqual(d.tools, JEJU_MEMBER_TOOLS);
  for (const key of ['kitchen', 'car', 'events']) assert.ok(d.hidden.includes(key), `${key} 칸은 숨긴다`);
  assert.equal(d.kitchen, null); assert.equal(d.car, null); assert.equal(d.events, null);
  assert.deepEqual([d.me.kitchen, d.me.car, d.me.gospelPending], [[], [], false], '알림에도 쓸 수 없는 도구 항목이 없다');
  const wolko = await dash('pt@wol.org');
  assert.equal(wolko.tools, null); assert.ok(!wolko.hidden.includes('events'));
});

test('서버: 제한된 도구의 API 는 제주팀 일반 멤버에게 403, 나머지는 그대로 통과', async () => {
  const t = setup();
  await t.acc('jj@wol.org', 'jeju'); await t.acc('pt@wol.org', 'wolko'); await t.acc('samuelsong@wol.org', 'jeju', 'admin'); await t.acc('pending@wol.org', 'jeju');
  await t.env.CAMP_KV.put('hub:account:pending@wol.org', JSON.stringify({ email: 'pending@wol.org', campus: 'jeju', status: 'pending' }));
  const run = async (path, headers = {}) => {
    let passed = false;
    const res = await middleware({ env: t.env, request: new Request('https://t.co' + path, { headers }), next: async () => { passed = true; return new Response('ok'); } });
    return { passed, status: res.status };
  };
  const jj = await t.bearer('jj@wol.org');
  for (const path of ['/api/car/drive', '/api/kitchen/duty', '/api/portal/gospel-stats', '/api/portal/gospel-reporters', '/api/schedule/events', '/api/campteam/members', '/api/camp-progress/data', '/api/teach/camps', '/api/rsvp-manual']) {
    const r = await run(path, jj); assert.deepEqual([path, r.passed, r.status], [path, false, 403]);
  }
  for (const path of ['/api/portal/resources', '/api/portal/prayers', '/api/portal/dashboard', '/api/expense/reports', '/api/admin/registrations', '/api/hub/me', '/api/newsletter/profile', '/api/geocode', '/api/rsvp', '/api/portal/notices']) {
    assert.equal((await run(path, jj)).passed, true, path);
  }
  assert.equal((await run('/api/car/drive', await t.bearer('pt@wol.org'))).passed, true, '평택은 통과');
  assert.equal((await run('/api/car/drive', await t.bearer('samuelsong@wol.org', 'admin'))).passed, true, '제주 관리자는 통과');
  assert.equal((await run('/api/car/drive')).passed, true, '토큰이 없으면 각 API 의 원래 인증에 맡긴다');
  assert.equal((await run('/api/car/drive', { Authorization: 'Bearer nonsense' })).passed, true, '포탈 토큰이 아니면 통과');
  assert.equal((await run('/api/campteam/members', { Authorization: 'Bearer camp.token.value' })).passed, true, '캠프팀 별도 로그인 토큰');
  assert.equal(toolOfApi('/api/portal/resource-file'), null);
  const body = await (await middleware({ env: t.env, request: new Request('https://t.co/api/car/drive', { headers: jj }), next: async () => new Response('x') })).json();
  assert.equal(body.code, 'tool_not_allowed');
});

test('복음 통계를 열 수 없는 제주팀 일반 멤버는 보고 대상(알림·미제출 명단)이 아니다', async () => {
  const t = setup();
  await t.acc('jj@wol.org', 'jeju'); await t.acc('pt@wol.org', 'wolko'); await t.acc('samuelsong@wol.org', 'jeju', 'admin');
  const emails = (await reporterRoster(t.env)).map(p => p.email).sort();
  assert.deepEqual(emails, ['pt@wol.org', 'samuelsong@wol.org']);
});

test('화면 스크립트(wolko-access.js): 허용 목록 밖의 /portal 도구 주소는 하위 주소까지 막고, 첫 화면·포탈 밖은 연다', async () => {
  const vm = await import('node:vm');
  const src = readFileSync(new URL('../public/wolko-access.js', import.meta.url), 'utf8');
  const tools = [...JEJU_MEMBER_TOOLS];
  const store = { 'wolko-hub-token': 'tok-1234567890abcdefgh', ['wolko-hub-me:' + 'tok-1234567890abcdefgh'.slice(-16)]: JSON.stringify({ tools }) };
  const window = {};
  const document = { documentElement: { lang: 'ko' }, body: null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  vm.runInNewContext(src, { window, document, sessionStorage: { getItem: k => store[k] ?? null, setItem() {} }, location: { pathname: '/portal/crs' }, fetch: async () => ({ ok: false }), setTimeout });
  const A = window.WolkoAccess;
  assert.equal(JSON.stringify(A.tools()), JSON.stringify(tools));
  for (const ok of ['/portal', '/portal/', '/portal/crs', '/portal/crs/', '/portal/expense/report', '/portal/mypage', '/', '/camp/summer', '/api/hub/me']) assert.equal(A.allows(ok), true, ok);
  for (const no of ['/portal/car-drive', '/portal/car', '/portal/car-log', '/portal/kitchen', '/portal/schedule', '/portal/wolkoevents', '/portal/gospel-stats', '/portal/gospel-stats/mric', '/portal/campstaff', '/portal/camp-resources', '/portal/campteam', '/portal/campteam/budget', '/portal/serve-applications', '/portal/notify-check', '/portal/crsx']) assert.equal(A.allows(no), false, no);
  // tools 가 null(제한 없음)이면 전부 연다
  const open = {}; vm.runInNewContext(src, { window: open, document, sessionStorage: { getItem: k => (k === 'wolko-hub-token' ? 'tok-1234567890abcdefgh' : k.startsWith('wolko-hub-me:') ? JSON.stringify({ tools: null }) : null), setItem() {} }, location: { pathname: '/portal/kitchen' }, fetch: async () => ({ ok: false }), setTimeout });
  assert.equal(open.WolkoAccess.allows('/portal/kitchen'), true);
});

test('제한된 도구 페이지를 쓰는 모든 포탈 페이지에 접근 스크립트가 연결돼 있다(레일 또는 직접)', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  assert.match(read('public/wolko-rail.js'), /wolko-access\.js\?v=\d+/);
  assert.match(read('src/layouts/CampTeamLayout.astro'), /wolko-access\.js/, '캠프팀 모든 페이지');
  for (const page of ['src/pages/portal/gospel-stats/mric/index.astro', 'src/pages/portal/serve-applications/index.astro', 'src/pages/portal/serve-inquiries/index.astro', 'src/pages/portal/notify-check/index.astro']) assert.match(read(page), /wolko-access\.js/, page);
  for (const page of ['schedule/index', 'wolkoevents', 'gospel-stats/index', 'campstaff/index', 'camp-resources/index', 'car-drive/index', 'kitchen/index']) assert.match(read(`src/pages/portal/${page}.astro`), /wolko-rail\.js\?v=\d+/, page);
});
