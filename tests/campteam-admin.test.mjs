import assert from 'node:assert/strict';
import test from 'node:test';
import * as Trash from '../functions/api/campteam/trash.js';
import * as Exp from '../functions/api/campteam/export.js';
import * as Audit from '../functions/api/campteam/audit.js';
import * as Gloss from '../functions/api/campteam/glossary.js';
import * as Config from '../functions/api/campteam/config.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import * as Decisions from '../functions/api/campteam/decisions.js';
import * as Budget from '../functions/api/campteam/budget.js';
import * as Files from '../functions/api/campteam/files.js';
import * as Meetings from '../functions/api/campteam/meetings.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const mk = () => makeEnv(fakeD1());
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: { onRequestGet: 'GET', onRequestPatch: 'PATCH', onRequestDelete: 'DELETE' }[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = r => r.json();

test('휴지통: 삭제한 것을 보고 복구하며, 영구 삭제 기능은 없다', async () => {
  const env = mk();
  assert.equal((await call(Trash, 'onRequestGet', env, U.view)).status, 403); assert.equal((await call(Trash, 'onRequestGet', env, null)).status, 401);
  await call(Tasks, 'onRequestDelete', env, U.mem, { qs: '?id=t05' }); await call(Meetings, 'onRequestDelete', env, U.mem, { qs: '?id=m2' });
  const counts = (await J(await call(Trash, 'onRequestGet', env, U.admin))).counts; assert.equal(counts.tasks, 1); assert.equal(counts.meetings, 1); assert.ok('budget' in counts, '관리자는 모든 삭제 항목을 본다');
  assert.equal((await J(await call(Trash, 'onRequestGet', env, U.dir))).counts.tasks, 0, '다른 사람이 지운 건 팀원에게 안 보인다 (내가 지운 것만)'); assert.equal((await J(await call(Trash, 'onRequestGet', env, U.mem))).counts.tasks, 1, '내가 지운 건 보인다');
  assert.equal((await J(await call(Trash, 'onRequestGet', env, U.dir, { qs: '?kind=tasks' }))).items.length, 0);
  assert.equal((await call(Trash, 'onRequestPost', env, U.dir, { body: { kind: 'tasks', id: 't05' } })).status, 404, '남이 지운 항목은 복구할 수 없다'); assert.equal((await J(await call(Trash, 'onRequestGet', env, U.admin, { qs: '?kind=tasks' }))).items.length, 1);
  const list = await J(await call(Trash, 'onRequestGet', env, U.mem, { qs: '?kind=tasks' })); assert.equal(list.items[0].id, 't05'); assert.equal(list.items[0].deletedBy, 'test-member@wolko.org');
  assert.equal((await call(Trash, 'onRequestPost', env, U.view, { body: { kind: 'tasks', id: 't05' } })).status, 403);
  assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id: 't05' } })).status, 200);
  assert.equal((await J(await call(Tasks, 'onRequestGet', env, U.view))).items.some(t => t.id === 't05'), true, '복구하면 다시 보인다');
  assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id: 't05' } })).status, 404, '이미 복구된 항목');
  assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'nope', id: 'x' } })).status, 400);
  assert.equal(typeof Trash.onRequestDelete, 'undefined', '영구 삭제 API 없음');
});

test('휴지통: 상위 항목이 삭제 상태면 복구를 막고, 금액 자료는 금액 권한이 있어야 한다', async () => {
  const env = mk();
  await call(Budget, 'onRequestDelete', env, U.fin, { qs: '?id=b01' });
  await call(Files, 'onRequestDelete', env, U.fin, { qs: '?id=f4' });
  // 캠프 재정 담당은 금액 항목을 복구할 수 있고, 월코 재정(조회 전용)은 아무것도 복구할 수 없다
  assert.equal((await call(Trash, 'onRequestPost', env, U.fin, { body: { kind: 'budget', id: 'b01' } })).status, 200);
  assert.equal((await call(Trash, 'onRequestPost', env, U.tre, { body: { kind: 'tasks', id: 'x' } })).status, 403);
  assert.equal((await J(await call(Trash, 'onRequestGet', env, U.fin))).counts.files, 1, '금액 파일은 재정 담당에게 보인다');
  // 일반 팀원은 금액 권한도 있어 보인다. 조회만 계정은 아예 접근 불가(403)
  // 상위(캠프) 삭제 → 하위 복구 거부
  env.DB.sqlite.exec(`UPDATE camps SET deletedAt='2026-10-21T00:00:00Z' WHERE id='camp-p26'`);
  await call(Tasks, 'onRequestDelete', env, U.mem, { qs: '?id=t20' });
  const r = await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id: 't20' } }); assert.equal(r.status, 409); assert.equal((await J(r)).code, 'parent_deleted');
  assert.equal((await call(Trash, 'onRequestPost', env, U.admin, { body: { kind: 'camps', id: 'camp-p26' } })).status, 200, '기록 없이 지워진 항목은 관리자가 복구');
  assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'tasks', id: 't20' } })).status, 200);
});

test('휴지통: 결정 삭제→복구는 대체 관계까지 원래대로', async () => {
  const env = mk();
  await call(Decisions, 'onRequestDelete', env, U.mem, { qs: '?id=d6' }); assert.equal(env.DB.sqlite.prepare('SELECT state FROM decisions WHERE id=?').get('d1').state, 'active', '삭제하면 이전 결정이 되살아남');
  assert.equal((await call(Trash, 'onRequestPost', env, U.mem, { body: { kind: 'decisions', id: 'd6' } })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT state FROM decisions WHERE id=?').get('d1').state, 'superseded', '복구하면 다시 대체됨');
});

test('내보내기: 관리자만, JSON 전체/CSV 한 표, TV 열쇠는 제외, 수식 주입 방지', async () => {
  const env = mk();
  for (const w of [U.mem, U.fin, U.view]) assert.equal((await call(Exp, 'onRequestGet', env, w)).status, 403);
  const r = await call(Exp, 'onRequestGet', env, U.admin); assert.equal(r.status, 200); assert.match(r.headers.get('content-disposition'), /campteam-backup-\d{4}-\d{2}-\d{2}\.json/);
  const j = await J(r); assert.ok(j.tables.tasks.length >= 20 && j.tables.budget_lines.length >= 10 && j.tables.decisions.length >= 5); assert.ok(!('tv_settings' in j.tables), 'TV 열쇠가 든 표는 내보내지 않음');
  assert.doesNotMatch(JSON.stringify(j), /testtoken1/);
  await call(Tasks, 'onRequestPost', env, U.mem, { body: { title: '=SUM(A1)', notes: 'a,b' } });
  const csv = await call(Exp, 'onRequestGet', env, U.admin, { qs: '?format=csv&table=tasks' }); const text = await csv.text(); assert.match(csv.headers.get('content-type'), /text\/csv/); assert.ok(text.includes("'=SUM(A1)"));
  assert.equal((await call(Exp, 'onRequestGet', env, U.admin, { qs: '?format=csv&table=sqlite_master' })).status, 400, '허용된 표만');
});

test('기록(감사 로그): 관리자만 보고 필터', async () => {
  const env = mk(); await call(Tasks, 'onRequestPost', env, U.mem, { body: { title: '기록 테스트' } });
  assert.equal((await call(Audit, 'onRequestGet', env, U.mem)).status, 403);
  const a = await J(await call(Audit, 'onRequestGet', env, U.admin, { qs: '?entity=task&action=create' })); assert.ok(a.items.length >= 1 && a.items.every(x => x.entity === 'task' && x.action === 'create')); assert.ok(a.entities.includes('task'));
  assert.ok((await J(await call(Audit, 'onRequestGet', env, U.admin, { qs: '?q=기록 테스트' }))).items.length >= 1);
});

test('용어집: 조회는 모두, 수정은 팀원 이상', async () => {
  const env = mk(); assert.equal((await J(await call(Gloss, 'onRequestGet', env, U.view))).items.length, 4);
  assert.equal((await call(Gloss, 'onRequestPost', env, U.view, { body: { termEn: 'X' } })).status, 403); assert.equal((await call(Gloss, 'onRequestPost', env, U.mem, { body: {} })).status, 400);
  const { id } = await J(await call(Gloss, 'onRequestPost', env, U.mem, { body: { termKo: '카운슬러', termEn: 'Counselor', keep: false } }));
  assert.equal((await call(Gloss, 'onRequestPatch', env, U.mem, { qs: `?id=${id}`, body: { keep: true } })).status, 200); assert.equal(env.DB.sqlite.prepare('SELECT keep FROM glossary WHERE id=?').get(id).keep, 1);
  assert.equal((await call(Gloss, 'onRequestDelete', env, U.mem, { qs: `?id=${id}` })).status, 200);
});

test('공개 설정: 비밀 값은 없고 켜진 기능만', async () => {
  const off = await J(await Config.onRequestGet({ env: {} })); assert.deepEqual(off, { googleClientId: '', aiEnabled: false });
  const on = await J(await Config.onRequestGet({ env: { CAMPTEAM_GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com', ANTHROPIC_API_KEY: 'sk-secret' } }));
  assert.equal(on.aiEnabled, true); assert.doesNotMatch(JSON.stringify(on), /sk-secret/);
});
