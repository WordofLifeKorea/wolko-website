import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOooName, matchMember, coversToday, oooToday } from '../functions/lib/campteamOoo.js';
import { fakeD1, makeEnv } from './helpers/campteam-fakes.mjs';

test('제목에서 사람 이름을 뽑는다: 부재 표시는 영어·한글 모두, 문장 같은 제목은 버린다', () => {
  assert.equal(parseOooName('Aiden Out of office'), 'Aiden');
  assert.equal(parseOooName('Out of Office - Aiden Park'), 'Aiden Park');
  assert.equal(parseOooName('Ella OOO'), 'Ella');
  assert.equal(parseOooName('Jason (Day off)'), 'Jason');
  assert.equal(parseOooName('박에이든 휴가'), '박에이든');
  assert.equal(parseOooName('연차 - 최예나'), '최예나');
  assert.equal(parseOooName('Staff meeting'), '');
  assert.equal(parseOooName('Out of office policy review meeting for 2027'), '', '회의 제목');
  assert.equal(parseOooName('OOO'), '', '이름이 없으면 사람이 아님');
});

test('명단과 이름으로 맞춘다: 한 단어는 첫 단어, 여러 사람이면 모호해서 맞추지 않는다', () => {
  const ms = [{ email: 'a@wolko.org', name: 'Aiden Park' }, { email: 'e@wolko.org', name: 'Ella Lim' }, { email: 'a2@wolko.org', name: 'Aiden Kim' }, { email: 'n@wolko.org', name: '최예나' }];
  assert.equal(matchMember('Ella', ms).email, 'e@wolko.org');
  assert.equal(matchMember('Aiden', ms), null, 'Aiden 이 둘이면 모호');
  assert.equal(matchMember('Aiden Park', ms).email, 'a@wolko.org');
  assert.equal(matchMember('최예나', ms).email, 'n@wolko.org');
  assert.equal(matchMember('Someone', ms), null);
});

test('종일 일정만, 끝 날짜는 포함하지 않는다(구글 방식)', () => {
  assert.equal(coversToday({ allDay: true, start: '2026-11-02', end: '2026-11-03' }, '2026-11-02'), true);
  assert.equal(coversToday({ allDay: true, start: '2026-11-02', end: '2026-11-03' }, '2026-11-03'), false);
  assert.equal(coversToday({ allDay: true, start: '2026-11-02', end: '2026-11-06' }, '2026-11-05'), true);
  assert.equal(coversToday({ allDay: false, start: '2026-11-02T09:00:00+09:00', end: '2026-11-02T10:00:00+09:00' }, '2026-11-02'), false, '시간이 있는 일정은 휴가로 보지 않는다');
});

test('오늘 부재자: 구글 일정 + 캠프팀 달력 「부재」 일정을 합치고, 중복을 줄이고, 이메일은 명단과 맞을 때만', async () => {
  const e = makeEnv(fakeD1(), {}), db = e.DB.sqlite;
  const m = db.prepare('SELECT email, name FROM camp_members WHERE active = 1 LIMIT 1').get();
  assert.ok(m, '시험 명단이 있어야 한다');
  const first = m.name.split(' ')[0];
  const events = [
    { summary: `${first} Out of office`, allDay: true, start: '2026-11-02', end: '2026-11-03' },
    { summary: 'Guest Staff OOO', allDay: true, start: '2026-11-02', end: '2026-11-03' },
    { summary: 'Late Person OOO', allDay: true, start: '2026-11-03', end: '2026-11-04' },
    { summary: 'Timed OOO', allDay: false, start: '2026-11-02T09:00:00+09:00', end: '2026-11-02T10:00:00+09:00' },
    { summary: '캠프 회의', allDay: true, start: '2026-11-02', end: '2026-11-03' },
  ];
  const r = await oooToday(e, '2026-11-02', { listEvents: async () => events });
  const names = r.map((x) => x.name);
  assert.ok(names.includes('Guest Staff') && !names.includes('Late Person') && !names.includes('Timed') && r.length <= 3);
  assert.equal(r.filter((x) => x.email === m.email.toLowerCase()).length <= 1, true);
  const guest = r.find((x) => x.name === 'Guest Staff'); assert.equal(guest.email, null);
  db.prepare("INSERT INTO events (id,title,kind,startDate,endDate,createdAt,updatedAt,createdBy) VALUES ('ev-ooo','Visiting Guest','out','2026-11-01','2026-11-03','2026-10-30','2026-10-30','t')").run();
  const r2 = await oooToday(e, '2026-11-02', { listEvents: async () => [] });
  assert.ok(r2.some((x) => x.name === 'Visiting Guest'), '캠프팀 달력 부재 일정');
});
