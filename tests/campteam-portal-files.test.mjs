import assert from 'node:assert/strict';
import test from 'node:test';
import * as PortalFiles from '../functions/api/campteam/portal-files.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

// 가짜 KV — 쓰기·삭제가 한 번이라도 일어나면 ops 에 기록되어 시험이 잡아낸다
function kv(data) {
  const ops = [];
  return { ops, async get(k, type) { const v = data[k]; return v === undefined ? null : type === 'json' ? JSON.parse(JSON.stringify(v)) : String(v); }, async put(k) { ops.push(['put', k]); }, async delete(k) { ops.push(['delete', k]); }, async list() { ops.push(['list']); return { keys: [], list_complete: true }; } };
}
const DATA = { items: [
  { id: 't1', tab: 'teacher', team: '레슨플랜', person: 'Fake Teacher', uploaderName: '가짜 업로더', uploaderEmail: 'secret-uploader@example.com', campIds: ['c1'], title: '1주차 수업안', url: 'https://example.com/a', archiveUrl: 'https://wolko.example/api/teach/file/nas-1.pdf', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' },
  { id: 'p1', tab: 'program', title: '프로그램 시간표', url: 'https://docs.google.com/document/d/1/edit', campIds: ['c1', 'c2'], createdAt: '2026-10-05T00:00:00Z' },
  { id: 'old', team: '옛팀', title: '옛 자료(tab 없음)', url: 'https://example.com/old', campIds: ['c2'], createdAt: '2026-09-01T00:00:00Z' },
  { id: 'bad', tab: 'general', title: '위험 링크', url: 'javascript:alert(1)', campIds: ['c1'], createdAt: '2026-10-09T00:00:00Z' },
  { id: 'http', tab: 'general', title: '보안 안 된 링크', url: 'http://example.com/x', campIds: ['c1'], createdAt: '2026-10-09T00:00:00Z' },
] };
const CAMPS = { camps: [{ id: 'c1', year: 2026, season: 'winter', name: '모멘텀 캠프' }, { id: 'c2', year: 2026, season: 'summer', name: '여름 캠프' }], defaultCampId: 'c1' };
const setup = () => { const store = kv({ 'teach:data:v1': DATA, 'teach:camps:v1': CAMPS }); return { store, env: makeEnv(fakeD1(), { CAMP_KV: store }) }; };
const get = async (env, who, qs = '') => PortalFiles.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/portal-files' + qs }) });

test('포털 자료실 자료를 캠프팀 명단 사람에게 읽기 전용으로 보여 준다 (최신 순, 업로더 이메일은 없음, 쓰기 없음)', async () => {
  const { store, env } = setup();
  const r = await get(env, U.mem); assert.equal(r.status, 200);
  const d = await r.json();
  assert.deepEqual(d.items.map((i) => i.id), ['portal:p1', 'portal:t1', 'portal:old'], 'https 가 아닌 링크는 걸러지고 최신 순');
  const t1 = d.items.find((i) => i.id === 'portal:t1');
  assert.equal(t1.readOnly, true); assert.equal(t1.source, 'portal'); assert.equal(t1.tabKo, '수업자료'); assert.equal(t1.openUrl, 'https://wolko.example/api/teach/file/nas-1.pdf', '보관 파일 주소가 우선'); assert.equal(t1.isArchive, true);
  assert.deepEqual(t1.camps, ['2026 Winter 모멘텀 캠프']); assert.equal(t1.uploadedBy, '가짜 업로더');
  assert.ok(!JSON.stringify(d).includes('secret-uploader'), '업로더 이메일은 내려가지 않는다');
  assert.equal(d.items.find((i) => i.id === 'portal:old').tab, 'teacher', 'tab 이 없는 옛 자료는 팀이 있으면 수업자료');
  assert.deepEqual(store.ops, [], '포털 저장소에 쓰기·삭제·목록 호출이 없다');
});

test('검색: 제목·팀·사람·캠프 이름으로 찾는다', async () => {
  const { env } = setup();
  assert.deepEqual((await (await get(env, U.mem, '?q=' + encodeURIComponent('수업안'))).json()).items.map((i) => i.id), ['portal:t1']);
  assert.deepEqual((await (await get(env, U.mem, '?q=' + encodeURIComponent('여름'))).json()).items.map((i) => i.id), ['portal:p1', 'portal:old']);
  assert.deepEqual((await (await get(env, U.mem, '?q=fake teacher')).json()).items.map((i) => i.id), ['portal:t1']);
  assert.equal((await (await get(env, U.mem, '?q=' + encodeURIComponent('없는말'))).json()).total, 0);
  assert.equal((await (await get(env, U.mem, '?limit=1&offset=1')).json()).items[0].id, 'portal:t1');
});

test('권한: 로그인 필요, 명단 밖 월코 팀원은 빈 목록, 자료실 권한이 없으면 막힌다', async () => {
  const { env } = setup();
  assert.equal((await get(env, null)).status, 401);
  assert.deepEqual(await (await get(env, U.out)).json(), { items: [], total: 0 }, '명단 밖에는 포털 자료를 보여 주지 않는다');
  assert.equal((await (await get(env, U.view)).json()).total, 3, '명단에 있고 자료실을 볼 수 있으면 보인다');
});

test('저장소가 비었거나 읽기에 실패해도 오류 없이 빈 목록', async () => {
  const env = makeEnv(fakeD1(), { CAMP_KV: kv({}) });
  assert.deepEqual(await (await get(env, U.mem)).json(), { items: [], total: 0, camps: [], teamOrder: {} });
  const broken = makeEnv(fakeD1(), { CAMP_KV: { async get() { throw new Error('kv down'); } } });
  assert.equal((await (await get(broken, U.mem)).json()).unavailable, true);
  assert.deepEqual(await (await get(makeEnv(fakeD1(), {}), U.mem)).json(), { items: [], total: 0 }, 'KV 연결이 없으면 빈 목록');
});

test('통합 검색에도 포털 자료가 나온다 (명단 사람만, 포털 저장소에는 쓰지 않는다)', async () => {
  const Search = await import('../functions/api/campteam/search.js');
  const { store, env } = setup();
  const run = async (who) => (await (await Search.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/search?q=' + encodeURIComponent('수업안') }) })).json()).groups;
  const mem = await run(U.mem);
  assert.deepEqual(mem.portalFiles.map((i) => i.id), ['portal:t1']); assert.equal(mem.portalFiles[0].readOnly, true);
  assert.deepEqual((await run(U.out)).portalFiles, [], '명단 밖에는 나오지 않는다');
  assert.deepEqual(store.ops, []);
});

test('포털의 분류 정보(캠프 목록·캠프 번호·팀 폴더 순서)를 함께 주고, 200개를 넘어도 모두 내려준다', async () => {
  const many = Array.from({ length: 250 }, (_, i) => ({ id: 'm' + i, tab: i % 2 ? 'general' : 'teacher', team: i % 2 ? '' : '레슨플랜', title: '자료 ' + i, url: 'https://example.com/' + i, campIds: [i % 3 ? 'c1' : 'c2'], createdAt: '2026-10-01T00:00:' + String(i % 60).padStart(2, '0') + 'Z' }));
  const store = kv({ 'teach:data:v1': { items: many }, 'teach:camps:v1': CAMPS, 'teach:folders:v1': { folders: [{ id: 'f1', name: '내 폴더', campId: 'c1', ownerEmail: 'x@example.com' }], removedDefaults: [{ campId: 'c2', name: 'WOLKO' }] } });
  const env = makeEnv(fakeD1(), { CAMP_KV: store });
  const d = await (await get(env, U.mem)).json();
  assert.equal(d.total, 250); assert.equal(d.items.length, 250, '200개에서 잘리지 않는다');
  assert.deepEqual(d.camps.map((c) => c.id), ['c1', 'c2'], '캠프 목록이 내려온다');
  assert.deepEqual(d.camps.map((c) => c.name), ['2026 Winter 모멘텀 캠프', '2026 Summer 여름 캠프'], '같은 해에는 겨울이 먼저');
  assert.ok(d.items.every((i) => Array.isArray(i.campIds) && i.campIds.length === 1));
  assert.deepEqual(d.teamOrder.c1, ['WOLKO', 'Student Fusion Team Projects', '레슨플랜', '내 폴더'], '기본 폴더 뒤에 직접 만든 폴더');
  assert.deepEqual(d.teamOrder.c2, ['Student Fusion Team Projects', '레슨플랜'], '포털에서 뺀 기본 폴더는 빠진다');
  assert.deepEqual(store.ops, []);
  assert.ok(!JSON.stringify(d).includes('x@example.com'), '폴더 만든 사람 이메일은 내려가지 않는다');
});
