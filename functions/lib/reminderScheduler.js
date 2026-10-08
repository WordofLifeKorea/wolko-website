import { onRequestPost as kitchen } from '../api/kitchen/reminders.js';
import { onRequestPost as drive } from '../api/car/drive-reminders.js';
import { onRequestPost as crs } from '../api/crs-reminders.js';
import { onRequestPost as staffing } from '../api/staffing/weekly-reminder.js';

const handlers = { kitchen, drive, crs, staffing };
export async function runReminderJobs(env, { dryRun = false, now = Date.now(), services = handlers } = {}) {
  const kst = new Date(now + 9 * 3600000);
  const date = kst.toISOString().slice(0, 10);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const jobs = [];
  const definitions = [
    { name:'kitchen', path:'/api/kitchen/reminders', secret:env.KITCHEN_REMINDER_SECRET || env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET || env.KITCHEN_SCHEDULER_SECRET, due:minutes >= 360 && minutes < 1320 },
    { name:'drive', path:'/api/car/drive-reminders', secret:env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET, due:minutes >= 360 && minutes < 1320 },
    { name:'staffing', path:'/api/staffing/weekly-reminder', secret:env.STAFFING_REMINDER_SECRET || env.KITCHEN_REMINDER_SECRET || env.DRIVE_REMINDER_SECRET || env.CRS_REMINDER_SECRET, due:kst.getUTCDay() === 1 && minutes >= 570 && minutes < 1320 },
    { name:'crs', path:'/api/crs-reminders', secret:env.CRS_REMINDER_SECRET || env.KITCHEN_SCHEDULER_SECRET, due:minutes >= 557 && minutes < 1320, daily:true },
  ];
  for (const job of definitions) {
    const base = { name:job.name, sent:0, failed:0 };
    if (!dryRun && !job.due) { jobs.push({ ...base, skipped:'not-due' }); continue; }
    const doneKey = `reminders:daily:${job.name}:${date}`;
    try {
      if (!dryRun && job.daily && await env.CAMP_KV.get(doneKey)) {
        jobs.push({ ...base, skipped:'already-checked' }); continue;
      }
      if (!job.secret) { jobs.push({ ...base, failed:1, status:503 }); continue; }
      const response = await services[job.name]({ env, request:new Request(`https://wolko.org${job.path}${dryRun ? '?dryRun=1' : ''}`, {
        method:'POST', headers:{ Authorization:`Bearer ${job.secret}` },
      }) });
      const result = await response.json();
      const row = { ...base, status:response.status, sent:Number(result.sent || 0),
        failed:response.ok ? (result.results || []).filter(entry => entry.error).length + Number(result.review || 0) : 1,
        remaining:Number(result.remaining || 0),
        ...(result.skipped ? { skipped:result.skipped } : {}) };
      if (!dryRun && job.daily && response.ok && row.remaining === 0) {
        // CRS keeps its atomic per-delivery ledger; ambiguous results remain for review.
        await env.CAMP_KV.put(doneKey, JSON.stringify({ ...row, at:new Date(now).toISOString() }), { expirationTtl:172800 });
      }
      jobs.push(row);
    } catch {
      jobs.push({ ...base, failed:1, status:502 });
    }
  }
  const summary = { date, time:`${String(kst.getUTCHours()).padStart(2,'0')}:${String(kst.getUTCMinutes()).padStart(2,'0')}`,
    dryRun, jobs, sent:jobs.reduce((sum, job) => sum + job.sent, 0), failed:jobs.reduce((sum, job) => sum + job.failed, 0) };
  if (!dryRun) await env.CAMP_KV.put('reminders:run:last', JSON.stringify({ ...summary, at:new Date(now).toISOString() }), { expirationTtl:604800 });
  return summary;
}
