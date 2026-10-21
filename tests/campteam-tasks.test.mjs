import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Events from '../functions/api/campteam/events.js';
import * as Calendar from '../functions/api/campteam/calendar.js';
import * as Templates from '../functions/api/campteam/templates.js';
import * as Apply from '../functions/api/campteam/apply-template.js';
import * as Import from '../functions/api/campteam/import-tasks.js';
import * as Sheets from '../functions/api/campteam/sheets-sync.js';
import * as Me from '../functions/api/campteam/me.js';
import { parseCsv, parseLooseDate } from '../functions/lib/campteamCsv.js';
import { buildSheetPlan } from '../functions/lib/campteamSheets.js';
import { addDays } from '../functions/lib/campteamDb.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { fakeD1, makeEnv, req, U, root, SECRET } from './helpers/campteam-fakes.mjs';

const mk = (extra) => makeEnv(fakeD1(), extra);
const call = async (mod, fn, env, who, { qs = '', method, body } = {}) => {
  const name = mod.name; const r = await req(who, { method: method || (fn === 'onRequestGet' ? 'GET' : 'POST'), body, url: `http://localhost:8788/api/campteam/${name}${qs}` });
  return mod.mod[fn]({ env, request: r });
};
const T = { name: 'tasks', mod: Tasks }, EV = { name: 'events', mod: Events }, TP = { name: 'templates', mod: Templates }, AP = { name: 'apply-template', mod: Apply }, IM = { name: 'import-tasks', mod: Import };
const listTasks = async (env, qs = '') => (await (await call(T, 'onRequestGet', env, U.view, { qs })).json());

test('날짜 더하기', () => {
  assert.equal(addDays('2027-01-14', -90), '2026-10-16'); assert.equal(addDays('2027-01-14', 14), '2027-01-28'); assert.equal(addDays('2027-03-01', -1), '2027-02-28');
  assert.equal(addDays('bad', 1), null);
});

test('업무: 팀원은 만들고 고칠 수 있고, 담당자·기한이 비어 있어도 저장된다', async () => {
  const env = mk();
  assert.equal((await call(T, 'onRequestPost', env, U.view, { body: { title: 'x' } })).status, 403);
  assert.equal((await call(T, 'onRequestPost', env, U.fin, { body: { title: 'x' } })).status, 403, '재정 담당은 일반 업무 작성 불가');
  const res = await call(T, 'onRequestPost', env, U.mem, { body: { title: '담당·기한 미정 업무' } });
  assert.equal(res.status, 201); const { id } = await res.json();
  const row = env.DB.sqlite.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  assert.equal(row.ownerName, ''); assert.equal(row.dueDate, null); assert.equal(row.status, 'Not Started'); assert.equal(row.priority, 'Medium');
  const patch = (body) => call(T, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${id}`, body });
  assert.equal((await patch({ status: 'In Progress', ownerName: 'Leader B', dueDate: '2026-11-30', campId: 'camp-w27' })).status, 200);
  assert.equal((await patch({ status: 'Done' })).status, 400); assert.equal((await patch({ dueDate: '2026-13-40' })).status, 400);
  assert.equal((await patch({ campId: 'nope' })).status, 400); assert.equal((await patch({ title: '  ' })).status, 400);
  assert.equal((await patch({ ownerName: '' })).status, 200, '담당자를 다시 비울 수도 있다');
  assert.equal((await call(T, 'onRequestDelete', env, U.view, { method: 'DELETE', qs: `?id=${id}` })).status, 403);
  assert.equal((await call(T, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?id=${id}` })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM tasks WHERE id=? AND deletedAt IS NOT NULL').get(id).n, 1);
  assert.ok(!(await listTasks(env, '?q=미정 업무')).items.length);
});

test('업무 필터: 마감 지남 · 담당 없음 · 기한 없음 · 캠프 · 정렬', async () => {
  const env = mk();
  const base = await listTasks(env);
  assert.equal(base.items.length, 21); assert.equal(base.counts.open, 19); assert.equal(base.counts.overdue, 1); assert.equal(base.counts.noOwner, 2);
  const over = await listTasks(env, '?flag=overdue'); assert.deepEqual(over.items.map(t => t.id), ['t21']);
  assert.deepEqual((await listTasks(env, '?flag=noowner')).items.map(t => t.id).sort(), ['t11', 't18']);
  assert.ok((await listTasks(env, '?flag=nodue')).items.every(t => !t.dueDate));
  assert.ok((await listTasks(env, '?campId=camp-u26')).items.every(t => t.campId === 'camp-u26'));
  assert.equal((await listTasks(env, '?status=Completed')).items.length, 2);
  assert.deepEqual((await listTasks(env, '?sort=due')).items.slice(0, 2).map(t => t.id), ['t21', 't07'], '기한 빠른 순, 기한 없는 것은 맨 뒤');
  assert.deepEqual((await listTasks(env, '?owner=Leader C&flag=open')).items.every(t => t.ownerName === 'Leader C'), true);
});

test('팀 일정: 만들기·수정·삭제와 기간 조회, 달력 한 번에 보기', async () => {
  const env = mk();
  const bad = (body) => call(EV, 'onRequestPost', env, U.mem, { body });
  assert.equal((await bad({ title: 'x', startDate: 'nope' })).status, 400);
  assert.equal((await bad({ title: 'x', startDate: '2026-11-05', endDate: '2026-11-01' })).status, 400);
  assert.equal((await bad({ title: 'x', startDate: '2026-11-05', startTime: '25:00' })).status, 400);
  assert.equal((await call(EV, 'onRequestPost', env, U.view, { body: { title: 'x', startDate: '2026-11-05' } })).status, 403);
  const ok = await bad({ title: 'Winter Camp 답사', startDate: '2026-11-05', startTime: '09:30', campId: 'camp-w27', kind: 'camp' });
  assert.equal(ok.status, 201); const { id } = await ok.json();
  const inRange = async (from, to) => (await (await call(EV, 'onRequestGet', env, U.view, { qs: `?from=${from}&to=${to}` })).json()).items.map(e => e.title);
  assert.ok((await inRange('2026-11-01', '2026-11-30')).includes('Winter Camp 답사'));
  assert.ok(!(await inRange('2026-12-01', '2026-12-31')).includes('Winter Camp 답사'));
  assert.ok((await inRange('2026-10-20', '2026-10-21')).includes('Leader D Out of Office'), '여러 날 일정은 걸쳐 있으면 보인다');
  assert.equal((await call(EV, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?id=${id}`, body: { title: '수정됨', endDate: '2026-11-06' } })).status, 200);
  const cal = await (await call({ name: 'calendar', mod: Calendar }, 'onRequestGet', env, U.view, { qs: '?from=2026-10-01&to=2027-01-31' })).json();
  assert.ok(cal.events.length >= 6 && cal.camps.some(c => c.nameKo === '2027 Winter Camp') && cal.tasks.some(t => t.id === 't07') && Array.isArray(cal.meetings));
  assert.equal((await call({ name: 'calendar', mod: Calendar }, 'onRequestGet', env, U.view, { qs: '?from=x&to=y' })).status, 400);
  assert.equal((await call(EV, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?id=${id}` })).status, 200);
  assert.ok(!(await inRange('2026-11-01', '2026-11-30')).includes('수정됨'));
});

test('템플릿 적용: 마감일은 캠프 시작일 기준 계산, 담당자는 제안만, 미리보기는 아무것도 만들지 않고, 두 번 적용해도 중복 없음', async () => {
  const env = mk();
  const count = () => env.DB.sqlite.prepare("SELECT COUNT(*) n FROM tasks WHERE sourceKey LIKE 'tpl:%'").get().n;
  const pv = await (await call(AP, 'onRequestPost', env, U.mem, { body: { campId: 'camp-w27', templateId: 'tpl-winter', preview: true } })).json();
  assert.equal(count(), 0, '미리보기는 저장하지 않는다'); assert.equal(pv.summary.toCreate, 8); assert.equal(pv.summary.campHasDate, true);
  const by = (t) => pv.plan.find(p => p.title.startsWith(t));
  assert.equal(by('Approve camp budget').dueDate, '2026-10-16'); assert.equal(by('Complete camp evaluation').dueDate, '2027-01-28');
  assert.equal(by('Confirm camp dates').dueDate, null, '기준일이 비어 있으면 마감일을 만들지 않는다');
  assert.equal(by('Approve camp budget').ownerSuggestion, 'Leader A'); assert.equal(by('Approve camp budget').ownerName, '');
  assert.equal((await call(AP, 'onRequestPost', env, U.view, { body: { campId: 'camp-w27', templateId: 'tpl-winter' } })).status, 403);
  const r = await call(AP, 'onRequestPost', env, U.mem, { body: { campId: 'camp-w27', templateId: 'tpl-winter', owners: { ci3: 'Leader B (확인)' } } });
  assert.equal(r.status, 201); assert.equal((await r.json()).created, 8);
  const rows = env.DB.sqlite.prepare("SELECT title, ownerName, ownerSuggestion, dueDate, status FROM tasks WHERE sourceKey LIKE 'tpl:%'").all();
  assert.equal(rows.find(x => x.title.startsWith('Approve camp budget')).ownerName, '', '사람이 확정하기 전에는 담당자가 비어 있다');
  assert.equal(rows.find(x => x.title.startsWith('Recruit staff')).ownerName, 'Leader B (확인)', '확정한 담당자만 들어간다');
  assert.ok(rows.every(x => x.status === 'Not Started'));
  const again = await (await call(AP, 'onRequestPost', env, U.mem, { body: { campId: 'camp-w27', templateId: 'tpl-winter' } })).json();
  assert.equal(again.created, 0); assert.equal(again.skipped, 8); assert.equal(count(), 8);
  const noDate = await (await call(AP, 'onRequestPost', env, U.mem, { body: { campId: 'camp-u26', templateId: 'tpl-winter' } })).json();
  assert.equal(noDate.summary.campHasDate, false);
  assert.ok(env.DB.sqlite.prepare("SELECT dueDate FROM tasks WHERE campId='camp-u26' AND sourceKey LIKE 'tpl:%'").all().every(x => x.dueDate === null), '캠프 날짜가 없으면 마감일은 비워 둔다');
});

test('템플릿 편집: 만들기·항목 추가·수정·삭제', async () => {
  const env = mk();
  const t = await (await call(TP, 'onRequestPost', env, U.mem, { body: { kind: 'template', nameKo: 'Unity 체크리스트', typeId: 'type-unity' } })).json();
  assert.ok(t.id);
  assert.equal((await call(TP, 'onRequestPost', env, U.mem, { body: { kind: 'item', templateId: t.id, title: '장소 확정', offsetDays: 'abc' } })).status, 400);
  const it = await (await call(TP, 'onRequestPost', env, U.mem, { body: { kind: 'item', templateId: t.id, title: '장소 확정', offsetDays: -30, ownerSuggestion: 'Leader A', priority: 'High' } })).json();
  assert.equal((await call(TP, 'onRequestPatch', env, U.mem, { method: 'PATCH', qs: `?kind=item&id=${it.id}`, body: { offsetDays: '' } })).status, 200);
  const list = await (await call(TP, 'onRequestGet', env, U.view)).json();
  assert.equal(list.templates.find(x => x.id === t.id).items[0].offsetDays, null);
  assert.equal((await call(TP, 'onRequestPost', env, U.view, { body: { kind: 'template', nameKo: 'x' } })).status, 403);
  assert.equal((await call(TP, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: `?kind=item&id=${it.id}` })).status, 200);
});

test('CSV 읽기: 따옴표·줄바꿈·날짜 형식', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi"""\r\n1,2'), [['a', 'b'], ['x, y', 'say "hi"'], ['1', '2']]);
  assert.deepEqual(parseCsv('Task\tOwner\nA, with comma\tLeader B\n'), [['Task', 'Owner'], ['A, with comma', 'Leader B']], '시트에서 셀을 복사해 붙여넣은 탭 구분도 읽는다');
  assert.equal(parseLooseDate('2026-10-23').date, '2026-10-23'); assert.equal(parseLooseDate('10/23/2026').date, '2026-10-23'); assert.equal(parseLooseDate('2026/1/5').date, '2026-01-05');
  assert.ok(parseLooseDate('내일').warn); assert.equal(parseLooseDate('').date, null);
});

test('시트 CSV 가져오기: 미리보기 → 가져오기, 캠프 연결은 확실할 때만, 중복 건너뜀, 빈 담당·기한은 그대로', async () => {
  const env = mk();
  const csv = [
    'Task,Owner,Due,Status,Camp,Priority,Source,Notes',
    'Recruit staff and confirm team roster,Leader B,,In Progress,Winter Camp,High,Master checklist,',                // 이미 있는 업무 → 건너뜀
    'Brand new Unity task,All Together,10/30/2026,In Progress,Unity Camp,High,Unity checklist,"Assign primary owner, soon"',
    'Mystery task,,,Waiting for Confirmation,Some Other Camp,Medium,,',
    'Weird values,Leader B,tomorrow,Maybe,Winter Camp,Urgent,,',
  ].join('\n');
  const pv = await (await call(IM, 'onRequestPost', env, U.mem, { body: { csv, preview: true } })).json();
  assert.equal(pv.summary.total, 4); assert.equal(pv.summary.skipped, 1); assert.equal(pv.summary.toCreate, 3); assert.deepEqual(pv.summary.unmatchedCamps, ['Some Other Camp']);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM tasks WHERE sourceKey LIKE 'csv:%'").get().n, 0, '미리보기는 저장하지 않는다');
  assert.equal((await call(IM, 'onRequestPost', env, U.view, { body: { csv } })).status, 403);
  assert.equal((await call(IM, 'onRequestPost', env, U.mem, { body: { csv: 'a,b\n1,2' } })).status, 400);
  const done = await call(IM, 'onRequestPost', env, U.mem, { body: { csv } }); assert.equal(done.status, 201);
  const get = (t) => env.DB.sqlite.prepare('SELECT * FROM tasks WHERE title = ?').get(t);
  const u = get('Brand new Unity task'); assert.equal(u.campId, 'camp-u26'); assert.equal(u.dueDate, '2026-10-30'); assert.equal(u.notes, 'Assign primary owner, soon');
  const m = get('Mystery task'); assert.equal(m.campId, null); assert.equal(m.ownerName, ''); assert.equal(m.dueDate, null); assert.equal(m.status, 'Waiting for Confirmation');
  const w = get('Weird values'); assert.equal(w.status, 'Not Started'); assert.equal(w.priority, 'Medium'); assert.equal(w.dueDate, null); assert.equal(w.campId, 'camp-w27', 'Winter Camp 는 진행 중인 캠프 하나로 확실히 연결');
  const again = await (await call(IM, 'onRequestPost', env, U.mem, { body: { csv } })).json();
  assert.equal(again.created, 0, '두 번 가져와도 중복되지 않는다');
});

test('시트 계획(순수): Task ID 열 없으면 막기 · 새 줄 추가 · 바뀐 칸만 수정 · 기존 줄 보존 · 삭제는 Not Applicable', () => {
  const t = (o) => ({ id: 'id1', title: 'A', ownerName: 'Leader B', dueDate: '2026-11-01', status: 'In Progress', priority: 'High', notes: '', campLabel: 'Winter Camp', deleted: false, ...o });
  const hdr = ['Task', 'Owner', 'Due', 'Status', 'Camp', 'Priority', 'Source', 'Notes'];
  assert.equal(buildSheetPlan([t()], [hdr, ['legacy', 'x']]).blocked, true, 'Task ID 열이 없으면 쓰지 않는다');
  const h2 = [...hdr, 'Task ID'];
  const fresh = buildSheetPlan([t()], [h2, ['old row', '', '', 'Completed', 'Winter Camp', 'High', 'Master checklist', '', '']]);
  assert.equal(fresh.blocked, false); assert.equal(fresh.appends.length, 1); assert.equal(fresh.legacyRows, 1); assert.equal(fresh.updates.length, 0);
  assert.deepEqual(fresh.appends[0].row, ['A', 'Leader B', '2026-11-01', 'In Progress', 'Winter Camp', 'High', 'Portal', '', 'id1']);
  const sheet = [h2, ['A', 'Leader B', '2026-11-01', 'Not Started', 'Winter Camp', 'High', 'Portal', '', 'id1']];
  const upd = buildSheetPlan([t()], sheet); assert.deepEqual(upd.updates.map(u => [u.cell, u.header, u.from, u.to]), [['D2', 'Status', 'Not Started', 'In Progress']]);
  assert.equal(buildSheetPlan([t({ status: 'Not Started' })], sheet).unchanged, 1);
  const ret = buildSheetPlan([t({ deleted: true })], sheet); assert.equal(ret.retired, 1); assert.equal(ret.updates[0].to, 'Not Applicable'); assert.equal(ret.appends.length, 0);
  assert.equal(buildSheetPlan([t({ deleted: true })], [h2]).appends.length, 0, '삭제된 업무는 시트에 새로 만들지 않는다');
  // 기존 시트 줄(ID 없음)과 이름이 같으면 새 줄을 만들지 않고 그 줄에 ID 만 연결한다
  const legacySheet = [h2, ['a', 'Leader B', '', 'In Progress', 'Winter Camp', 'High', 'Master checklist', 'keep me', '']];
  const adopt = buildSheetPlan([t({ title: 'A', dueDate: '' })], legacySheet);
  assert.equal(adopt.appends.length, 0); assert.equal(adopt.adopted, 1); assert.deepEqual(adopt.updates.map(u => [u.cell, u.header, u.to]), [['I2', 'Task ID', 'id1']], '연결할 때는 ID 칸만 쓰고 직접 쓴 메모 등은 건드리지 않는다');
  // 이름이 같은 줄이 둘 이상이면 건드리지 않고 알린다
  const dup = buildSheetPlan([t()], [h2, ['A', '', '', '', '', '', '', '', ''], ['a', '', '', '', '', '', '', '', '']]);
  assert.equal(dup.appends.length, 0); assert.equal(dup.updates.length, 0); assert.equal(dup.warnings.length, 1);
});

test('시트 연동 API: 미리보기는 관리자만, 쓰기는 기본 꺼짐·설정+확인 둘 다 있어야 하며 시트 줄 삭제 요청은 없다', async () => {
  const env = mk(); const SY = { name: 'sheets-sync', mod: Sheets };
  assert.equal((await call(SY, 'onRequestGet', env, U.mem)).status, 403);
  const pv = await (await call(SY, 'onRequestGet', env, U.admin)).json();
  assert.equal(pv.configured, false); assert.equal(pv.writeEnabled, false); assert.equal(pv.counts.appends, 21, '연결 전에는 전부 새로 쓰게 될 것으로 보여준다');
  assert.equal((await call(SY, 'onRequestPost', env, U.admin, { body: { confirm: true } })).status, 400, '시트 설정이 없으면 쓰지 않는다');
  // 시트 설정은 있지만 쓰기 플래그가 꺼진 경우: 외부 요청이 한 번도 나가면 안 된다
  const calls = []; const realFetch = globalThis.fetch; globalThis.fetch = async (...a) => { calls.push(String(a[0])); throw new Error('network must not be used'); };
  try {
    const cfgEnv = mk({ CAMPTEAM_SHEET_ID: 'sheet123', GOOGLE_SERVICE_ACCOUNT_JSON: '{}' });
    const r = await call(SY, 'onRequestPost', cfgEnv, U.admin, { body: { confirm: true } });
    assert.equal(r.status, 403); assert.equal((await r.json()).code, 'write_disabled'); assert.equal(calls.length, 0);
    const noConfirm = mk({ CAMPTEAM_SHEET_ID: 'sheet123', GOOGLE_SERVICE_ACCOUNT_JSON: '{}', CAMPTEAM_SHEETS_WRITE: '1' });
    assert.equal((await call(SY, 'onRequestPost', noConfirm, U.admin, { body: {} })).status, 400); assert.equal(calls.length, 0);
  } finally { globalThis.fetch = realFetch; }
  assert.doesNotMatch(readFileSync(root + 'functions/lib/campteamSheets.js', 'utf8'), /deleteDimension|DELETE|clear\b|:clear/, '시트 줄/내용을 지우는 요청은 없다');
});

test('시트 쓰기(모의 Google): 읽기 → 바뀐 칸만 batchUpdate, 새 줄만 append', async () => {
  const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const sa = JSON.stringify({ client_email: 'svc@test.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` });
  const env = mk({ CAMPTEAM_SHEET_ID: 'sheet123', GOOGLE_SERVICE_ACCOUNT_JSON: sa, CAMPTEAM_SHEETS_WRITE: '1' });
  env.DB.sqlite.exec("DELETE FROM tasks WHERE id NOT IN ('t01','t02')");
  const hdr = ['Task', 'Owner', 'Due', 'Status', 'Camp', 'Priority', 'Source', 'Notes', 'Task ID'];
  const sheetValues = [hdr, ['Confirm camp dates, theme & leadership', 'All Together', '', 'Not Started', 'Winter Camp', 'High', 'Portal', '', 't01'], ['legacy only', 'x', '', 'In Progress', 'Unity Camp', 'High', 'Master checklist', '', '']];
  const seen = []; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    seen.push({ url: String(url), method: init.method || 'GET', body: init.body });
    if (String(url).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'tok' });
    if ((init.method || 'GET') === 'GET') return Response.json({ values: sheetValues });
    return Response.json({ ok: true });
  };
  try {
    const r = await call({ name: 'sheets-sync', mod: Sheets }, 'onRequestPost', env, U.admin, { body: { confirm: true } });
    assert.equal(r.status, 200); const out = await r.json(); assert.equal(out.updated, 1, 't01 의 Status 한 칸만'); assert.equal(out.appended, 1, 't02 한 줄만 새로');
    const upd = seen.find(s => s.url.includes('values:batchUpdate')); const body = JSON.parse(upd.body);
    assert.deepEqual(body.data, [{ range: 'Tasks!D2', values: [['Completed']] }]);
    const app = JSON.parse(seen.find(s => s.url.includes(':append')).body); assert.equal(app.values.length, 1); assert.equal(app.values[0][8], 't02');
    assert.ok(seen.every(s => !/\/values\/[^?]*:clear|deleteDimension/.test(s.url + (s.body || ''))));
  } finally { globalThis.fetch = realFetch; }
});

test('기존 포털 계정·관리자는 건드리지 않는다: 캠프팀 새 코드는 기존 계정 코드를 바꾸거나 쓰지 않고, 기존 포털 관리자도 캠프팀 안에서는 명단이 있어야 한다', async () => {
  const env = mk();
  for (const f of readdirSync(root + 'functions/api/campteam')) {
    const src = readFileSync(root + 'functions/api/campteam/' + f, 'utf8');
    assert.doesNotMatch(src, /putAccount|MASTER_EMAILS|ADMIN_EMAILS|listAccounts|hub:account|CAMP_KV\.(put|delete)/, f);
  }
  const libs = ['campteamAuth.js', 'campteamDb.js', 'campteamFiles.js', 'campteamStorage.js', 'campteamCsv.js', 'campteamSheets.js'];
  for (const f of libs) assert.doesNotMatch(readFileSync(root + 'functions/lib/' + f, 'utf8'), /putAccount|hub:account|CAMP_KV\.(put|delete)/, f);
  // 기존 포털 관리자(hkim3@wol.org, 코드의 ADMIN_EMAILS)와 마스터는 캠프팀 명단에 없으면 "조회만"
  for (const [email, role] of [['hkim3@wol.org', 'admin'], ['admin@wolko.org', 'master']]) {
    const r = new Request('http://localhost/api/campteam/me', { headers: { Authorization: 'Bearer ' + await createHubSessionToken(SECRET, email, role) } });
    const me = await (await Me.onRequestGet({ env, request: r })).json();
    assert.equal(me.campRole, null, email); assert.equal(me.perms.write, false); assert.equal(me.perms.manageMembers, false); assert.equal(me.perms.moneyRead, false);
  }
});
