import { runReminderJobs } from '../../lib/reminderScheduler.js';

export async function onRequestPost({ env, request }) {
  const headers = { 'Cache-Control':'no-store' };
  if (!env.KITCHEN_SCHEDULER_SECRET || request.headers.get('Authorization') !== `Bearer ${env.KITCHEN_SCHEDULER_SECRET}`) {
    return Response.json({ error:'Unauthorized' }, { status:401, headers });
  }
  if (!env.CAMP_KV) return Response.json({ error:'Missing KV' }, { status:503, headers });
  try {
    const summary = await runReminderJobs(env, { dryRun:new URL(request.url).searchParams.get('dryRun') === '1' });
    return Response.json(summary, { status:summary.failed ? 503 : 200, headers });
  } catch {
    return Response.json({ error:'Reminder status unavailable' }, { status:503, headers });
  }
}
