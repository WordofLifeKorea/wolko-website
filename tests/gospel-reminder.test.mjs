import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import * as Ex from '../functions/api/portal/gospel-exempt.js';
import { onRequestPost as remind } from '../functions/api/gospel-reminders.js';
import { isLastDayOfMonth, missingReporters, submittedEmails, reminderMail, reportLink } from '../functions/lib/gospelReminder.js';
import { ownerOf } from '../functions/lib/gospelStats.js';
import { GOSPEL_FIELD_IDS } from '../functions/lib/gospelStats.js';

test('매달 마지막 날 판단(윤년 포함)과 보고 링크', () => {
  assert.equal(isLastDayOfMonth('2026-10-31'), true);
  assert.equal(isLastDayOfMonth('2026-10-30'), false);
  assert.equal(isLastDayOfMonth('2026-02-28'), true);
  assert.equal(isLastDayOfMonth('2028-02-28'), false, '윤년 2월은 29일이 마지막');
  assert.equal(isLastDayOfMonth('2028-02-29'), true);
  assert.equal(isLastDayOfMonth('2026-11-30'), true);
  assert.equal(isLastDayOfMonth('garbage'), false);
  assert.equal(reportLink('2026-10'), 'https://wolko.org/portal/gospel-stats/?write=1&month=2026-10');
});

test('알림 메일: 한글·영어, 이름·링크가 들어가고 이름은 이스케이프된다', () => {
  const m = reminderMail({ name: '<b>Anna</b>', month: '2026-10', link: reportLink('2026-10') });
  assert.match(m.subject, /2026년 10월/); assert.match(m.subject, /October 2026/);
  assert.match(m.html, /보고하러 가기/); assert.match(m.html, /Open the report form/);
  assert.match(m.html, /\?write=1&amp;month=2026-10/);
  assert.equal(m.html.includes('<b>Anna</b>'), false);
});

test('아직 안 낸 사람: 낸 사람(팀 보고 포함)과 보고 제외는 뺀다', async () => {
  const roster = [{ email: 'a@wol.org', name: 'A', exempt: false }, { email: 'b@wol.org', name: 'B', exempt: false }, { email: 'c@wol.org', name: 'C', exempt: true }, { email: 'd@wol.org', name: 'D', exempt: false }];
  const env = { ADMIN_PASSWORD: 'secret' };
  const reports = [{ owner: await ownerOf(env, 'A@wol.org') }, { owner: await ownerOf(env, 'b@wol.org'), scope: 'team' }];   // 보고에는 이메일이 없고 표식만 있다
  const missing = missingReporters(roster, await submittedEmails(env, roster, reports));
  assert.deepEqual(missing.map(p => p.email), ['d@wol.org']);
});

function setup(count = 3) {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 're_test', GOSPEL_REMINDER_SECRET: 'gs' };
  const acc = (email, role = 'counselor', status = 'approved', name = email.split('@')[0]) => kv.put(`hub:account:${email}`, JSON.stringify({ email, name, role, status }));
  return { env, kv, acc, store };
}
const sentMails = [];
const realFetch = globalThis.fetch;
function mockResend(t) {
  sentMails.length = 0;
  globalThis.fetch = async (url, init) => { if (String(url).includes('resend.com')) { sentMails.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); } return realFetch(url, init); };
  t.after(() => { globalThis.fetch = realFetch; });
}
const call = (env, query = '', secret = 'gs') => remind({ env, request: new Request(`https://wolko.org/api/gospel-reminders${query}`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });

test('알림 API: 비밀키가 맞아야 하고, 마지막 날이 아니면 보내지 않는다', async t => {
  mockResend(t);
  const { env, acc } = setup(); await acc('a@wol.org');
  assert.equal((await call(env, '', 'wrong')).status, 401);
  const skipped = await (await call(env)).json();     // 오늘이 월말이 아닌 날이면 건너뜀(월말이면 아래 force 시험과 같은 동작)
  if (skipped.skipped) { assert.equal(skipped.skipped, 'not-last-day'); assert.equal(sentMails.length, 0); }
});

test('알림 API: 미제출자에게만, 사람마다 한 통, 같은 달에는 한 번만, 20통씩 나눠 보낸다', async t => {
  mockResend(t);
  const { env, kv, acc } = setup();
  const month = '2026-10';
  await acc('done@wol.org'); await acc('pending@wol.org', 'counselor', 'pending'); await acc('exempt@wol.org'); await acc('admin@wolko.org', 'master'); await acc('wolkorea1@gmail.com', 'admin');
  for (let i = 0; i < 22; i++) await acc(`p${String(i).padStart(2, '0')}@wol.org`);
  await kv.put('gospel:exempt:exempt@wol.org', '{}');
  const values = Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));
  await kv.put(`gospel:rep:${month}:x1`, JSON.stringify({ id: 'x1', month, email: 'done@wol.org', scope: 'individual', location: 'mainland', values }));

  const dry = await (await call(env, `?force=1&month=${month}&dryRun=1`)).json();
  assert.deepEqual([dry.missing, dry.pending, dry.sent], [22, 22, 0], '승인 대기·보고 제외·이미 낸 사람은 대상이 아니다');
  assert.equal(sentMails.length, 0, 'dryRun 은 보내지 않는다');

  const first = await (await call(env, `?force=1&month=${month}`)).json();
  assert.deepEqual([first.sent, first.remaining], [20, 2]);
  assert.ok(sentMails.every(m => m.to.length === 1 && m.html.includes(`month=${month}`)), '한 사람에게 한 통, 링크 포함');
  const to = sentMails.map(m => m.to[0]);
  assert.equal(new Set(to).size, 20);
  assert.equal(to.some(a => ['done@wol.org', 'pending@wol.org', 'exempt@wol.org', 'admin@wolko.org', 'wolkorea1@gmail.com'].includes(a)), false);

  const second = await (await call(env, `?force=1&month=${month}`)).json();
  assert.deepEqual([second.sent, second.remaining], [2, 0], '남은 사람에게만');
  assert.equal(new Set(sentMails.map(m => m.to[0])).size, 22, '모두 한 번씩');
  const third = await (await call(env, `?force=1&month=${month}`)).json();
  assert.equal(third.sent, 0, '같은 달에는 다시 보내지 않는다');
  assert.equal(sentMails.length, 22);
});

test('알림 API: ?to= 시험 메일은 그 주소로만 한 통, 기록을 남기지 않는다', async t => {
  mockResend(t);
  const { env, store, acc } = setup(); await acc('a@wol.org');
  const res = await (await call(env, '?to=me@wol.org&month=2026-10')).json();
  assert.equal(res.test, true);
  assert.deepEqual(sentMails.map(m => m.to), [['me@wol.org']]);
  assert.equal([...store.keys()].some(k => k.startsWith('gospel:mail:')), false);
  assert.equal((await call(env, '?to=not-an-email')).status, 400);
});

test('제출 현황·보고 제외: 마스터·관리자만 보고, 제외하면 미제출 목록에서 빠진다', async () => {
  const { env, kv, acc } = setup();
  await acc('admin@wolko.org', 'master'); await acc('wolkorea1@gmail.com', 'admin'); await acc('hkim3@wol.org', 'admin'); await acc('anna@wol.org'); await acc('bob@wol.org'); await acc('cara@wol.org');
  const month = '2026-10';
  const values = Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));
  await kv.put(`gospel:rep:${month}:a`, JSON.stringify({ id: 'a', month, email: 'anna@wol.org', scope: 'team', teamName: 'T', location: 'jeju', values }));
  const get = async who => G.onRequestGet({ env, request: new Request(`https://t.co/api/portal/gospel-stats?month=${month}`, { headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]) } }) });
  const post = async (who, body) => Ex.onRequestPost({ env, request: new Request('https://t.co/api/portal/gospel-exempt', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]) }, body: JSON.stringify(body) }) });
  const admin = ['hkim3@wol.org', 'admin'], anna = ['anna@wol.org', 'counselor'];

  const member = await (await get(anna)).json();
  assert.equal('submission' in member, false, '일반 멤버에게는 제출 현황이 없다');
  const a = await (await get(admin)).json();
  assert.equal(a.submission.expected, 4, 'admin@wolko.org 와 wolkorea1 계정은 늘 제외'); assert.equal(a.submission.submitted, 1);
  assert.deepEqual(a.submission.missing.map(p => p.email).sort(), ['bob@wol.org', 'cara@wol.org', 'hkim3@wol.org']);
  assert.deepEqual(a.submission.exempt.map(p => [p.email, p.fixed]).sort(), [['admin@wolko.org', true], ['wolkorea1@gmail.com', true]]);
  assert.equal((await post(admin, { email: 'wolkorea1@gmail.com', exempt: false })).status, 400, '항상 제외되는 계정은 다시 넣을 수 없다');
  assert.equal((await post(anna, { email: 'bob@wol.org', exempt: true })).status, 403);
  assert.equal((await post(admin, { email: 'nope', exempt: true })).status, 400);
  assert.equal((await post(admin, { email: 'Bob@wol.org', exempt: true })).status, 200);
  const b = await (await get(admin)).json();
  assert.equal(b.submission.expected, 3); assert.deepEqual(b.submission.exempt.map(p => p.email).sort(), ['admin@wolko.org', 'bob@wol.org', 'wolkorea1@gmail.com']);
  assert.equal(b.submission.missing.some(p => p.email === 'bob@wol.org'), false);
  await post(admin, { email: 'bob@wol.org', exempt: false });
  assert.deepEqual((await (await get(admin)).json()).submission.exempt.map(p => p.email).sort(), ['admin@wolko.org', 'wolkorea1@gmail.com'], '직접 제외한 계정은 다시 넣을 수 있다');
});
