import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import * as Now from '../functions/api/campteam/now.js';
import * as Links from '../functions/api/campteam/share-links.js';
import * as View from '../functions/api/campteam/share-view.js';
import { pickCamp, campPhase, staffRow, parseItems, rowTeamNames, limitToTeams, makeToken, TOKEN_RE, defaultExpiryDate, endOfDayKstIso, linkStatus, cleanTeamList, GONE_BODY } from '../functions/lib/campteamNow.js';
import { todayKST, addDays } from '../functions/lib/campteamDb.js';
import { fakeD1, ensureCueSchema, makeEnv, req, root, U } from './helpers/campteam-fakes.mjs';

// ── 화면 계산(now-core.js)은 브라우저용 파일이라 vm 안에서 읽는다 ──
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(root + 'public/portal/campteam/now-core.js', 'utf8'), ctx);
const NC = ctx.NowCore;
// KST 로 'YYYY-MM-DD HH:MM[:SS]' → 그 순간의 now (서버·기기 시간대와 무관하게 한국 시간으로 읽는지 확인)
const at = (s) => { const [d, t] = s.split(' '), [h, m, sec = 0] = t.split(':').map(Number), [y, mo, da] = d.split('-').map(Number); return NC.kstNow(Date.UTC(y, mo - 1, da, h - 9, m, sec)); };
const R = (o) => ({ dayDate: '2026-07-20', startTime: '', endTime: '', title: 'x', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0, ...o });

test('한국 시간: UTC 15:30 은 다음 날 00:30 (시계·날짜는 기기 시간대와 상관없이 KST)', () => {
  assert.deepEqual({ ...NC.kstNow(Date.UTC(2026, 10, 2, 15, 30)) }, { date: '2026-11-03', minutes: 30, dow: 2 });
  assert.equal(NC.fmtHm(NC.kstNow(Date.UTC(2026, 6, 20, 0, 5)).minutes), '09:05');
});

test('지금·다음·그 다음: 시작 시각은 지금에 포함, 끝 시각은 제외', () => {
  const rows = [R({ startTime: '09:00', endTime: '09:30', title: '등록' }), R({ startTime: '09:30', endTime: '10:30', title: '개회 예배' }), R({ startTime: '10:30', title: '게임' }), R({ startTime: '12:00', endTime: '13:00', title: '점심' }), R({ startTime: '15:00', title: '정리' }), R({ dayDate: '2026-07-21', startTime: '09:00', title: '다음날' })];
  let c = NC.currentAndNext(rows, at('2026-07-20 09:10'));
  assert.equal(c.current.title, '등록'); assert.equal(c.next.title, '개회 예배'); assert.equal(c.minutesToNext, 20); assert.equal(c.minutesLeft, 20);
  assert.deepEqual(Array.from(c.later.map((r) => r.title)), ['게임', '점심', '정리'], '그 다음은 최대 3개, 다음 날 줄은 섞이지 않는다');
  c = NC.currentAndNext(rows, at('2026-07-20 09:30'));
  assert.equal(c.current.title, '개회 예배', '정각에 시작하는 줄은 이미 「지금」'); assert.equal(c.next.title, '게임');
  c = NC.currentAndNext(rows, at('2026-07-20 10:30:00'));
  assert.equal(c.current.title, '게임', '끝 시간이 없으면 다음 줄 시작(12:00)까지');
  c = NC.currentAndNext(rows, at('2026-07-20 11:59:30')); assert.equal(c.current.title, '게임'); assert.equal(c.minutesToNext, 1, '30초 남아도 「1분 뒤」(올림)');
  c = NC.currentAndNext(rows, at('2026-07-20 13:00'));
  assert.equal(c.current, null, '점심은 13:00 에 끝남'); assert.equal(c.next.title, '정리'); assert.equal(c.minutesToNext, 120);
  c = NC.currentAndNext(rows, at('2026-07-20 15:20')); assert.equal(c.current.title, '정리', '마지막 줄은 1시간 동안'); assert.equal(c.next, null);
  c = NC.currentAndNext(rows, at('2026-07-20 16:30')); assert.equal(c.current, null); assert.equal(c.next, null); assert.equal(c.done, true, '오늘 줄이 다 끝남');
  c = NC.currentAndNext(rows, at('2026-07-22 09:00')); assert.equal(c.total, 0); assert.equal(c.done, false);
});

test('시간 없는 줄은 지금·다음이 되지 않고 따로 모인다 · 같은 시각에 시작하는 줄은 함께', () => {
  const rows = [R({ title: '하루 종일 공지' }), R({ startTime: '10:00', endTime: '11:00', title: 'A', team: '찬양' }), R({ startTime: '10:00', endTime: '11:00', title: 'B', team: '게임' })];
  const c = NC.currentAndNext(rows, at('2026-07-20 09:00'));
  assert.equal(c.next.title, 'A'); assert.deepEqual(Array.from(c.nextAlso.map((r) => r.title)), ['B']); assert.deepEqual(Array.from(c.untimed.map((r) => r.title)), ['하루 종일 공지']);
  const d = NC.currentAndNext(rows, at('2026-07-20 10:15')); assert.deepEqual(Array.from(d.currents.map((r) => r.title)), ['A', 'B']);
});

test('「N분 뒤」 말과 「준비는 지금부터」(prepMinutes 안에 들어오면)', () => {
  assert.equal(NC.fmtCountdown(12, 'ko'), '12분 뒤'); assert.equal(NC.fmtCountdown(60, 'ko'), '1시간 뒤'); assert.equal(NC.fmtCountdown(65, 'ko'), '1시간 5분 뒤'); assert.equal(NC.fmtCountdown(65, 'en'), 'in 1 h 5 min'); assert.equal(NC.fmtCountdown(0, 'ko'), '0분 뒤');
  const rows = [R({ startTime: '10:00', title: '저녁 준비', prepMinutes: 30 })];
  assert.equal(NC.currentAndNext(rows, at('2026-07-20 09:29')).prepNow, false, '31분 전: 아직');
  assert.equal(NC.currentAndNext(rows, at('2026-07-20 09:30')).prepNow, true, '정확히 30분 전부터');
  assert.equal(NC.currentAndNext(rows, at('2026-07-20 09:59')).prepNow, true);
  assert.equal(NC.currentAndNext(rows, at('2026-07-20 10:00')).prepNow, false, '시작하면 준비는 끝(그때부터는 「지금」)');
  assert.equal(NC.currentAndNext([R({ startTime: '10:00', title: '준비 없음' })], at('2026-07-20 09:59')).prepNow, false, 'prepMinutes 0 이면 표시 없음');
  assert.equal(NC.prepActive(R({ dayDate: '2026-07-21', startTime: '10:00', prepMinutes: 600 }), at('2026-07-20 09:59')), false, '다른 날 줄은 오늘의 준비가 아님');
});

test('팀 걸러 보기: 고른 팀 + 팀이 없는 공통 일정, 비우면 전부 · 쉼표로 여러 팀', () => {
  const rows = [R({ title: '공통' }), R({ title: '찬양만', team: '찬양' }), R({ title: '게임만', team: '게임' }), R({ title: '둘 다', team: '찬양, 게임' })];
  assert.equal(NC.filterTeams(rows, []).length, 4);
  assert.deepEqual(Array.from(NC.filterTeams(rows, ['찬양']).map((r) => r.title)), ['공통', '찬양만', '둘 다']);
  assert.deepEqual(Array.from(NC.filterTeams(rows, ['게임', '찬양']).map((r) => r.title)), ['공통', '찬양만', '게임만', '둘 다']);
  assert.deepEqual(Array.from(NC.teamList([{ name: '찬양', color: '#f00' }], rows).map((t) => t.name)), ['찬양', '게임'], '팀 표 순서 먼저, 줄에만 있는 팀은 뒤에');
});

test('캠프 단계 · 날짜 탭 · 처음 열 날', () => {
  const camp = { startDate: '2026-07-20', endDate: '2026-07-22', prepStart: '2026-07-13', prepEnd: '2026-07-19' };
  assert.deepEqual({ ...NC.campPhase(camp, '2026-07-21') }, { phase: 'during', dDay: -1, dayNo: 2 });
  assert.equal(NC.campPhase(camp, '2026-07-15').phase, 'prep'); assert.equal(NC.campPhase(camp, '2026-07-01').phase, 'before'); assert.equal(NC.campPhase(camp, '2026-07-01').dDay, 19); assert.equal(NC.campPhase(camp, '2026-08-01').phase, 'after');
  assert.equal(NC.campPhase({ startDate: '2026-07-20' }, '2026-07-10').phase, 'before', '준비 기간 칸이 없어도(다른 작업이 더하는 칸) 동작');
  const tabs = NC.dayTabs(camp, [R({ dayDate: '2026-07-14' })], '2026-07-20');
  assert.deepEqual(Array.from(tabs).slice(0, 3), ['2026-07-13', '2026-07-14', '2026-07-15'], '준비 주간 날짜가 탭에 들어간다'); assert.ok(tabs.includes('2026-07-19') && tabs.includes('2026-07-21') && tabs.includes('2026-07-22'));
  assert.equal(NC.dayLabel('2026-07-19', '2026-07-20', 'ko'), '어제'); assert.equal(NC.dayLabel('2026-07-20', '2026-07-20', 'ko'), '오늘'); assert.equal(NC.dayLabel('2026-07-21', '2026-07-20', 'en'), 'Tomorrow'); assert.equal(NC.dayLabel('2026-07-23', '2026-07-20', 'ko'), '7/23 (목)');
  assert.equal(NC.defaultDay(camp, [R({ dayDate: '2026-07-20' })], '2026-07-20'), '2026-07-20');
  assert.equal(NC.defaultDay({ startDate: '2026-07-20', endDate: '2026-07-22' }, [R({ dayDate: '2026-07-20' }), R({ dayDate: '2026-07-21' })], '2026-07-10'), '2026-07-20', '캠프 전: 가장 가까운 앞날');
  assert.equal(NC.defaultDay({ startDate: '2026-07-20', endDate: '2026-07-22' }, [R({ dayDate: '2026-07-21' })], '2026-08-10'), '2026-07-21', '다 지났으면 마지막 줄 있는 날');
});

test('홈 카드 고르기: 오늘 줄 → live / 곧 시작·준비 중 → D-n / 그 밖엔 카드 없음', () => {
  const camp = { id: 'c', nameKo: '여름 캠프', startDate: '2026-07-20', endDate: '2026-07-22' };
  const now = at('2026-07-20 09:10'), rows = [R({ startTime: '09:00', endTime: '09:30', title: '등록' }), R({ startTime: '10:00', title: '개회' })];
  let c = NC.homeCard({ camp, rows }, now); assert.equal(c.kind, 'live'); assert.equal(c.cn.current.title, '등록'); assert.equal(c.cn.next.title, '개회');
  c = NC.homeCard({ camp, rows: [] }, at('2026-07-21 09:00')); assert.equal(c.kind, 'countdown'); assert.equal(c.label, 'day'); assert.equal(c.dayNo, 2, '캠프 중인데 오늘 줄이 없으면 「n일째」');
  c = NC.homeCard({ camp, rows: [R({ dayDate: '2026-07-20', startTime: '09:00', title: '첫 일정' })] }, at('2026-07-10 12:00'));
  assert.equal(c.kind, 'countdown'); assert.equal(c.label, 'dn'); assert.equal(c.dDay, 10); assert.equal(c.nextRow.title, '첫 일정');
  assert.equal(NC.homeCard({ camp, rows: [] }, at('2026-06-10 12:00')), null, '40일 전: 카드 없음');
  assert.equal(NC.homeCard({ camp: null, rows: [] }, now), null, '캠프가 없으면 빈 카드를 그리지 않는다');
  const prepCamp = { ...camp, prepStart: '2026-05-25', prepEnd: '2026-06-30' };
  c = NC.homeCard({ camp: prepCamp, rows: [R({ dayDate: '2026-06-10', startTime: '14:00', title: '장보기' })] }, at('2026-06-01 08:00')); assert.equal(c.kind, 'countdown', '준비 기간이면 30일보다 멀어도 보인다'); assert.equal(c.dDay, 49);
  c = NC.homeCard({ camp, rows: rows.slice(0, 1) }, at('2026-07-20 20:00')); assert.equal(c.kind, 'countdown'); assert.equal(c.label, 'day', '오늘 줄이 다 끝났어도 캠프 중이면 「n일째」 카드');
  assert.equal(NC.homeCard({ camp, rows: [] }, at('2026-07-23 09:00')), null, '끝난 캠프는 카드 없음');
});

// ── 서버 도우미 ──
test('캠프 고르기: 진행 중 > 14일 안에 시작 > 가장 최근, 취소·삭제는 건너뜀', () => {
  const c = (id, s, e, st = 'planning', x = {}) => ({ id, startDate: s, endDate: e, status: st, ...x }), today = '2026-07-20';
  assert.equal(pickCamp([c('a', '2026-07-25', '2026-07-27'), c('run', '2026-07-19', '2026-07-21'), c('old', '2026-06-01', '2026-06-03')], today).id, 'run');
  assert.equal(pickCamp([c('far', '2026-09-01', '2026-09-03'), c('soon', '2026-07-30', '2026-08-01'), c('old', '2026-06-01', '2026-06-03')], today).id, 'soon');
  assert.equal(pickCamp([c('far', '2026-09-01', '2026-09-03'), c('old', '2026-06-01', '2026-06-03'), c('older', '2026-05-01', '2026-05-03')], today).id, 'old', '14일 안에 없으면 가장 최근에 끝난 캠프');
  assert.equal(pickCamp([c('far', '2026-09-01', '2026-09-03')], today, { horizon: 30, mostRecent: false }), null, '홈 카드: 30일 밖이면 없음');
  assert.equal(pickCamp([c('x', '2026-07-19', '2026-07-21', 'canceled'), c('y', '2026-07-01', '2026-07-02', 'done', { deletedAt: 'z' })], today), null);
  assert.equal(pickCamp([c('prep', '2026-09-01', '2026-09-03', 'planning', { prepStart: '2026-07-10', prepEnd: '2026-07-31' })], today).id, 'prep', '준비 기간 중인 캠프도 진행 중');
  assert.equal(campPhase({ startDate: '2026-07-20', endDate: '2026-07-20' }, '2026-07-20').phase, 'during');
});

test('staffRow: 내부 메모·모르는 칸은 빠지고, 담당자 이름은 허용했을 때만', () => {
  const row = { id: 'r1', campId: 'c1', dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: '개회', titleEn: 'Opening', place: '강당', ownerName: 'Jason', notes: '내부 비밀 메모', team: 't1', prepNotes: '마이크 확인', items: '["마이크","의자"]', prepMinutes: '15', createdBy: 'jason@example.org', phone: '010-0000-0000', email: 'ella@example.org' };
  const teams = [{ id: 't1', name: '찬양팀', color: '#fff' }];
  const a = staffRow(row, { teams }); const js = JSON.stringify(a);
  assert.equal(a.team, '찬양팀', '팀 id 는 이름으로 바뀐다'); assert.deepEqual(a.items, ['마이크', '의자']); assert.equal(a.prepMinutes, 15); assert.equal(a.prepNotes, '마이크 확인');
  for (const bad of ['notes', '내부 비밀', 'ownerName', 'Jason', 'example.org', '010-', 'createdBy', 'campId', '"id"']) assert.equal(js.includes(bad), false, bad + ' 가 나가면 안 됨');
  assert.equal(staffRow(row, { showOwners: true, teams }).ownerName, 'Jason');
  assert.deepEqual(parseItems('마이크\n의자; 책상'), ['마이크', '의자', '책상']); assert.deepEqual(parseItems([{ name: 'A' }, 'B', '']), ['A', 'B']); assert.deepEqual(parseItems(''), []);
  assert.equal(staffRow({ title: 't' }).team, '', '새 칸이 없는 줄도 동작'); assert.equal(staffRow({ title: 't', prepMinutes: 'abc' }).prepMinutes, 0);
  assert.deepEqual(rowTeamNames({ team: 't1, 게임 ,찬양팀' }, teams), ['찬양팀', '게임']);
  const rows = [{ team: '' }, { team: '찬양팀' }, { team: '게임' }]; assert.equal(limitToTeams(rows, ['찬양팀']).length, 2); assert.equal(limitToTeams(rows, []).length, 3);
});

test('토큰: 32자 이상, 주소에 쓸 수 있는 글자만, 겹치지 않음 · 기한 계산', () => {
  const set = new Set(); for (let i = 0; i < 200; i++) { const t = makeToken(); assert.ok(t.length >= 32, t.length); assert.match(t, /^[A-Za-z0-9_-]+$/); assert.ok(TOKEN_RE.test(t)); set.add(t); }
  assert.equal(set.size, 200);
  assert.equal(TOKEN_RE.test('short'), false); assert.equal(TOKEN_RE.test('a'.repeat(31)), false); assert.equal(TOKEN_RE.test('a'.repeat(40) + '%20'), false); assert.equal(TOKEN_RE.test("a'; DROP TABLE x;--" + 'a'.repeat(20)), false);
  assert.equal(defaultExpiryDate({ endDate: '2026-07-22' }, '2026-07-01'), '2026-08-05', '캠프 끝 + 14일'); assert.equal(defaultExpiryDate({}, '2026-07-01'), '2026-07-31', '끝 날짜 없으면 오늘 + 30일');
  assert.equal(endOfDayKstIso('2026-08-05'), '2026-08-05T14:59:59.999Z');
  assert.equal(linkStatus({ revokedAt: 'x' }, 'n'), 'revoked'); assert.equal(linkStatus({ expiresAt: '2020-01-01T00:00:00Z' }, '2026-01-01T00:00:00Z'), 'expired'); assert.equal(linkStatus({ expiresAt: null }, 'n'), 'active');
  assert.equal(cleanTeamList(['찬양, 팀', ' 게임 ', '게임', '']), '찬양 팀,게임');
});

// ── API ──
const T0 = todayKST(), d = (n) => addDays(T0, n);
function mk() {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite; ensureCueSchema(q);
  q.exec(`UPDATE camps SET deletedAt='x'; DELETE FROM camp_timeline;`);
  const typeId = q.prepare('SELECT id FROM camp_types LIMIT 1').get().id;
  const camp = (id, name, s, e, extra = {}) => q.prepare(`INSERT INTO camps (id,typeId,nameKo,nameEn,startDate,endDate,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?, 'x','x')`).run(id, typeId, name, name + ' EN', s, e, extra.status || 'planning');
  const slot = (id, campId, day, start, title, o = {}) => q.prepare(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,endTime,title,place,ownerName,notes,team,prepNotes,items,prepMinutes,sortOrder,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,'x','x')`)
    .run(id, campId, day, start, o.end || '', title, o.place || '', o.owner || 'Jason', o.notes || 'SECRET-INTERNAL-NOTE', o.team || '', o.prepNotes || '', o.items || '', o.pm || 0);
  return { env, q, camp, slot };
}
const jget = async (m, env, who, url, extra = {}) => { const r = await m({ env, request: await req(who, { url, ...extra }) }); return { status: r.status, headers: r.headers, body: await r.json() }; };
const NOW = (qs, who = U.mem, env) => jget(Now.onRequestGet, env, who, 'http://localhost/api/campteam/now' + qs);
const LINKS = (env, who, { qs = '', method = 'GET', body } = {}) => jget(method === 'POST' ? Links.onRequestPost : method === 'DELETE' ? Links.onRequestDelete : Links.onRequestGet, env, who, 'http://localhost/api/campteam/share-links' + qs, { method, body });
const VIEW = async (env, t, qs = '') => { const r = await View.onRequestGet({ env, request: new Request('http://localhost/api/campteam/share-view?t=' + encodeURIComponent(t) + qs) }); return { status: r.status, headers: r.headers, text: await r.text() }; };

test('now.js: 로그인 필요 · 명단 밖 사람은 못 봄 · 보기만 하는 팀원은 볼 수 있음', async () => {
  const { env, camp, slot } = mk(); camp('c1', '여름', d(-1), d(1)); slot('s1', 'c1', T0, '09:00', '등록');
  assert.equal((await NOW('', null, env)).status, 401);
  assert.equal((await NOW('', U.out, env)).status, 403, '캠프팀 명단 밖');
  assert.equal((await NOW('', U.view, env)).status, 200, '보기 권한(camps view)이 있으면 진행표와 같게 볼 수 있다');
  assert.equal((await NOW('', U.mem, env)).status, 200);
  // 「캠프별 공간」을 못 보게 막은 사람은 진행표와 마찬가지로 못 본다
  env.DB.sqlite.prepare(`INSERT OR REPLACE INTO member_perms (email,area,level,updatedAt) VALUES (?, 'camps','none','x')`).run(U.view);
  assert.equal((await NOW('', U.view, env)).status, 403);
});

test('now.js: 오늘 진행 중인 캠프를 고르고, notes·연락처 없이 줄만 준다 / summary', async () => {
  const { env, camp, slot } = mk();
  camp('past', '지난 캠프', d(-60), d(-58)); camp('run', '진행 캠프', d(-1), d(1)); camp('later', '다음 캠프', d(5), d(7));
  slot('s1', 'run', T0, '09:00', '등록', { team: '찬양', items: '마이크', pm: 10, place: '로비' }); slot('s2', 'later', d(5), '10:00', '다른 캠프 줄');
  const r = await NOW('', U.mem, env); assert.equal(r.body.camp.nameKo, '진행 캠프'); assert.equal(r.body.rows.length, 1); assert.equal(r.body.rows[0].title, '등록'); assert.equal(r.body.rows[0].prepMinutes, 10);
  assert.ok(r.body.camps.some((c) => c.id === 'later')); assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const js = JSON.stringify(r.body); assert.equal(js.includes('SECRET-INTERNAL-NOTE'), false); assert.equal(js.includes('"notes"'), false);
  assert.equal((await NOW('?campId=later', U.mem, env)).body.camp.nameKo, '다음 캠프'); assert.equal((await NOW('?campId=later', U.mem, env)).body.rows[0].title, '다른 캠프 줄');
  assert.equal((await NOW('?day=' + d(3), U.mem, env)).body.rows.length, 0, 'day 를 주면 그날 줄만');
  const s = await NOW('?summary=1', U.mem, env); assert.equal(s.body.camp.nameKo, '진행 캠프'); assert.equal(s.body.rows.length, 1); assert.ok(s.body.today);
  const fresh = mk(); fresh.camp('far', '먼 캠프', d(90), d(92)); assert.equal((await NOW('?summary=1', U.mem, fresh.env)).body.camp, null, '30일 안에 시작·진행·준비 중인 캠프가 없으면 camp:null');
  assert.equal((await NOW('', U.mem, fresh.env)).body.camp.nameKo, '먼 캠프', '그래도 화면에는 가장 가까운 캠프');
  const none = mk(); assert.equal((await NOW('', U.mem, none.env)).body.camp, null);
});

test('now.js: 새 칸(team 등)·팀 표가 없는 DB 에서도 동작', async () => {
  const env = makeEnv(fakeD1()), q = env.DB.sqlite; q.exec(`UPDATE camps SET deletedAt='x'`);
  const typeId = q.prepare('SELECT id FROM camp_types LIMIT 1').get().id;
  q.prepare(`INSERT INTO camps (id,typeId,nameKo,startDate,endDate,createdAt,updatedAt) VALUES ('c',?, '캠프', ?, ?, 'x','x')`).run(typeId, d(0), d(1));
  q.prepare(`INSERT INTO camp_timeline (id,campId,dayDate,startTime,title,createdAt,updatedAt) VALUES ('s','c',?, '09:00','등록','x','x')`).run(T0);
  const r = await NOW('', U.mem, env); assert.equal(r.status, 200); assert.equal(r.body.rows[0].team, ''); assert.deepEqual(r.body.rows[0].items, []); assert.equal(r.body.rows[0].prepMinutes, 0);
});

test('공개 링크 관리: 진행표 수정 권한이 있어야 목록·만들기·끄기, 활동 기록에는 토큰이 없다', async () => {
  const { env, camp } = mk(); camp('c1', '여름', d(-1), d(1));
  for (const who of [null, U.out, U.view]) { assert.ok([401, 403].includes((await LINKS(env, who, { qs: '?campId=c1' })).status), String(who) + ' 목록'); assert.ok([401, 403].includes((await LINKS(env, who, { method: 'POST', body: { campId: 'c1' } })).status), String(who) + ' 만들기'); }
  assert.equal((await LINKS(env, U.view, { method: 'DELETE', qs: '?id=x' })).status, 403);
  const a = await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', label: '찬양팀 단톡방' } }); assert.equal(a.status, 201);
  const it = a.body.item; assert.ok(it.token.length >= 32 && TOKEN_RE.test(it.token)); assert.equal(it.showOwners, false, '담당자 이름 보이기는 기본 꺼짐'); assert.equal(it.status, 'active'); assert.equal(it.expiresDate, addDays(d(1), 14), '기한 기본값 = 캠프 끝 + 14일');
  const row = env.DB.sqlite.prepare('SELECT * FROM camp_share_links WHERE id=?').get(it.id); assert.equal(row.createdBy, U.mem); assert.equal(row.viewCount, 0);
  const list = await LINKS(env, U.mem, { qs: '?campId=c1' }); assert.equal(list.body.items.length, 1); assert.equal(list.body.defaultExpiry, addDays(d(1), 14));
  const logs = env.DB.sqlite.prepare(`SELECT * FROM audit_log WHERE entity='share_link'`).all(); assert.equal(logs.length, 1); assert.equal(logs[0].action, 'share_link_create'); assert.equal(JSON.stringify(logs).includes(it.token), false, '기록에 토큰을 남기지 않는다');
  const off = await LINKS(env, U.mem, { method: 'DELETE', qs: '?id=' + it.id }); assert.equal(off.status, 200);
  assert.ok(env.DB.sqlite.prepare('SELECT revokedAt FROM camp_share_links WHERE id=?').get(it.id).revokedAt); assert.equal(env.DB.sqlite.prepare(`SELECT COUNT(*) n FROM audit_log WHERE action='share_link_revoke'`).get().n, 1);
  assert.equal((await LINKS(env, U.mem, { method: 'DELETE', qs: '?id=nope' })).status, 404);
  assert.equal((await LINKS(env, U.mem, { method: 'POST', body: { campId: 'nope' } })).status, 400);
  assert.equal((await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', expiresDate: d(-3) } })).status, 400, '지난 날짜는 기한이 될 수 없음');
  assert.equal((await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', expiresDate: '' } })).body.item.expiresAt, '', '비우면 기한 없음');
});

test('「새 링크로 바꾸기」: 옛 링크는 바로 꺼지고 새 링크가 생긴다 (같은 설정)', async () => {
  const { env, camp } = mk(); camp('c1', '여름', d(-1), d(1));
  const a = (await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', label: 'A', showOwners: true, teams: ['찬양'] } })).body.item;
  const b = await LINKS(env, U.mem, { method: 'POST', body: { action: 'replace', id: a.id } }); assert.equal(b.status, 201);
  assert.notEqual(b.body.item.token, a.token); assert.equal(b.body.item.label, 'A'); assert.equal(b.body.item.showOwners, true); assert.equal(b.body.item.teams, '찬양');
  assert.equal((await VIEW(env, a.token)).status, 404, '옛 링크는 즉시 막힘'); assert.equal((await VIEW(env, b.body.item.token)).status, 200);
  assert.equal((await LINKS(env, U.view, { method: 'POST', body: { action: 'replace', id: a.id } })).status, 403);
});

test('공개 보기: 모르는 링크·기한 지난 링크·끈 링크는 완전히 똑같은 404', async () => {
  const { env, camp, slot, q } = mk(); camp('c1', '여름', d(-1), d(1)); slot('s1', 'c1', T0, '09:00', '등록');
  const mkLink = async (b = {}) => (await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', ...b } })).body.item;
  const good = await mkLink(), exp = await mkLink(), rev = await mkLink();
  q.prepare(`UPDATE camp_share_links SET expiresAt='2020-01-01T00:00:00.000Z' WHERE id=?`).run(exp.id);
  await LINKS(env, U.mem, { method: 'DELETE', qs: '?id=' + rev.id });
  const unknown = await VIEW(env, makeToken()), expired = await VIEW(env, exp.token), revoked = await VIEW(env, rev.token), malformed = await VIEW(env, 'abc'), empty = await VIEW(env, ''), sql = await VIEW(env, "' OR '1'='1");
  for (const x of [unknown, expired, revoked, malformed, empty, sql]) { assert.equal(x.status, 404); assert.equal(x.text, JSON.stringify(GONE_BODY), '본문이 모두 같다'); assert.equal(x.headers.get('Cache-Control'), 'no-store'); }
  assert.equal(JSON.stringify([...unknown.headers]), JSON.stringify([...revoked.headers]), '머리글까지 같다');
  const ok = await VIEW(env, good.token); assert.equal(ok.status, 200); assert.match(ok.headers.get('X-Robots-Tag'), /noindex/); assert.equal(ok.headers.get('Cache-Control'), 'no-store');
  assert.equal((await VIEW(env, good.token.toUpperCase())).status, 404, '글자 하나까지 똑같아야 열린다');
  assert.equal((await VIEW(env, good.token + 'x')).status, 404);
  // 끄는 즉시 닫힘
  await LINKS(env, U.mem, { method: 'DELETE', qs: '?id=' + good.id }); assert.equal((await VIEW(env, good.token)).text, JSON.stringify(GONE_BODY));
  // 캠프를 지우면 링크도 닫힘, 표가 아직 없는 DB 도 같은 404
  const second = await mkLink(); q.prepare(`UPDATE camps SET deletedAt='x' WHERE id='c1'`).run(); assert.equal((await VIEW(env, second.token)).status, 404);
  const bare = makeEnv(fakeD1()); bare.DB.sqlite.exec('DROP TABLE camp_share_links'); assert.equal((await VIEW(bare, makeToken())).text, JSON.stringify(GONE_BODY));
});

test('공개 보기: 보내는 내용은 스태프용 칸뿐 (notes·담당자·이메일·전화·돈 없음), 담당자는 켠 링크만', async () => {
  const { env, camp, slot, q } = mk(); camp('c1', '여름 캠프', d(-1), d(1));
  q.prepare(`UPDATE camps SET notes='예산 비밀 5,000,000원', location='ella@example.org 010-1234-5678' WHERE id='c1'`).run();
  q.prepare(`INSERT INTO camp_teams (id,campId,name,color,sortOrder) VALUES ('t1','c1','찬양팀','#7a5af0',0),('t2','c1','게임팀','#f0a020',1)`).run();
  slot('s1', 'c1', T0, '09:00', '개회 예배', { place: '강당', owner: 'Jason Kim', notes: 'SECRET-INTERNAL-NOTE jason@example.org', team: 't1', prepNotes: '마이크 확인', items: '마이크\n의자', pm: 20, end: '10:00' });
  slot('s2', 'c1', T0, '11:00', '게임', { team: '게임팀', owner: 'Ella Lim' }); slot('s3', 'c1', T0, '12:00', '공통 점심');
  const mkLink = async (b) => (await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1', ...b } })).body.item;
  const hidden = await mkLink({ label: '기본' }), shown = await mkLink({ label: '이름 포함', showOwners: true }), only = await mkLink({ label: '찬양만', teams: ['찬양팀'] });
  const j = async (l, qs) => JSON.parse((await VIEW(env, l.token, qs)).text);
  const a = await j(hidden); const txt = JSON.stringify(a);
  for (const bad of ['SECRET-INTERNAL-NOTE', 'notes', 'Jason', 'Ella', 'ownerName', '@', '010-', '5,000,000', 'email', 'phone', 'createdBy', 'location', 'campId', hidden.token]) assert.equal(txt.includes(bad), false, bad + ' 가 공개 답에 있으면 안 됨');
  assert.equal(a.camp.nameKo, '여름 캠프'); assert.deepEqual(Object.keys(a.camp).sort(), ['endDate', 'nameEn', 'nameKo', 'prepEnd', 'prepStart', 'startDate']);
  assert.deepEqual(Object.keys(a.rows[0]).sort(), ['dayDate', 'endTime', 'items', 'place', 'prepMinutes', 'prepNotes', 'startTime', 'team', 'title', 'titleEn']);
  assert.equal(a.rows.length, 3); assert.equal(a.rows[0].team, '찬양팀'); assert.deepEqual(a.rows[0].items, ['마이크', '의자']); assert.equal(a.rows[0].prepNotes, '마이크 확인'); assert.equal(a.rows[0].prepMinutes, 20);
  const b = await j(shown); assert.equal(b.rows[0].ownerName, 'Jason Kim'); assert.equal(JSON.stringify(b).includes('SECRET-INTERNAL-NOTE'), false); assert.equal(JSON.stringify(b).includes('@'), false);
  const c = await j(only); assert.deepEqual(c.rows.map((r) => r.title), ['개회 예배', '공통 점심'], '팀 제한: 그 팀 + 공통 일정'); assert.deepEqual(c.teams.map((t) => t.name), ['찬양팀']);
});

test('공개 보기: 열 때마다 횟수·마지막 시각 기록 (자동 새로고침 poll=1 은 안 셈), 로그인 없이 열림', async () => {
  const { env, camp, q } = mk(); camp('c1', '여름', d(-1), d(1));
  const l = (await LINKS(env, U.mem, { method: 'POST', body: { campId: 'c1' } })).body.item;
  assert.equal((await VIEW(env, l.token)).status, 200); assert.equal((await VIEW(env, l.token)).status, 200); assert.equal((await VIEW(env, l.token, '&poll=1')).status, 200);
  const row = q.prepare('SELECT viewCount, lastViewedAt FROM camp_share_links WHERE id=?').get(l.id); assert.equal(row.viewCount, 2); assert.ok(row.lastViewedAt);
  assert.equal((await LINKS(env, U.mem, { qs: '?campId=c1' })).body.items[0].viewCount, 2);
  const unknown = await VIEW(env, makeToken()); assert.equal(q.prepare('SELECT SUM(viewCount) n FROM camp_share_links').get().n, 2, '모르는 토큰은 아무것도 기록하지 않음');
  assert.equal(unknown.status, 404);
});

// ── 파일·화면 연결 ──
test('0042 마이그레이션: 덧붙이기만, 요구한 칸 모두', () => {
  const sql = readFileSync(root + 'camp-team/db/0042_share_links.sql', 'utf8').replace(/--.*$/gm, '');
  assert.ok(/CREATE TABLE IF NOT EXISTS camp_share_links/.test(sql)); assert.equal(/DROP|DELETE|UPDATE\s|ALTER/i.test(sql), false);
  for (const c of ['id TEXT PRIMARY KEY', 'campId TEXT NOT NULL', 'token TEXT NOT NULL UNIQUE', 'label TEXT NOT NULL DEFAULT', 'showOwners INTEGER NOT NULL DEFAULT 0', 'teams TEXT NOT NULL DEFAULT', 'expiresAt TEXT', 'revokedAt TEXT', 'createdBy', 'createdAt TEXT NOT NULL', 'lastViewedAt TEXT', 'viewCount INTEGER NOT NULL DEFAULT 0', 'CREATE INDEX IF NOT EXISTS']) assert.ok(sql.includes(c), c);
});

test('매니페스트: 이름·시작 주소·범위(캠프팀 폴더 안)·아이콘, 레이아웃에만 연결', () => {
  const m = JSON.parse(readFileSync(root + 'public/portal/campteam/manifest.webmanifest', 'utf8'));
  assert.equal(m.name, '캠프팀 지금'); assert.equal(m.short_name, '지금'); assert.equal(m.display, 'standalone'); assert.equal(m.start_url, '/portal/campteam/now/?src=app'); assert.equal(m.scope, '/portal/campteam/');
  assert.ok(m.start_url.startsWith(m.scope), '시작 주소가 범위 안'); assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  // 범위가 캠프팀 폴더뿐이라 월코 포털(/portal/)·홈페이지(/…) 주소는 이 앱에 잡히지 않는다
  for (const url of ['/', '/portal/', '/portal/crs/', '/portal/campstaff/', '/camp-register/', '/portal/campteamX/']) assert.equal(url.startsWith(m.scope), false, url);
  const sizes = m.icons.map((i) => i.sizes + ':' + i.purpose); assert.ok(sizes.includes('192x192:any') && sizes.includes('512x512:any') && sizes.includes('512x512:maskable'));
  for (const i of m.icons) { const f = root + 'public' + i.src; assert.ok(existsSync(f), i.src); const b = readFileSync(f); assert.equal(b.slice(1, 4).toString(), 'PNG'); assert.equal(b.readUInt32BE(16), parseInt(i.sizes)); assert.equal(b.readUInt32BE(20), parseInt(i.sizes)); }
  const ap = readFileSync(root + 'public/portal/campteam/icons/apple-touch-icon.png'); assert.equal(ap.readUInt32BE(16), 180);
  const lay = readFileSync(root + 'src/layouts/CampTeamLayout.astro', 'utf8');
  for (const s of ['rel="manifest" href="/portal/campteam/manifest.webmanifest"', 'rel="apple-touch-icon"', 'name="apple-mobile-web-app-capable"', 'name="apple-mobile-web-app-title"', 'name="theme-color"']) assert.ok(lay.includes(s), s);
  // 다른 공통 틀(월코 포털·홈페이지)에는 매니페스트를 달지 않았다
  for (const f of ['src/layouts/BaseLayout.astro', 'src/layouts/PortalLayout.astro', 'src/layouts/Layout.astro']) if (existsSync(root + f)) assert.equal(/manifest|apple-touch-icon/.test(readFileSync(root + f, 'utf8')), false, f);
});

test('공개 화면(cue.astro): noindex·no-referrer, 로그인 틀 없음, 인증 머리글을 보내지 않음 / 지금 화면은 로그인 틀', () => {
  const cue = readFileSync(root + 'src/pages/portal/campteam/cue.astro', 'utf8'), js = readFileSync(root + 'public/portal/campteam/cue-public.js', 'utf8');
  assert.ok(/<meta name="robots" content="noindex, nofollow">/.test(cue)); assert.ok(/name="referrer" content="no-referrer"/.test(cue)); assert.equal(/CampTeamLayout|wolko-session|wolko-access|googleapis/.test(cue), false, '로그인 틀·외부 글꼴 없음');
  assert.equal(/Authorization|wolko-hub-token|wolko-camp-token/.test(js), false); assert.ok(js.includes('/api/campteam/share-view'));
  const now = readFileSync(root + 'src/pages/portal/campteam/now.astro', 'utf8'); assert.ok(now.includes('CampTeamLayout'));
  const home = readFileSync(root + 'src/pages/portal/campteam/index.astro', 'utf8'); assert.ok(home.indexOf('id="nowBox"') < home.indexOf('id="catchupBox"'), '지금 카드가 다른 카드 위');
  for (const f of ['now-core.js', 'now-view.js', 'now.js', 'home-now.js', 'share-links.js', 'cue-public.js']) { const s = readFileSync(root + 'public/portal/campteam/' + f, 'utf8'); vm.runInNewContext('(function(){' + s.replace(/^\s*\/\*[\s\S]*?\*\//, '') + '\n})', {}); } // 문법 확인
});

// ── 화면 그리기(now-view.js)를 가짜 화면 틀로 돌려 본다: 오류 없이 지금·다음·준비 표시가 나오는지 ──
function viewCtx(fixedUtcMs, store = {}) {
  const FIXED = fixedUtcMs; class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  const c = { console, Date: FD, addEventListener() {}, removeEventListener() {}, print() {}, setInterval: () => 0, clearInterval() {}, document: { hidden: false, addEventListener() {}, removeEventListener() {} }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } } };
  c.window = c; c.globalThis = c; vm.createContext(c);
  vm.runInContext(readFileSync(root + 'public/portal/campteam/now-core.js', 'utf8'), c); vm.runInContext(readFileSync(root + 'public/portal/campteam/now-view.js', 'utf8'), c);
  return c;
}
async function paint(c, data, opts = {}) {
  const host = { innerHTML: '', querySelector: () => null, addEventListener() {} };
  const v = c.NowView.mount(host, { getLang: () => 'ko', load: async () => data, storeKey: 'k', ...opts }); await v.refresh(); return { host, v };
}
test('화면: 지금 카드·다음 카드(N분 뒤)·「준비는 지금부터」·팀 칩이 그려진다', async () => {
  const c = viewCtx(Date.UTC(2026, 6, 20, 0, 40)), day = '2026-07-20';   // 한국 09:40
  const data = { today: day, camp: { id: 'c', nameKo: '여름 캠프', nameEn: 'Summer', startDate: day, endDate: '2026-07-22', prepStart: '', prepEnd: '' }, teams: [{ name: '찬양팀', color: '#7a5af0' }], rows: [
    { dayDate: day, startTime: '09:00', endTime: '10:00', title: '개회 <b>예배</b>', titleEn: '', place: '강당', team: '찬양팀', prepNotes: '마이크 확인', items: ['마이크', '의자'], prepMinutes: 0 },
    { dayDate: day, startTime: '10:10', endTime: '11:00', title: '게임', titleEn: '', place: '운동장', team: '', prepNotes: '', items: [], prepMinutes: 30 },
    { dayDate: day, startTime: '12:00', title: '점심', titleEn: '', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0 }] };
  const { host } = await paint(c, data); const h = host.innerHTML;
  assert.match(h, /nv-now/); assert.match(h, /20분 남음/); assert.match(h, /nv-next prep/, '게임은 30분 안이라 준비 표시'); assert.match(h, /30분 뒤|30분 뒤/); assert.match(h, /준비는 지금부터!/); assert.match(h, /마이크/); assert.match(h, /찬양팀/); assert.match(h, /그 다음/); assert.match(h, /점심/);
  assert.equal(h.includes('<b>예배</b>'), false, '제목의 HTML 은 글자로만 나온다'); assert.match(h, /&lt;b&gt;예배/);
  assert.match(h, /여름 캠프/); assert.match(h, /캠프 1일째|오늘이 캠프 첫날이에요/); assert.match(h, />오늘</);
  assert.equal(/Jason|SECRET/.test(h), false);
});
test('화면: 줄이 없으면 안내(링크), 캠프 전에는 D-n 과 첫 일정, 하루 일정이 끝났을 때, 오류 후에도 이전 내용 유지', async () => {
  let c = viewCtx(Date.UTC(2026, 6, 10, 3, 0));   // 한국 7/10 12:00
  const camp = { id: 'c', nameKo: '여름 캠프', nameEn: '', startDate: '2026-07-20', endDate: '2026-07-22' };
  let r = await paint(c, { camp, teams: [], rows: [] }, { emptyHtml: () => '<a href="/portal/campteam/prep/">진행표</a>' }); assert.match(r.host.innerHTML, /\/portal\/campteam\/prep\//);
  r = await paint(c, { camp, teams: [], rows: [{ dayDate: '2026-07-20', startTime: '09:00', title: '등록', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0 }] }); assert.match(r.host.innerHTML, /캠프까지 D-10/); assert.match(r.host.innerHTML, /등록/, '캠프 전에는 첫날 일정이 먼저 열린다');
  r.v.state.day = '2026-07-10'; r.v.rerender(); assert.match(r.host.innerHTML, /첫 일정/, '오늘 탭: 일정이 없으니 「첫 일정」을 보여 준다'); assert.match(r.host.innerHTML, /7\/20 \(월\)/);
  c = viewCtx(Date.UTC(2026, 6, 20, 10, 0));      // 한국 7/20 19:00
  r = await paint(c, { camp, teams: [], rows: [{ dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: '등록', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0 }, { dayDate: '2026-07-21', startTime: '09:00', title: '둘째 날 시작', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0 }] });
  assert.match(r.host.innerHTML, /오늘 일정이 모두 끝났어요/); assert.match(r.host.innerHTML, /내일/); assert.match(r.host.innerHTML, /둘째 날 시작/);
  // 팀 고른 것은 이 기기에 기억된다 (localStorage 저장값을 읽어 적용)
  const store = { 'k:c': '["찬양팀"]' }; c = viewCtx(Date.UTC(2026, 6, 20, 0, 0), store);
  r = await paint(c, { camp, teams: [{ name: '찬양팀', color: '' }, { name: '게임팀', color: '' }], rows: [{ dayDate: '2026-07-20', startTime: '09:30', title: '찬양 연습', place: '', team: '찬양팀', prepNotes: '', items: [], prepMinutes: 0 }, { dayDate: '2026-07-20', startTime: '09:30', title: '게임 준비', place: '', team: '게임팀', prepNotes: '', items: [], prepMinutes: 0 }] });
  assert.match(r.host.innerHTML, /찬양 연습/); assert.equal(r.host.innerHTML.includes('게임 준비'), false, '고른 팀만');
  let n = 0; const host = { innerHTML: '', querySelector: () => null, addEventListener() {} };
  const v = c.NowView.mount(host, { getLang: () => 'ko', storeKey: 'z', load: async () => { if (n++) throw new Error('x'); return { camp, teams: [], rows: [{ dayDate: '2026-07-20', startTime: '09:30', title: '남는 줄', place: '', team: '', prepNotes: '', items: [], prepMinutes: 0 }] }; } });
  await v.refresh(); await v.refresh(); assert.match(host.innerHTML, /남는 줄/); assert.match(host.innerHTML, /연결이 불안정/);
  const g = c.NowView.mount(host, { getLang: () => 'ko', storeKey: 'g', load: async () => { const e = new Error('끊긴 링크'); e.gone = true; throw e; } }); await g.refresh(); assert.match(host.innerHTML, /끊긴 링크/); assert.equal(host.innerHTML.includes('남는 줄'), false);
});
