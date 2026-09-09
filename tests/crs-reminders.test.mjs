import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { overdueChurches, lastActivity, activityDays, lastVisitAt, visitDays } from '../public/crs-reminders.js';
import { reminderRecipients, reminderKey, reminderMessage, deliverReminder } from '../functions/lib/crsReminders.js';
import { onRequestPost } from '../functions/api/crs-reminders.js';

const DAY = 86400000, now = Date.parse('2026-09-09T00:00:00Z');
const church = { id: 'c1', churchName: '테스트교회', updatedAt: now - 180 * DAY };
const overdue = overdueChurches([church], now)[0];

test('visit counter ignores edits and recording timestamps', () => {
  const record = { updatedAt:now, createdAt:now, lastVisitDate:'2026-06-01',
    visits:{a:{date:'2026-06-10',recordedAt:now}}, steps:{1:[{date:'2026-09-09'}]} };
  assert.equal(lastVisitAt(record),Date.parse('2026-06-10'));
  assert.equal(visitDays(record,now),91);
  assert.equal(visitDays({updatedAt:now,createdAt:now},now),null);
  assert.equal(visitDays({visitDate:'2026-09-01'},now),8);
});
test('visit counter advances at Korean midnight and handles today/future dates', () => {
  const record={lastVisitDate:'2026-09-09'};
  assert.equal(visitDays(record,Date.parse('2026-09-09T23:59:00+09:00')),0);
  assert.equal(visitDays(record,Date.parse('2026-09-10T00:01:00+09:00')),1);
  assert.equal(visitDays({lastVisitDate:'2026-09-10'},now),-1);
});

test('180-day inclusive boundary; invalid/missing/future timestamps excluded', () => {
  const data = [church, { ...church, id:'recent', updatedAt: now-180*DAY+1 },
    { id:'missing' }, { id:'invalid', updatedAt:'bad' }, { id:'future', updatedAt:now+DAY }];
  assert.deepEqual(overdueChurches(data, now).map(c => c.id), ['c1']);
});
test('new visits and legacy visit dates clear old update warnings', () => {
  assert.equal(overdueChurches([{ ...church, visits:{ v:{ date:'2026-09-08', recordedAt:now } } }], now).length, 0);
  assert.equal(lastActivity({ ...church, visitDate:'2026-09-08' }), Date.parse('2026-09-08'));
  assert.equal(lastActivity({ createdAt:now, visits:{ removed:null } }), now);
});
test('D-Day supports ISO and numeric-string dates without resetting stored dates', () => {
  for (const updatedAt of [now-12*DAY, String(now-12*DAY), new Date(now-12*DAY).toISOString()]) {
    assert.equal(activityDays({updatedAt}, now),12);
  }
  assert.equal(activityDays({lastVisitDate:'2026-09-01'}, now),8);
  assert.equal(activityDays({createdAt:now-5*DAY}, now),5);
  assert.equal(activityDays({steps:{1:[{date:'2026-09-02'}],2:true}},now),7);
  assert.equal(activityDays({updatedAt:'invalid'},now),null);
  assert.equal(activityDays({},now),null);
  assert.equal(activityDays({updatedAt:now+DAY},now),0);
});
test('approved accounts only, deduplicated and normalized', () => {
  assert.deepEqual(reminderRecipients([{status:'approved',email:' A@wol.org '}, {status:'approved',email:'a@wol.org'},
    {status:'pending',email:'b@wol.org'}, {status:'rejected',email:'c@wol.org'}, {status:'approved',email:'bad\r\n@wol.org'}]), ['a@wol.org']);
});
test('delivery key changes after activity or for another recipient', async () => {
  const key = await reminderKey(overdue, 'a@wol.org');
  assert.notEqual(key, await reminderKey({...overdue,activityAt:now}, 'a@wol.org'));
  assert.notEqual(key, await reminderKey(overdue, 'b@wol.org'));
});
function memoryLedger() {
  const records = new Map();
  return { records, async claim(key, value) { if(records.has(key)) return false; records.set(key,value); return true; },
    async finish(key,value) { records.set(key,value); } };
}
test('concurrent and repeated runs send once', async () => {
  const ledger=memoryLedger(); let sent=0;
  const run=()=>deliverReminder({church:overdue,email:'a@wol.org',ledger,send:async()=>{sent++;return 'mail1';}});
  await Promise.all([run(),run()]); await run();
  assert.equal(sent,1); assert.equal([...ledger.records.values()][0].status,'sent');
});
test('unknown delivery is flagged, not blindly retried', async () => {
  const ledger=memoryLedger(); let calls=0;
  const run=()=>deliverReminder({church:overdue,email:'a@wol.org',ledger,send:async()=>{calls++;throw new Error('timeout');}});
  await assert.rejects(run(),/timeout/); assert.equal(await run(),'skipped');
  assert.equal(calls,1); assert.equal([...ledger.records.values()][0].status,'review');
});
test('mail has CRS sender, reply-to and one private recipient', () => {
  const mail=reminderMessage(overdue,'a@wol.org');
  assert.equal(mail.from,'WOLKO CRS <crs@wolko.org>'); assert.equal(mail.reply_to,'wolkorea1@gmail.com');
  assert.deepEqual(mail.to,['a@wol.org']); assert.match(mail.text,/테스트교회/);
  assert.equal(reminderMessage(overdue,'a@wol.org','hub@wolko.org').from,'WOLKO CRS <hub@wolko.org>');
});
test('cron endpoint denies missing/wrong secret before any network access', async () => {
  const request=new Request('https://example.com/api/crs-reminders',{method:'POST'});
  assert.equal((await onRequestPost({request,env:{}})).status,401);
  assert.equal((await onRequestPost({request,env:{CRS_REMINDER_SECRET:'secret'}})).status,401);
});
test('cron endpoint reports missing config, no false success', async () => {
  const request=new Request('https://example.com/api/crs-reminders',{method:'POST',headers:{Authorization:'Bearer secret'}});
  assert.equal((await onRequestPost({request,env:{CRS_REMINDER_SECRET:'secret'}})).status,503);
});

test('endpoint dry run, delivery and subsequent run use real ledger flow without real mail', async t => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength:2048, privateKeyEncoding:{type:'pkcs8',format:'pem'}, publicKeyEncoding:{type:'spki',format:'pem'} });
  const state = {};
  const activityAt = Date.now()-181*DAY;
  let sends=0;
  t.mock.method(globalThis, 'fetch', async (url, options={}) => {
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({access_token:'test-token'});
    if (url === 'https://api.resend.com/emails') {
      const message=JSON.parse(options.body);
      assert.equal(message.from,'WOLKO CRS <crs@wolko.org>');
      assert.equal(message.to.length,1);
      assert.match(options.headers['Idempotency-Key'],/^crs-/);
      sends++; return Response.json({id:'test-message'});
    }
    const path = new URL(url).pathname;
    if (path === '/churches.json') return Response.json({c1:{...church,updatedAt:activityAt}});
    if (path === '/crsReminderDelivery.json') return Response.json(state);
    if (path.startsWith('/crsReminderDelivery/')) {
      const key=path.split('/').pop().replace('.json','');
      if (options.method==='PUT') {
        if(options.headers['if-match'] && state[key]) return new Response(null,{status:412});
        state[key]=JSON.parse(options.body); return Response.json(state[key]);
      }
      return Response.json(state[key] || null,{headers:{etag:'"null_etag"'}});
    }
    throw new Error(`Unexpected network request ${url}`);
  });
  const env={CRS_REMINDER_SECRET:'secret',RESEND_API_KEY:'test',FIREBASE_CRS_SERVICE_ACCOUNT:{client_email:'test@example.com',private_key:privateKey},
    CAMP_KV:{list:async()=>({keys:[{name:'account'}],list_complete:true}),get:async()=>({status:'approved',email:'a@wol.org'})}};
  const request=(query='')=>new Request(`https://example.com/api/crs-reminders${query}`,{method:'POST',headers:{Authorization:'Bearer secret'}});
  const dry=await onRequestPost({request:request('?dryRun=1'),env});
  assert.equal(dry.status,200); assert.equal((await dry.json()).dryRun,true); assert.equal(sends,0); assert.equal(Object.keys(state).length,0);
  const first=await onRequestPost({request:request(),env});
  assert.equal(first.status,200); assert.equal((await first.json()).sent,1);
  const second=await onRequestPost({request:request(),env});
  assert.equal((await second.json()).sent,0); assert.equal(sends,1);
});
