import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePhone, toSolapiNumber } from '../functions/lib/phone.js';
import { sendKakaoWithSmsFallback } from '../functions/lib/solapi.js';

test('Korean mobile numbers always become 010-0000-0000', () => {
  for (const input of ['+8210-1234-5678', '+82 10 1234 5678', '8210 1234 5678', '+82 (0)10-1234-5678', '0082 10 1234 5678', '01012345678', '010 1234 5678', '(010)1234-5678']) {
    assert.equal(normalizePhone(input), '010-1234-5678', input);
  }
  assert.equal(normalizePhone('010-123-4567'), '010-123-4567');
});

test('international and unknown numbers are kept recognisable, empty stays empty', () => {
  assert.equal(normalizePhone('+1 (555) 123-4567'), '+15551234567');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone(null), '');
  assert.equal(normalizePhone('02-123-4567'), '02-123-4567');
});

test('Solapi receives the domestic digits even when the saved number is +82', async () => {
  assert.equal(toSolapiNumber('+8210-1234-5678'), '01012345678');
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); };
  try {
    const env = { SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER_PHONE: '010-9999-8888', KAKAO_PF_ID: 'pf' };
    assert.equal(await sendKakaoWithSmsFallback(env, '+82 10 1234 5678', 'TPL', { '#{담당자}': 'x' }, 'fallback'), 'kakao');
    assert.equal(sent[0].message.to, '01012345678');
  } finally { globalThis.fetch = realFetch; }
});
