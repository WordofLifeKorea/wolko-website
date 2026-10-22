import assert from 'node:assert/strict';
import test from 'node:test';
import * as HL from '../functions/api/campteam/home-layout.js';
import * as Home from '../functions/api/campteam/home.js';
import * as Audit from '../functions/api/campteam/audit.js';
import * as Exp from '../functions/api/campteam/export.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Files from '../functions/api/campteam/files.js';
import * as Meetings from '../functions/api/campteam/meetings.js';
import * as Budget from '../functions/api/campteam/budget.js';
import * as Members from '../functions/api/campteam/members.js';
import * as TvConfig from '../functions/api/campteam/tv-config.js';
import * as Notices from '../functions/api/campteam/notices.js';
import * as Glossary from '../functions/api/campteam/glossary.js';
import * as Trash from '../functions/api/campteam/trash.js';
import { sanitizeHomeLayout, defaultHomeLayout, SECTION_IDS } from '../functions/lib/campteamHomeLayout.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const METHOD = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: METHOD[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();
const layoutOf = (hide = [], order = SECTION_IDS, wide = []) => ({ sections: order.map((id) => ({ id, show: !hide.includes(id), size: wide.includes(id) || ['stats', 'budget'].includes(id) ? 'full' : 'half' })) });

test('홈 배치 검사: 기본 배치는 모든 섹션이 보이고, 이상한 값은 거부하며, 빠진 섹션은 끝에 채운다', () => {
  assert.equal(defaultHomeLayout().sections.length, SECTION_IDS.length);
  assert.ok(defaultHomeLayout().sections.every((s) => s.show));
  assert.ok(sanitizeHomeLayout(defaultHomeLayout()).layout);
  for (const bad of [null, {}, { sections: 'x' }, { sections: [{ id: 'hack', size: 'half' }] }, { sections: [{ id: 'camps', size: 'huge' }] }, { sections: [{ id: 'camps', size: 'half' }, { id: 'camps', size: 'half' }] }, { sections: Array(9).fill({ id: 'camps', size: 'half' }) }])
    assert.ok(sanitizeHomeLayout(bad).error, JSON.stringify(bad).slice(0, 60));
  const partial = sanitizeHomeLayout({ sections: [{ id: 'files', show: true, size: 'full' }, { id: 'camps', show: false, size: 'half' }] }).layout.sections;
  assert.deepEqual(partial.slice(0, 2).map((s) => s.id), ['files', 'camps']);
  assert.equal(partial.length, SECTION_IDS.length, '빠진 섹션은 뒤에 붙는다');
  assert.equal(partial[1].show, false);
  assert.match(sanitizeHomeLayout(layoutOf(SECTION_IDS)).error, /하나는/, '전부 숨기기는 거부');
  assert.deepEqual(Object.keys(sanitizeHomeLayout({ sections: [{ id: 'camps', show: 1, size: 'half', evil: '<script>' }] }).layout.sections[0]), ['id', 'show', 'size'], '알 수 없는 키는 버린다');
});

test('홈 배치 API: 로그인 필요, 내 배치는 누구나·내 것만, 모두의 기본 배치는 관리자만', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call(HL, 'onRequestGet', env, null)).status, 401);
  assert.equal((await call(HL, 'onRequestPut', env, null, { body: { scope: 'mine', layout: layoutOf() } })).status, 401);
  const first = await J(await call(HL, 'onRequestGet', env, U.view));
  assert.equal(first.mine, null); assert.equal(first.default, null); assert.deepEqual(first.effective, defaultHomeLayout()); assert.equal(first.canEditDefault, false);
  assert.equal((await J(await call(HL, 'onRequestGet', env, U.admin))).canEditDefault, true);

  // 조회만 사용자도 "내 홈"은 저장할 수 있지만, 기본 홈은 못 바꾼다
  const mine = layoutOf(['agenda'], ['files', ...SECTION_IDS.filter((x) => x !== 'files')]);
  const r = await call(HL, 'onRequestPut', env, U.view, { body: { scope: 'mine', layout: mine } }); assert.equal(r.status, 200);
  assert.deepEqual((await J(r)).effective.sections.map((s) => s.id).slice(0, 2), ['files', 'stats']);
  for (const who of [U.view, U.fin, U.mem]) assert.equal((await call(HL, 'onRequestPut', env, who, { body: { scope: 'default', layout: layoutOf() } })).status, 403, who);
  assert.equal((await call(HL, 'onRequestDelete', env, U.mem, { qs: '?scope=default' })).status, 403);

  // 다른 사람의 배치에는 영향이 없다
  assert.deepEqual((await J(await call(HL, 'onRequestGet', env, U.mem))).effective, defaultHomeLayout());
  assert.equal((await J(await call(HL, 'onRequestGet', env, U.view))).mine.sections[0].id, 'files');

  // 관리자가 기본 홈을 바꾸면: 개인 배치가 없는 사람은 따라가고, 있는 사람은 자기 것이 우선
  const def = layoutOf(['files', 'meetings']);
  assert.equal((await call(HL, 'onRequestPut', env, U.admin, { body: { scope: 'default', layout: def } })).status, 200);
  const memNow = await J(await call(HL, 'onRequestGet', env, U.mem)); assert.equal(memNow.effective.sections.find((s) => s.id === 'files').show, false);
  const viewNow = await J(await call(HL, 'onRequestGet', env, U.view)); assert.equal(viewNow.effective.sections[0].id, 'files', '개인 배치가 우선');
  // 내 배치 초기화 → 기본(관리자) 홈을 따라간다
  const back = await J(await call(HL, 'onRequestDelete', env, U.view, { qs: '?scope=mine' }));
  assert.equal(back.mine, null); assert.equal(back.effective.sections.find((s) => s.id === 'files').show, false);
  // 기본 홈 초기화는 관리자만, 처음 모양으로
  assert.deepEqual((await J(await call(HL, 'onRequestDelete', env, U.admin, { qs: '?scope=default' }))).effective, defaultHomeLayout());

  for (const body of [{ scope: 'other', layout: layoutOf() }, { scope: 'mine', layout: { sections: [{ id: 'x', size: 'half' }] } }, { scope: 'mine' }, { scope: 'mine', layout: layoutOf(SECTION_IDS) }])
    assert.equal((await call(HL, 'onRequestPut', env, U.mem, { body })).status, 400, JSON.stringify(body).slice(0, 50));
  assert.equal((await call(HL, 'onRequestDelete', env, U.mem, { qs: '?scope=zzz' })).status, 400);
});

test('홈 배치: 기본 배치 저장·초기화는 변경 기록에 남고, 개인 배치는 기록하지 않으며, 백업에 포함된다', async () => {
  const env = makeEnv(fakeD1());
  await call(HL, 'onRequestPut', env, U.mem, { body: { scope: 'mine', layout: layoutOf() } });
  await call(HL, 'onRequestPut', env, U.admin, { body: { scope: 'default', layout: layoutOf(['files']) } });
  await call(HL, 'onRequestDelete', env, U.admin, { qs: '?scope=default' });
  const log = (await J(await call(Audit, 'onRequestGet', env, U.admin))).items.filter((a) => a.entity === 'home_layout');
  assert.deepEqual(log.map((a) => a.action).sort(), ['reset', 'save']);
  assert.ok(log.every((a) => a.actor === 'test-admin@wolko.org'));
  const dump = await J(await call(Exp, 'onRequestGet', env, U.admin));
  assert.ok(Array.isArray(dump.tables.home_layout)); assert.equal(dump.tables.home_layout.length, 1, '내 배치 한 건만 남음(기본은 초기화됨)');
});

test('홈 배치가 깨져 있어도 홈은 기본 모양으로 열린다', async () => {
  const env = makeEnv(fakeD1());
  await env.DB.prepare(`INSERT INTO home_layout (scope,json,updatedAt) VALUES ('default','{oops',?1)`).bind(new Date().toISOString()).run();
  await env.DB.prepare(`INSERT INTO home_layout (scope,json,updatedAt) VALUES ('u:test-member@wolko.org',?1,?2)`).bind(JSON.stringify({ sections: [{ id: 'nope', size: 'half' }] }), new Date().toISOString()).run();
  const v = await J(await call(HL, 'onRequestGet', env, U.mem));
  assert.equal(v.default, null); assert.equal(v.mine, null); assert.deepEqual(v.effective, defaultHomeLayout());
});

test('접근 권한 표: 역할(비로그인·조회만·재정·팀원·관리자)별로 같은 요청이 어떻게 달라지는지 한 번에 확인', async () => {
  // 기대값: 숫자 = 그 상태여야 함, '!403' = 권한 오류만 아니면 됨(입력이 틀려 400/404 가 나와도 "권한은 통과")
  const rows = [
    ['홈 요약', Home, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['홈 배치 읽기', HL, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['캠프 목록', Camps, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['업무 목록', Tasks, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['자료 목록', Files, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['회의 목록', Meetings, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['공지 읽기', Notices, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['용어집 읽기', Glossary, 'onRequestGet', {}, [401, 200, 200, 200, 200]],
    ['예산 읽기(금액)', Budget, 'onRequestGet', { qs: '?campId=camp-u26' }, [401, 403, 200, 200, 200]],
    ['업무 만들기', Tasks, 'onRequestPost', { body: {} }, [401, 403, 403, '!403', '!403']],
    ['캠프 만들기', Camps, 'onRequestPost', { body: {} }, [401, 403, 403, '!403', '!403']],
    ['공지 만들기', Notices, 'onRequestPost', { body: {} }, [401, 403, 403, '!403', '!403']],
    ['회의 만들기', Meetings, 'onRequestPost', { body: {} }, [401, 403, 403, '!403', '!403']],
    ['예산 항목 만들기(금액 쓰기)', Budget, 'onRequestPost', { body: {} }, [401, 403, '!403', '!403', '!403']],
    ['휴지통 목록', Trash, 'onRequestGet', {}, [401, 403, '!403', '!403', '!403']],
    ['내 홈 저장', HL, 'onRequestPut', { body: { scope: 'mine', layout: layoutOf() } }, [401, 200, 200, 200, 200]],
    ['모두의 기본 홈 저장', HL, 'onRequestPut', { body: { scope: 'default', layout: layoutOf() } }, [401, 403, 403, 403, 200]],
    ['팀 명단 보기', Members, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['변경 기록', Audit, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['전체 내보내기', Exp, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
    ['TV 설정(열쇠 포함)', TvConfig, 'onRequestGet', {}, [401, 403, 403, 403, 200]],
  ];
  const roles = [null, U.view, U.fin, U.mem, U.admin], names = ['비로그인', '조회만', '재정', '팀원', '관리자'];
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
    assert.deepEqual(who.perms, { read: true, write: false, moneyRead: false, moneyWrite: false, manageMembers: false }, hubRole);
    const b = await Budget.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/budget?campId=camp-u26', { headers: { Authorization: 'Bearer ' + token } }) });
    assert.equal(b.status, 403, hubRole + ' 는 금액을 볼 수 없다');
    const d = await HL.onRequestPut({ env, request: new Request('http://localhost:8788/api/campteam/home-layout', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'default', layout: layoutOf() }) }) });
    assert.equal(d.status, 403, hubRole + ' 는 기본 홈을 바꿀 수 없다');
  }
});
