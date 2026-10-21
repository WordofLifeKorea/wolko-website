import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Me from '../functions/api/campteam/me.js';
import * as Home from '../functions/api/campteam/home.js';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Members from '../functions/api/campteam/members.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { fakeD1 as fakeD1Base, makeEnv, req as reqBase, U, root, SECRET } from './helpers/campteam-fakes.mjs';
import { permsFor } from '../functions/lib/campteamAuth.js';

const env = makeEnv;
const fakeD1 = (o) => fakeD1Base(o);
async function req(email, opts) { return reqBase(email, opts); }
const ADMIN = U.admin, FIN = U.fin, MEM = U.mem, VIEW = U.view;

test('권한표: 역할별 조회·작성·금액 권한', () => {
  assert.deepEqual(permsFor('admin'), { read: true, write: true, moneyRead: true, moneyWrite: true, manageMembers: true });
  assert.deepEqual(permsFor('finance'), { read: true, write: false, moneyRead: true, moneyWrite: true, manageMembers: false });
  assert.deepEqual(permsFor('member'), { read: true, write: true, moneyRead: true, moneyWrite: true, manageMembers: false });
  assert.deepEqual(permsFor(null), { read: true, write: false, moneyRead: false, moneyWrite: false, manageMembers: false });
});

test('로그인 없이 접근하면 401', async () => {
  const e = env(fakeD1());
  assert.equal((await Me.onRequestGet({ env: e, request: await req(null) })).status, 401);
  assert.equal((await Home.onRequestGet({ env: e, request: await req(null) })).status, 401);
});

test('테스트 로그인은 운영 주소에서는 켜지지 않는다', async () => {
  const e = env(fakeD1());
  const res = await Me.onRequestGet({ env: e, request: await req(ADMIN, { url: 'https://wolko.org/api/campteam/me' }) });
  assert.equal(res.status, 401); // CAMP_KV 가 없어서 정식 로그인 확인이 실패 → 거부
});

test('명단에 없는 사람(조회만): 홈은 보이지만 금액은 응답에 없고, 작성은 403', async () => {
  const seen = [];
  const e = env(fakeD1({ spy: sql => seen.push(sql) }));
  const res = await Home.onRequestGet({ env: e, request: await req(VIEW) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal('budget' in body, false);
  assert.equal(seen.some(s => /budget_lines/.test(s)), false, '금액 표는 아예 읽지 않아야 한다');
  assert.equal(body.user.campRole, null);
  const post = await Camps.onRequestPost({ env: e, request: await req(VIEW, { method: 'POST', body: { kind: 'type', nameKo: 'X' } }) });
  assert.equal(post.status, 403);
});

test('재정 담당: 금액 조회 가능, 일반 자료 작성은 불가', async () => {
  const e = env(fakeD1());
  const body = await (await Home.onRequestGet({ env: e, request: await req(FIN) })).json();
  assert.equal(body.budget.planned, 5600000);
  assert.equal(body.budget.actual, 150000);
  const post = await Camps.onRequestPost({ env: e, request: await req(FIN, { method: 'POST', body: { kind: 'type', nameKo: 'X' } }) });
  assert.equal(post.status, 403);
});

test('캠프팀 팀원: 금액 조회 가능, 캠프 유형·행사 만들고 수정하고 삭제 표시(복구 가능)', async () => {
  const e = env(fakeD1());
  const t = await Camps.onRequestPost({ env: e, request: await req(MEM, { method: 'POST', body: { kind: 'type', nameKo: 'Cause Circle', nameEn: 'Cause Circle' } }) });
  assert.equal(t.status, 201);
  const typeId = (await t.json()).id;
  const c = await Camps.onRequestPost({ env: e, request: await req(MEM, { method: 'POST', body: { kind: 'camp', typeId, nameKo: '2027 Cause Circle', startDate: '2027-03-01', endDate: '2027-03-03' } }) });
  assert.equal(c.status, 201);
  const campId = (await c.json()).id;
  const bad = await Camps.onRequestPost({ env: e, request: await req(MEM, { method: 'POST', body: { kind: 'camp', typeId, nameKo: 'bad', startDate: '2027-03-05', endDate: '2027-03-01' } }) });
  assert.equal(bad.status, 400);
  const patch = await Camps.onRequestPatch({ env: e, request: await req(MEM, { method: 'PATCH', url: `http://localhost/api/campteam/camps?kind=camp&id=${campId}`, body: { location: 'Pyeongtaek' } }) });
  assert.equal(patch.status, 200);
  // 유형에 캠프가 남아 있으면 삭제 불가
  const blocked = await Camps.onRequestDelete({ env: e, request: await req(MEM, { method: 'DELETE', url: `http://localhost/api/campteam/camps?kind=type&id=${typeId}` }) });
  assert.equal(blocked.status, 400);
  const del = await Camps.onRequestDelete({ env: e, request: await req(MEM, { method: 'DELETE', url: `http://localhost/api/campteam/camps?kind=camp&id=${campId}` }) });
  assert.equal(del.status, 200);
  const list = await (await Camps.onRequestGet({ env: e, request: await req(VIEW) })).json();
  assert.equal(list.types.find(x => x.id === typeId).camps.length, 0);
  const row = e.DB.sqlite.prepare('SELECT deletedAt FROM camps WHERE id = ?').get(campId);
  assert.ok(row.deletedAt, '행은 남아 있고 삭제 표시만 된다');
  assert.ok(e.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entityId = ?").get(campId).n >= 3);
});

test('홈 요약: 진행 중·마감 지남·담당 미정 숫자가 맞다', async () => {
  const e = env(fakeD1());
  const body = await (await Home.onRequestGet({ env: e, request: await req(VIEW) })).json();
  assert.equal(body.stats.total, 21);
  assert.equal(body.stats.completed, 2);
  assert.equal(body.stats.open, 19);
  assert.equal(body.stats.noOwner, 2);
  assert.ok(body.camps.some(c => c.nameKo === '2027 Winter Camp'));
  assert.ok(!body.camps.some(c => c.status === 'done'), '끝난 캠프는 진행 중 목록에서 빠진다');
  assert.ok(body.deadlines.length > 0 && body.deadlines[0].dueDate <= body.deadlines[body.deadlines.length - 1].dueDate);
  assert.equal(body.agenda.length, 3);
});

test('명단 관리는 관리자만, 관리자는 여러 명 가능, 코드에 고정된 관리자 2명은 바꾸거나 뺄 수 없다', async () => {
  const e = env(fakeD1());
  assert.equal((await Members.onRequestGet({ env: e, request: await req(MEM) })).status, 403);
  const list = await (await Members.onRequestGet({ env: e, request: await req(ADMIN) })).json();
  assert.deepEqual(list.members.filter(m => m.fixed).map(m => m.email), ['aidenpark@wolko.org', 'hkim3@wol.org']);
  const post = async (body, who = ADMIN) => Members.onRequestPost({ env: e, request: await req(who, { method: 'POST', body }) });
  assert.equal((await post({ email: 'new@wolko.org', name: '새 관리자', role: 'admin' })).status, 200, '관리자 수 제한 없음');
  assert.equal((await post({ email: 'new2@wolko.org', name: '새 팀원', role: 'member' })).status, 200);
  assert.equal((await post({ email: 'x@gmail.com', role: 'member' })).status, 400);
  assert.equal((await post({ email: 'new2@wolko.org', role: 'boss' })).status, 400);
  assert.equal((await post({ email: 'hkim3@wol.org', role: 'member' })).status, 400, '고정 관리자 역할 변경 불가');
  assert.equal((await post({ email: 'aidenpark@wolko.org', role: 'finance' })).status, 400);
  const del = async (email) => Members.onRequestDelete({ env: e, request: await req(ADMIN, { method: 'DELETE', url: `http://localhost/api/campteam/members?email=${email}` }) });
  assert.equal((await del('new2@wolko.org')).status, 200);
  assert.equal((await del('hkim3@wol.org')).status, 400); assert.equal((await del('aidenpark@wolko.org')).status, 400);
  assert.equal((await del('nobody@wolko.org')).status, 404);
  // 새로 추가한 관리자도 명단 관리 가능
  assert.equal((await Members.onRequestGet({ env: e, request: await req('new@wolko.org') })).status, 200);
});

test('고정 관리자(aidenpark@wolko.org, hkim3@wol.org)는 명단이 비어 있어도 항상 관리자, 포털 마스터/그 밖의 포털 관리자는 아니다', async () => {
  const empty = env(fakeD1({ seed: false }));
  const as = async (email, role) => new Request('http://localhost/api/campteam/me', { headers: { Authorization: 'Bearer ' + await createHubSessionToken(SECRET, email, role) } });
  for (const [email, hub] of [['aidenpark@wolko.org', 'counselor'], ['hkim3@wol.org', 'admin']]) {
    const me = await (await Me.onRequestGet({ env: empty, request: await as(email, hub) })).json();
    assert.equal(me.campRole, 'admin', email); assert.equal(me.perms.manageMembers, true);
  }
  for (const [email, hub] of [['admin@wolko.org', 'master'], ['samuelsong@wol.org', 'admin']]) {
    assert.equal((await (await Me.onRequestGet({ env: empty, request: await as(email, hub) })).json()).campRole, null, email + ' 는 캠프팀에서는 명단이 있어야 한다');
  }
});

test('새 코드는 기존 데이터 저장소(CAMP_KV)에 쓰지 않는다', () => {
  for (const f of ['me', 'home', 'camps', 'members']) {
    const src = readFileSync(root + `functions/api/campteam/${f}.js`, 'utf8');
    assert.doesNotMatch(src, /CAMP_KV|CAMP_FILES|TEACH_FILES|QT_BOOK_FILES|\.put\(|R2_BUCKET/);
  }
});
