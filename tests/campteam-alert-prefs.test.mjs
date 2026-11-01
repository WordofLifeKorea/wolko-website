import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Alerts from '../functions/api/campteam/alerts.js';
import * as Mail from '../functions/api/campteam/weekly-mail.js';
import * as Off from '../functions/api/campteam/email-off.js';
import { unionDays, cleanDays, sanitizePrefPatch, isQuietNow, loadPrefs, rowToPrefs, DEFAULT_PREFS, DEFAULT_SETTINGS } from '../functions/lib/campteamAlerts.js';
import { signEmailOff, verifyEmailOff, UNSUB_TTL_SEC } from '../functions/lib/campteamUnsub.js';
import { mailFooter } from '../functions/lib/campteamMail.js';
import { todayKST, addDays } from '../functions/lib/campteamDb.js';
import { fakeD1, makeEnv, req, root, SECRET, U } from './helpers/campteam-fakes.mjs';

const T = todayKST(), d = (n) => addDays(T, n), J = (r) => r.json();
const get = async (env, who) => Alerts.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/alerts' }) });
const post = async (env, who, body) => Alerts.onRequestPost({ env, request: await req(who, { method: 'POST', body, url: 'http://localhost:8788/api/campteam/alerts' }) });
const keyOf = (items) => items.map((x) => x.key.split(':').slice(0, 3).join(':'));

function mk(extra = {}) {
  const env = makeEnv(fakeD1(), extra), q = env.DB.sqlite;
  q.exec(`UPDATE tasks SET deletedAt='x'; UPDATE meetings SET deletedAt='x'; UPDATE events SET deletedAt='x'; UPDATE decisions SET deletedAt='x';`);
  const task = (id, due, owner = U.mem, createdBy = 't') => q.prepare(`INSERT INTO tasks (id,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy) VALUES (?,?,?,?,?, 'In Progress','Medium','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z',?)`).run(id, '업무 ' + id, '이름', owner, due, createdBy);
  const meeting = (id, date) => q.prepare(`INSERT INTO meetings (id,title,meetDate,createdAt,updatedAt) VALUES (?,?,?,'x','x')`).run(id, '회의 ' + id, date);
  return { env, q, task, meeting };
}
/** 메일 서비스(Resend) 흉내: 보낸 내용을 모으고, 다른 주소로 나가는 요청은 시험을 깨뜨린다(진짜 발송 방지) */
function fakeMailer() {
  const real = globalThis.fetch, sent = [];
  globalThis.fetch = async (url, opts) => { if (String(url).startsWith('https://api.resend.com/')) { sent.push(JSON.parse(opts.body)); return new Response('{"id":"x"}', { status: 200 }); } throw new Error('진짜 네트워크 호출 금지: ' + url); };
  return { sent, fail: (status) => { globalThis.fetch = async (url) => { if (String(url).startsWith('https://api.resend.com/')) return new Response('nope', { status }); throw new Error('진짜 네트워크 호출 금지'); }; }, restore: () => { globalThis.fetch = real; } };
}
const MAILENV = { RESEND_API_KEY: 're_test_not_real', CAMPTEAM_MAIL_RETRY_MS: '1', CAMPTEAM_MAIL_GAP_MS: '0', CAMPTEAM_MAIL_SECRET: 'mail-secret-test' };

test('0037 마이그레이션은 덧붙이기만 한다 (칸 추가, 삭제·변경 없음)', () => {
  const sql = readFileSync(root + 'camp-team/db/0037_alert_prefs.sql', 'utf8').replace(/--.*$/gm, '');
  assert.ok(/ALTER TABLE notify_prefs ADD COLUMN/.test(sql)); assert.equal(/DROP|DELETE|UPDATE\s/i.test(sql), false);
  for (const c of ['dueDays', 'eventDays', 'emailDue', 'quietStart', 'quietEnd', 'notifyMine']) assert.ok(sql.includes(c), c);
});

test('설정이 없는 사람: 기본값(업무 3일·1일 전, 일정 1일 전) 그대로, 이메일 모두 켜짐', async () => {
  const { env, task, meeting } = mk(); task('a', d(3)); task('b', d(2)); task('c', d(1)); task('x', d(7)); meeting('pm1', d(1)); meeting('pm2', d(2));
  const b = await J(await get(env, U.mem));
  assert.deepEqual(b.prefs, { weeklyEmail: true, emailDue: true, dueDays: [], eventDays: [], quietStart: null, quietEnd: null, notifyMine: false });
  assert.deepEqual(b.settings, DEFAULT_SETTINGS); assert.equal(b.mailReady, false);
  assert.deepEqual(keyOf(b.items.filter((x) => x.type === 'task')).sort(), ['task:a:d3', 'task:b:d3', 'task:c:d1'], '7일 남은 업무는 아직 알리지 않음');
  assert.deepEqual(keyOf(b.items.filter((x) => x.type === 'meeting')), ['meet:pm1:d1']);
  assert.deepEqual(unionDays(DEFAULT_SETTINGS.dueDays, DEFAULT_PREFS.dueDays), [3, 1]);
});

test('사람마다 따로 정한 날: 그 사람에게만 더해진다 (업무 1주 전·2일 전, 회의 2일 전)', async () => {
  const { env, task, meeting } = mk(); task('w', d(7), U.mem); task('t2', d(2), U.mem); task('o', d(7), U.fin); meeting('pm2', d(2));
  assert.equal((await post(env, U.mem, { action: 'pref', dueDays: [7, 2], eventDays: [2] })).status, 200);
  const me = await J(await get(env, U.mem)), other = await J(await get(env, U.fin));
  assert.deepEqual(me.prefs.dueDays, [7, 2]); assert.deepEqual(me.prefs.eventDays, [2]);
  assert.deepEqual(keyOf(me.items.filter((x) => x.type === 'task')).sort(), ['task:t2:d2', 'task:w:d7']);
  assert.deepEqual(keyOf(me.items.filter((x) => x.type === 'meeting')), ['meet:pm2:d2']);
  assert.deepEqual(keyOf(other.items.filter((x) => x.type === 'task')), [], '다른 사람의 설정은 영향 없음 (fin 의 d(7) 업무는 아직 알리지 않음)');
  assert.equal(other.items.filter((x) => x.type === 'meeting').length, 0, '회의 2일 전은 내 설정일 뿐');
  assert.deepEqual((await J(await get(env, U.fin))).prefs.dueDays, []);
});

test('팀 고정 알림 + 내 날짜 = 합집합, 같은 날이 겹쳐도 알림은 하나', async () => {
  const { env, task } = mk(); task('a', d(3)); task('b', d(1)); task('c', d(5));
  await post(env, U.mem, { action: 'pref', dueDays: [3, 1, 5, 3] });   // 고정(3,1)과 겹치는 날 + 5일 전
  const b = await J(await get(env, U.mem)), tasks = b.items.filter((x) => x.type === 'task');
  assert.deepEqual(tasks.map((x) => x.key.split(':')[1]).sort(), ['a', 'b', 'c'], '업무마다 알림 한 개'); assert.equal(new Set(tasks.map((x) => x.key)).size, 3);
  assert.deepEqual(b.prefs.dueDays, [5, 3, 1]);
  // 관리자가 고정 알림을 바꾸면 모두에게 바로 적용 (5일 전을 고정으로 → 다른 사람도 받는다)
  assert.equal((await post(env, U.admin, { action: 'settings', dueDays: [5, 3, 1] })).status, 200);
  task('d', d(5), U.fin);
  assert.deepEqual(keyOf((await J(await get(env, U.fin))).items), ['task:d:d5']);
  assert.deepEqual(unionDays([5, 3, 1], [3, 7]), [7, 5, 3, 1]);
});

test('고정 알림(관리자 전용): 일반 팀원·디렉터는 403, 관리자는 목록·접는 일수를 바꾼다', async () => {
  const { env } = mk();
  for (const who of [U.mem, U.dir, U.fin, U.tre]) assert.equal((await post(env, who, { action: 'settings', dueDays: [7] })).status, 403, who);
  assert.deepEqual((await J(await get(env, U.mem))).settings, DEFAULT_SETTINGS, '거부되면 아무것도 바뀌지 않음');
  const r = await J(await post(env, U.admin, { action: 'settings', dueDays: [14, 7, 3, 1], eventDays: [7, 1], expireDays: 45 }));
  assert.deepEqual(r.settings, { dueDays: [14, 7, 3, 1], eventDays: [7, 1], expireDays: 45 });
  assert.deepEqual((await J(await get(env, U.mem))).settings, r.settings, '모든 팀원 화면에 같은 고정 알림');
  assert.equal((await post(env, U.admin, { action: 'settings', expireDays: 0 })).status, 400);
  assert.deepEqual((await J(await post(env, U.admin, { action: 'settings', dueDays: [] }))).settings.dueDays, [], '고정 알림을 모두 비우면 당일·지난 뒤만');
  assert.deepEqual((await J(await post(env, U.admin, { action: 'settings', dueDays: '' }))).settings.dueDays, [], '글자가 비면 이전 값 유지(위에서 비운 상태)');
});

test('고정 알림을 모두 비워도 당일·마감 지난 뒤 알림은 나온다', async () => {
  const { env, task } = mk(); task('a', d(0)); task('b', d(-1)); task('c', d(1));
  await post(env, U.admin, { action: 'settings', dueDays: [] });
  assert.deepEqual(keyOf((await J(await get(env, U.mem))).items).sort(), ['task:a:d0', 'task:b:over']);
});

test('내 설정 저장: 보낸 칸만 바뀌고, 잘못된 값은 400', async () => {
  const { env } = mk();
  assert.equal((await post(env, U.mem, { action: 'pref', weeklyEmail: false })).status, 200);
  let p = (await J(await get(env, U.mem))).prefs; assert.equal(p.weeklyEmail, false); assert.equal(p.emailDue, true, '다른 칸은 그대로');
  await post(env, U.mem, { action: 'pref', emailDue: false, notifyMine: true, quietStart: '22:00', quietEnd: '07:00' });
  p = (await J(await get(env, U.mem))).prefs; assert.deepEqual([p.weeklyEmail, p.emailDue, p.notifyMine, p.quietStart, p.quietEnd], [false, false, true, '22:00', '07:00']);
  await post(env, U.mem, { action: 'pref', quietStart: '', quietEnd: '' }); p = (await J(await get(env, U.mem))).prefs; assert.equal(p.quietStart, null); assert.equal(p.quietEnd, null);
  for (const bad of [{ dueDays: [0] }, { dueDays: [61] }, { dueDays: [1.5] }, { dueDays: 'abc' }, { dueDays: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, { eventDays: ['x'] }, { quietStart: '25:00', quietEnd: '07:00' }, { quietStart: '22:00' }, { quietStart: '07:00', quietEnd: '07:00' }, {}]) assert.equal((await post(env, U.mem, { action: 'pref', ...bad })).status, 400, JSON.stringify(bad));
  assert.equal((await post(env, U.out, { action: 'pref', weeklyEmail: false })).status, 403, '명단 밖은 거부');
  assert.equal((await post(env, null, { action: 'pref', weeklyEmail: false })).status, 401);
  assert.equal(cleanDays([' ', 3]), null); assert.deepEqual(cleanDays(['7', 2, 7]), [7, 2]); assert.equal(sanitizePrefPatch({ weeklyEmail: 'false' }).patch.weeklyEmail, false);
});

test('이메일을 꺼도 알림 목록은 그대로 (끄기·확인은 사람이 누를 때만)', async () => {
  const { env, task } = mk(); task('a', d(3)); task('b', d(0));
  const before = (await J(await get(env, U.mem))).items.map((x) => x.key);
  await post(env, U.mem, { action: 'pref', weeklyEmail: false, emailDue: false, quietStart: '00:00', quietEnd: '23:59' });
  const after = await J(await get(env, U.mem)); assert.deepEqual(after.items.map((x) => x.key), before); assert.equal(after.unread, 2);
  await post(env, U.mem, { action: 'state', keys: [before[0]], state: 'dismissed' });
  assert.equal((await J(await get(env, U.mem))).items.length, 1, '확인(끄기)을 누르면 사라진다');
});

test('내가 만든 업무도 알림: 켠 사람만, 담당자가 달라도, 내 업무와 겹치면 한 번만', async () => {
  const { env, task } = mk(); task('c1', d(1), U.fin, U.dir); task('c2', d(3), U.dir, U.dir); task('n1', d(1), U.fin, U.fin);
  assert.deepEqual(keyOf((await J(await get(env, U.dir))).items), ['task:c2:d3'], '끈 상태: 내가 맡은 업무만');
  await post(env, U.dir, { action: 'pref', notifyMine: true });
  const b = await J(await get(env, U.dir)), by = Object.fromEntries(b.items.map((x) => [x.taskId, x]));
  assert.deepEqual(Object.keys(by).sort(), ['c1', 'c2']); assert.equal(b.items.length, 2, '내가 만들고 내가 맡은 업무는 한 번만');
  assert.equal(by.c1.asCreator, true); assert.equal(by.c1.ownerName, '이름'); assert.equal(by.c2.asCreator, undefined);
  assert.equal(b.today.soon.length, 2);
  assert.deepEqual(keyOf((await J(await get(env, U.fin))).items).sort(), ['task:c1:d1', 'task:n1:d1'], '담당자 쪽 알림은 그대로');
  assert.deepEqual(keyOf((await J(await get(env, U.mem))).items), [], '다른 사람은 영향 없음');
});

test('방해 금지 시간대: 자정을 넘는 시간대·경계, 설정이 없으면 항상 허용', () => {
  const at = (hh, mm) => new Date(Date.UTC(2027, 0, 5, hh - 9, mm)), q = { quietStart: '22:00', quietEnd: '07:00' };   // 한국 시간 hh:mm
  assert.equal(isQuietNow(q, at(23, 0)), true); assert.equal(isQuietNow(q, at(3, 30)), true); assert.equal(isQuietNow(q, at(22, 0)), true, '시작 시각 포함'); assert.equal(isQuietNow(q, at(7, 0)), false, '끝 시각은 허용');
  assert.equal(isQuietNow(q, at(9, 0)), false); assert.equal(isQuietNow(q, at(21, 59)), false);
  const day = { quietStart: '12:00', quietEnd: '14:00' }; assert.equal(isQuietNow(day, at(13, 0)), true); assert.equal(isQuietNow(day, at(15, 0)), false);
  assert.equal(isQuietNow({ quietStart: null, quietEnd: null }, at(3, 0)), false); assert.equal(isQuietNow(null, at(3, 0)), false);
  assert.equal(isQuietNow({ quietStart: '22:00', quietEnd: '07:00' }, new Date(Date.UTC(2027, 0, 4, 14, 0))), true, '한국 시간 23:00 (UTC 14:00)');
});

test('주간 메일: 방해 금지 시간대에 걸린 사람은 건너뛰고(기록 없음), 끈 사람은 제외, 시간이 지나면 보낸다', async () => {
  const m = fakeMailer(), { env, q, task } = mk(MAILENV); try {
    const monday = addDays(T, -((new Date(T + 'T00:00:00Z').getUTCDay() + 6) % 7)); task('a', addDays(monday, 2), U.mem); task('b', addDays(monday, 3), U.dir); task('c', addDays(monday, 4), U.fin);
    const kst = new Date(Date.now() + 9 * 3600e3), hhmm = (mins) => { const x = ((mins % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); }, nowMin = kst.getUTCHours() * 60 + kst.getUTCMinutes();
    q.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, quietStart, quietEnd, updatedAt) VALUES (?, 1, ?, ?, 'x')`).run(U.mem, hhmm(nowMin - 60), hhmm(nowMin + 60));       // 지금이 방해 금지 안
    q.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, quietStart, quietEnd, updatedAt) VALUES (?, 1, ?, ?, 'x')`).run(U.dir, hhmm(nowMin + 120), hhmm(nowMin + 180));      // 지금은 밖
    q.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, updatedAt) VALUES (?, 0, 'x')`).run(U.fin);
    const call = (qs) => Mail.onRequestPost({ env, request: new Request('https://wolko.org/api/campteam/weekly-mail?' + qs, { method: 'POST', headers: { Authorization: 'Bearer mail-secret-test' } }) });
    const r = await J(await call('force=1')); assert.deepEqual(m.sent.map((x) => x.to[0]), [U.dir]);
    assert.ok(r.skipped.some((x) => x.email === U.mem && x.why === 'quiet-hours')); assert.ok(r.skipped.some((x) => x.email === U.fin && x.why === 'opted-out'));
    assert.equal(q.prepare(`SELECT COUNT(*) AS n FROM mail_log WHERE email = ? AND kind='weekly'`).get(U.mem).n, 0, '건너뛴 사람은 기록이 없어서 나중 실행에서 보낼 수 있다');
    q.prepare(`UPDATE notify_prefs SET quietStart = NULL, quietEnd = NULL WHERE email = ?`).run(U.mem);
    m.sent.length = 0; await call('force=1'); assert.ok(m.sent.some((x) => x.to[0] === U.mem), '방해 금지가 끝나면(여기서는 해제) 보낸다');
    m.sent.length = 0; const only = await J(await call('to=' + encodeURIComponent(U.fin))); assert.equal(only.sent, 1, '시험 발송(?to=)은 설정과 무관');
  } finally { m.restore(); }
});

test('나에게 테스트 이메일: 나에게만 한 통, 1시간에 3번까지, 진짜 발송 없음', async () => {
  const m = fakeMailer(), { env, q } = mk(MAILENV); try {
    assert.equal((await post(env, null, { action: 'testMail' })).status, 401); assert.equal((await post(env, U.out, { action: 'testMail' })).status, 403);
    assert.equal(m.sent.length, 0);
    assert.equal((await post({ ...env, RESEND_API_KEY: '' }, U.mem, { action: 'testMail' })).status, 503, '메일 서비스 키가 없으면 보내지 않음');
    for (let i = 0; i < 3; i++) assert.equal((await post(env, U.mem, { action: 'testMail' })).status, 200);
    assert.equal(m.sent.length, 3); assert.ok(m.sent.every((x) => x.to.length === 1 && x.to[0] === U.mem), '요청한 사람에게만');
    const r = await post(env, U.mem, { action: 'testMail' }); assert.equal(r.status, 429); assert.equal(m.sent.length, 3, '네 번째는 보내지 않음');
    assert.equal((await post(env, U.dir, { action: 'testMail' })).status, 200, '사람마다 따로 센다'); assert.equal(m.sent.at(-1).to[0], U.dir);
    q.prepare(`UPDATE mail_log SET createdAt = ? WHERE kind = 'test' AND email = ?`).run(new Date(Date.now() - 2 * 3600e3).toISOString(), U.mem);
    assert.equal((await post(env, U.mem, { action: 'testMail' })).status, 200, '1시간이 지나면 다시 보낼 수 있다');
    assert.equal(q.prepare(`SELECT COUNT(*) AS n FROM mail_log WHERE kind='weekly'`).get().n, 0, '주간 메일 중복 방지 기록과 섞이지 않음');
  } finally { m.restore(); }
});

test('테스트 이메일이 실패하면 502, 그래도 한 번으로 센다', async () => {
  const m = fakeMailer(), { env } = mk(MAILENV); try {
    m.fail(422);
    for (let i = 0; i < 3; i++) assert.equal((await post(env, U.mem, { action: 'testMail' })).status, 502);
    assert.equal((await post(env, U.mem, { action: 'testMail' })).status, 429, '실패한 시도도 횟수에 들어간다(연타 방지)');
  } finally { m.restore(); }
});

test('모든 메일 맨 아래: 알림 → 설정 안내 + 「이 메일 그만 받기」 링크, 받는 사람 주소의 서명 토큰', async () => {
  const m = fakeMailer(), { env, task } = mk({ ...MAILENV, CAMPTEAM_BASE_URL: 'https://example.test' }); try {
    await post(env, U.mem, { action: 'testMail' });
    const monday = addDays(T, -((new Date(T + 'T00:00:00Z').getUTCDay() + 6) % 7)); task('a', addDays(monday, 2), U.dir);
    await Mail.onRequestPost({ env, request: new Request('https://wolko.org/api/campteam/weekly-mail?force=1', { method: 'POST', headers: { Authorization: 'Bearer mail-secret-test' } }) });
    assert.equal(m.sent.length, 2); const subjects = m.sent.map((x) => x.subject.replace(/\(.*/, ''));
    for (const mail of m.sent) {
      assert.match(mail.text, /알림 → 설정/); assert.match(mail.html, /알림 → 설정/); assert.match(mail.html, /이 메일 그만 받기/); assert.match(mail.text, /이 메일 그만 받기/);
      const url = /https:\/\/example\.test\/api\/campteam\/email-off\?t=([A-Za-z0-9_.-]+)/.exec(mail.text); assert.ok(url, '링크가 본문에 있다');
      assert.equal(await verifyEmailOff(env, url[1]), mail.to[0], '토큰은 받는 사람 주소에 묶여 있다');
      assert.equal(mail.headers['List-Unsubscribe'], `<${url[0]}>`); assert.equal(mail.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    }
    assert.ok(subjects.some((x) => /이번 주 할 일/.test(x)) && subjects.some((x) => /시험 메일/.test(x)));
    // 비밀값이 없으면 링크 없이 안내 글만
    const f = mailFooter({ base: 'https://example.test' }); assert.ok(f.text.includes('알림 → 설정') && !f.text.includes('email-off'));
  } finally { m.restore(); }
});

test('그만 받기 토큰: 맞는 것·변조·다른 주소·만료·다른 비밀값', async () => {
  const env = { ADMIN_PASSWORD: 'secret-a' }, t = await signEmailOff(env, 'Test-Member@Wolko.org', 1_000_000);
  assert.equal(await verifyEmailOff(env, t, 1_000_000 + 1000), 'test-member@wolko.org', '주소는 소문자로');
  assert.ok(!t.includes('@') && /^[A-Za-z0-9_.-]+$/.test(t), '링크에 쓸 수 있는 글자만');
  const [e, exp, sig] = t.split('.'), b64 = (s) => Buffer.from(s).toString('base64url');
  assert.equal(await verifyEmailOff(env, `${b64('someone-else@wolko.org')}.${exp}.${sig}`, 1_000_000), null, '다른 사람 주소로 바꾸면 거부');
  assert.equal(await verifyEmailOff(env, `${e}.${Number(exp) + 99999}.${sig}`, 1_000_000), null, '만료일을 늘리면 거부');
  assert.equal(await verifyEmailOff(env, `${e}.${exp}.${sig.slice(0, -2)}AA`, 1_000_000), null, '서명을 바꾸면 거부');
  assert.equal(await verifyEmailOff(env, t.slice(0, -1), 1_000_000), null);
  assert.equal(await verifyEmailOff({ ADMIN_PASSWORD: 'secret-b' }, t, 1_000_000), null, '다른 비밀값으로는 거부');
  assert.equal(await verifyEmailOff(env, t, 1_000_000 + (UNSUB_TTL_SEC + 5) * 1000), null, '만료');
  for (const junk of ['', 'abc', 'a.b.c', '..', null, undefined, 'a.1.b.c', 'x'.repeat(2000)]) assert.equal(await verifyEmailOff(env, junk), null, String(junk).slice(0, 10));
  assert.equal(await signEmailOff({}, 'a@b.co'), null, '비밀값이 없으면 토큰을 만들지 않음'); assert.equal(await verifyEmailOff({}, t, 1_000_000), null);
});

test('그만 받기 링크: 로그인 없이 두 이메일만 끄고, 잘못된 링크는 아무것도 바꾸지 않는다', async () => {
  const { env, q } = mk(); const off = (qs, method = 'GET', body, headers) => (method === 'GET' ? Off.onRequestGet : Off.onRequestPost)({ env, request: new Request('https://wolko.org/api/campteam/email-off' + qs, { method, body, headers }) });
  const row = (e) => q.prepare('SELECT * FROM notify_prefs WHERE email = ?').get(e);
  const tok = await signEmailOff(env, U.mem);
  // 잘못된 링크
  for (const bad of ['', '?t=', '?t=garbage', '?t=' + tok.slice(0, -3) + 'abc']) { const r = await off(bad); assert.equal(r.status, 302); assert.match(r.headers.get('Location'), /email-off\/\?err=1$/, bad); }
  assert.equal(row(U.mem), undefined, '아무것도 바뀌지 않음');
  assert.equal(q.prepare('SELECT COUNT(*) AS n FROM notify_prefs').get().n, 0);
  // 맞는 링크: 로그인 없음(Authorization 없음), 바로 꺼지고 확인 화면으로
  const r = await off('?t=' + encodeURIComponent(tok)); assert.equal(r.status, 302); assert.match(r.headers.get('Location'), /^\/portal\/campteam\/email-off\/\?ok=1&t=/); assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual([row(U.mem).weeklyEmail, row(U.mem).emailDue], [0, 0]); assert.equal(row(U.fin), undefined, '다른 사람은 그대로');
  // 알림 목록·다른 설정은 그대로
  await post(env, U.dir, { action: 'pref', dueDays: [7], notifyMine: true, quietStart: '22:00', quietEnd: '07:00' });
  await off('?t=' + encodeURIComponent(await signEmailOff(env, U.dir)));
  const p = await loadPrefs(env, U.dir); assert.deepEqual([p.weeklyEmail, p.emailDue, p.dueDays, p.notifyMine, p.quietStart], [false, false, [7], true, '22:00'], '이메일 두 가지만 꺼진다');
  // 받은편지함 「구독 취소」 단추(POST)와 다시 받기
  const tok2 = await signEmailOff(env, U.fin);
  assert.equal((await off('?t=' + encodeURIComponent(tok2), 'POST', 'List-Unsubscribe=One-Click', { 'Content-Type': 'application/x-www-form-urlencoded' })).status, 200);
  assert.equal(row(U.fin).weeklyEmail, 0);
  const on = await off('', 'POST', JSON.stringify({ t: tok2, action: 'on' }), { 'Content-Type': 'application/json' }); assert.equal((await J(on)).on, true);
  assert.deepEqual([row(U.fin).weeklyEmail, row(U.fin).emailDue], [1, 1], '다시 받기');
  assert.equal((await off('', 'POST', JSON.stringify({ t: 'bad', action: 'on' }), { 'Content-Type': 'application/json' })).status, 400);
  assert.equal((await off('', 'POST')).status, 400);
  // 끈 사람은 주간 메일에서 빠진다
  const m = fakeMailer(); try {
    const e2 = { ...env, ...MAILENV }, monday = addDays(T, -((new Date(T + 'T00:00:00Z').getUTCDay() + 6) % 7)); q.prepare(`INSERT INTO tasks (id,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy) VALUES ('zz','z','n',?,?, 'In Progress','Medium','x','x','t')`).run(U.mem, addDays(monday, 3));
    const res = await J(await Mail.onRequestPost({ env: e2, request: new Request('https://wolko.org/api/campteam/weekly-mail?force=1', { method: 'POST', headers: { Authorization: 'Bearer mail-secret-test' } }) }));
    assert.ok(res.skipped.some((x) => x.email === U.mem && x.why === 'opted-out')); assert.equal(m.sent.some((x) => x.to[0] === U.mem), false);
  } finally { m.restore(); }
});

test('그만 받기 화면: 로그인 없이 열리는 최소 화면, 쉬운 한국어 안내와 설정 길 안내', () => {
  const page = readFileSync(root + 'src/pages/portal/campteam/email-off.astro', 'utf8');
  assert.equal(/CampTeamLayout|wolko-session|CT\.boot|login/i.test(page), false, '로그인·메뉴 틀을 쓰지 않는다');
  for (const s of ['이메일을 껐어요', '알림 → 오른쪽 위 「설정」', '이 링크는 쓸 수 없어요', 'noindex', 'no-referrer', '다시 받기']) assert.ok(page.includes(s), s);
  const alerts = readFileSync(root + 'src/pages/portal/campteam/alerts.astro', 'utf8'); assert.ok(alerts.includes('apSetBtn') && alerts.includes('apPop') && !alerts.includes('apMine"') , '설정 버튼과 팝오버, 예전 반반 칸은 없음');
  const js = readFileSync(root + 'public/portal/campteam/alerts-page.js', 'utf8');
  for (const s of ['고정 알림으로 이미 설정됨', '직접 입력 (○일 전)', '마감·일정 알림 이메일', '매주 화요일 이메일', '방해 금지 시간대', '내가 만든 업무도 알림 받기', '나에게 테스트 이메일 보내기', '지난 공지를 접는 일수', 'Already set as a fixed reminder', 'Send me a test e-mail']) assert.ok(js.includes(s), s);
});

test('0037 이전 DB(새 칸이 없음)에서도 알림은 열린다 — 코드를 먼저 배포해도 안전', async () => {
  const { env, q, task } = mk(); task('a', d(3));
  for (const c of ['dueDays', 'eventDays', 'emailDue', 'quietStart', 'quietEnd', 'notifyMine']) q.exec(`ALTER TABLE notify_prefs DROP COLUMN ${c}`);
  q.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, updatedAt) VALUES (?, 0, 'x')`).run(U.mem);
  const r = await get(env, U.mem); assert.equal(r.status, 200); const b = await J(r);
  assert.equal(b.prefs.weeklyEmail, false); assert.equal(b.prefs.emailDue, true); assert.equal(b.items.length, 1);
  assert.deepEqual(rowToPrefs(null), DEFAULT_PREFS);
});
