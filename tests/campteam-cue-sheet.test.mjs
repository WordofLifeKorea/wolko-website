import assert from 'node:assert/strict';
import test from 'node:test';
import * as TL from '../functions/api/campteam/timeline.js';
import * as SP from '../functions/api/campteam/supplies.js';
import * as TM from '../functions/api/campteam/camp-teams.js';
import * as Lib from '../functions/lib/campteamCue.js';
import '../public/portal/campteam/xlsx-lite.js';
import '../public/portal/campteam/cue-core.js';
import '../public/portal/campteam/cue-import.js';
import '../public/portal/campteam/cue-print.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const CC = globalThis.CueCore, CI = globalThis.CueImport, CP = globalThis.CuePrint, X = globalThis.XlsxLite;
const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { url: 'http://localhost/api/campteam/x' + (o.qs || ''), method: o.method, body: o.body }) }); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text() }; };
const campId = async (env) => (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL ORDER BY createdAt LIMIT 1').first()).id;
const list = async (env, cid) => (await call(TL.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items;
const teams = async (env, cid) => (await call(TM.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items;
const mkTeam = (env, cid, name, extra = {}) => call(TM.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, name, ...extra } });

test('마이그레이션 0041: 새 칸과 camp_teams 표가 생긴다', () => {
  const env = makeEnv(fakeD1()), cols = (t) => env.DB.sqlite.prepare(`PRAGMA table_info(${t})`).all();
  const tl = cols('camp_timeline'), by = Object.fromEntries(tl.map((c) => [c.name, c]));
  for (const k of ['team', 'prepNotes', 'items']) { assert.ok(by[k], k); assert.equal(by[k].notnull, 1); assert.equal(by[k].dflt_value, "''"); }
  assert.ok(by.prepMinutes); assert.equal(by.prepMinutes.notnull, 0); assert.equal(by.prepMinutes.type, 'INTEGER');
  assert.ok(by.notes, '내부 메모 칸은 그대로');
  assert.ok(cols('camp_supplies').some((c) => c.name === 'team'));
  assert.deepEqual(cols('camp_teams').map((c) => c.name), ['id', 'campId', 'name', 'color', 'sortOrder', 'createdAt', 'updatedAt', 'createdBy', 'deletedAt']);
  assert.ok(env.DB.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_camp_teams_camp'").get());
});

test('진행표 API: 새 칸 저장·읽기·부분 수정, 예전 방식 요청도 그대로', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  const a = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', startTime: '9:00', endTime: '10:00', title: '개회 예배', place: '강당', team: ' 찬양팀 ', prepNotes: '악기 세팅\n사운드 체크', items: ' 마이크 \n\n악보  \n', prepMinutes: '30', notes: '내부용', ownerName: '제이슨' } });
  assert.equal(a.status, 201);
  const r = (await list(env, cid))[0];
  assert.equal(r.team, '찬양팀'); assert.equal(r.prepNotes, '악기 세팅\n사운드 체크'); assert.equal(r.items, '마이크\n악보'); assert.equal(r.prepMinutes, 30); assert.equal(r.notes, '내부용');
  // 일부만 고쳐도 나머지 칸은 유지
  assert.equal((await call(TL.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + r.id, body: { place: '체육관' } })).status, 200);
  const r2 = (await list(env, cid))[0]; assert.deepEqual([r2.place, r2.team, r2.items, r2.prepMinutes], ['체육관', '찬양팀', '마이크\n악보', 30]);
  // 준비 시간을 비우면 null, 이상한 값은 거절
  assert.equal((await call(TL.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + r.id, body: { prepMinutes: '' } })).status, 200);
  assert.equal((await list(env, cid))[0].prepMinutes, null);
  for (const bad of ['abc', -5, 721, 1.5]) assert.equal((await call(TL.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + r.id, body: { prepMinutes: bad } })).status, 400, String(bad));
  // 길이 제한
  await call(TL.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + r.id, body: { team: 'ㄱ'.repeat(60), prepNotes: 'x'.repeat(2000), items: Array.from({ length: 80 }, (_, i) => '물품' + i).join('\n') } });
  const r3 = (await list(env, cid))[0]; assert.equal(r3.team.length, 30); assert.equal(r3.prepNotes.length, 1000); assert.equal(r3.items.split('\n').length, 40);
  // 예전 화면(새 칸을 모르는 요청)도 만들어진다
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', title: '등록' } })).status, 201);
  const old = (await list(env, cid)).find((x) => x.title === '등록'); assert.deepEqual([old.team, old.prepNotes, old.items, old.prepMinutes], ['', '', '', null]);
  // 붙여넣기(예전 방식)도 그대로
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'paste', campId: cid, text: '2026-07-21\t10:00\t11:00\t게임\t운동장' } })).body.created, 1);
});

test('0041 반영 전에도 목록(GET)은 예전 칸으로 동작한다', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', title: '등록' } });
  await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, name: '생수' } });
  for (const c of ['team', 'prepNotes', 'items', 'prepMinutes']) env.DB.sqlite.exec(`ALTER TABLE camp_timeline DROP COLUMN ${c}`);
  env.DB.sqlite.exec('ALTER TABLE camp_supplies DROP COLUMN team');
  const t = await call(TL.onRequestGet, env, U.mem, { qs: '?campId=' + cid }); assert.equal(t.status, 200); assert.equal(t.body.items[0].title, '등록');
  const s = await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + cid }); assert.equal(s.status, 200); assert.equal(s.body.items[0].name, '생수');
});

test('준비물: 팀 칸 저장', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  assert.equal((await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, name: '마이크', team: '찬양팀' } })).status, 201);
  const it = (await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items[0]; assert.equal(it.team, '찬양팀');
  await call(SP.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + it.id, body: { qty: '4개' } });
  assert.equal((await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items[0].team, '찬양팀', '다른 칸만 고쳐도 팀 유지');
});

test('팀 만들기·이름 바꾸기·색·순서·지우기', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  const a = await mkTeam(env, cid, '찬양팀'); assert.equal(a.status, 201);
  const b = await mkTeam(env, cid, '미디어팀', { color: '#AABBCC' }); assert.equal(b.status, 201);
  let t = await teams(env, cid); assert.deepEqual(t.map((x) => x.name), ['찬양팀', '미디어팀']); assert.match(t[0].color, /^#[0-9a-f]{6}$/, '색을 안 정하면 자동으로'); assert.equal(t[1].color, '#aabbcc'); assert.deepEqual(t.map((x) => x.sortOrder), [0, 1]);
  // 겹치는 이름·「전체」·이상한 색·빈 이름
  assert.equal((await mkTeam(env, cid, ' 찬양팀 ')).status, 400);
  assert.equal((await mkTeam(env, cid, '전체')).status, 400);
  assert.equal((await mkTeam(env, cid, '식사팀', { color: 'red' })).status, 400);
  assert.equal((await mkTeam(env, cid, '  ')).status, 400);
  assert.equal((await call(TM.onRequestPost, env, U.mem, { method: 'POST', body: { campId: 'nope', name: 'x' } })).status, 400);
  // 다른 캠프에는 같은 이름 가능
  const other = (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL AND id != ?1 LIMIT 1').bind(cid).first()).id;
  assert.equal((await mkTeam(env, other, '찬양팀')).status, 201);
  // 이름 바꾸기: 그 캠프의 진행표·준비물 이름도 함께 바뀌고 다른 캠프는 그대로
  await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', title: '예배', team: '찬양팀' } });
  await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: other, dayDate: '2026-07-20', title: '예배', team: '찬양팀' } });
  await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, name: '악보대', team: '찬양팀' } });
  assert.equal((await call(TM.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + t[0].id, body: { name: '워십팀' } })).status, 200);
  assert.equal((await list(env, cid))[0].team, '워십팀'); assert.equal((await list(env, other))[0].team, '찬양팀');
  assert.equal((await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items[0].team, '워십팀');
  assert.equal((await call(TM.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + t[0].id, body: { name: '미디어팀' } })).status, 400, '이미 있는 이름으로는 못 바꿈');
  assert.equal((await call(TM.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + t[0].id, body: { color: '#112233' } })).status, 200);
  // 순서 바꾸기
  const ids = (await teams(env, cid)).map((x) => x.id);
  assert.equal((await call(TM.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'reorder', campId: cid, ids: [ids[1], ids[0]] } })).status, 200);
  t = await teams(env, cid); assert.deepEqual(t.map((x) => x.name), ['미디어팀', '워십팀']); assert.equal(t[1].color, '#112233');
  // 지우기: 팀 칸만 비워지고 일정은 남는다
  const del = await call(TM.onRequestDelete, env, U.mem, { method: 'DELETE', qs: '?id=' + t[1].id }); assert.equal(del.status, 200); assert.equal(del.body.cleared, 2);
  assert.deepEqual((await teams(env, cid)).map((x) => x.name), ['미디어팀']);
  const rows = await list(env, cid); assert.equal(rows.length, 1); assert.equal(rows[0].team, '');
  assert.equal((await mkTeam(env, cid, '워십팀')).status, 201, '지운 이름은 다시 쓸 수 있다');
});

test('팀 API 권한: 보기만 하는 계정·명단 밖', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  assert.equal((await mkTeam(env, cid, 'x')).status, 201);
  assert.equal((await call(TM.onRequestGet, env, U.view, { qs: '?campId=' + cid })).status, 200);
  assert.equal((await call(TM.onRequestPost, env, U.view, { method: 'POST', body: { campId: cid, name: 'y' } })).status, 403);
  assert.equal((await call(TM.onRequestGet, env, U.out, { qs: '?campId=' + cid })).status, 403);
  const id = (await teams(env, cid))[0].id;
  assert.equal((await call(TM.onRequestDelete, env, U.view, { method: 'DELETE', qs: '?id=' + id })).status, 403);
  assert.equal((await call(TM.onRequestPatch, env, U.view, { method: 'PATCH', qs: '?id=' + id, body: { name: 'z' } })).status, 403);
  assert.equal((await call(TM.onRequestPost, env, U.view, { method: 'POST', body: { action: 'reorder', campId: cid, ids: [id] } })).status, 403);
  assert.equal((await teams(env, cid))[0].name, 'x');
});

test('표 가져오기 API: 미리보기(저장 안 함) → 저장, 중복 건너뛰기, 새 팀 자동 추가', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', startTime: '09:00', title: '개회 예배', team: '찬양팀' } });
  const rows = [
    { dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: ' 개회  예배 ', team: '찬양팀', place: '강당' },     // 이미 있음(공백·대소문자 무시)
    { dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: '개회 예배', team: '미디어팀', items: '카메라\n삼각대', prepNotes: '송출 점검' },   // 같은 칸이라도 다른 팀이면 새 줄
    { dayDate: '2026-07-20', startTime: '09:00', title: '개회 예배', team: '미디어팀' },                                         // 같은 묶음 안 중복
    { dayDate: '07/20', title: '날짜 이상' }, { dayDate: '2026-07-20', title: '' }, { dayDate: '2026-07-20', startTime: '9시반', title: '시간 이상' }, { dayDate: '2026-07-20', startTime: '11:00', endTime: '10:00', title: '거꾸로' }
  ];
  const pv = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: cid, rows, preview: true } });
  assert.equal(pv.status, 200); assert.deepEqual(pv.body.results.map((r) => r.status), ['dup', 'new', 'dup', 'bad', 'bad', 'bad', 'bad']); assert.deepEqual(pv.body.counts, { new: 1, dup: 2, bad: 4 });
  assert.equal((await list(env, cid)).length, 1, '미리보기는 저장하지 않는다'); assert.equal((await teams(env, cid)).length, 0);
  const go = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: cid, rows } });
  assert.equal(go.status, 201); assert.equal(go.body.created, 1); assert.deepEqual(go.body.newTeams, ['미디어팀'], '새로 쓰는 줄의 팀만(건너뛴 줄의 팀은 만들지 않는다)');
  const l = await list(env, cid); assert.equal(l.length, 2); const m = l.find((x) => x.team === '미디어팀'); assert.deepEqual([m.items, m.prepNotes, m.endTime, m.notes, m.ownerName], ['카메라\n삼각대', '송출 점검', '10:00', '', '']);
  assert.deepEqual((await teams(env, cid)).map((x) => x.name), ['미디어팀']);
  // 같은 파일을 또 가져와도 늘어나지 않는다
  const again = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: cid, rows } }); assert.equal(again.status, 400);
  assert.equal((await list(env, cid)).length, 2);
  // 입력 검사·권한·한도
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: 'nope', rows } })).status, 400);
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: cid, rows: [] } })).status, 400);
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'cue-import', campId: cid, rows: Array.from({ length: 401 }, (_, i) => ({ dayDate: '2026-07-21', title: 't' + i })) } })).status, 400);
  assert.equal((await call(TL.onRequestPost, env, U.view, { method: 'POST', body: { action: 'cue-import', campId: cid, rows: [{ dayDate: '2026-07-22', title: 'z' }] } })).status, 403);
  assert.equal((await call(TL.onRequestPost, env, U.view, { method: 'POST', body: { action: 'cue-import', campId: cid, rows: [{ dayDate: '2026-07-22', title: 'z' }], preview: true } })).status, 200, '미리보기는 보기 권한이면 된다');
  assert.equal((await call(TL.onRequestPost, env, U.out, { method: 'POST', body: { action: 'cue-import', campId: cid, rows, preview: true } })).status, 403);
});

test('표 읽기: 붙여넣기(탭) — 머리글·범위 시간·오전/오후·날짜 이어쓰기·여러 팀·메모 열 제외', () => {
  const t = ['날짜\t시간\t일정\t장소\t담당팀\t준비물\t할 일\t비고', '7월 20일(월)\t09:00-10:00\t개회 예배\t강당\t찬양팀, 미디어팀\t"마이크\n악보대"\t리허설 먼저\t사장님 메모', '\t오전 10시 30분\t게임\t운동장\t게임팀\t공, 호루라기\t\t', '2026.7.21\t오후 2:00\t오후 활동\t\t\t\t\t', '\t곧\t이상한 시간\t\t\t\t\t', '\t11:00\t\t\t\t\t\t'].join('\n');
  const r = CI.fromText(t, { defaultDay: '2026-07-20' });
  assert.equal(r.header, true); assert.deepEqual(r.ignored, ['비고']); assert.ok(r.used.includes('준비물'));
  assert.deepEqual(r.rows.map((x) => [x.dayDate, x.startTime, x.endTime, x.title, x.team]), [['2026-07-20', '09:00', '10:00', '개회 예배', '찬양팀'], ['2026-07-20', '09:00', '10:00', '개회 예배', '미디어팀'], ['2026-07-20', '10:30', '', '게임', '게임팀'], ['2026-07-21', '14:00', '', '오후 활동', '']]);
  assert.equal(r.rows[0].items, '마이크\n악보대'); assert.equal(r.rows[2].items, '공\n호루라기'); assert.equal(r.rows[0].prepNotes, '리허설 먼저');
  assert.ok(!JSON.stringify(r.rows).includes('사장님'), '비고(메모) 열은 가져오지 않는다');
  assert.deepEqual(r.skipped.map((s) => s.reason), ['시작 시간을 읽지 못했어요', '일정 이름이 없어요']);
});

test('표 읽기: 머리글 없음(정해진 순서) · 날짜 구분 줄 · 날짜를 알 수 없으면 건너뜀 · 지어내지 않음', () => {
  const r = CI.fromText('7월 20일\n09:00\t10:00\t개회\t강당\t찬양팀\n7월 21일\n08:00\t\t아침 기도', { defaultDay: '2026-07-20' });
  // 첫 열이 날짜 자리인 표(날짜\t시작…)가 아니면 [날짜][시작]… 순서로 읽는다 — 시간이 날짜 칸에 들어가면 날짜를 못 읽으므로 건너뛴다
  assert.equal(r.header, false);
  const r2 = CI.fromText('2026-07-20\t09:00\t10:00\t개회\t강당\t찬양팀\t마이크, 악보\t리허설\n\t10:00\t\t게임');
  assert.deepEqual(r2.rows.map((x) => [x.dayDate, x.startTime, x.title, x.team, x.items, x.prepNotes]), [['2026-07-20', '09:00', '개회', '찬양팀', '마이크\n악보', '리허설'], ['2026-07-20', '10:00', '게임', '', '', '']]);
  const none = CI.fromText('09:00\t10:00\t개회\t강당');   // 날짜도 기본 날짜도 없다
  assert.equal(none.rows.length, 0); assert.equal(none.skipped.length, 1);
  assert.deepEqual(CI.fromText('', {}).rows, []); assert.deepEqual(CI.fromRows(null).rows, []);
  // 날짜만 적힌 구분 줄은 아래 줄의 날짜가 된다(머리글 있는 표)
  const d = CI.fromText('시작\t일정\n7월 20일(월)\n09:00\t개회\n7월 21일(화)\n09:30\t기도', { year: 2026 });
  assert.deepEqual(d.rows.map((x) => [x.dayDate, x.startTime, x.title]), [['2026-07-20', '09:00', '개회'], ['2026-07-21', '09:30', '기도']]);
});

test('표 읽기: 엑셀 시간·날짜 숫자, 범위 칸, 읽기 규칙', () => {
  assert.equal(CI.parseClock(0.375), '09:00'); assert.equal(CI.parseClock(0.5), '12:00'); assert.equal(CI.parseClock('오후 2시'), '14:00'); assert.equal(CI.parseClock('12:00 AM'), '00:00'); assert.equal(CI.parseClock('9:30'), '09:30'); assert.equal(CI.parseClock('25:00'), ''); assert.equal(CI.parseClock('곧'), '');
  assert.equal(CI.parseDay(46223), '2026-07-20'); assert.equal(CI.parseDay('2026/7/5'), '2026-07-05'); assert.equal(CI.parseDay('7/20', 2026), '2026-07-20'); assert.equal(CI.parseDay('2026-02-30'), ''); assert.equal(CI.parseDay('아무 말'), '');
  assert.deepEqual(CI.splitRange('9시~10시 30분'), ['09:00', '10:30']); assert.equal(CI.splitRange('09:00'), null);
  assert.deepEqual(CI.parseText('a\tb\n"x\ty\nz"\tq'), [['a', 'b'], ['x\ty\nz', 'q']]);
});

test('표 읽기: .xlsx 파일(작은 가짜 파일) → 읽은 표 → 가져올 줄', async () => {
  const book = await X.read(X.write({ sheets: [{ name: '메모', rows: [['아무거나']] }, { name: '큐시트', rows: [['날짜', '시작', '끝', '프로그램', '장소', '팀', '준비물', '준비사항'], [{ d: '2026-07-20' }, 0.375, 0.416666666666667, '개회 예배', '강당', '찬양팀', '마이크, 악보', '리허설'], [null, '10:30', null, '게임', '운동장', '게임팀', '공', null]] }] }));
  assert.equal(book.sheets.length, 2);
  const sheet = book.sheets[1], r = CI.fromRows(sheet.rows.map((row) => row.map((c) => (c == null ? '' : c))), { defaultDay: '2026-07-20' });
  assert.deepEqual(r.rows.map((x) => [x.dayDate, x.startTime, x.endTime, x.title, x.team, x.items, x.prepNotes]), [['2026-07-20', '09:00', '10:00', '개회 예배', '찬양팀', '마이크\n악보', '리허설'], ['2026-07-20', '10:30', '', '게임', '게임팀', '공', '']]);
  assert.deepEqual(r.skipped, []);
});

const ROWS = [
  { id: 'a', dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: '개회 예배', place: '강당', team: '찬양팀', prepNotes: '악기 세팅', items: '마이크\n악보', prepMinutes: 30, notes: '비밀 내부 메모 A', ownerName: '제이슨', sortOrder: 0 },
  { id: 'b', dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: '개회 예배', place: '강당', team: '미디어팀', prepNotes: '송출', items: '카메라', prepMinutes: null, notes: '비밀 내부 메모 B', ownerName: '엘라', sortOrder: 1 },
  { id: 'c', dayDate: '2026-07-20', startTime: '10:30', endTime: '', title: '<b>간식</b> & 놀이', place: '', team: '전체', prepNotes: '', items: '', prepMinutes: null, notes: '', ownerName: '', sortOrder: 0 },
  { id: 'd', dayDate: '2026-07-21', startTime: '08:00', endTime: '', title: '아침 기도', place: '', team: '식사팀', prepNotes: '', items: '컵', prepMinutes: 15, notes: '', ownerName: '', sortOrder: 0 }
];

test('인쇄 화면: 기본으로 내부 메모·담당자 이름은 나가지 않는다', () => {
  const html = CP.printHtml(ROWS, { campName: '여름 캠프' });
  assert.ok(!html.includes('비밀 내부 메모')); assert.ok(!html.includes('제이슨')); assert.ok(!html.includes('엘라'));
  assert.ok(html.includes('마이크') && html.includes('악보') && html.includes('악기 세팅') && html.includes('찬양팀') && html.includes('강당'));
  assert.equal((html.match(/class="cue-page"/g) || []).length, 2, '하루에 한 쪽');
  assert.ok(html.includes('&lt;b&gt;간식&lt;/b&gt; &amp; 놀이') && !html.includes('<b>간식</b>'), '글은 안전하게 바꿔서 넣는다');
  assert.ok(html.includes('준비 끝 08:30'), '준비 몇 분 전 → 준비 끝낼 시각');
  const own = CP.printHtml(ROWS, { campName: '여름 캠프', showOwners: true });
  assert.ok(own.includes('제이슨') && own.includes('엘라')); assert.ok(!own.includes('비밀 내부 메모'), '담당자를 넣어도 내부 메모는 안 나간다');
});

test('인쇄 화면: 팀 걸러내기(+전체), 날짜 고르기, 준비물 목록은 이름·수량·팀만', () => {
  const html = CP.printHtml(ROWS, { campName: 'c', team: '찬양팀' });
  assert.ok(html.includes('악기 세팅') && html.includes('간식') && !html.includes('송출') && !html.includes('아침 기도'));
  assert.equal((html.match(/class="cue-page"/g) || []).length, 1, '그 팀에 일정이 없는 날은 쪽이 안 생긴다');
  assert.equal(CP.pages(ROWS, { team: '찬양팀' })[0].n, 1); assert.equal(CP.pages(ROWS, { days: ['2026-07-21'] })[0].n, 2, 'n일차는 캠프 전체 날짜 순서');
  const sup = CP.printHtml([], { campName: 'c', supplies: [{ name: '생수', qty: '100병', team: '식사팀', ownerName: '비밀담당', notes: '비밀노트' }, { name: '마이크', team: '찬양팀' }] });
  assert.ok(sup.includes('생수 × 100병') && sup.includes('식사팀') && sup.includes('마이크')); assert.ok(!sup.includes('비밀'));
  const m = CP.imageModel(CP.pages(ROWS, {})[0], { campName: '여름 캠프' }); assert.match(m.title, /7월 20일 \(월\)/); assert.equal(m.entries.length, 3);
  assert.ok(!JSON.stringify(m.entries).includes('비밀'));
});

test('cue-core: staffView 는 내부 메모·담당자를 절대 돌려주지 않는다', () => {
  const v = CC.staffView(ROWS[0]);
  assert.deepEqual(Object.keys(v).sort(), ['dayDate', 'endTime', 'items', 'place', 'prepMinutes', 'prepNotes', 'startTime', 'team', 'title']);
  assert.equal(v.prepMinutes, 30); assert.equal(v.items, '마이크\n악보'); assert.ok(!('notes' in v) && !('ownerName' in v));
  assert.equal(CC.staffView(ROWS[1]).prepMinutes, null); assert.equal(CC.staffView(null).title, ''); assert.equal(CC.staffView({ prepMinutes: 'x' }).prepMinutes, null);
});

test('cue-core: groupByDay — 날짜·시작 시각·sortOrder 순, 시각 없는 줄은 맨 끝, 빈 입력', () => {
  const rows = [{ dayDate: '2026-07-21', startTime: '08:00', title: 'd2' }, { dayDate: '2026-07-20', startTime: '', title: 'free' }, { dayDate: '2026-07-20', startTime: '10:00', title: 'b', sortOrder: 2 }, { dayDate: '2026-07-20', startTime: '10:00', title: 'a', sortOrder: 1 }, { dayDate: '2026-07-20', startTime: '09:00', title: 'first' }, { dayDate: '', title: '날짜 없음' }, null];
  const g = CC.groupByDay(rows); assert.deepEqual(g.map((x) => x.day), ['2026-07-20', '2026-07-21']);
  assert.deepEqual(g[0].rows.map((r) => r.title), ['first', 'a', 'b', 'free']); assert.equal(g[0].rows[0], rows[4], '줄 객체는 그대로');
  assert.deepEqual(CC.groupByDay([]), []); assert.deepEqual(CC.groupByDay(null), []); assert.deepEqual(CC.groupByDay(undefined), []);
});

const at = (date, hm) => { const [h, m] = hm.split(':').map(Number); return { date, minutes: h * 60 + m }; };
const T = (title, start, end, extra = {}) => ({ id: title, dayDate: '2026-07-20', startTime: start, endTime: end, title, sortOrder: 0, ...extra });

test('cue-core: currentAndNext — 진행 중·다음·그 뒤', () => {
  const rows = [T('등록', '08:00', '09:00'), T('예배', '09:00', '10:00'), T('게임', '10:30', '12:00'), T('점심', '12:00', '13:00'), T('다음날', '08:00', '09:00', { dayDate: '2026-07-21' })];
  let r = CC.currentAndNext(rows, at('2026-07-20', '09:30')); assert.equal(r.current.title, '예배'); assert.equal(r.next.title, '게임'); assert.deepEqual(r.later.map((x) => x.title), ['점심'], '같은 날 다음 줄들만');
  r = CC.currentAndNext(rows, at('2026-07-20', '10:10')); assert.equal(r.current, null, '쉬는 시간'); assert.equal(r.next.title, '게임');
  r = CC.currentAndNext(rows, at('2026-07-20', '09:00')); assert.equal(r.current.title, '예배', '시작 시각 정각은 진행 중'); r = CC.currentAndNext(rows, at('2026-07-20', '10:00')); assert.equal(r.current, null, '끝 시각 정각은 끝남');
  r = CC.currentAndNext(rows, at('2026-07-20', '07:00')); assert.equal(r.current, null); assert.equal(r.next.title, '등록'); assert.deepEqual(r.later.map((x) => x.title), ['예배', '게임', '점심']);
  r = CC.currentAndNext(rows, at('2026-07-20', '13:30')); assert.equal(r.current, null); assert.equal(r.next.title, '다음날'); assert.deepEqual(r.later, []);
  r = CC.currentAndNext(rows, at('2026-07-22', '08:00')); assert.deepEqual(r, { current: null, next: null, later: [], alsoNow: [] }, '모두 지난 뒤');
});

test('cue-core: currentAndNext — 겹침(함께 진행)·끝 시각 없음·자정 넘김·빈 입력', () => {
  // 겹침: 가장 늦게 시작한 줄이 current, 나머지는 alsoNow
  const ov = [T('긴 활동', '09:00', '12:00'), T('찬양', '10:00', '10:30'), T('게임', '10:15', '11:00')];
  let r = CC.currentAndNext(ov, at('2026-07-20', '10:20')); assert.equal(r.current.title, '게임'); assert.deepEqual(r.alsoNow.map((x) => x.title).sort(), ['긴 활동', '찬양']);
  r = CC.currentAndNext(ov, at('2026-07-20', '11:30')); assert.equal(r.current.title, '긴 활동'); assert.deepEqual(r.alsoNow, []);
  // 같은 시각에 시작하는 두 팀 줄: 둘 다 진행 중, 다음 줄도 같이 센다
  const two = [T('예배(찬양)', '09:00', '10:00', { sortOrder: 0 }), T('예배(미디어)', '09:00', '10:00', { sortOrder: 1 }), T('간식', '10:00', '10:30')];
  r = CC.currentAndNext(two, at('2026-07-20', '09:10')); assert.equal(r.current.title, '예배(찬양)'); assert.deepEqual(r.alsoNow.map((x) => x.title), ['예배(미디어)']); assert.equal(r.next.title, '간식');
  r = CC.currentAndNext(two, at('2026-07-20', '08:00')); assert.equal(r.next.title, '예배(찬양)'); assert.deepEqual(r.later.map((x) => x.title), ['예배(미디어)', '간식']);
  // 끝 시각 없음: 같은 날 그다음 줄이 시작할 때까지, 마지막 줄이면 1시간
  const ne = [T('자유 시간', '14:00', ''), T('저녁', '17:00', '18:00'), T('취침 준비', '21:00', '')];
  r = CC.currentAndNext(ne, at('2026-07-20', '16:59')); assert.equal(r.current.title, '자유 시간'); r = CC.currentAndNext(ne, at('2026-07-20', '17:00')); assert.equal(r.current.title, '저녁');
  r = CC.currentAndNext(ne, at('2026-07-20', '21:59')); assert.equal(r.current.title, '취침 준비'); r = CC.currentAndNext(ne, at('2026-07-20', '22:00')); assert.equal(r.current, null);
  // 시작 시각 없는 줄은 current/next/later 에 안 들어간다
  r = CC.currentAndNext([T('하루 종일', '', ''), T('예배', '09:00', '10:00')], at('2026-07-20', '08:00')); assert.equal(r.next.title, '예배'); assert.deepEqual(r.later, []);
  // 자정 넘김: 23:00–01:00 은 다음 날 00:30 에도 진행 중
  const mid = [T('밤 별 보기', '23:00', '01:00'), T('아침 기도', '07:00', '08:00', { dayDate: '2026-07-21' })];
  r = CC.currentAndNext(mid, at('2026-07-20', '23:30')); assert.equal(r.current.title, '밤 별 보기'); r = CC.currentAndNext(mid, at('2026-07-21', '00:30')); assert.equal(r.current.title, '밤 별 보기'); assert.equal(r.next.title, '아침 기도');
  r = CC.currentAndNext(mid, at('2026-07-21', '01:00')); assert.equal(r.current, null);
  // 빈 입력·이상한 입력
  const empty = { current: null, next: null, later: [], alsoNow: [] };
  assert.deepEqual(CC.currentAndNext([], at('2026-07-20', '09:00')), empty); assert.deepEqual(CC.currentAndNext(null, at('2026-07-20', '09:00')), empty);
  assert.deepEqual(CC.currentAndNext(ov, null), empty); assert.deepEqual(CC.currentAndNext(ov, { date: 'x', minutes: 5 }), empty); assert.deepEqual(CC.currentAndNext(ov, { date: '2026-07-20', minutes: 'a' }), empty);
  assert.deepEqual(CC.currentAndNext([{ dayDate: '2026-07-20', startTime: 'abc', title: 'x' }, null], at('2026-07-20', '09:00')), empty);
});

test('cue-core 와 서버 거울(functions/lib/campteamCue.js)은 같은 결과를 낸다', () => {
  const rows = [...ROWS, T('긴', '09:00', '12:00', { id: 'x1' }), T('끝없음', '14:00', '', { id: 'x2' }), T('밤', '23:00', '01:00', { id: 'x3' })];
  assert.deepEqual(Lib.groupByDay(rows), CC.groupByDay(rows));
  for (const hm of ['00:30', '08:00', '09:15', '10:40', '14:30', '23:30']) for (const d of ['2026-07-20', '2026-07-21']) assert.deepEqual(Lib.currentAndNext(rows, at(d, hm)), CC.currentAndNext(rows, at(d, hm)), d + ' ' + hm);
  for (const r of rows) assert.deepEqual(Lib.staffView(r), CC.staffView(r));
  assert.ok(!('notes' in Lib.staffView(ROWS[0])) && !('ownerName' in Lib.staffView(ROWS[0])));
  assert.deepEqual(CC.itemsByTeam(ROWS.slice(0, 2)), [{ team: '찬양팀', items: ['마이크', '악보'] }, { team: '미디어팀', items: ['카메라'] }]); assert.equal(CC.readyAt(ROWS[0]), '08:30'); assert.equal(CC.readyAt(ROWS[1]), '');
  assert.equal(CC.readyAt({ startTime: '00:10', prepMinutes: 30 }), '00:00', '자정 앞으로는 안 넘어간다');
});

// ---- 화면 연결 시험: 진짜 브라우저 없이 prep-cue.js 를 가짜 화면(DOM 흉내) 위에서 돌려 본다 ----
test('prep-cue.js: 진행표 탭 그리기(하루/한 주/팀 걸러 보기)와 다른 onTimeline 훅 이어 부르기', async () => {
  const { readFileSync } = await import('node:fs'), vm = await import('node:vm');
  const els = {}, mkEl = () => ({ innerHTML: '', hidden: false, value: '', dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], insertBefore() {}, insertAdjacentHTML() {}, showModal() { this.open = true; }, close() { this.open = false; }, addEventListener() {}, removeEventListener() {}, focus() {} });
  const document = { getElementById: (id) => (els[id] ||= mkEl()), createElement: mkEl, addEventListener() {}, body: { appendChild() {}, classList: { add() {}, remove() {} } } };
  const dict = {}, CT = { addDict(d) { Object.assign(dict, d.ko); }, esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), t: (k) => (k in dict ? dict[k] : k), lang: () => 'ko', api: async (path) => (path.includes('camp-teams') ? { items: [{ id: 't1', name: '찬양팀', color: '#2f7fd1' }] } : { items: [] }) };
  const hookCalls = []; const P = { S: { tab: 'timeline', campId: 'c1', camps: [{ id: 'c1', nameKo: '여름 캠프', startDate: '2026-07-20' }] }, api: async () => ({}), canW: () => true, campLabel: (c) => c.nameKo, del() {}, show: async () => {}, onTimeline: () => hookCalls.push('assign') };
  const ctx = { window: null, document, CT, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console, Date, Array, Object, String, Number, Promise, Math, JSON, setTimeout, clearTimeout, alert() {}, confirm: () => true, navigator: {}, URL: { createObjectURL: () => 'blob:x' }, File: class {}, Blob: class {} };
  ctx.window = ctx; ctx.window.CTPrep = P; ctx.CTPrep = P; ctx.CueCore = CC; ctx.CueImport = CI; ctx.CuePrint = CP; ctx.XlsxLite = X; ctx.CT = CT;
  vm.runInNewContext(readFileSync(new URL('../public/portal/campteam/prep-cue.js', import.meta.url), 'utf8'), ctx);
  assert.equal(typeof ctx.CTCue.teamOptions, 'function');
  const rows = ROWS.map((r) => ({ ...r, titleEn: '' }));
  P.onTimeline(rows); await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(hookCalls, ['assign'], '먼저 달려 있던 훅도 불린다');
  const html = () => els.pView.innerHTML, click = (sel) => els.pView.onclick({ target: { closest: (q) => (q === sel.q ? sel.el : null) } });
  assert.ok(html().includes('개회 예배') && html().includes('cue-chip') && html().includes('찬양팀') && html().includes('마이크') && html().includes('악기 세팅'), '하루 보기(첫 날)');
  assert.ok(html().includes('비밀 내부 메모 A'), '화면에서는 팀원에게 내부 메모도 보이되 「내부 메모」 이름표가 붙는다'); assert.ok(html().includes('cue-int'));
  assert.ok(html().includes('data-a="add"') && html().includes('data-a="imp"') && html().includes('data-a="teams"') && html().includes('data-a="print"'));
  assert.ok(html().includes('&lt;b&gt;간식&lt;/b&gt;'), '제목은 안전하게 바꿔서 그린다'); assert.ok(!html().includes('<b>간식</b>'));
  click({ q: '[data-v]', el: { dataset: { v: 'week' } } }); assert.ok(html().includes('cue-week') && html().includes('아침 기도') && html().includes('7월 21일 (화)'));
  click({ q: '[data-day]', el: { dataset: { day: '2026-07-21' } } }); assert.ok(html().includes('아침 기도') && !html().includes('개회 예배'), '날짜를 누르면 그 날 화면');
  click({ q: '[data-t]', el: { dataset: { t: '찬양팀' } } }); click({ q: '[data-day]', el: { dataset: { day: '2026-07-20' } } });
  assert.ok(html().includes('악기 세팅') && html().includes('간식') && !html().includes('송출'), '팀 걸러 보기: 그 팀 + 전체');
  // 읽기 전용 계정은 만들기·고치기 단추가 없다
  P.canW = () => false; P.onTimeline(rows); await new Promise((r) => setTimeout(r, 20)); assert.ok(!html().includes('data-a="add"') && !html().includes('data-e='));
  // 준비물 탭에서 쓰는 팀 고르기 목록
  const opts = ctx.CTCue.teamOptions(); assert.deepEqual(opts.slice(0, 3).map((o) => o[0]), ['', '전체', '찬양팀']);
});
