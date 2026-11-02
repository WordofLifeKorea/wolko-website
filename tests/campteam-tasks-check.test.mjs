import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Apply from '../functions/api/campteam/apply-template.js';
import { moveTemplateDueDates } from '../functions/lib/campteamDateMove.js';
import { fakeD1, makeEnv, req, root, U } from './helpers/campteam-fakes.mjs';

const read = (f) => readFileSync(root + f, 'utf8');
const J = (r) => r.json();
const NOW = '2026-01-01T00:00:00Z';

// 브라우저용 파일(날짜 도우미)을 그대로 불러온다 — 파일이 globalThis.CTDateOffset 에 올려 준다
await import('../public/portal/campteam/date-offset-picker.js');
const DO = globalThis.CTDateOffset;

function mk() {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite;
  q.exec(`UPDATE tasks SET deletedAt='x'`);
  q.prepare(`INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,createdAt,updatedAt,createdBy) VALUES ('c1','type-unity','체크 캠프','Check Camp','2027-01-17','2027-01-19','planning',?,?, 't'), ('c2','type-unity','날짜 없는 캠프','No Date Camp',NULL,NULL,'planning',?,?,'t')`).run(NOW, NOW, NOW, NOW);
  const task = (id, extra = {}) => q.prepare(`INSERT INTO tasks (id,campId,title,ownerName,dueDate,status,priority,createdAt,updatedAt,createdBy,offsetDays,dueEdited) VALUES (?,?,?,?,?,?, 'Medium',?,?, 't',?,?)`)
    .run(id, extra.campId ?? 'c1', extra.title ?? '업무 ' + id, '', extra.due ?? null, extra.status ?? 'Not Started', NOW, NOW, extra.offset ?? null, extra.edited ?? 0);
  const row = (id) => q.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  const audits = (action) => q.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY at, rowid').all(action);
  return { env, q, task, row, audits };
}
const patch = async (env, who, id, body) => Tasks.onRequestPatch({ env, request: await req(who, { method: 'PATCH', body, url: 'http://localhost:8788/api/campteam/tasks?id=' + id }) });
const list = async (env, who, qs = '') => J(await Tasks.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/tasks' + qs }) }));
const patchCamp = async (env, who, id, body) => Camps.onRequestPatch({ env, request: await req(who, { method: 'PATCH', body, url: 'http://localhost:8788/api/campteam/camps?kind=camp&id=' + id }) });

test('0038 마이그레이션은 덧붙이기만 한다', () => {
  const sql = read('camp-team/db/0038_task_check.sql').replace(/--.*$/gm, '');
  assert.ok(/ALTER TABLE tasks ADD COLUMN/.test(sql)); assert.equal(/DROP|DELETE|UPDATE\s/i.test(sql), false);
  for (const c of ['completedBy', 'completedAt', 'templateItemId', 'offsetDays', 'dueEdited']) assert.ok(sql.includes(c), c);
  assert.match(sql, /dueEdited INTEGER NOT NULL DEFAULT 0/);
});

test('기한 글자: 1/14 · 캠프 3일 전 (당일·후, 캠프나 시작일이 없으면 날짜만)', () => {
  assert.equal(DO.dueLabel('2027-01-14', '2027-01-17', 'ko'), '1/14 · 캠프 3일 전');
  assert.equal(DO.dueLabel('2027-01-17', '2027-01-17', 'ko'), '1/17 · 캠프 당일');
  assert.equal(DO.dueLabel('2027-01-22', '2027-01-17', 'ko'), '1/22 · 캠프 5일 후');
  assert.equal(DO.dueLabel('2027-01-14', null, 'ko'), '1/14', '캠프 시작일이 없으면 날짜만');
  assert.equal(DO.dueLabel('2027-01-14', '', 'ko'), '1/14');
  assert.equal(DO.dueLabel(null, '2027-01-17', 'ko'), '');
  assert.equal(DO.dueLabel('2027-01-14', '2027-01-17', 'en'), '1/14 · 3 days before camp');
  assert.equal(DO.dueRel('2026-12-31', '2027-01-02'), -2, '연말·연초를 넘어도 맞다');
});

test('기준일 ⇄ [숫자 + 일 전/일 후/당일/정하지 않음] 변환', () => {
  assert.deepEqual(DO.offsetToParts(-3), { kind: 'before', n: 3 }); assert.deepEqual(DO.offsetToParts(5), { kind: 'after', n: 5 });
  assert.deepEqual(DO.offsetToParts(0), { kind: 'same', n: '' }); assert.deepEqual(DO.offsetToParts(null), { kind: 'none', n: '' }); assert.deepEqual(DO.offsetToParts(''), { kind: 'none', n: '' });
  assert.equal(DO.partsToOffset('before', '3'), -3); assert.equal(DO.partsToOffset('after', 5), 5); assert.equal(DO.partsToOffset('same', ''), 0); assert.equal(DO.partsToOffset('none', '9'), null);
  assert.equal(DO.partsToOffset('before', '0'), 0, '0일 전은 당일과 같다');
  for (const bad of ['', 'abc', '1.5', '-2', '1001']) assert.ok(Number.isNaN(DO.partsToOffset('before', bad)), '잘못된 숫자: ' + bad);
  for (const n of [-90, -3, 0, 7, null]) { const p = DO.offsetToParts(n); assert.equal(DO.partsToOffset(p.kind, p.n), n, '왕복: ' + n); }
  assert.equal(DO.offsetLabel(-3, 'ko'), '3일 전'); assert.equal(DO.offsetLabel(0, 'ko'), '당일'); assert.equal(DO.offsetLabel(5, 'ko'), '5일 후'); assert.equal(DO.offsetLabel(null, 'ko'), '기한 없음');
});

test('달력: 예시 캠프 기본값(가장 가까운 앞으로의 캠프, 없으면 가장 최근), 캠프·준비 주 표시', () => {
  const camps = [{ id: 'old', startDate: '2026-01-10', endDate: '2026-01-12' }, { id: 'later', startDate: '2027-07-01', endDate: '2027-07-03' }, { id: 'soon', startDate: '2027-01-17', endDate: '2027-01-19' }, { id: 'nodate', startDate: null }];
  assert.equal(DO.pickDefaultCamp(camps, '2026-11-02').id, 'soon');
  assert.equal(DO.pickDefaultCamp(camps, '2027-01-18').id, 'soon', '진행 중인 캠프도 앞으로의 캠프');
  assert.equal(DO.pickDefaultCamp(camps, '2030-01-01').id, 'later', '모두 지났으면 가장 최근');
  assert.equal(DO.pickDefaultCamp([{ id: 'x', startDate: null }], '2026-11-02'), null); assert.equal(DO.pickDefaultCamp([], '2026-11-02'), null);
  const c = { startDate: '2027-01-17', endDate: '2027-01-19', prepStart: '2027-01-10', prepEnd: '2027-01-14' };
  assert.equal(DO.dayKind('2027-01-18', c), 'camp'); assert.equal(DO.dayKind('2027-01-12', c), 'prep'); assert.equal(DO.dayKind('2027-01-05', c), '');
  assert.equal(DO.dayKind('2027-01-12', { startDate: '2027-01-17', endDate: '2027-01-19' }), '', 'prepStart/prepEnd 가 없어도 괜찮다');
  assert.equal(DO.dayKind('2027-01-12', null), '');
  const cells = DO.monthCells(2027, 0); assert.equal(cells.length % 7, 0); assert.equal(cells.filter(x => x.date).length, 31); assert.equal(cells[5].date, '2027-01-01', '2027-01-01 은 금요일');
});

test('체크: 완료로 + 누가·언제 기록, 풀면 되돌리고 비운다, 둘 다 감사 기록', async () => {
  const { env, task, row, audits } = mk(); task('t1', { due: '2027-01-14' });
  const r1 = await J(await patch(env, U.mem, 't1', { status: 'Completed' }));
  assert.equal(r1.status, 'Completed'); assert.equal(r1.completedBy, '테스트 팀원', '명단의 이름'); assert.match(r1.completedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual([row('t1').status, row('t1').completedBy, row('t1').completedAt], ['Completed', '테스트 팀원', r1.completedAt]);
  const l = await list(env, U.mem, '?campId=c1'); assert.equal(l.items[0].completedBy, '테스트 팀원'); assert.equal(l.items[0].completedAt, r1.completedAt);
  assert.equal(audits('check').length, 1); assert.equal(audits('check')[0].actor, U.mem); assert.equal(audits('check')[0].entityId, 't1'); assert.match(audits('check')[0].detail, /테스트 팀원/);
  const r2 = await J(await patch(env, U.mem, 't1', { status: 'Not Started' }));
  assert.equal(r2.status, 'Not Started'); assert.equal(r2.completedBy, null);
  assert.deepEqual([row('t1').status, row('t1').completedBy, row('t1').completedAt], ['Not Started', null, null]);
  assert.equal(audits('uncheck').length, 1); assert.equal(audits('uncheck')[0].actor, U.mem);
  // 같은 상태로 다시 저장해도 기록이 늘지 않는다
  await patch(env, U.mem, 't1', { notes: 'x' }); assert.equal(audits('check').length, 1); assert.equal(audits('uncheck').length, 1);
});

test('체크: 명단에 이름이 없으면 이메일, 조회만 계정은 못 한다, 상태 드롭다운으로 완료해도 같은 기록', async () => {
  const { env, task, row } = mk(); task('t1'); task('t2');
  const r = await J(await patch(env, 'aidenpark@wolko.org', 't1', { status: 'Completed' })); assert.equal(r.completedBy, 'aidenpark@wolko.org');
  assert.equal((await patch(env, U.view, 't2', { status: 'Completed' })).status, 403); assert.equal(row('t2').status, 'Not Started');
  assert.equal((await patch(env, U.out, 't2', { status: 'Completed' })).status, 403);
  await patch(env, U.mem, 't2', { status: 'Completed' }); await patch(env, U.mem, 't2', { status: 'In Progress' });
  assert.equal(row('t2').completedBy, null, '완료에서 다른 상태로 가면 확인 기록은 비운다');
});

test('체크한 업무는 지워지지 않고, 목록 필터의 뜻은 그대로(진행 중에는 빠지고 전체에는 남음)', async () => {
  const { env, task } = mk(); task('a'); task('b');
  await patch(env, U.mem, 'a', { status: 'Completed' });
  const open = await list(env, U.mem, '?campId=c1&flag=open'), all = await list(env, U.mem, '?campId=c1');
  assert.deepEqual(open.items.map(x => x.id), ['b']); assert.deepEqual(all.items.map(x => x.id).sort(), ['a', 'b']);
  assert.equal(all.items.find(x => x.id === 'a').status, 'Completed');
});

test('0038 이 아직 없는 DB 에서도 목록·체크·수정이 예전처럼 동작한다', async () => {
  const { env, q, task } = mk(); task('t1');
  for (const c of ['completedBy', 'completedAt', 'templateItemId', 'offsetDays', 'dueEdited']) q.exec(`ALTER TABLE tasks DROP COLUMN ${c}`);
  const l = await list(env, U.mem, '?campId=c1'); assert.equal(l.items.length, 1);
  const r = await patch(env, U.mem, 't1', { status: 'Completed', dueDate: '2027-01-10' }); assert.equal(r.status, 200);
  assert.equal(q.prepare('SELECT status, dueDate FROM tasks WHERE id = ?').get('t1').status, 'Completed');
  assert.deepEqual(await moveTemplateDueDates(env, 'c1', '2027-01-17', '2027-01-20', U.mem), { moved: 0 });
  assert.equal((await patchCamp(env, U.mem, 'c1', { startDate: '2027-01-20', endDate: '2027-01-22' })).status, 200);
});

test('날짜 이동: 템플릿 업무만 새 시작일 + 기준일로, 직접 고친 것·완료·삭제·다른 캠프는 그대로, 감사 기록은 한 번', async () => {
  const { env, task, row, audits } = mk();
  task('keep1', { due: '2027-01-10', offset: -7 }); task('keep2', { due: '2027-01-17', offset: 0 });
  task('edited', { due: '2027-01-02', offset: -15, edited: 1 }); task('done', { due: '2027-01-10', offset: -7, status: 'Completed' });
  task('plain', { due: '2027-01-05' }); task('other', { campId: 'c2', due: '2027-03-01', offset: -3 });
  env.DB.sqlite.exec(`INSERT INTO tasks (id,campId,title,ownerName,dueDate,status,priority,createdAt,updatedAt,createdBy,offsetDays,dueEdited,deletedAt) VALUES ('gone','c1','지움','','2027-01-10','Not Started','Medium','${NOW}','${NOW}','t',-7,0,'x')`);
  const res = await J(await patchCamp(env, U.mem, 'c1', { startDate: '2027-01-24', endDate: '2027-01-26' }));
  assert.equal(res.ok, true); assert.equal(res.movedTasks, 2);
  assert.equal(row('keep1').dueDate, '2027-01-17'); assert.equal(row('keep2').dueDate, '2027-01-24');
  assert.equal(row('edited').dueDate, '2027-01-02', '직접 고친 기한은 그대로'); assert.equal(row('done').dueDate, '2027-01-10', '완료된 업무는 그대로');
  assert.equal(row('plain').dueDate, '2027-01-05', '기준일이 없는 업무는 그대로'); assert.equal(row('other').dueDate, '2027-03-01'); assert.equal(row('gone').dueDate, '2027-01-10');
  const a = audits('move_due'); assert.equal(a.length, 1, '감사 기록은 한 번'); assert.equal(a[0].entityId, 'c1');
  for (const s of ['keep1 2027-01-10→2027-01-17', 'keep2 2027-01-17→2027-01-24', '2027-01-17→2027-01-24']) assert.ok(a[0].detail.includes(s), s);
  // 시작일을 그대로 두거나 이름만 고치면 아무것도 안 한다
  const same = await J(await patchCamp(env, U.mem, 'c1', { nameKo: '이름만', startDate: '2027-01-24', endDate: '2027-01-26' })); assert.equal(same.movedTasks, 0); assert.equal(audits('move_due').length, 1);
  assert.deepEqual(await moveTemplateDueDates(env, 'c1', '2027-01-24', '', U.mem), { moved: 0 }, '새 시작일이 비면 아무것도 안 한다');
  assert.deepEqual(await moveTemplateDueDates(env, 'c1', '2027-01-24', null, U.mem), { moved: 0 });
});

test('날짜 이동: 업무가 많아도 감사 기록 한 줄에 전·후 날짜가 다 남는다 (손으로 되돌릴 수 있게)', async () => {
  const { env, task, audits } = mk();
  for (let i = 0; i < 40; i++) task('bulk' + String(i).padStart(2, '0') + '-' + 'x'.repeat(26), { due: '2027-01-10', offset: -7 });
  assert.deepEqual(await moveTemplateDueDates(env, 'c1', '2027-01-17', '2027-02-17', U.mem), { moved: 40 });
  const d = audits('move_due'); assert.equal(d.length, 1); assert.equal((d[0].detail.match(/2027-01-10→2027-02-10/g) || []).length, 40);
});

test('직접 기한을 고치면 dueEdited=1, 같은 날짜로 저장하거나 다른 칸만 고치면 그대로', async () => {
  const { env, task, row } = mk(); task('t1', { due: '2027-01-10', offset: -7 });
  await patch(env, U.mem, 't1', { dueDate: '2027-01-10', title: '이름만 바꿈' }); assert.equal(row('t1').dueEdited, 0);
  await patch(env, U.mem, 't1', { dueDate: '2027-01-12' }); assert.equal(row('t1').dueEdited, 1);
  await patchCamp(env, U.mem, 'c1', { startDate: '2027-02-01', endDate: '2027-02-03' }); assert.equal(row('t1').dueDate, '2027-01-12', '직접 고친 기한은 캠프 날짜가 바뀌어도 그대로');
});

test('템플릿 적용: 기준일과 항목 번호를 업무에 남긴다 (캠프 시작일이 없으면 기준일은 남기지 않음)', async () => {
  const { env, q, row } = mk();
  q.exec(`INSERT INTO checklist_templates (id,nameKo,nameEn,createdAt,updatedAt,createdBy) VALUES ('tp','시험 템플릿','Test Tpl','${NOW}','${NOW}','t');
    INSERT INTO checklist_items (id,templateId,title,offsetDays,priority,sortOrder,createdAt,updatedAt,createdBy) VALUES ('i1','tp','3일 전 일','-3','Medium',1,'${NOW}','${NOW}','t'),('i2','tp','기한 없는 일',NULL,'Medium',2,'${NOW}','${NOW}','t'),('i3','tp','당일 일',0,'Medium',3,'${NOW}','${NOW}','t');`);
  const post = async (campId) => Apply.onRequestPost({ env, request: await req(U.mem, { method: 'POST', body: { campId, templateId: 'tp' }, url: 'http://localhost:8788/api/campteam/apply-template' }) });
  assert.equal((await post('c1')).status, 201);
  const get = (camp, item) => q.prepare('SELECT * FROM tasks WHERE campId = ? AND templateItemId = ?').get(camp, item);
  assert.deepEqual([get('c1', 'i1').offsetDays, get('c1', 'i1').dueDate, get('c1', 'i1').dueEdited], [-3, '2027-01-14', 0]);
  assert.equal(get('c1', 'i2').offsetDays, null); assert.equal(get('c1', 'i2').dueDate, null); assert.equal(get('c1', 'i3').offsetDays, 0, '0(당일)도 기준일로 저장');
  assert.equal((await post('c2')).status, 201);
  assert.equal(get('c2', 'i1').offsetDays, null, '캠프 시작일이 없으면 기준일을 남기지 않음'); assert.equal(get('c2', 'i1').dueDate, null);
  // 적용 → 캠프 시작일 이동 → 기한이 함께 움직인다
  assert.equal((await J(await patchCamp(env, U.mem, 'c1', { startDate: '2027-01-24', endDate: '2027-01-26' }))).movedTasks, 2);
  assert.equal(row(get('c1', 'i1').id).dueDate, '2027-01-21'); assert.equal(row(get('c1', 'i3').id).dueDate, '2027-01-24');
});

test('0038 이 없는 DB 에서도 템플릿 적용은 예전처럼 업무를 만든다', async () => {
  const { env, q } = mk();
  q.exec(`INSERT INTO checklist_templates (id,nameKo,nameEn,createdAt,updatedAt,createdBy) VALUES ('tp','t','t','${NOW}','${NOW}','t'); INSERT INTO checklist_items (id,templateId,title,offsetDays,priority,sortOrder,createdAt,updatedAt,createdBy) VALUES ('i1','tp','일','-3','Medium',1,'${NOW}','${NOW}','t');`);
  for (const c of ['completedBy', 'completedAt', 'templateItemId', 'offsetDays', 'dueEdited']) q.exec(`ALTER TABLE tasks DROP COLUMN ${c}`);
  const r = await Apply.onRequestPost({ env, request: await req(U.mem, { method: 'POST', body: { campId: 'c1', templateId: 'tp' }, url: 'http://localhost:8788/api/campteam/apply-template' }) });
  assert.equal(r.status, 201); assert.equal(q.prepare(`SELECT dueDate FROM tasks WHERE sourceKey = 'tpl:tp:i1'`).get().dueDate, '2027-01-14');
});

/* ---------- 화면 코드 (브라우저 파일을 읽어서 확인) ---------- */
function loadCheckModule() { // tasks-check.js 를 가짜 브라우저 환경에서 실행해 도우미 함수를 꺼낸다
  const win = {}, CT = { addDict() {}, esc: (s) => String(s), t: (k) => ({ ckDoneWord: '확인', ckOther: '기타' }[k] || k), lang: () => 'ko' };
  vm.runInNewContext(read('public/portal/campteam/tasks-check.js'), { window: win, CT, document: { getElementById: () => null, querySelectorAll: () => [] } });
  return win.CTCheck;
}

test('「홍길동 · 11/3 14:20 확인」 글자와 구역별 묶기 (구역 없음 → 기타, 맨 뒤)', () => {
  const C = loadCheckModule();
  assert.match(C.stampText({ status: 'Completed', completedBy: 'Jason', completedAt: '2026-11-03T05:20:00Z' }), /^Jason · \d+\/\d+ \d\d:\d\d 확인$/);
  assert.equal(C.stampText({ status: 'Not Started', completedBy: 'Jason' }), '', '완료가 아니면 안 보인다');
  assert.equal(C.stampText({ status: 'Completed' }), '', '예전에 완료한 업무(기록 없음)는 빈 글자');
  const items = [{ id: 1, section: '' }, { id: 2, section: '준비' }, { id: 3, section: '프로그램' }, { id: 4, section: '준비' }, { id: 5 }];
  const g = JSON.parse(JSON.stringify(C.groupBySection(items, '기타'))); // (다른 실행 공간의 배열이라 같은 모양으로 바꿔 비교)
  assert.deepEqual(g.map(x => [x.name, x.items.map(i => i.id)]), [['준비', [2, 4]], ['프로그램', [3]], ['기타', [1, 5]]]);
  const c = C.countable([{ status: 'Completed' }, { status: 'Not Applicable' }, { status: 'Not Started', inactive: 1 }, { status: 'In Progress' }]); assert.equal(c.length, 2, '비활성·해당 없음은 점검 대상이 아니다');
});

test('업무 목록 화면: 체크박스(확인 버튼 없음), 담당 미정·제안·확정 한 줄, 기한은 캠프 기준, 팀 점검 탭', () => {
  const js = read('public/portal/campteam/tasks.js'), astro = read('src/pages/portal/campteam/tasks.astro');
  assert.ok(js.includes('data-chk="') && js.includes('type="checkbox" class="tchk"'), '업무 줄마다 체크박스'); assert.ok(!js.includes('확인했어요'), '「확인했어요」 버튼은 없다');
  assert.ok(js.includes('own-line') && js.includes("CT.t('ownUnset')") && js.includes('own-nm') && js.includes('data-confirm="'), '담당 미정 · 제안 이름 [확정] 한 줄');
  assert.ok(js.includes('DO.dueLabel(t.dueDate'), '기한: 1/14 · 캠프 3일 전'); assert.ok(js.includes('id="dueHint"') && js.includes('dueHint(df)'), '업무 창 기한 아래 안내');
  assert.ok(js.includes('S.keep'), '방금 체크한 줄은 필터가 바뀔 때까지 남긴다');
  assert.match(astro, /data-tab="check"[^>]*data-t="tabCheck"/); assert.ok(astro.includes('id="paneCheck"') && astro.includes('data-m="all"') && astro.includes('data-m="todo"'), '팀 점검 화면 · 안 한 것만/전부');
  assert.ok(astro.indexOf('data-tab="imp"') < astro.indexOf('data-tab="check"'), '네 번째 탭(시트에서 가져오기 다음)');
  assert.ok(/date-offset-picker\.js/.test(astro) && /tasks-check\.js/.test(astro));
  assert.ok(js.indexOf("check: 'Check'") > 0, 'showTab 이 check 를 안다');
});

test('템플릿 표·항목 창: -3d 같은 글자는 없고 [숫자 + 일 전/일 후/당일/정하지 않음] + 달력 버튼, 임시 표시는 그대로', () => {
  const js = read('public/portal/campteam/tasks.js');
  const tbl = js.slice(js.indexOf('function renderTpl'), js.indexOf('function tplImportForm'));
  assert.ok(tbl.includes('DO.offsetLabel(i.offsetDays') && tbl.includes("CT.t('provisional')"), '표는 offsetLabel, 임시 칩 유지');
  assert.equal(/\+ 'd'|'d' \+|\.offsetDays \+ 'd/.test(tbl), false, '표에 -3d 모양이 없다');
  const form = js.slice(js.indexOf('function itemForm'), js.indexOf('function applyForm'));
  for (const k of ['offBefore', 'offAfter', 'offSame', 'offNone', 'offCal']) assert.ok(form.includes(k), k);
  assert.ok(form.includes('DO.partsToOffset') && form.includes('offsetDays: off'), '저장 값은 정수 기준일'); assert.equal(form.includes('name="offsetDays"'), false, '부호 있는 숫자를 직접 치는 칸은 없다');
  assert.ok(js.includes('📅 달력에서 고르기'));
  const pk = read('public/portal/campteam/date-offset-picker.js');
  for (const s of ['예시 캠프', '캠프 준비 주', 'prepStart', 'prepEnd', 'data-nav', "T('캠프'", '이 날짜로 정하기']) assert.ok(pk.includes(s), s);
});

test('CSS: 단어 단위 줄바꿈 공용 규칙, 담당자 칸 넓힘, 흑백 확인 표시, 폰 시트', () => {
  const css = read('public/portal/campteam/campteam.css'), blk = css.slice(css.indexOf('/* ==== batch-D tasks-check ==== */'), css.indexOf('/* ==== /batch-D tasks-check ==== */'));
  assert.ok(blk.length > 500, '표시된 블록 안에 있다');
  assert.match(blk, /\.wrap-word,\.task \.c-camp[^{]*\{word-break:keep-all;overflow-wrap:break-word\}/, '캠프 이름은 단어 단위로 줄바꿈 (anywhere 아님)');
  assert.match(blk, /\.task-head,\.task\{grid-template-columns:minmax\(0,1fr\) 210px /, '담당자 칸이 150px 보다 넓다');
  assert.match(blk, /\.task\.done,\.ck-row\.done\{filter:grayscale\(1\)/, '확인한 업무는 흑백');
  assert.match(blk, /\.chk-hit\{[^}]*width:40px;height:40px/, '체크박스 누르는 칸 40px');
  assert.match(blk, /@media\(max-width:900px\)\{\s*\.dop-back\{[^}]*\}\s*\.dop\{left:0 !important/, '폰에서는 아래 시트');
  assert.match(blk, /\.own-nm\{word-break:keep-all;overflow-wrap:break-word\}/, '담당자 이름은 단어 중간에서 끊지 않는다');
  assert.equal(/\.task \.c-owner\{[^}]*text-overflow/.test(blk), false, '담당자 이름에 …(말줄임)을 쓰지 않는다');
  // 다른 곳(회의·캠프 목록·캠프 선택)의 캠프 이름도 같은 규칙
  for (const sel of ['.mt small', '.camp-row .nm b', '.p-row .p-main b']) assert.ok(blk.includes(sel), sel);
});

test('캠프 날짜 고치는 화면: 옮긴 업무 개수를 알려 준다', () => {
  const js = read('public/portal/campteam/camps.js');
  assert.ok(js.includes('movedTasks') && js.includes('업무 기한'), '토스트 안내');
});
