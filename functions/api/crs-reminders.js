import { firebaseDatabaseToken } from '../lib/firebaseCrsDatabase.js';
import { listAccounts } from '../lib/hubAccounts.js';
import { overdueChurches, reminderRecipients, reminderKey, deliverReminder } from '../lib/crsReminders.js';

const DATABASE = 'https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app';
const headers = { 'Cache-Control': 'no-store' };

export async function onRequestPost({ request, env }) {
  if (!env.CRS_REMINDER_SECRET || request.headers.get('Authorization') !== `Bearer ${env.CRS_REMINDER_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  if (!env.CAMP_KV || !env.FIREBASE_CRS_SERVICE_ACCOUNT || !env.RESEND_API_KEY) {
    return Response.json({ error: 'Missing reminder server configuration' }, { status: 503, headers });
  }
  try {
    const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
    const db = (path, options = {}) => fetch(`${DATABASE}/${path}.json`, {
      ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    });
    const churchesResponse = await db('churches');
    if (!churchesResponse.ok) throw new Error('Church records unavailable');
    const records = await churchesResponse.json();
    const churches = overdueChurches(Object.entries(records || {}).map(([id, value]) => ({ ...value, id })));
    const recipients = reminderRecipients(await listAccounts(env));
    const from = env.CRS_REMINDER_FROM || 'crs@wolko.org';
    if (!['crs@wolko.org', 'hub@wolko.org'].includes(from)) throw new Error('Invalid CRS reminder sender');
    if (new URL(request.url).searchParams.get('dryRun') === '1') {
      return Response.json({ dryRun: true, overdue: churches.length, recipients: recipients.length, from }, { headers });
    }
    const stateResponse = await db('crsReminderDelivery');
    if (!stateResponse.ok) throw new Error('Delivery records unavailable');
    const state = await stateResponse.json() || {};
    const ledger = {
      async claim(key, value) {
        const path = `crsReminderDelivery/${key}`;
        const existing = await db(path, { headers: { 'X-Firebase-ETag': 'true' } });
        if (!existing.ok) throw new Error('Delivery claim read failed');
        if (await existing.json()) return false;
        const etag = existing.headers.get('etag');
        if (!etag) throw new Error('Delivery claim requires ETag');
        const result = await db(path, { method: 'PUT', headers: { 'if-match': etag }, body: JSON.stringify(value) });
        if (result.status === 412) return false;
        if (!result.ok) throw new Error('Delivery claim failed');
        return true;
      },
      async finish(key, value) {
        const result = await db(`crsReminderDelivery/${key}`, { method: 'PUT', body: JSON.stringify(value) });
        if (!result.ok) throw new Error('Delivery status save failed');
      },
    };
    let sent = 0, attempted = 0, remaining = 0, review = 0;
    for (const church of churches) for (const email of recipients) {
      const key = await reminderKey(church, email);
      if (state[key]) { if (state[key].status !== 'sent') review++; continue; }
      if (attempted >= 10) { remaining++; continue; }
      attempted++;
      const status = await deliverReminder({ church, email, from, ledger, send: async (message, key) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `crs-${key}` },
          body: JSON.stringify(message),
        });
        if (!response.ok) throw new Error(`Reminder provider returned ${response.status}`);
        const data = await response.json();
        if (!data.id) throw new Error('Reminder delivery outcome unknown');
        return data.id;
      } });
      if (status === 'sent') {
        sent++;
        // Keep individual deliveries below the provider's default request rate.
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
    return Response.json({ sent, remaining, review, overdue: churches.length }, { headers });
  } catch (error) {
    console.error('CRS reminders:', error.message);
    return Response.json({ error: 'Reminder job failed; check delivery records before retrying.' }, { status: 502, headers });
  }
}
