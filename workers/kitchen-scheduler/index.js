const ENDPOINT = 'https://wolko.org/api/kitchen/reminders';

export async function checkReminders(env, dryRun = false, fetcher = fetch) {
  if (!env.KITCHEN_SCHEDULER_SECRET) throw new Error('Missing KITCHEN_SCHEDULER_SECRET');
  const response = await fetcher(ENDPOINT + (dryRun ? '?dryRun=1' : ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.KITCHEN_SCHEDULER_SECRET}` },
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Kitchen reminder API returned ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result.results)) throw new Error('Invalid kitchen reminder response');
  // Keep recipient names and phone numbers out of scheduler logs.
  const summary = {
    date: result.date, time: result.time, configured: result.configured,
    sent: result.sent, dryRun,
    failed: result.results.filter(row => row.error).length,
    alreadySent: result.results.filter(row => row.alreadySent).length,
    skipped: result.results.reduce((counts, row) => {
      if (row.skipped) counts[row.skipped] = (counts[row.skipped] || 0) + 1;
      return counts;
    }, {}),
  };
  console.log(JSON.stringify({ source: 'kitchen-scheduler', ...summary }));
  if (summary.failed) throw new Error(`Kitchen reminders failed for ${summary.failed} recipient(s)`);
  return summary;
}

export default {
  async scheduled(controller, env) {
    await checkReminders(env);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ service: 'kitchen-scheduler', configured: !!env.KITCHEN_SCHEDULER_SECRET });
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
