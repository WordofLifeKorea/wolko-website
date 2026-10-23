import assert from 'node:assert/strict';
import test from 'node:test';
import * as Mail from '../functions/api/campteam/weekly-mail.js';
import { buildWeeklyEmail, fromAddress, DEFAULT_FROM } from '../functions/lib/campteamMail.js';
import { todayKST, addDays } from '../functions/lib/campteamDb.js';
import { mondayOf } from '../functions/lib/campteamAlerts.js';
import { fakeD1, makeEnv, U } from './helpers/campteam-fakes.mjs';

const T = todayKST(), isTue = new Date(T + 'T00:00:00Z').getUTCDay() === 2, d = (n) => addDays(mondayOf(T), n);
const SECRET = 'mail-secret-test';
const call = (env, qs = '', secret = SECRET) => Mail.onRequestPost({ env, request: new Request('https://wolko.org/api/campteam/weekly-mail' + qs, { method: 'POST', headers: secret ? { Authorization: 'Bearer ' + secret } : {} }) });
const J = (r) => r.json();

function mk(extra = {}) {
  const env = makeEnv(fakeD1(), { CAMPTEAM_MAIL_SECRET: SECRET, RESEND_API_KEY: 're_test_not_real', ...extra }), q = env.DB.sqlite, sent = [];
  q.exec(`UPDATE tasks SET deletedAt='x'; UPDATE meetings SET deletedAt='x'; UPDATE events SET deletedAt='x';`);
  const task = (id, due, owner) => q.prepare(`INSERT INTO tasks (id,title,ownerName,ownerEmail,dueDate,status,priority,createdAt,updatedAt,createdBy) VALUES (?,?, '이름', ?, ?, 'In Progress','Medium','x','x','t')`).run(id, '주간 <b>업무</b> ' + id, owner, due);
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { if (String(url).includes('resend.com')) { const body = JSON.parse(opts.body); sent.push(body); return new Response('{"id":"x"}', { status: 200 }); } return real(url, opts); };
  return { env, q, task, sent, restore: () => { globalThis.fetch = real; } };
}

test('발송 주소: 설정값이 올바를 때만 쓰고, 이상하면 기존 포털 주소로', () => {
  assert.equal(fromAddress({}), DEFAULT_FROM); assert.equal(fromAddress({ CAMPTEAM_MAIL_FROM: 'WOLKO Camp Team <aidenpark@wolko.org>' }), 'WOLKO Camp Team <aidenpark@wolko.org>'); assert.equal(fromAddress({ CAMPTEAM_MAIL_FROM: 'aidenpark@wolko.org' }), 'aidenpark@wolko.org');
  for (const bad of ['a@b.com, c@d.com', 'x\r\nBcc: y@z.com', '<a@b.com', 'no-at-sign', 'A <a@b.com> extra']) assert.equal(fromAddress({ CAMPTEAM_MAIL_FROM: bad }), DEFAULT_FROM, bad);
});

test('메일 내용: 제목·본문에 이번 주 일이 들어가고 HTML 은 안전하게 처리된다', () => {
  const week = { start: '2027-01-04', end: '2027-01-10', overdue: [{ title: '지난 일', date: '2027-01-02', camp: '' }], tasks: [{ title: '<script>alert(1)</script>', date: '2027-01-06', camp: '겨울 캠프' }], meetings: [{ title: '주간 회의', date: '2027-01-05', time: '10:00' }], events: [] };
  const m = buildWeeklyEmail({ name: '팀원', week, summary: '이번 주는 <b>마감</b>이 많아요.' });
  assert.match(m.subject, /01\/04~01\/10/); assert.equal(m.html.includes('<script>'), false); assert.ok(m.html.includes('&lt;script&gt;')); assert.ok(m.html.includes('&lt;b&gt;마감&lt;/b&gt;')); assert.ok(m.text.includes('주간 회의') && m.text.includes('지난 마감'));
  assert.ok(m.html.includes('https://wolko.org/campteam/'));
});

test('발송 권한: 비밀값이 없거나 틀리면 거부, 서비스 키가 없으면 503, 화요일이 아니면 건너뜀', async () => {
  const { env, restore } = mk(); try {
    assert.equal((await call(env, '', null)).status, 401); assert.equal((await call(env, '', 'wrong')).status, 401);
    assert.equal((await call({ ...env, CAMPTEAM_MAIL_SECRET: '' }, '')).status, 503); assert.equal((await call({ ...env, RESEND_API_KEY: '' }, '')).status, 503);
    assert.equal((await call({ ...env, RESEND_API_KEY: '' }, '?dryRun=1')).status, 200, '미리 보기는 메일 키가 없어도 된다');
    if (!isTue) assert.equal((await J(await call(env, ''))).skipped, 'not-tuesday');
    assert.equal((await call(env, '?to=not-an-email')).status, 400);
  } finally { restore(); }
});

test('발송 규칙: 이번 주에 일이 있는 사람만, 받기 끈 사람 제외, 같은 주 중복 방지, 미리 보기는 보내지 않음, 한 명 실패해도 계속', async () => {
  const { env, q, task, sent, restore } = mk({ CAMPTEAM_MAIL_FROM: 'WOLKO Camp Team <aidenpark@wolko.org>', CAMPTEAM_MAIL_REPLY_TO: 'aidenpark@wolko.org' }); try {
    task('a', d(2), U.mem); task('b', d(3), U.dir); task('c', d(1), U.fin); task('old', d(-3), U.tre); task('far', d(20), U.admin);
    q.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, updatedAt) VALUES (?, 0, 'x')`).run(U.fin);
    const dry = await J(await call(env, '?dryRun=1&force=1')); assert.equal(sent.length, 0, '미리 보기는 아무에게도 보내지 않아요');
    assert.deepEqual(dry.planned.map((x) => x.email).sort(), [U.dir, U.mem, U.tre].sort()); assert.ok(dry.skipped.some((x) => x.email === U.fin && x.why === 'opted-out')); assert.ok(dry.skipped.some((x) => x.email === U.admin && x.why === 'nothing-this-week'));
    const r = await J(await call(env, '?force=1')); assert.equal(r.sent, 3); assert.equal(sent.length, 3); assert.deepEqual(r.failed, []);
    assert.equal(sent[0].from, 'WOLKO Camp Team <aidenpark@wolko.org>'); assert.equal(sent[0].reply_to, 'aidenpark@wolko.org'); assert.ok(sent[0].html.includes('&lt;b&gt;업무&lt;/b&gt;')); assert.equal(sent.every((m) => m.to.length === 1), true, '한 통에 한 사람만(받는 사람끼리 주소가 안 보임)');
    assert.equal(q.prepare(`SELECT COUNT(*) AS n FROM mail_log WHERE status='sent'`).get().n, 3);
    sent.length = 0; const again = await J(await call(env, isTue ? '' : '?force=1')); if (isTue) { assert.equal(again.sent, 0); assert.ok(again.skipped.some((x) => x.why === 'already-sent')); assert.equal(sent.length, 0, '같은 주에 두 번 보내지 않아요'); }
    sent.length = 0; assert.equal((await J(await call(env, '?force=1'))).sent, 3, '강제 발송은 다시 보낸다');
    const own = sent.length; const test = await J(await call(env, '?to=' + encodeURIComponent(U.mem))); assert.equal(test.sent, 1); assert.equal(sent.length, own + 1); assert.equal(sent.at(-1).to[0], U.mem, '시험 발송은 그 한 사람에게만');
  } finally { restore(); }
});

test('발송 실패는 기록하고 나머지에게는 계속 보낸다 / AI 요약이 실패해도 메일은 나간다', async () => {
  const { env, q, task, sent, restore } = mk({ ANTHROPIC_API_KEY: 'sk-test-not-real' }); try {
    task('a', d(2), U.mem); task('b', d(3), U.dir);
    const real = globalThis.fetch; let n = 0;
    globalThis.fetch = async (url, opts) => { if (String(url).includes('anthropic')) return new Response('{}', { status: 500 }); if (String(url).includes('resend')) { n++; if (JSON.parse(opts.body).to[0] === U.mem) return new Response('bad', { status: 422 }); sent.push(JSON.parse(opts.body)); return new Response('{}', { status: 200 }); } return real(url, opts); };
    const r = await J(await call(env, '?force=1')); assert.equal(r.sent, 1); assert.equal(r.failed.length, 1); assert.equal(r.failed[0].email, U.mem); assert.equal(sent[0].to[0], U.dir); assert.equal(sent[0].html.includes('이번 주는'), false);
    assert.equal(q.prepare(`SELECT status FROM mail_log WHERE email = ?`).get(U.mem).status, 'failed');
    globalThis.fetch = async (url, opts) => { if (String(url).includes('anthropic')) { return new Response(JSON.stringify({ content: [{ type: 'text', text: '이번 주는 마감이 두 개예요.' }] }), { status: 200 }); } sent.push(JSON.parse(opts.body)); return new Response('{}', { status: 200 }); };
    sent.length = 0; const ok = await J(await call(env, '?force=1')); assert.equal(ok.sent, 2); assert.ok(sent[0].html.includes('이번 주는 마감이 두 개예요.'));
    assert.equal(q.prepare(`SELECT COUNT(*) AS n FROM daily_summaries WHERE kind='weekly'`).get().n, 2, '포털의 주간 요약과 같은 문장을 쓴다');
  } finally { restore(); }
});

test('속도 제한(429)은 쉬었다 다시 시도해서 보내고, 끝내 실패한 사람이 있으면 502 로 알린다', async () => {
  const { env, task, restore } = mk({ CAMPTEAM_MAIL_RETRY_MS: '1', CAMPTEAM_MAIL_GAP_MS: '0' }); try {
    task('a', d(2), U.mem); task('b', d(3), U.dir);
    const real = globalThis.fetch; const tries = {};
    globalThis.fetch = async (url, opts) => { if (!String(url).includes('resend')) return real(url, opts); const to = JSON.parse(opts.body).to[0]; tries[to] = (tries[to] || 0) + 1; if (to === U.mem && tries[to] < 3) return new Response('rate', { status: 429 }); if (to === U.dir) return new Response('bad', { status: 422 }); return new Response('{}', { status: 200 }); };
    const res = await call(env, '?force=1'), body = await J(res);
    assert.equal(tries[U.mem], 3, '429 는 두 번 쉬었다 다시 시도해서 성공'); assert.equal(tries[U.dir], 1, '주소 오류(422)는 다시 시도하지 않는다');
    assert.equal(body.sent, 1); assert.equal(body.failed.length, 1); assert.equal(res.status, 502, '실패한 사람이 있으면 502');
  } finally { restore(); }
});
