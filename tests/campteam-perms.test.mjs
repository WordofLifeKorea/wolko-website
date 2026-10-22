import assert from 'node:assert/strict';
import test from 'node:test';
import * as MP from '../functions/api/campteam/member-perms.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Events from '../functions/api/campteam/events.js';
import * as Meetings from '../functions/api/campteam/meetings.js';
import * as Decisions from '../functions/api/campteam/decisions.js';
import * as Files from '../functions/api/campteam/files.js';
import * as FileUrl from '../functions/api/campteam/file-url.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Space from '../functions/api/campteam/camp-space.js';
import * as Portal from '../functions/api/campteam/camp-portal.js';
import * as Search from '../functions/api/campteam/search.js';
import * as Cal from '../functions/api/campteam/calendar.js';
import * as Home from '../functions/api/campteam/home.js';
import * as Alerts from '../functions/api/campteam/alerts.js';
import * as Trash from '../functions/api/campteam/trash.js';
import * as Cats from '../functions/api/campteam/ledger-categories.js';
import * as Summary from '../functions/api/campteam/ledger-summary.js';
import * as Budget from '../functions/api/campteam/budget.js';
import * as Me from '../functions/api/campteam/me.js';
import * as Meeting from '../functions/api/campteam/meeting.js';
import { permsFor, applyOverrides, roleAreas, canView, canWrite, AREAS } from '../functions/lib/campteamAuth.js';
import { todayKST, addDays } from '../functions/lib/campteamDb.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json(), T = todayKST();
const set = (env, email, overrides) => call(MP, 'onRequestPut', env, U.admin, { body: { email, overrides } });

test('역할 기본값은 그대로: 항목별 수준과 기존 권한 묶음이 같다', () => {
  assert.deepEqual(roleAreas('member'), { tasks: 'edit', meetings: 'edit', files: 'edit', camps: 'edit', money: 'view', personal: 'none', notices: 'edit' });
  assert.deepEqual(roleAreas('treasurer'), { tasks: 'view', meetings: 'view', files: 'view', camps: 'view', money: 'view', personal: 'none', notices: 'edit' });
  assert.deepEqual(roleAreas('director'), roleAreas('finance')); assert.equal(roleAreas('director').personal, 'view'); assert.deepEqual(roleAreas(null), { tasks: 'none', meetings: 'none', files: 'view', camps: 'view', money: 'none', personal: 'none', notices: 'none' }, '명단 밖: 캠프 목록과 공개 파일만');
  assert.equal(permsFor('member').write, true); assert.equal(permsFor('treasurer').write, false); assert.equal(permsFor('member').personal, false);
});

test('맞춤 권한 적용: 관리자 역할은 못 바꿈, 허용되지 않는 값은 무시, 금액 항목이 곧 금액 권한', () => {
  assert.deepEqual(applyOverrides('admin', { tasks: 'none', money: 'none' }).areas, roleAreas('admin'));
  const p = applyOverrides('member', { tasks: 'view', money: 'edit', personal: 'edit', meetings: 'bogus', zzz: 'edit' });
  assert.deepEqual(p.areas, { ...roleAreas('member'), tasks: 'view', money: 'edit' }); assert.equal(p.moneyWrite, true); assert.equal(p.moneyAdmin, true); assert.equal(p.write, true);
  const q = applyOverrides('member', { tasks: 'none', meetings: 'view', files: 'none', camps: 'view' }); assert.equal(q.write, false, '일반 자료를 하나도 못 고치면 write 도 꺼진다');
  assert.equal(canView(q, 'tasks'), false); assert.equal(canView(q, 'meetings'), true); assert.equal(canWrite(q, 'meetings'), false); assert.equal(applyOverrides('member', { money: 'none' }).moneyRead, false);
});

test('권한 설정 API: 관리자만, 형식·명단·고정 관리자 검사, 기본값과 같은 칸은 저장하지 않음, 변경 기록, 되돌리기', async () => {
  const env = makeEnv(fakeD1());
  for (const who of [null, U.out]) assert.ok([401, 403].includes((await call(MP, 'onRequestGet', env, who)).status));
  for (const who of [U.mem, U.dir, U.fin, U.tre]) { assert.equal((await call(MP, 'onRequestGet', env, who)).status, 403, who); assert.equal((await call(MP, 'onRequestPut', env, who, { body: { email: U.mem, overrides: { tasks: 'none' } } })).status, 403, who); }
  assert.deepEqual((await J(await call(MP, 'onRequestGet', env, U.admin))).list.filter((x) => x.email !== U.view), [], '권한 없는 사람의 시도는 아무것도 바꾸지 않았다');
  assert.equal((await set(env, 'nobody@example.com', { tasks: 'view' })).status, 404); assert.equal((await set(env, U.admin, { tasks: 'view' })).status, 400, '관리자는 바꿀 수 없다'); assert.equal((await set(env, 'aidenpark@wolko.org', { tasks: 'view' })).status, 400, '고정 관리자도');
  assert.equal((await set(env, U.mem, { bogus: 'view' })).status, 400); assert.equal((await set(env, U.mem, { personal: 'edit' })).status, 400, '개인정보에는 수정이 없다'); assert.equal((await set(env, U.mem, { tasks: 'maybe' })).status, 400); assert.equal((await call(MP, 'onRequestPut', env, U.admin, { body: { email: U.mem, overrides: 'x' } })).status, 400);
  const ok = await J(await set(env, U.mem, { tasks: 'view', meetings: 'edit', money: 'none', personal: 'view', files: null })); assert.deepEqual(ok.overrides, { tasks: 'view', money: 'none', personal: 'view' }, '기본값(meetings edit)과 같은 칸은 저장하지 않는다');
  const g = await J(await call(MP, 'onRequestGet', env, U.admin, { qs: '?email=' + encodeURIComponent(U.mem) })); assert.equal(g.role, 'member'); assert.equal(g.effective.tasks, 'view'); assert.equal(g.defaults.tasks, 'edit'); assert.deepEqual(g.areas, AREAS);
  assert.deepEqual((await J(await call(MP, 'onRequestGet', env, U.admin))).list.filter((x) => x.email !== U.view), [{ email: U.mem, custom: 3 }]);
  assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE entity = 'member_perms'`).get().n, 1, '변경은 기록에 남는다');
  assert.equal((await call(MP, 'onRequestDelete', env, U.mem, {})).status, 403); assert.equal((await call(MP, 'onRequestDelete', env, U.admin, { qs: '?email=' + encodeURIComponent(U.mem) })).status, 200);
  assert.deepEqual((await J(await call(MP, 'onRequestGet', env, U.admin))).list.filter((x) => x.email !== U.view), [], '되돌리면 기본값');
  const me = await J(await call(Me, 'onRequestGet', env, U.mem)); assert.equal(me.perms.areas.tasks, 'edit');
});

test('업무 항목: 보기만이면 쓰기 403(읽기 OK), 안 보임이면 업무·일정·검색·달력·홈·알림에서 모두 빠진다', async () => {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite;
  q.prepare(`INSERT INTO tasks (id,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy) VALUES ('pt1','권한시험 업무','m',?,?,'In Progress','Medium','x','x','t')`).run(U.mem, T);
  const body = { title: '새 업무', status: 'Not Started', priority: 'Medium' };
  assert.equal((await call(Tasks, 'onRequestPost', env, U.mem, { body })).status, 201);
  await set(env, U.mem, { tasks: 'view' });
  assert.equal((await call(Tasks, 'onRequestGet', env, U.mem)).status, 200); assert.equal((await call(Tasks, 'onRequestPost', env, U.mem, { body })).status, 403); assert.equal((await call(Tasks, 'onRequestPatch', env, U.mem, { qs: '?id=pt1', body: { status: 'Completed' } })).status, 403); assert.equal((await call(Events, 'onRequestPost', env, U.mem, { body: { title: 'x', startDate: T, kind: 'team' } })).status, 403);
  assert.equal((await call(Tasks, 'onRequestPost', env, U.dir, { body })).status, 201, '다른 사람은 그대로');
  await set(env, U.mem, { tasks: 'none' });
  for (const [m, qs] of [[Tasks, ''], [Events, '']]) assert.equal((await call(m, 'onRequestGet', env, U.mem, { qs })).status, 403);
  assert.deepEqual((await J(await call(Search, 'onRequestGet', env, U.mem, { qs: '?q=' + encodeURIComponent('권한시험') }))).groups.tasks, []); assert.ok((await J(await call(Search, 'onRequestGet', env, U.dir, { qs: '?q=' + encodeURIComponent('권한시험') }))).groups.tasks.length >= 1);
  const cal = await J(await call(Cal, 'onRequestGet', env, U.mem, { qs: `?from=${addDays(T, -30)}&to=${addDays(T, 30)}` })); assert.deepEqual([cal.tasks.length, cal.events.length], [0, 0]); assert.ok(cal.meetings.length > 0 || cal.camps.length >= 0);
  const home = await J(await call(Home, 'onRequestGet', env, U.mem)); assert.deepEqual([home.stats.open, home.deadlines.length, home.myTasks.length, home.overdue.length], [0, 0, 0, 0]); assert.ok((await J(await call(Home, 'onRequestGet', env, U.dir))).stats.open > 0);
  const al = await J(await call(Alerts, 'onRequestGet', env, U.mem)); assert.equal(al.items.some((x) => x.type === 'task'), false); assert.equal(al.today.today.length, 0);
  assert.equal((await call(Camps, 'onRequestGet', env, U.mem)).status, 200, '캠프 목록은 다른 영역을 볼 수 있으면 공통 자료');
});

test('회의·자료·캠프 공간·금액·개인정보·공지: 항목마다 따로 막힌다', async () => {
  const env = makeEnv(fakeD1());
  await set(env, U.mem, { meetings: 'none' }); assert.equal((await call(Meetings, 'onRequestGet', env, U.mem)).status, 403); assert.equal((await call(Decisions, 'onRequestGet', env, U.mem)).status, 403); assert.equal((await call(Tasks, 'onRequestGet', env, U.mem)).status, 200);
  assert.equal((await J(await call(Home, 'onRequestGet', env, U.mem))).decisions.length, 0); assert.equal((await J(await call(Alerts, 'onRequestGet', env, U.mem))).items.some((x) => x.type === 'meeting' || x.type === 'decision'), false);
  await set(env, U.mem, { files: 'view' }); assert.equal((await call(Files, 'onRequestGet', env, U.mem)).status, 200); assert.equal((await call(Files, 'onRequestPost', env, U.mem, { body: { title: '자료', kind: 'link', url: 'https://example.com' } })).status, 403);
  await set(env, U.mem, { files: 'none' }); assert.equal((await call(Files, 'onRequestGet', env, U.mem)).status, 403); assert.equal((await call(FileUrl, 'onRequestGet', env, U.mem, { qs: '?id=x' })).status, 403);
  await set(env, U.mem, { camps: 'none', tasks: 'none', meetings: 'none', files: 'none' }); assert.equal((await call(Camps, 'onRequestGet', env, U.mem)).status, 403, '일반 영역이 전부 안 보이면 캠프 목록도 못 본다');
  await set(env, U.mem, { camps: 'none' }); assert.equal((await call(Space, 'onRequestGet', env, U.mem, { qs: '?id=camp-w27' })).status, 403); assert.equal((await call(Portal, 'onRequestGet', env, U.mem, { qs: '?campId=camp-w27' })).status, 403); assert.equal((await call(Space, 'onRequestGet', env, U.dir, { qs: '?id=camp-w27' })).status, 200);
  await set(env, U.mem, { money: 'none' }); assert.equal((await call(Summary, 'onRequestGet', env, U.mem, { qs: '?periodId=lp-2027h1' })).status, 403); assert.equal((await call(Budget, 'onRequestGet', env, U.mem, { qs: '?campId=camp-w27' })).status, 403); assert.equal('budget' in (await J(await call(Home, 'onRequestGet', env, U.mem))), false);
  assert.equal((await call(Cats, 'onRequestPost', env, U.dir, { body: { kind: 'expense', name: '대조용' } })).status < 300, true); await set(env, U.mem, { money: 'view' }); assert.equal((await call(Cats, 'onRequestPost', env, U.mem, { body: { kind: 'expense', name: '안 되는 항목' } })).status, 403); await set(env, U.mem, { money: 'edit' }); assert.ok([200, 201].includes((await call(Cats, 'onRequestPost', env, U.mem, { body: { kind: 'expense', name: '맞춤 권한 항목' } })).status), '금액 수정 권한을 주면 항목 목록을 고칠 수 있다');
  // 개인정보: 기본 역할에서는 디렉터만 보고, 팀원에게 따로 열어 줄 수 있고, 디렉터에게서 뺄 수도 있다
  const kv = { async list({ prefix }) { return { keys: [{ name: prefix + 'r1' }], list_complete: true }; }, async get() { return { regId: 'r1', registrationType: 'individual', name: '가상', phone: '010-0000-0001', refundAccount: '000-1', status: 'confirmed', campFeeFinal: 100000 }; } };
  const pe = makeEnv(fakeD1(), { CAMP_KV: kv }); pe.DB.sqlite.prepare(`UPDATE camps SET registrationCampId = 'x-camp' WHERE id = 'camp-w27'`).run();
  const priv = async (who) => (await J(await call(Portal, 'onRequestGet', pe, who, { qs: '?campId=camp-w27' }))).campers?.[0]?.private;
  assert.ok(await priv(U.dir)); assert.equal(await priv(U.mem), undefined); await set(pe, U.mem, { personal: 'view' }); assert.ok(await priv(U.mem)); await set(pe, U.dir, { personal: 'none' }); assert.equal(await priv(U.dir), undefined);
  const ne = makeEnv(fakeD1()); await set(ne, U.mem, { notices: 'view' }); assert.equal((await call(Alerts, 'onRequestPost', ne, U.mem, { body: { action: 'announce', title: '공지' } })).status, 403); assert.equal((await call(Alerts, 'onRequestPost', ne, U.dir, { body: { action: 'announce', title: '공지', audience: 'all' } })).status, 201);
  assert.equal((await J(await call(Alerts, 'onRequestGet', ne, U.mem))).announcements.length, 1); await set(ne, U.mem, { notices: 'none' }); assert.deepEqual((await J(await call(Alerts, 'onRequestGet', ne, U.mem))).announcements, []);
});

test('휴지통 복구: 그 항목을 고칠 수 있어야 복구할 수 있고, 볼 수 없는 종류는 목록에도 없다', async () => {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite;
  q.prepare(`UPDATE tasks SET deletedAt = 'x' WHERE id = (SELECT id FROM tasks LIMIT 1)`).run(); const id = q.prepare(`SELECT id FROM tasks WHERE deletedAt = 'x'`).get().id;
  q.prepare(`INSERT INTO audit_log (id, at, actor, action, entity, entityId, detail) VALUES ('au-x', '2026-10-22T00:00:00Z', ?, 'delete', 'task', ?, '')`).run(U.mem, id); // 팀원이 지운 것으로 기록
  await set(env, U.mem, { tasks: 'view' }); assert.equal((await J(await call(Trash, 'onRequestGet', env, U.mem))).counts.tasks, 1); assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id } })).status, 403);
  await set(env, U.mem, { tasks: 'none' }); assert.equal('tasks' in (await J(await call(Trash, 'onRequestGet', env, U.mem))).counts, false);
  await set(env, U.mem, { tasks: 'edit' }); assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id } })).status, 200);
});

test('맞춤 권한이 저장된 표가 아직 없는 DB 에서도 기존 역할 권한으로 동작한다', async () => {
  const env = makeEnv(fakeD1()); env.DB.sqlite.exec('DROP TABLE member_perms');
  assert.equal((await call(Tasks, 'onRequestPost', env, U.mem, { body: { title: '표 없이도', status: 'Not Started', priority: 'Medium' } })).status, 201);
});

test('명단 밖 월코 팀원: 캠프 목록·공개로 표시한 파일만, 업무·회의·결정·장부·개인정보는 없음 / 캠프 공간은 영역별로 가려서 내려간다', async () => {
  const kv = { async list({ prefix }) { return { keys: [{ name: prefix + 'r1' }], list_complete: true }; }, async get() { return { regId: 'r1', registrationType: 'individual', name: '가상', phone: '010-0000-0001', refundAccount: '000-1', notes: '땅콩 알레르기', status: 'confirmed', campFeeFinal: 100000 }; } };
  const env = makeEnv(fakeD1(), { CAMP_KV: kv }), q = env.DB.sqlite; q.prepare(`UPDATE camps SET registrationCampId = 'x-camp' WHERE id = 'camp-w27'`).run();
  const fl = await J(await call(Files, 'onRequestGet', env, U.out)); assert.equal(fl.items.length, 0, '공개로 표시한 파일이 없으면 아무것도 안 보인다');
  const fid = (await J(await call(Files, 'onRequestGet', env, U.mem))).items.find((f) => !f.restricted).id;
  assert.equal((await call(Files, 'onRequestPatch', env, U.mem, { qs: `?id=${fid}`, body: { publicToAll: true } })).status, 200);
  assert.deepEqual((await J(await call(Files, 'onRequestGet', env, U.out))).items.map((f) => f.id), [fid], '월코 팀 전체 공개로 표시한 파일만');
  assert.equal((await call(Files, 'onRequestGet', env, U.mem)).status, 200); assert.equal((await J(await call(Files, 'onRequestGet', env, U.mem))).items.find((f) => f.id === fid).isPublic, 1);
  const restricted = (await J(await call(Files, 'onRequestGet', env, U.fin))).items.find((f) => f.restricted);
  if (restricted) { await call(Files, 'onRequestPatch', env, U.fin, { qs: `?id=${restricted.id}`, body: { publicToAll: true } }); assert.equal((await J(await call(Files, 'onRequestGet', env, U.out))).items.some((f) => f.id === restricted.id), false, '금액 자료는 공개로 못 한다'); }
  assert.equal((await call(Tasks, 'onRequestGet', env, U.out)).status, 403); assert.equal((await call(Meetings, 'onRequestGet', env, U.out)).status, 403); assert.equal((await call(Summary, 'onRequestGet', env, U.out, { qs: '?periodId=lp-2027h1' })).status, 403);
  assert.equal((await call(Camps, 'onRequestGet', env, U.out)).status, 200, '캠프 목록은 볼 수 있다');
  const cl = await J(await call(Camps, 'onRequestGet', env, U.out)); assert.ok(cl.types.flatMap((t) => t.camps).every((c) => c.taskTotal === null && c.taskDone === null), '업무 개수도 가린다');
  const hm = await J(await call(Home, 'onRequestGet', env, U.out)); assert.ok(hm.camps.every((c) => c.taskTotal === null), '홈 캠프 카드에도 업무 개수가 없다');
  const sp = await J(await call(Space, 'onRequestGet', env, U.out, { qs: '?id=camp-w27' })); assert.deepEqual([sp.tasks.length, sp.meetings.length, sp.decisions.length, sp.events.length, sp.stats.open], [0, 0, 0, 0, 0]); assert.deepEqual(sp.files.map((f) => f.id), [fid]); assert.equal('budget' in sp, false);
  assert.equal((await call(Search, 'onRequestGet', env, U.out, { qs: '?q=' + encodeURIComponent('Camp') })).status, 200);
  const sr = await J(await call(Search, 'onRequestGet', env, U.out, { qs: '?q=Camp' })); assert.deepEqual([sr.groups.tasks.length, sr.groups.meetings.length, sr.groups.decisions.length], [0, 0, 0]); assert.ok(sr.groups.files.every((f) => f.id === fid));
  const home = await J(await call(Home, 'onRequestGet', env, U.out)); assert.equal(home.stats.open, 0); assert.ok(home.files.every((f) => f.id === fid)); assert.equal('budget' in home, false);
  const pt = await call(Portal, 'onRequestGet', env, U.out, { qs: '?campId=camp-w27' }); assert.equal(pt.status, 200, '신청 인원 숫자는 볼 수 있다'); const pb = await J(pt); assert.equal(pb.campers, undefined); assert.equal(pb.staff, undefined); assert.equal(JSON.stringify(pb).includes('땅콩') || JSON.stringify(pb).includes('010-0000'), false); assert.ok(pb.byStatus);
  // 캠프 공간: 업무를 안 보이게 한 팀원은 업무가 아예 안 내려온다
  await set(env, U.mem, { tasks: 'none' }); const sm = await J(await call(Space, 'onRequestGet', env, U.mem, { qs: '?id=camp-w27' })); assert.deepEqual([sm.tasks.length, sm.stats.open, sm.events.length], [0, 0, 0]); assert.ok(sm.meetings.length > 0);
  // 회의 상세: 업무·자료 영역이 안 보이면 그 내용은 빠진다
  const mt = (await J(await call(Meetings, 'onRequestGet', env, U.dir))).items[0].id; const withTasks = await J(await call(Meeting, 'onRequestGet', env, U.dir, { qs: `?id=${mt}` })); await set(env, U.mem, { tasks: 'none', files: 'none' }); const md = await J(await call(Meeting, 'onRequestGet', env, U.mem, { qs: `?id=${mt}` })); assert.deepEqual([md.tasks.length, md.files.length], [0, 0]); assert.ok(withTasks.meeting);
});
