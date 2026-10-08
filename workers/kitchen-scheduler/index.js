const ENDPOINT = 'https://wolko.org/api/reminders/run';

export async function checkReminders(env, dryRun = false, fetcher = fetch) {
  if (!env.KITCHEN_SCHEDULER_SECRET) throw new Error('Missing KITCHEN_SCHEDULER_SECRET');
  const response = await fetcher(ENDPOINT + (dryRun ? '?dryRun=1' : ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.KITCHEN_SCHEDULER_SECRET}` },
    redirect: 'manual',
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => null);
  if (!Array.isArray(result?.jobs)) throw new Error(`Reminder API returned ${response.status}`);
  // Keep recipient names and phone numbers out of scheduler logs.
  const summary = {
    date: result.date, time: result.time,
    sent: result.sent, dryRun,
    failed: result.failed,
    jobs:result.jobs.map(row => ({ name:row.name, status:row.status, sent:row.sent,
      failed:row.failed, remaining:row.remaining, skipped:row.skipped })),
  };
  console.log(JSON.stringify({ source: 'reminder-scheduler', ...summary }));
  if (!response.ok || summary.failed) throw new Error(`Reminders failed: ${summary.failed || response.status}`);
  return summary;
}

export default {
  async scheduled(controller, env) {
    await checkReminders(env);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ service: 'reminder-scheduler', configured: !!env.KITCHEN_SCHEDULER_SECRET });
    }
    if (url.pathname !== '/check' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (!env.KITCHEN_SCHEDULER_SECRET || request.headers.get('Authorization') !== `Bearer ${env.KITCHEN_SCHEDULER_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    // Manual checks are always dry runs. Only the Cron Trigger sends messages.
    try {
      return Response.json(await checkReminders(env, true));
    } catch (error) {
      return Response.json({ error: error.message }, { status: 502 });
    }
  },
};
