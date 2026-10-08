import assert from 'node:assert/strict';
import test from 'node:test';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { FLOWS, onRequestGet, onRequestPost } from '../functions/api/portal/notify-check.js';

function envWith(extra = {}) {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'test-secret',
    CAMP_KV: { async get(k, type) { const v = values.get(k) ?? null; return v && type === 'json' ? JSON.parse(v) : v; }, async put(k, v) { values.set(k, v); } },
    ...extra,
  };
}
const req = (token, body) => new Request('https://example.com/api/portal/notify-check', {
  method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
});

test('only the master account can see settings or send test messages', async () => {
  const env = envWith({ SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', KAKAO_PF_ID: 'pf', KAKAO_TEMPLATE_STAFF: 't' });
  await env.CAMP_KV.put('hub:account:other@wol.org', JSON.stringify({ email: 'other@wol.org', name: 'x', status: 'approved' }));
  const member = await createHubSessionToken(env.ADMIN_PASSWORD, 'other@wol.org', 'admin');
  assert.equal((await onRequestGet({ env, request: req('bad') })).status, 401);
  assert.equal((await onRequestGet({ env, request: req(member) })).status, 403);
  assert.equal((await onRequestPost({ env, request: req(member, { flow: 'staff', phone: '01012345678' }) })).status, 403);
});

test('GET reports presence only and never leaks configuration values', async () => {
  const env = envWith({ SOLAPI_API_KEY: 'SECRET-KEY-VALUE', KAKAO_PF_ID: 'pf-value', KAKAO_TEMPLATE_STAFF: 'TPL-VALUE' });
  const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
  const response = await onRequestGet({ env, request: req(master) });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /SECRET-KEY-VALUE|pf-value|TPL-VALUE/);
  const data = JSON.parse(text);
  assert.equal(data.common.solapiKey, true);
  assert.equal(data.common.solapiSecret, false);
  assert.equal(data.flows.find(f => f.id === 'staff').templateSet, true);
  assert.equal(data.flows.find(f => f.id === 'kitchen').templateSet, false);
});

test('POST validates the phone and missing template, and sends one alimtalk to that number only', async () => {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ groupInfo: { _id: 'G1' } }), { status: 200 }); };
  try {
    const env = envWith({ SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', KAKAO_PF_ID: 'pf', KAKAO_TEMPLATE_STAFF: 'TPL' });
    const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
    assert.equal((await onRequestPost({ env, request: req(master, { flow: 'nope', phone: '01012345678' }) })).status, 400);
    assert.equal((await onRequestPost({ env, request: req(master, { flow: 'staff', phone: '123' }) })).status, 400);
    assert.equal((await onRequestPost({ env, request: req(master, { flow: 'kitchen', phone: '01012345678' }) })).status, 503);
    const ok = await onRequestPost({ env, request: req(master, { flow: 'staff', phone: '010-1234-5678' }) });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).solapiGroupId, 'G1');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.message.to, '01012345678');
    assert.equal(sent[0].body.message.kakaoOptions.templateId, 'TPL');
    assert.ok(Object.keys(FLOWS).length >= 9);
  } finally { globalThis.fetch = realFetch; }
});

test('sms check sends a plain SMS from the sender number and needs no Kakao channel', async () => {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ groupInfo: { _id: 'S1' } }), { status: 200 }); };
  try {
    const env = envWith({ SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '010-1111-2222' });
    const master = await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master');
    const response = await onRequestPost({ env, request: req(master, { flow: 'sms', phone: '01099998888' }) });
    assert.equal(response.status, 200);
    assert.equal(sent[0].message.from, '01011112222');
    assert.equal(sent[0].message.to, '01099998888');
    assert.equal(sent[0].message.kakaoOptions, undefined);
  } finally { globalThis.fetch = realFetch; }
});
