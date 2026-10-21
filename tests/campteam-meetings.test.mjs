import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import * as Meetings from '../functions/api/campteam/meetings.js';
import * as Meeting from '../functions/api/campteam/meeting.js';
import * as Agenda from '../functions/api/campteam/agenda.js';
import * as Decisions from '../functions/api/campteam/decisions.js';
import * as MTask from '../functions/api/campteam/meeting-task.js';
import * as MLinks from '../functions/api/campteam/meeting-links.js';
import * as MTexts from '../functions/api/campteam/meeting-texts.js';
import * as ImportMin from '../functions/api/campteam/import-minutes.js';
import * as Search from '../functions/api/campteam/search.js';
import { parseMeetingDate, parseMinutesText, mergeMinutes } from '../functions/lib/campteamMinutes.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const mk = () => makeEnv(fakeD1());
const call = async (mod, fn, env, who, { qs = '', body, method } = {}) => mod[fn]({ env, request: await req(who, { method: method || (fn === 'onRequestGet' ? 'GET' : fn === 'onRequestPatch' ? 'PATCH' : fn === 'onRequestDelete' ? 'DELETE' : 'POST'), body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = async (r) => r.json();

const EN = ['Sample Team Meeting Minutes', 'Date and time: Tuesday, October 20, 2026, at 11:00 a.m.', 'Attendees: Leader A, Leader B', 'Recorded discussion: About 30 minutes', 'Purpose: Review the sample plan.',
  '1. Executive Summary', 'The team reviewed the sample plan.', '2. Participant Groups and Roles', 'Group || Eligibility', 'Campers || Grade 6 to 9', '3. Camp Fee', 'Two tiers were proposed. No decision was made.', '4. Agenda for the Next Meeting', 'Topic || Discussion needed', 'Fee tiers || Decide the amounts', 'Speakers || Confirm schedule'].join('\n');
const KO = ['샘플 팀 회의록', '일시: 2026년 10월 20일 화요일 오전 11시', '참석자: Leader A, Leader B', '기록 범위: 약 30분', '목적: 샘플 계획 검토',
  '1. 핵심 요약', '팀은 샘플 계획을 검토했다.', '2. 대상과 역할 구분', '구분 || 대상', '캠퍼 || 초6~중3', '3. 참가비', '두 단계 금액을 제안했다. 결정은 하지 않았다.', '4. 다음 회의 논의 안건', '안건 || 논의할 내용', '참가비 단계 || 금액 결정', '강사 || 일정 확정'].join('\n');

test('회의 날짜·시간 읽기 (한국어/영어)', () => {
  assert.deepEqual(parseMeetingDate('2026년 10월 20일 화요일 오전 11시'), { date: '2026-10-20', time: '11:00' });
  assert.deepEqual(parseMeetingDate('Tuesday, October 20, 2026, at 11:00 a.m.'), { date: '2026-10-20', time: '11:00' });
  assert.deepEqual(parseMeetingDate('2026-11-05 오후 2시 30분'), { date: '2026-11-05', time: '14:30' });
  assert.deepEqual(parseMeetingDate('Nov 5, 2026 3 PM'), { date: '2026-11-05', time: '15:00' });
  assert.deepEqual(parseMeetingDate('언젠가'), { date: null, time: '' });
});

test('회의록 해석: 한·영이 같은 번호의 구역으로 짝지어지고, 다음 회의 표는 안건 목록이 된다', () => {
  const m = mergeMinutes(parseMinutesText(KO), parseMinutesText(EN));
  assert.equal(m.date, '2026-10-20'); assert.equal(m.time, '11:00'); assert.equal(m.attendees, 'Leader A, Leader B');
  assert.deepEqual(m.sections.map(s => [s.no, s.kind, s.titleKo, s.titleEn]), [[1, 'summary', '핵심 요약', 'Executive Summary'], [2, 'context', '대상과 역할 구분', 'Participant Groups and Roles'], [3, 'discussion', '참가비', 'Camp Fee'], [4, 'discussion', '다음 회의 논의 안건', 'Agenda for the Next Meeting']]);
  assert.match(m.sections[1].bodyKo, /캠퍼 — 초6~중3/); assert.equal(m.sections[3].isNext, true);
  assert.deepEqual(m.sections[3].nextItems.map(x => [x.topicKo, x.topicEn]), [['참가비 단계', 'Fee tiers'], ['강사', 'Speakers']], '머리글 줄은 건너뛴다');
  const only = mergeMinutes(null, parseMinutesText(EN)); assert.equal(only.sections[0].bodyKo, ''); assert.ok(only.sections[0].bodyEn);
});

test('회의록 가져오기: 미리보기 → 저장 → 중복 방지 → 결정은 자동 생성하지 않음', async () => {
  const env = mk();
  assert.equal((await call(ImportMin, 'onRequestPost', env, U.view, { body: { textKo: KO, textEn: EN } })).status, 403);
  assert.equal((await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: '  ' } })).status, 400);
  assert.equal((await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: '제목\n1. 구역\n내용' } })).status, 400, '날짜 없는 회의록은 거부');
  const before = env.DB.sqlite.prepare('SELECT COUNT(*) n FROM meetings').get().n;
  const pv = await J(await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: KO, textEn: EN, preview: true } }));
  assert.deepEqual(pv.summary.languages, ['ko', 'en']); assert.equal(pv.summary.sections.length, 3); assert.equal(pv.summary.nextItems, 2);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM meetings').get().n, before, '미리보기는 저장하지 않는다');
  const r = await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: KO, textEn: EN, campId: 'camp-u26' } }); assert.equal(r.status, 201);
  const { id } = await J(r);
  const detail = await J(await call(Meeting, 'onRequestGet', env, U.view, { qs: `?id=${id}` }));
  assert.equal(detail.meeting.status, 'draft'); assert.equal(detail.meeting.campId, 'camp-u26'); assert.equal(detail.meeting.meetTime, '11:00');
  assert.equal(detail.meeting.summaryKo, '팀은 샘플 계획을 검토했다.'); assert.equal(detail.meeting.summaryEn, 'The team reviewed the sample plan.');
  const normal = detail.sections.filter(s => !s.nextMeeting), next = detail.sections.filter(s => s.nextMeeting);
  assert.equal(normal.length, 3, '요약·배경·논의 (다음 회의 구역은 표뿐이라 본문 구역은 만들지 않음)'); assert.equal(next.length, 2);
  assert.equal(normal[2].topic, '참가비'); assert.equal(normal[2].titleEn, 'Camp Fee'); assert.equal(normal[2].bodyEn, 'Two tiers were proposed. No decision was made.');
  assert.equal(next[0].bodyKo, '금액 결정'); assert.equal(next[0].bodyEn, 'Decide the amounts');
  assert.equal(detail.decisions.length, 0, '회의록 문장만으로 결정을 추측해서 만들지 않는다');
  assert.equal((await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: KO, textEn: EN } })).status, 409);
  assert.equal((await call(ImportMin, 'onRequestPost', env, U.mem, { body: { textKo: KO, textEn: EN, force: true } })).status, 201);
  const nextList = await J(await call(Agenda, 'onRequestGet', env, U.view, { qs: '?next=1&campId=camp-u26' }));
  assert.ok(nextList.items.some(i => i.topic === '참가비 단계' && i.titleEn === 'Fee tiers'), '다음 회의 안건 모음에 나온다');
});

test('회의 목록: 날짜·캠프·태그·검색(구역·결정 본문까지) 필터', async () => {
  const env = mk(); const list = async (qs) => (await J(await call(Meetings, 'onRequestGet', env, U.view, { qs }))).items.map(m => m.id);
  assert.deepEqual(await list(''), ['m1', 'm2']);
  assert.deepEqual(await list('?from=2026-10-15'), ['m1']); assert.deepEqual(await list('?to=2026-10-15'), ['m2']);
  assert.deepEqual(await list('?campId=camp-w27'), ['m2']); assert.deepEqual(await list('?campId=none'), []);
  assert.deepEqual(await list('?tag=예산'), ['m1'], '구역 태그로 찾기'); assert.deepEqual(await list('?tag=주제'), ['m1', 'm2'], '결정 태그로도 찾기');
  assert.deepEqual(await list('?q=breakout'), ['m1'], '구역 본문 검색'); assert.deepEqual(await list('?q=Sample Theme B'), ['m1'], '결정 본문 검색');
  assert.deepEqual(await list('?q=%25'), []);
  const m1 = (await J(await call(Meetings, 'onRequestGet', env, U.view))).items.find(m => m.id === 'm1');
  assert.ok(m1.sectionCount >= 4 && m1.decisionCount >= 4 && m1.taskCount >= 1);
});

test('회의/구역 만들기·수정·삭제와 권한', async () => {
  const env = mk();
  assert.equal((await call(Meetings, 'onRequestPost', env, U.view, { body: { title: 'x', meetDate: '2026-11-01' } })).status, 403);
  assert.equal((await call(Meetings, 'onRequestPost', env, U.mem, { body: { title: '', meetDate: '2026-11-01' } })).status, 400);
  assert.equal((await call(Meetings, 'onRequestPost', env, U.mem, { body: { title: 'x', meetDate: 'nope' } })).status, 400);
  const { id } = await J(await call(Meetings, 'onRequestPost', env, U.mem, { body: { title: '새 회의', titleEn: 'New meeting', meetDate: '2026-11-03', meetTime: '10:00', campId: 'camp-w27', attendees: 'A, B' } }));
  const sec = await call(Agenda, 'onRequestPost', env, U.mem, { body: { meetingId: id, topic: '장소', titleEn: 'Venue', bodyKo: '장소 후보', bodyEn: 'Venue options', kind: 'discussion', tags: 'Venue, 예산', nextMeeting: false } });
  assert.equal(sec.status, 201); const sid = (await J(sec)).id;
  assert.equal(env.DB.sqlite.prepare('SELECT tags FROM agenda_items WHERE id=?').get(sid).tags, ',venue,예산,');
  assert.equal((await call(Agenda, 'onRequestPost', env, U.mem, { body: { topic: 'x', kind: 'weird', meetingId: id } })).status, 400);
  assert.equal((await call(Agenda, 'onRequestPost', env, U.mem, { body: { topic: '회의 없이' } })).status, 400, '회의 없는 일반 구역은 불가(다음 회의 안건만 가능)');
  assert.equal((await call(Agenda, 'onRequestPost', env, U.mem, { body: { topic: '다음 회의에서', nextMeeting: true } })).status, 201, '회의 없이 만든 "다음 회의 안건"은 가능');
  assert.equal((await call(Agenda, 'onRequestPatch', env, U.mem, { qs: `?id=${sid}`, body: { status: 'decided', nextMeeting: true } })).status, 200);
  assert.equal((await call(Agenda, 'onRequestPatch', env, U.view, { qs: `?id=${sid}`, body: { status: 'pending' } })).status, 403);
  assert.equal((await call(Meetings, 'onRequestPatch', env, U.mem, { qs: `?id=${id}`, body: { status: 'draft', purpose: '목적' } })).status, 200);
  assert.equal((await call(Meetings, 'onRequestPatch', env, U.mem, { qs: `?id=${id}`, body: { status: 'weird' } })).status, 400);
  assert.equal((await call(Meetings, 'onRequestDelete', env, U.mem, { qs: `?id=${id}` })).status, 200);
  assert.equal((await call(Meeting, 'onRequestGet', env, U.view, { qs: `?id=${id}` })).status, 404);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM agenda_items WHERE meetingId=? AND deletedAt IS NULL').get(id).n, 1, '삭제 표시는 회의만 숨기고 내용은 보존');
});

test('결정 이력: 새 결정이 이전 결정을 "대체됨"으로 남기고, 현재 유효한 결정만 따로 보이며, 삭제하면 이전 결정이 되살아난다', async () => {
  const env = mk(); const dec = (qs) => call(Decisions, 'onRequestGet', env, U.view, { qs });
  const eff = (await J(await dec('?effective=1&campId=camp-u26'))).items; assert.deepEqual(eff.map(d => d.id).sort(), ['d2', 'd6'], '제안·보류·대체된 것은 현재 유효한 결정이 아니다');
  const hist = (await J(await dec('?history=1&campId=camp-u26'))).chains; const chain = hist.find(c => c.some(d => d.id === 'd1'));
  assert.deepEqual(chain.map(d => [d.id, d.kind, d.state]), [['d1', 'proposal', 'superseded'], ['d6', 'final', 'active']]);
  const w = (await J(await dec('?history=1&campId=camp-w27'))).chains.find(c => c.some(d => d.id === 'd3')); assert.deepEqual(w.map(d => d.id), ['d3', 'd4']);
  // 새 결정이 d6 을 대체
  const mk6 = (body, who = U.mem) => call(Decisions, 'onRequestPost', env, who, { body });
  assert.equal((await mk6({ kind: 'final', textKo: 'x' }, U.view)).status, 403);
  assert.equal((await mk6({ kind: 'maybe', textKo: 'x' })).status, 400); assert.equal((await mk6({ kind: 'final' })).status, 400);
  assert.equal((await mk6({ kind: 'changed', textKo: 'x', supersedesId: 'nope' })).status, 400);
  assert.equal((await mk6({ kind: 'changed', textKo: 'x', supersedesId: 'd1' })).status, 400, '이미 대체된 결정은 다시 대체할 수 없다');
  const r = await mk6({ meetingId: 'm1', kind: 'changed', textKo: '일반 참가비를 75,000원으로 바꾼다. (가상)', textEn: 'Regular fee changes to 75,000. (sample)', supersedesId: 'd6', tags: '예산' });
  assert.equal(r.status, 201); const nid = (await J(r)).id;
  assert.equal(env.DB.sqlite.prepare('SELECT state FROM decisions WHERE id=?').get('d6').state, 'superseded', '이전 결정은 지우지 않고 대체됨으로 남는다');
  assert.equal(env.DB.sqlite.prepare('SELECT decidedDate FROM decisions WHERE id=?').get(nid).decidedDate, '2026-10-20', '회의 날짜가 결정 날짜');
  assert.deepEqual((await J(await dec('?effective=1&campId=camp-u26'))).items.map(d => d.id).sort(), ['d2', nid].sort());
  // 철회 / 대체됨 직접 지정 불가
  assert.equal((await call(Decisions, 'onRequestPatch', env, U.mem, { qs: `?id=${nid}`, body: { state: 'superseded' } })).status, 400);
  assert.equal((await call(Decisions, 'onRequestPatch', env, U.mem, { qs: '?id=d5', body: { state: 'withdrawn' } })).status, 200);
  assert.ok(!(await J(await dec('?effective=1&state=withdrawn'))).items.length);
  // 삭제하면 이전 결정이 다시 유효
  assert.equal((await call(Decisions, 'onRequestDelete', env, U.mem, { qs: `?id=${nid}` })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT state FROM decisions WHERE id=?').get('d6').state, 'active');
  assert.equal((await J(await dec('?q=Sample Theme B'))).items.length, 1, '결정 본문 검색');
});

test('안건에서 업무 만들기: 담당·기한은 입력한 것만, 같은 안건의 같은 업무는 한 번만(한·영 중복 방지)', async () => {
  const env = mk(); const mt = (body, who = U.mem) => call(MTask, 'onRequestPost', env, who, { body });
  assert.equal((await mt({ meetingId: 'm1', agendaItemId: 's4', title: 'x' }, U.view)).status, 403);
  assert.equal((await mt({ meetingId: 'nope', title: 'x' })).status, 400); assert.equal((await mt({ meetingId: 'm1', title: ' ' })).status, 400);
  const a = await mt({ meetingId: 'm1', agendaItemId: 's4', title: '외부 강사 섭외' }); assert.equal(a.status, 201);
  const row = env.DB.sqlite.prepare('SELECT * FROM tasks WHERE id=?').get((await J(a)).id);
  assert.equal(row.ownerName, ''); assert.equal(row.dueDate, null); assert.equal(row.campId, 'camp-u26'); assert.equal(row.meetingId, 'm1'); assert.equal(row.agendaItemId, 's4');
  const again = await J(await mt({ meetingId: 'm1', agendaItemId: 's4', title: '외부 강사 섭외' })); assert.equal(again.existing, true); assert.equal(again.tasks.length, 1, '이 안건에서 이미 만든 업무 목록을 돌려준다');
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM tasks WHERE title='외부 강사 섭외'").get().n, 1);
  assert.equal((await mt({ meetingId: 'm1', decisionId: 'd2', title: '참가비 안내문', ownerName: 'Leader B', dueDate: '2026-11-10' })).status, 201);
  assert.equal((await mt({ meetingId: 'm1', title: 'x', dueDate: 'bad' })).status, 400);
});

test('회의에 파일 연결(중복 업로드 없이)과 전사 텍스트 붙여넣기', async () => {
  const env = mk();
  assert.equal((await call(MLinks, 'onRequestPost', env, U.view, { body: { meetingId: 'm1', fileId: 'f1' } })).status, 403);
  assert.equal((await call(MLinks, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', fileId: 'f1', role: 'notes' } })).status, 201);
  assert.equal((await call(MLinks, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', fileId: 'f1', role: 'photo' } })).status, 201, '두 번 연결해도 한 줄');
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n, MAX(role) r FROM meeting_files').get().n, 1);
  assert.equal((await call(MLinks, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', fileId: 'nope' } })).status, 400);
  assert.equal((await call(MLinks, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', fileId: 'f4' } })).status, 201, '금액 권한이 있는 팀원은 금액 자료도 연결 가능');
  const view = await J(await call(Meeting, 'onRequestGet', env, U.view, { qs: '?id=m1' })); assert.deepEqual(view.files.map(f => f.id), ['f1'], '조회만 계정에는 금액 자료가 보이지 않는다');
  assert.equal((await J(await call(Meeting, 'onRequestGet', env, U.mem, { qs: '?id=m1' }))).files.length, 2);
  assert.equal((await call(MLinks, 'onRequestPost', env, U.view, { body: { meetingId: 'm1', fileId: 'f4' } })).status, 403);
  assert.equal((await call(MLinks, 'onRequestDelete', env, U.mem, { method: 'DELETE', qs: '?meetingId=m1&fileId=f1' })).status, 200);
  const t = await call(MTexts, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', kind: 'transcript', lang: 'ko', body: '00:00 안녕하세요 ... (가상 전사)' } }); assert.equal(t.status, 201);
  assert.equal((await call(MTexts, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', body: ' ' } })).status, 400);
  assert.equal((await call(MTexts, 'onRequestPost', env, U.mem, { body: { meetingId: 'm1', body: 'x'.repeat(400001) } })).status, 400);
  const d = await J(await call(Meeting, 'onRequestGet', env, U.view, { qs: '?id=m1' })); assert.equal(d.texts.length, 1); assert.ok(!('body' in d.texts[0]), '상세 목록에는 본문을 싣지 않는다');
  assert.match((await J(await call(MTexts, 'onRequestGet', env, U.view, { qs: `?id=${(await J(t)).id}` }))).text.body, /가상 전사/);
});

test('통합 검색: 업무·회의·구역·결정·파일, 권한 없는 금액 자료·예산은 제외', async () => {
  const env = mk(); const search = (q, who) => call(Search, 'onRequestGet', env, who, { qs: `?q=${encodeURIComponent(q)}` });
  assert.equal((await search('a', U.view)).status, 400); assert.equal((await call(Search, 'onRequestGet', env, null, { qs: '?q=ab' })).status, 401);
  const r = await J(await search('Camp', U.view)); assert.ok(r.groups.tasks.length && r.groups.meetings.length && r.groups.files.length);
  assert.ok((await J(await search('breakout', U.view))).groups.sections.some(s => s.meetingId === 'm1'), '회의 구역 본문');
  assert.ok((await J(await search('Sample Theme B', U.view))).groups.decisions.length, '결정 본문');
  const v = await J(await search('예산', U.view)); assert.equal('budget' in v.groups, false); assert.ok(!v.groups.files.some(f => f.restricted), '금액 파일은 조회만 계정 검색에서 제외');
  const m = await J(await search('예산', U.mem)); assert.ok(m.groups.files.some(f => f.restricted)); assert.ok(Array.isArray(m.groups.budget));
  assert.equal((await J(await search('%%', U.view))).total, 0);
});

const L = (f) => root + 'camp-team/samples-local/' + f;
test('실제 회의록 샘플(로컬 전용 파일이 있을 때만): 9개 구역이 한·영으로 짝지어지고 다음 회의 안건 11개', { skip: !existsSync(L('minutes_ko.txt')) }, () => {
  const m = mergeMinutes(parseMinutesText(readFileSync(L('minutes_ko.txt'), 'utf8')), parseMinutesText(readFileSync(L('minutes_en.txt'), 'utf8')));
  assert.equal(m.date, '2026-10-20'); assert.equal(m.time, '11:00'); assert.equal(m.sections.length, 9);
  assert.ok(m.sections.every(s => s.titleKo && s.titleEn), '모든 구역이 한·영 제목을 가진다');
  assert.equal(m.sections.find(s => s.isNext).nextItems.length, 11);
  assert.deepEqual(m.sections.map(s => s.kind).slice(0, 3), ['summary', 'context', 'discussion']);
});
