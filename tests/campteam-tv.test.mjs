import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as TvConfig from '../functions/api/campteam/tv-config.js';
import * as TvData from '../functions/api/campteam/tv-data.js';
import * as Notices from '../functions/api/campteam/notices.js';
import * as Camps from '../functions/api/campteam/camps.js';
import { sanitizeLayout, defaultLayout, cleanSettings, newToken, safeEqual } from '../functions/lib/campteamTv.js';
import { readSubmissionCount } from '../functions/lib/campteamRegistrations.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestPatch: 'PATCH', onRequestDelete: 'DELETE' }[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = r => r.json();
const tv = async (env, t) => TvData.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/tv-data' + (t === undefined ? '' : `?t=${t}`)) });

test('배치 검사: 기본 배치 통과, 알 수 없는 위젯/화면 밖/겹침/너무 많음은 거부, 이상한 값은 정리', () => {
  assert.ok(sanitizeLayout(defaultLayout()).layout);
  const one = (items, extra = {}) => sanitizeLayout({ pages: [{ id: 'a', name: 'A', secs: 20, items, ...extra }] });
  const w = (o) => ({ uid: 'u', type: 'tasks', x: 0, y: 0, w: 4, h: 3, opts: {}, ...o });
  assert.match(one([w({ type: 'hack' })]).error, /알 수 없는 위젯/); assert.match(one([w({ x: 14, w: 4 })]).error, /화면 밖/); assert.match(one([w({ y: 8, h: 3 })]).error, /화면 밖/);
  assert.match(one([w({}), w({ uid: 'v', x: 2 })]).error, /겹쳐/); assert.match(one([w({ w: 1 })]).error ?? 'no error', /화면 밖|no error/);
  assert.equal(sanitizeLayout({ pages: [] }).error?.includes('1~10'), true); assert.equal(sanitizeLayout({ pages: Array(11).fill({ items: [] }) }).error?.includes('1~10'), true);
  assert.match(one(Array.from({ length: 31 }, (_, i) => w({ uid: 'x' + i, x: i % 16, y: 0, w: 1, h: 1, type: 'weather' }))).error, /30개/);
  const clean = one([w({ opts: { fs: 9999, n: 99, secs: 1, compact: 'yes', evil: '<script>', noTitle: 0 } })]).layout.pages[0].items[0].opts;
  assert.deepEqual(clean, { fs: 260, n: 12, secs: 3, compact: 1 }, '범위로 맞추고 알 수 없는 키는 버린다');
  assert.equal(one([w({ uid: '<img onerror=1>' })]).layout.pages[0].items[0].uid, 'imgonerror1', 'uid 는 안전한 글자만');
  assert.equal(one([w({ type: 'weather', opts: { n: 5 } })]).layout.pages[0].items[0].opts.n, undefined, '목록이 아닌 위젯에는 개수 설정 없음');
  assert.equal(one([w({})], { secs: 1 }).layout.pages[0].secs, 5);
});

test('설정 검사와 열쇠 만들기', () => {
  assert.deepEqual(cleanSettings({ theme: 'light', language: 'both', refreshSec: '45', reloadHours: 12 }).settings, { theme: 'light', language: 'both', refreshSec: '45', reloadHours: '12' });
  for (const bad of [{ theme: 'neon' }, { language: 'fr' }, { refreshSec: 5 }, { reloadHours: 100 }, { weatherLat: 'x' }, { weatherLon: 500 }]) assert.ok(cleanSettings(bad).error, JSON.stringify(bad));
  const t = newToken(); assert.match(t, /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/); assert.notEqual(t, newToken());
  assert.equal(safeEqual('abc', 'abc'), true); assert.equal(safeEqual('abc', 'abd'), false); assert.equal(safeEqual('', ''), false); assert.equal(safeEqual(undefined, 'x'), false);
});

test('TV 설정 화면 API: 관리자만, 저장 → 다시 읽기, 열쇠 교체하면 이전 열쇠는 바로 무효', async () => {
  const env = makeEnv(fakeD1());
  for (const who of [U.mem, U.fin, U.view]) assert.equal((await call(TvConfig, 'onRequestGet', env, who)).status, 403);
  assert.equal((await call(TvConfig, 'onRequestGet', env, null)).status, 401);
  const first = await J(await call(TvConfig, 'onRequestGet', env, U.admin)); assert.equal(first.isDefault, true); assert.equal(first.layout.pages.length, 2); assert.equal(first.settings.token, 'testtoken1');
  assert.equal((await call(TvConfig, 'onRequestPut', env, U.mem, { body: { layout: first.layout } })).status, 403);
  assert.equal((await call(TvConfig, 'onRequestPut', env, U.admin, { body: { layout: { pages: [{ items: [{ type: 'nope', x: 0, y: 0, w: 1, h: 1 }] }] } } })).status, 400);
  const mine = { pages: [{ id: 'z', name: '내 화면', secs: 40, items: [{ uid: 'a', type: 'tasks', x: 0, y: 0, w: 8, h: 9, opts: { n: 4, secs: 7 } }, { uid: 'b', type: 'clock', x: 8, y: 0, w: 8, h: 2, opts: {} }] }] };
  assert.equal((await call(TvConfig, 'onRequestPut', env, U.admin, { body: { layout: mine, settings: { theme: 'light', refreshSec: 90 } } })).status, 200);
  const again = await J(await call(TvConfig, 'onRequestGet', env, U.admin)); assert.equal(again.isDefault, false); assert.equal(again.layout.pages[0].name, '내 화면'); assert.equal(again.settings.theme, 'light'); assert.equal(again.settings.refreshSec, '90');
  assert.equal((await call(TvConfig, 'onRequestPut', env, U.admin, { body: { settings: { theme: 'neon' } } })).status, 400);
  assert.equal((await tv(env, 'testtoken1')).status, 200);
  assert.equal((await call(TvConfig, 'onRequestPost', env, U.admin, { body: { action: 'oops' } })).status, 400);
  const { token } = await J(await call(TvConfig, 'onRequestPost', env, U.admin, { body: { action: 'rotate' } }));
  assert.equal((await tv(env, 'testtoken1')).status, 403, '교체 후 이전 열쇠는 무효'); assert.equal((await tv(env, token)).status, 200);
  env.DB.sqlite.exec(`UPDATE tv_layout SET json = '{broken'`); assert.equal((await J(await call(TvConfig, 'onRequestGet', env, U.admin))).isDefault, true, '깨진 저장값은 기본 배치로');
});

test('TV 데이터: 열쇠 없이/틀리면 403, 맞으면 필요한 내용만 — 금액·이메일·메모는 없다', async () => {
  const seen = []; const env = makeEnv(fakeD1({ spy: q => seen.push(q) }));
  assert.equal((await tv(env)).status, 403); assert.equal((await tv(env, 'wrong')).status, 403); assert.equal((await tv(env, '')).status, 403);
  const noToken = makeEnv(fakeD1()); noToken.DB.sqlite.exec(`DELETE FROM tv_settings`); assert.equal((await tv(noToken, 'testtoken1')).status, 403, '열쇠를 만들기 전에는 TV 가 열리지 않는다');
  seen.length = 0; const res = await tv(env, 'testtoken1'); assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'no-store');
  const raw = await res.clone().text(), body = await J(res);
  assert.equal(seen.some(q => /budget_|file_versions|meeting_texts|camp_members|audit_log/.test(q)), false, '금액·전사문·명단 표는 읽지 않는다');
  assert.doesNotMatch(raw, /plannedAmount|actualAmount|@wolko\.org|@wol\.org|token|body"/i, '금액·이메일·열쇠가 응답에 없다');
  assert.equal('token' in body.settings, false); assert.equal(body.settings.language, 'en'); assert.equal(body.layout.pages.length, 2);
  const d = body.data; assert.equal(d.stats.overdue, 1); assert.ok(d.stats.open >= 19 && d.stats.completion >= 0);
  assert.ok(d.tasks.length > 5 && d.tasks.every(t => !['Completed', 'Not Applicable'].includes(t.status)) && d.tasks[0].priority === 'High'); assert.ok(d.tasks.every(t => !('notes' in t) && !('id' in t)));
  assert.ok(d.late.some(l => l.reason === 'noowner') && d.late.some(l => l.reason === 'overdue'));
  assert.equal(d.notices.length, 2, '숨긴 공지는 제외'); assert.ok(d.decisions.length >= 3 && d.decisions.every(x => ['direction', 'final', 'changed'].includes(x.kind)), '현재 유효한 결정만');
  assert.ok(d.progress.length >= 2); assert.match(d.theme, /Sample Theme/); assert.equal(d.events.every(e => e.startDate >= '2026-01-01'), true);
});

test('신청 인원 숫자 읽기: 숫자 한 값만 읽고, 쓰기·목록·개인정보 키는 절대 건드리지 않는다', async () => {
  const log = []; const kv = { async get(k) { log.push(k); return k === 'camp:sample-winter:submissions' ? '17' : null; }, async put() { throw new Error('WRITE!'); }, async delete() { throw new Error('DELETE!'); }, async list() { throw new Error('LIST!'); } };
  assert.equal(await readSubmissionCount({ CAMP_KV: kv }, 'sample-winter'), 17); assert.equal(await readSubmissionCount({ CAMP_KV: kv }, 'unknown'), null);
  for (const bad of ['', 'a:b', '../x', 'a b', 'x'.repeat(61)]) assert.equal(await readSubmissionCount({ CAMP_KV: kv }, bad), null);
  assert.equal(await readSubmissionCount({}, 'sample-winter'), null, 'KV 가 없으면 조용히 null');
  assert.deepEqual(log, ['camp:sample-winter:submissions', 'camp:unknown:submissions']);
  const env = makeEnv(fakeD1(), { CAMP_KV: kv }); const body = await J(await tv(env, 'testtoken1'));
  assert.deepEqual(body.data.campers.map(c => [c.count, c.capacity]), [[17, 40]]); assert.ok(log.every(k => /^camp:[\w-]+:submissions$/.test(k)));
  assert.deepEqual((await J(await tv(makeEnv(fakeD1()), 'testtoken1'))).data.campers, [], '연결 안 됐으면 빈 목록');
  assert.doesNotMatch(readFileSync(root + 'functions/lib/campteamRegistrations.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /\.put\(|\.delete\(|\.list\(|:reg:/);
});

test('공지: 조회는 로그인한 모두, 작성·수정·삭제는 팀원 이상', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call(Notices, 'onRequestGet', env, U.view)).status, 200); assert.equal((await call(Notices, 'onRequestPost', env, U.view, { body: { message: 'x' } })).status, 403);
  assert.equal((await call(Notices, 'onRequestPost', env, U.mem, { body: { message: ' ' } })).status, 400);
  const { id } = await J(await call(Notices, 'onRequestPost', env, U.mem, { body: { message: '새 공지', messageEn: 'New notice' } }));
  assert.equal((await call(Notices, 'onRequestPatch', env, U.mem, { qs: `?id=${id}`, body: { active: false } })).status, 200);
  assert.equal((await J(await tv(env, 'testtoken1'))).data.notices.some(n => n.message === '새 공지'), false, '숨김 처리하면 TV 에서 사라진다');
  assert.equal((await call(Notices, 'onRequestDelete', env, U.mem, { qs: `?id=${id}` })).status, 200); assert.equal((await call(Notices, 'onRequestDelete', env, U.mem, { qs: `?id=${id}` })).status, 404);
});

test('캠프의 주제·정원·신청 시스템 ID 입력 검사', async () => {
  const env = makeEnv(fakeD1()); const patch = (body) => call(Camps, 'onRequestPatch', env, U.fin, { qs: '?kind=camp&id=camp-u26', body });
  assert.equal((await patch({ theme: '주제 샘플', capacity: '60', registrationCampId: 'unity-2027' })).status, 200);
  assert.deepEqual({ ...env.DB.sqlite.prepare('SELECT theme, capacity, registrationCampId FROM camps WHERE id=?').get('camp-u26') }, { theme: '주제 샘플', capacity: 60, registrationCampId: 'unity-2027' });
  for (const bad of [{ capacity: 'abc' }, { capacity: 0 }, { capacity: 1.5 }, { registrationCampId: 'a:b' }, { registrationCampId: 'x y' }]) assert.equal((await patch(bad)).status, 400, JSON.stringify(bad));
  assert.equal((await patch({ capacity: '', registrationCampId: '' })).status, 200); assert.equal(env.DB.sqlite.prepare('SELECT capacity FROM camps WHERE id=?').get('camp-u26').capacity, null);
});
