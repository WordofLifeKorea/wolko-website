import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runReminderJobs } from '../functions/lib/reminderScheduler.js';
import { onRequestPost } from '../functions/api/reminders/run.js';

function setup() {
  const records = new Map(), called = [];
  const env = { KITCHEN_SCHEDULER_SECRET:'scheduler', KITCHEN_REMINDER_SECRET:'kitchen',
    DRIVE_REMINDER_SECRET:'drive', CRS_REMINDER_SECRET:'crs', STAFFING_REMINDER_SECRET:'staffing',
    CAMP_KV:{ get:async key => records.get(key), put:async (key, value) => records.set(key, value) } };
  const services = Object.fromEntries(['kitchen','drive','crs','staffing'].map(name => [name, async ({ request }) => {
    assert.equal(request.headers.get('Authorization'), 'Bearer ' + name);
    called.push({ name, url:request.url });
    return Response.json({ sent:0, remaining:0, results:[] });
  }]));
  return { env, services, called, records };
}
const kst = value => Date.parse(value + '+09:00');

test('CRS uses the existing scheduler credential when its legacy secret is absent', async () => {
  const s = setup();
  delete s.env.CRS_REMINDER_SECRET;
  s.services.crs = async ({request}) => {
    assert.equal(request.headers.get('Authorization'), 'Bearer scheduler');
    return Response.json({sent:0});
  };
  assert.equal((await runReminderJobs(s.env, {services:s.services,dryRun:true})).failed, 0);
});

test('one scheduler runs every due job, preserving the independent credentials and ledgers', async () => {
  const s = setup(), options = { services:s.services, now:kst('2026-10-12T09:30:00') };
  const result = await runReminderJobs(s.env, options);
  assert.deepEqual(s.called.map(row => row.name), ['kitchen','drive','staffing','crs']);
  assert.equal(result.failed, 0);
  assert.ok(s.records.has('reminders:daily:crs:2026-10-12'));
  s.called.length = 0;
  await runReminderJobs(s.env, options);
  assert.deepEqual(s.called.map(row => row.name), ['kitchen','drive','staffing']);
});
test('time gates use Korea time and do not send weekly mail before Monday 09:30', async () => {
  const s = setup();
  await runReminderJobs(s.env, { services:s.services, now:kst('2026-10-08T08:00:00') });
  assert.deepEqual(s.called.map(row => row.name), ['kitchen','drive']);
  s.called.length = 0;
  await runReminderJobs(s.env, { services:s.services, now:kst('2026-10-12T09:20:00') });
  assert.deepEqual(s.called.map(row => row.name), ['kitchen','drive','crs']);
  s.called.length = 0;
  await runReminderJobs(s.env, { services:s.services, now:kst('2026-10-12T22:00:00') });
  assert.equal(s.called.length, 0);
});
test('failures do not block other jobs and incomplete CRS batches resume at the next tick', async () => {
  const s = setup();
  s.services.kitchen = async () => { throw new Error('private phone'); };
  s.services.crs = async () => Response.json({ sent:10, remaining:20, review:1 });
  const options = { services:s.services, now:kst('2026-10-12T09:30:00') };
  const result = await runReminderJobs(s.env, options);
  assert.equal(result.failed, 2);
  assert.equal(result.sent, 10);
  assert.ok(s.called.some(row => row.name === 'drive'));
  assert.ok(s.called.some(row => row.name === 'staffing'));
  assert.equal(s.records.has('reminders:daily:crs:2026-10-12'), false);
  assert.ok(!JSON.stringify(result).includes('private phone'));
  s.services.crs = async () => Response.json({ remaining:0, review:1 });
  await runReminderJobs(s.env, options);
  assert.equal(JSON.parse(s.records.get('reminders:daily:crs:2026-10-12')).failed, 1);
});
test('dry runs check all jobs without writing status or invoking force', async () => {
  const s = setup();
  await runReminderJobs(s.env, { services:s.services, dryRun:true, now:kst('2026-10-08T03:00:00') });
  assert.equal(s.called.length, 4);
  assert.ok(s.called.every(row => row.url.endsWith('?dryRun=1')));
  assert.equal(s.records.size, 0);
});
test('unified endpoint rejects unauthorized requests and checks KV after authentication', async () => {
  const request = key => new Request('https://wolko.org/api/reminders/run?force=1', {
    method:'POST', headers:{ Authorization:`Bearer ${key}` } });
  assert.equal((await onRequestPost({ env:{}, request:request('wrong') })).status, 401);
  assert.equal((await onRequestPost({ env:{ KITCHEN_SCHEDULER_SECRET:'scheduler' }, request:request('scheduler') })).status, 503);
});
test('all reminder GitHub workflows are manual-only; camp content automation is unchanged', () => {
  for (const name of ['kitchen-reminders','drive-reminders','crs-reminders','staffing-reminders']) {
    const source = readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /^\s+schedule:/m);
    assert.match(source, /workflow_dispatch:/);
  }
  assert.match(readFileSync(new URL('../.github/workflows/auto-open-camps.yml', import.meta.url), 'utf8'), /schedule:/);
});
