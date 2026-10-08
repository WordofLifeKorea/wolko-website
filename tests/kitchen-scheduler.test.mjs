import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { checkReminders } from '../workers/kitchen-scheduler/index.js';
import { onRequestPost } from '../functions/api/kitchen/reminders.js';

test('scheduler calls only the fixed production endpoint, with no force override', async () => {
  const summary = await checkReminders({ KITCHEN_SCHEDULER_SECRET: 'test' }, false, async (url, options) => {
    assert.equal(url, 'https://wolko.org/api/reminders/run');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test');
    assert.equal(options.redirect, 'manual');
    return Response.json({ date: '2026-10-08', time: '11:30', sent: 1, failed:0, jobs: [{ name:'kitchen', sent: 1, failed:0, person: { name: 'private', phone: 'private' } }] });
  });
  assert.equal(summary.sent, 1);
  assert.ok(!JSON.stringify(summary).includes('private'));
});

test('API errors fail the scheduled execution', async () => {
  await assert.rejects(checkReminders({}, false), /Missing/);
  await assert.rejects(checkReminders({ KITCHEN_SCHEDULER_SECRET: 'test' }, false, async () => new Response('', { status: 503 })), /503/);
  await assert.rejects(checkReminders({ KITCHEN_SCHEDULER_SECRET: 'test' }, false, async () => Response.json({ jobs: [{ name:'drive', failed:1 }], sent: 1, failed:1 })), /failed: 1/);
});

test('manual check is authenticated and always dry run', async () => {
  const env = { KITCHEN_SCHEDULER_SECRET: 'test' };
  assert.equal((await worker.fetch(new Request('https://worker/check', { method: 'POST' }), env)).status, 401);
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(url, 'https://wolko.org/api/reminders/run?dryRun=1');
    return Response.json({ jobs: [], sent: 0, failed:0 });
  };
  try {
    assert.equal((await worker.fetch(new Request('https://worker/check?force=1', { method: 'POST', headers: { Authorization: 'Bearer test' } }), env)).status, 200);
  } finally { globalThis.fetch = original; }
});

test('Pages accepts scheduler secret while keeping legacy authentication', async () => {
  const env = { DRIVE_REMINDER_SECRET: 'legacy', KITCHEN_SCHEDULER_SECRET: 'scheduler' };
  for (const secret of ['legacy', 'scheduler']) {
    const response = await onRequestPost({ env, request: new Request('https://wolko.org/api/kitchen/reminders', { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }) });
    assert.equal(response.status, 503); // Authentication passed; this test has no KV.
  }
  assert.equal((await onRequestPost({ env, request: new Request('https://wolko.org/api/kitchen/reminders', { method: 'POST', headers: { Authorization: 'Bearer invalid' } }) })).status, 401);
});
