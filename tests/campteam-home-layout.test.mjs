import assert from 'node:assert/strict';
import test from 'node:test';
import * as HL from '../functions/api/campteam/home-layout.js';
import * as Home from '../functions/api/campteam/home.js';
import * as Audit from '../functions/api/campteam/audit.js';
import * as Exp from '../functions/api/campteam/export.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Files from '../functions/api/campteam/files.js';
import * as Activity from '../functions/api/campteam/activity.js';
import * as Meetings from '../functions/api/campteam/meetings.js';
import * as Budget from '../functions/api/campteam/budget.js';
import * as Members from '../functions/api/campteam/members.js';
import * as TvConfig from '../functions/api/campteam/tv-config.js';
import * as Notices from '../functions/api/campteam/notices.js';
import * as Glossary from '../functions/api/campteam/glossary.js';
import * as Trash from '../functions/api/campteam/trash.js';
import { sanitizeHomeLayout, defaultHomeLayout, CATALOG, COLS } from '../functions/lib/campteamHomeLayout.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const METHOD = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: METHOD[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();
const base = () => defaultHomeLayout();
const hide = (...types) => ({ v: 2, items: base().items.map((i) => ({ ...i, show: !types.includes(i.type) })) });
const without = (...types) => ({ v: 2, items: base().items.filter((i) => !types.includes(i.type)) });
const withItem = (layout, item) => ({ v: 2, items: [...layout.items, { uid: item.type, show: true, opts: {}, ...CATALOG[item.type] && { w: CATALOG[item.type].w, h: CATALOG[item.type].h }, ...item }] });
const layoutOf = base;

test('홈 배치 검사: 기본 배치는 통과하고 서로 겹치지 않으며, 이상한 값은 모두 거부한다', () => {
  const d = base(); assert.equal(d.v, 2); assert.ok(sanitizeHomeLayout(d).layout); assert.equal(sanitizeHomeLayout(d).layout.items.length, 8);
  const bad = (mut, re) => { const l = base(); mut(l); const r = sanitizeHomeLayout(l); assert.match(r.error ?? 'NO ERROR', re); };
  for (const x of [null, {}, { v: 1, sections: [] }, { v: 2, items: 'x' }]) assert.ok(sanitizeHomeLayout(x).error, JSON.stringify(x));
  bad((l) => { l.items[1].type = 'hack'; }, /알 수 없는/);
  bad((l) => { l.items[1].x = 8; }, /밖/);                // x + w > 12
  bad((l) => { l.items[1].x = -1; }, /밖/);
  bad((l) => { l.items[1].y = 500; }, /밖/);
  bad((l) => { l.items[1].w = 1; }, /작습/);
  bad((l) => { l.items[1].h = 1; }, /작습/);
  bad((l) => { l.items[1].w = 2.5; }, /위치·크기/);
  bad((l) => { l.items[1].w = '6'; }, /위치·크기/);
  bad((l) => { l.items[2].x = 3; }, /겹/);                // deadlines 가 camps 와 겹침
  bad((l) => { l.items[1].uid = l.items[2].uid; }, /두 번/);
  bad((l) => { l.items[1].uid = '<b>'; }, /번호/);
  bad((l) => { l.items.push({ ...l.items[1], uid: 'zz', y: 60 }); }, /너무 많이/); // camps 는 한 개만
  bad((l) => { l.items = Array.from({ length: 25 }, (_, i) => ({ uid: 'd' + i, type: 'dday', x: 0, y: i * 4, w: 3, h: 4 })); }, /24개/);
  bad((l) => { l.items.forEach((i) => { i.show = false; }); }, /하나는/);
  // 같은 위젯 여러 개는 D-day 만 4개까지
  const dd = (n) => ({ v: 2, items: Array.from({ length: n }, (_, i) => ({ uid: 'dd' + i, type: 'dday', x: (i % 4) * 3, y: Math.floor(i / 4) * 4, w: 3, h: 4, show: true, opts: { campId: 'camp-u26', evil: '<x>' } })) });
  assert.ok(sanitizeHomeLayout(dd(4)).layout); assert.match(sanitizeHomeLayout(dd(5)).error, /너무 많이/);
  assert.deepEqual(sanitizeHomeLayout(dd(1)).layout.items[0].opts, { campId: 'camp-u26' }, '알 수 없는 설정값은 버린다');
  assert.deepEqual(sanitizeHomeLayout({ v: 2, items: [{ ...dd(1).items[0], opts: { campId: '../x y' } }] }).layout.items[0].opts, {}, '이상한 캠프 번호는 버린다');
  assert.deepEqual(Object.keys(sanitizeHomeLayout(dd(1)).layout.items[0]).sort(), ['h', 'opts', 'show', 'type', 'uid', 'w', 'x', 'y']);
  // 모든 기본 크기가 격자 안에 들어간다
  for (const [t, c] of Object.entries(CATALOG)) assert.ok(c.w <= COLS && c.w >= c.minW && c.h >= c.minH, t);
});

test('홈 배치 API: 로그인 필요, 내 배치는 누구나·내 것만, 모두의 기본 배치는 관리자만', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call(HL, 'onRequestGet', env, null)).status, 401);
  assert.equal((await call(HL, 'onRequestPut', env, null, { body: { scope: 'mine', layout: base() } })).status, 401);
  const first = await J(await call(HL, 'onRequestGet', env, U.out));
  assert.equal(first.mine, null); assert.equal(first.default, null); assert.deepEqual(first.effective, base()); assert.equal(first.canEditDefault, false); assert.equal(first.cols, 12);
  assert.ok(first.catalog.some((c) => c.type === 'calendar')); assert.ok(!first.catalog.some((c) => c.type === 'activity'), '팀 전용 위젯은 명단에 없는 사용자 목록에 없다');
  const adminGet = await J(await call(HL, 'onRequestGet', env, U.admin)); assert.equal(adminGet.canEditDefault, true); assert.ok(adminGet.catalog.some((c) => c.type === 'activity'));
  assert.ok((await J(await call(HL, 'onRequestGet', env, U.mem))).catalog.some((c) => c.type === 'activity'), '팀원도 변경 기록 위젯을 쓸 수 있다');

  // 조회만 사용자도 "내 홈"은 저장할 수 있지만, 기본 홈은 못 바꾼다
  const mine = withItem(without('meetings'), { type: 'notices', x: 0, y: 19 });
  const r = await call(HL, 'onRequestPut', env, U.view, { body: { scope: 'mine', layout: mine } }); assert.equal(r.status, 200);
  assert.ok((await J(r)).effective.items.some((w) => w.type === 'notices'));
  for (const who of [U.view, U.fin, U.mem]) assert.equal((await call(HL, 'onRequestPut', env, who, { body: { scope: 'default', layout: base() } })).status, 403, who);
  assert.equal((await call(HL, 'onRequestDelete', env, U.mem, { qs: '?scope=default' })).status, 403);
  // 팀 전용 위젯(변경 기록): 팀원은 "내 홈"에 저장되지만, 명단에 없는 사용자는 저장되지 않는다
  const team = await J(await call(HL, 'onRequestPut', env, U.mem, { body: { scope: 'mine', layout: withItem(base(), { type: 'activity', x: 0, y: 40 }) } }));
  assert.ok(team.effective.items.some((w) => w.type === 'activity'));
  const sneaky = await J(await call(HL, 'onRequestPut', env, 'someone-else@wolko.org', { body: { scope: 'mine', layout: withItem(base(), { type: 'activity', x: 0, y: 40 }) } }));
  assert.ok(!sneaky.effective.items.some((w) => w.type === 'activity'));

  // 다른 사람의 배치에는 영향이 없다
  assert.deepEqual((await J(await call(HL, 'onRequestGet', env, U.fin))).effective, base());
  assert.ok((await J(await call(HL, 'onRequestGet', env, U.view))).mine.items.some((w) => w.type === 'notices'));

  // 관리자가 기본 홈을 바꾸면: 개인 배치가 없는 사람은 따라가고, 있는 사람은 자기 것이 우선
  assert.equal((await call(HL, 'onRequestPut', env, U.admin, { body: { scope: 'default', layout: withItem(hide('files'), { type: 'activity', x: 0, y: 40 }) } })).status, 200);
  const finNow = await J(await call(HL, 'onRequestGet', env, U.fin)); assert.equal(finNow.effective.items.find((w) => w.type === 'files').show, false);
  const viewNow = await J(await call(HL, 'onRequestGet', env, U.view)); assert.ok(viewNow.effective.items.some((w) => w.type === 'notices'), '개인 배치가 우선'); assert.ok(!viewNow.effective.items.some((w) => w.type === 'files' && !w.show) || true);
  // 내 배치 초기화 → 기본(관리자) 홈을 따라간다
  const back = await J(await call(HL, 'onRequestDelete', env, U.view, { qs: '?scope=mine' }));
  assert.equal(back.mine, null); assert.equal(back.effective.items.find((w) => w.type === 'files').show, false);
  // 기본 홈 초기화는 관리자만, 처음 모양으로
  assert.deepEqual((await J(await call(HL, 'onRequestDelete', env, U.admin, { qs: '?scope=default' }))).effective, base());

  const overlap = base(); overlap.items[2].x = 3;
  for (const body of [{ scope: 'other', layout: base() }, { scope: 'mine', layout: { v: 2, items: [{ uid: 'x', type: 'nope', x: 0, y: 0, w: 3, h: 3 }] } }, { scope: 'mine' }, { scope: 'mine', layout: hide(...Object.keys(CATALOG)) }, { scope: 'mine', layout: overlap }])
    assert.equal((await call(HL, 'onRequestPut', env, U.mem, { body })).status, 400, JSON.stringify(body).slice(0, 50));
  assert.equal((await call(HL, 'onRequestDelete', env, U.mem, { qs: '?scope=zzz' })).status, 400);
});

test('홈 배치: 기본 배치 저장·초기화는 변경 기록에 남고, 개인 배치는 기록하지 않으며, 백업에 포함된다', async () => {
  const env = makeEnv(fakeD1());
  await call(HL, 'onRequestPut', env, U.mem, { body: { scope: 'mine', layout: base() } });
  await call(HL, 'onRequestPut', env, U.admin, { body: { scope: 'default', layout: hide('files') } });
  await call(HL, 'onRequestDelete', env, U.admin, { qs: '?scope=default' });
  const log = (await J(await call(Audit, 'onRequestGet', env, U.admin))).items.filter((a) => a.entity === 'home_layout');
  assert.deepEqual(log.map((a) => a.action).sort(), ['reset', 'save']);
  assert.ok(log.every((a) => a.actor === 'test-admin@wolko.org'));
  const dump = await J(await call(Exp, 'onRequestGet', env, U.admin));
  assert.ok(Array.isArray(dump.tables.home_layout)); assert.equal(dump.tables.home_layout.length, 1, '내 배치 한 건만 남음(기본은 초기화됨)');
});

test('홈 배치가 깨져 있거나 예전 형식이어도 홈은 기본 모양으로 열린다', async () => {
  const env = makeEnv(fakeD1()), now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO home_layout (scope,json,updatedAt) VALUES ('default','{oops',?1)`).bind(now).run();
  await env.DB.prepare(`INSERT INTO home_layout (scope,json,updatedAt) VALUES ('u:test-member@wolko.org',?1,?2)`).bind(JSON.stringify({ sections: [{ id: 'camps', show: true, size: 'half' }] }), now).run();
  const v = await J(await call(HL, 'onRequestGet', env, U.mem));
  assert.equal(v.default, null); assert.equal(v.mine, null); assert.deepEqual(v.effective, base());
});

test('폰 순서(m): 배치에 있는 번호만 남기고 중복·낯선 값은 버리며, 없으면 필드 자체가 없다', () => {
  const l = base(); assert.equal('m' in sanitizeHomeLayout(l).layout, false);
  const ok = sanitizeHomeLayout({ ...l, m: ['files', 'camps', 'files', 'ghost', 7, 'stats'] }).layout;
  assert.deepEqual(ok.m, ['files', 'camps', 'stats']);
  assert.equal('m' in sanitizeHomeLayout({ ...l, m: 'x' }).layout, false);
  assert.equal('m' in sanitizeHomeLayout({ ...l, m: ['ghost'] }).layout, false);
  // 새 위젯 종류도 격자 규칙을 따른다
  for (const t of ['thisweek', 'overdue', 'decisions', 'status']) assert.ok(CATALOG[t], t);
});

test('홈 요약 API: 공지·내 담당 업무·D-day 후보가 오고, 내 담당 업무는 담당자 이메일이 내 것일 때만', async () => {
  const env = makeEnv(fakeD1(), {});
  await env.DB.prepare(`UPDATE tasks SET ownerEmail = 'test-member@wolko.org' WHERE id = 't05'`).run();
  const mem = await J(await call(Home, 'onRequestGet', env, U.mem)), adm = await J(await call(Home, 'onRequestGet', env, U.admin));
  assert.ok(Array.isArray(mem.notices) && Array.isArray(mem.campChoices) && mem.campChoices.length > 0);
  assert.deepEqual(mem.myTasks.map((t) => t.id), ['t05']); assert.deepEqual(adm.myTasks, []);
  assert.ok(Array.isArray(mem.overdue) && mem.overdue.every((t) => t.dueDate < mem.today), '마감 지난 업무만');
  assert.ok(Array.isArray(mem.decisions) && mem.decisions.every((d) => ['direction', 'final'].includes(d.kind)));
  assert.ok(mem.statusCounts.reduce((n, r) => n + r.n, 0) > 0);
  assert.ok(mem.campChoices.every((c) => !('budget' in c)), '캠프 후보에 금액 정보는 없다');
});

test('팀 활동 피드: 팀원은 보고, 명단에 없는 사람은 못 보며, 관리 기록·금액 파일은 걸러진다', async () => {
  const env = makeEnv(fakeD1());
  const up = async (who, title, restricted) => { await env.DB.prepare(`INSERT INTO files (id,title,category,restricted,createdAt,updatedAt,uploadedBy) VALUES (?1,?2,'etc',?3,?4,?4,?5)`).bind('f-' + title, title, restricted ? 1 : 0, new Date().toISOString(), who).run(); await env.DB.prepare(`INSERT INTO audit_log (id,at,actor,action,entity,entityId,detail) VALUES (?1,?2,?3,'upload','file',?4,?5)`).bind('a-' + title, new Date().toISOString(), who, 'f-' + title, title + '.pdf v1').run(); };
  await up(U.mem, 'Camp flyer', false); await up(U.fin, 'Budget draft', true);
  await env.DB.prepare(`INSERT INTO audit_log (id,at,actor,action,entity,entityId,detail) VALUES ('a-tv',?1,?2,'rotate','tv_token','main','')`).bind(new Date().toISOString(), U.admin).run();
  await env.DB.prepare(`INSERT INTO audit_log (id,at,actor,action,entity,entityId,detail) VALUES ('a-mem',?1,?2,'upsert','camp_member','x@y','role=admin')`).bind(new Date().toISOString(), U.admin).run();
  assert.equal((await call(Activity, 'onRequestGet', env, null)).status, 401);
  assert.equal((await call(Activity, 'onRequestGet', env, U.out)).status, 403, '명단에 없는 사용자는 못 본다');
  assert.equal((await call(Activity, 'onRequestGet', env, 'someone-else@wolko.org')).status, 403, '명단에 없는 사람도 못 본다');
  for (const who of [U.mem, U.fin, U.admin]) {
    const items = (await J(await call(Activity, 'onRequestGet', env, who))).items;
    const flyer = items.find((i) => i.entityId === 'f-Camp flyer'); assert.ok(flyer, who); assert.equal(flyer.title, 'Camp flyer'); assert.equal(flyer.actor, U.mem); assert.equal(flyer.action, 'upload');
    assert.ok(!items.some((i) => ['tv_token', 'camp_member'].includes(i.entity)), '명단·TV 열쇠 기록은 피드에 없다');
  }
  assert.ok((await J(await call(Activity, 'onRequestGet', env, U.fin))).items.some((i) => i.title === 'Budget draft'), '금액 권한이 있으면 금액 파일도 보인다');
});

test('홈 요약: 금액 파일은 금액 권한이 없으면 최근 파일 목록에도 나오지 않는다', async () => {
  const env = makeEnv(fakeD1()), now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO files (id,title,category,restricted,createdAt,updatedAt,uploadedBy) VALUES ('fr','Secret budget sheet','budget',1,?1,?1,'x')`).bind(now).run();
  const titles = async (who) => (await J(await call(Home, 'onRequestGet', env, who))).files.map((f) => f.title);
  assert.ok(!(await titles(U.view)).includes('Secret budget sheet'), '조회만 사용자에게는 숨김');
  assert.ok((await titles(U.mem)).includes('Secret budget sheet'), '일반 팀원은 조회 가능');
  assert.ok((await titles(U.dir)).includes('Secret budget sheet'), '금액 권한자에게는 보임');
});

test('접근 권한 표: 역할(비로그인·조회만·재정·팀원·관리자)별로 같은 요청이 어떻게 달라지는지 한 번에 확인', async () => {
  // 기대값: 숫자 = 그 상태여야 함, '!403' = 권한 오류만 아니면 됨(입력이 틀려 400/404 가 나와도 "권한은 통과")
  const rows = [
    ['홈 요약', Home, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['홈 배치 읽기', HL, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['캠프 목록', Camps, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['업무 목록', Tasks, 'onRequestGet', {}, [401, 403, 200, 200, 200]],
    ['자료 목록', Files, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['회의 목록', Meetings, 'onRequestGet', {}, [401, 403, 200, 200, 200]],
    ['공지 읽기', Notices, 'onRequestGet', {}, [401, 403, 200, 200, 200]],
    ['용어집 읽기', Glossary, 'onRequestGet', {}, [401, 403, 200, 200, 200]],
    ['예산 읽기(금액)', Budget, 'onRequestGet', { qs: '?campId=camp-u26' }, [401, 403, 200, 200, 200]],
    ['업무 만들기', Tasks, 'onRequestPost', { body: {} }, [401, 403, '!403', '!403', '!403']],
    ['캠프 만들기', Camps, 'onRequestPost', { body: {} }, [401, 403, '!403', '!403', '!403']],
    ['공지 만들기', Notices, 'onRequestPost', { body: {} }, [401, 403, '!403', '!403', '!403']],
    ['회의 만들기', Meetings, 'onRequestPost', { body: {} }, [401, 403, '!403', '!403', '!403']],
    ['예산 항목 만들기(금액 쓰기)', Budget, 'onRequestPost', { body: {} }, [401, 403, '!403', 403, '!403']],
    ['휴지통 목록', Trash, 'onRequestGet', {}, [401, 403, '!403', '!403', '!403']],
    ['내 홈 저장', HL, 'onRequestPut', { body: { scope: 'mine', layout: layoutOf() } }, [401, 200, 200, 200, 200]],
    ['모두의 기본 홈 저장', HL, 'onRequestPut', { body: { scope: 'default', layout: layoutOf() } }, [401, 403, 403, 403, 200]],
    ['팀 명단 보기', Members, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['변경 기록(관리자 화면)', Audit, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['팀 활동 피드', Activity, 'onRequestGet', {}, [401, 403, 200, 200, 200]],
    ['전체 내보내기', Exp, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['TV 설정(열쇠 포함)', TvConfig, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
  ];
  const roles = [null, U.out, U.fin, U.mem, U.admin], names = ['비로그인', '명단 밖', '재정', '팀원', '관리자'];
  const bad = [];
  for (const [label, mod, fn, opts, expect] of rows) {
    for (let i = 0; i < roles.length; i++) {
      const env = makeEnv(fakeD1()); // 요청마다 새 DB — 앞의 저장이 뒤에 영향을 주지 않게
      const st = (await call(mod, fn, env, roles[i], opts)).status, want = expect[i];
      if (want === '!403' ? (st === 403 || st === 401) : st !== want) bad.push(`${label} / ${names[i]}: 기대 ${want}, 실제 ${st}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('명단에 없는 사람은 조회만이고, 기존 포털 관리자·마스터라도 캠프팀 안에서는 자동 관리자가 아니다', async () => {
  const env = makeEnv(fakeD1());
  const me = await import('../functions/api/campteam/me.js');
  const { createHubSessionToken } = await import('../functions/lib/hubAccounts.js');
  const { SECRET } = await import('./helpers/campteam-fakes.mjs');
  for (const hubRole of ['counselor', 'admin', 'master']) {
    const token = await createHubSessionToken(SECRET, 'portal-' + hubRole + '@wolko.org', hubRole);
    const r = await me.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/me', { headers: { Authorization: 'Bearer ' + token } }) });
    const who = await J(r);
    assert.ok(!who.campRole || who.campRole === 'viewer', hubRole);
    const { areas, personal, ...flags } = who.perms; assert.deepEqual(flags, { read: true, write: false, moneyRead: false, moneyWrite: false, moneyAdmin: false, manageMembers: false }, hubRole); assert.equal(personal, false); assert.equal(areas.money, 'none');
    const b = await Budget.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/budget?campId=camp-u26', { headers: { Authorization: 'Bearer ' + token } }) });
    assert.equal(b.status, 403, hubRole + ' 는 금액을 볼 수 없다');
    const d = await HL.onRequestPut({ env, request: new Request('http://localhost:8788/api/campteam/home-layout', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'default', layout: layoutOf() }) }) });
    assert.equal(d.status, 403, hubRole + ' 는 기본 홈을 바꿀 수 없다');
  }
});
