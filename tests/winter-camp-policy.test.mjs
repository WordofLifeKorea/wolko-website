import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { WINTER_CAMP_POLICY as policy, usesWinterCampPolicy, winterCampQuote } from '../functions/lib/winterCampPolicy.js';
import { onRequestPost } from '../functions/api/register.js';

const beforeDeadline = '2026-11-05T23:59:59.999+09:00';

test('winter union camp uses the same policy in the card, form and API', async () => {
  assert.equal(usesWinterCampPolicy('2027-unity-winter'), true);
  assert.equal(usesWinterCampPolicy('2026-inland-union'), false);
  const card = JSON.parse(readFileSync(new URL('../src/content/camp_schedules/2027-unity-winter.json', import.meta.url), 'utf8'));
  assert.equal(card.price_ko, '550,000원');
  assert.equal(card.deposit_amount, 50000);
  const { response, store } = await register({ campId: '2027-unity-winter', scholarshipDiscounts: { james_memory: 1, excellent_camper: 1 }, scholarshipDiscountDetails: { bestCamperEligible: true } });
  assert.equal(response.status, 200);
  const reg = JSON.parse([...store.entries()].find(([key]) => key.includes(':reg:'))[1]);
  assert.equal(reg.campFeeBase, 550000);
  assert.equal(reg.depositAmount, 50000);
  assert.equal(reg.campFeeFinal, 350000);
  assert.equal(reg.scholarshipDeferredReward, 100000);
  assert.equal(reg.scholarshipPolicyVersion, policy.version);
});

test('winter fee, deposit and balance match the new policy', () => {
  const q = winterCampQuote({}, 1, beforeDeadline);
  assert.equal(q.campFeeBase, 550000);
  assert.equal(q.depositAmount, 50000);
  assert.equal(q.campFeeFinal - q.depositAmount, 500000);
});

test('Early Bird ends at Korean midnight and applies equally to groups', () => {
  assert.equal(winterCampQuote({ early_bird: 3 }, 3, beforeDeadline).scholarshipDiscountAmount, 150000);
  assert.throws(() => winterCampQuote({ early_bird: 1 }, 1, '2026-11-06T00:00:00+09:00'), /기한/);
});

test('memorization reward is deferred, never subtracted from payment', () => {
  const q = winterCampQuote({ james_memory: 1, excellent_camper: 1 });
  assert.equal(q.scholarshipDiscountAmount, 200000);
  assert.equal(q.campFeeFinal, 350000);
  assert.equal(q.scholarshipDeferredReward, 100000);
  assert.equal(q.scholarshipDeferredRewardStatus, 'pending_verification');
  assert.equal(winterCampQuote({ james_memory: 2 }, 2).campFeeFinal, 1100000);
});

test('no more than two categories, including deferred rewards', () => {
  assert.throws(() => winterCampQuote({ early_bird: 1, sibling: 1, james_memory: 1 }, 1, beforeDeadline), /두 항목/);
  assert.throws(() => winterCampQuote({ sibling: 2 }, 1), /인원/);
  assert.throws(() => winterCampQuote({ sibling: -1 }), /인원/);
  assert.throws(() => winterCampQuote({ sibling: 0.5 }), /인원/);
  assert.throws(() => winterCampQuote({ wolbi_syme: 1 }), /지원하지/);
});

async function register(overrides = {}) {
  const store = new Map();
  const env = { CAMP_KV: {
    get: async key => store.get(key) || null,
    put: async (key, value) => store.set(key, value),
  } };
  const background = [];
  const payload = { campId: policy.campId, name: 'Test Camper', phone: '01000000000', email: 'test@example.com', grade: '6', gender: 'male', refundBank: 'test', refundAccount: '123', refundHolder: 'Test', ...overrides };
  const response = await onRequestPost({ env, request: new Request('https://example.com/api/register', { method: 'POST', body: JSON.stringify(payload) }), waitUntil: task => background.push(task) });
  await Promise.all(background);
  return { response, store };
}

test('API stores authoritative pricing, deferred reward and eligibility', async () => {
  const { response, store } = await register({ scholarshipDiscounts: { james_memory: 1, excellent_camper: 1 }, scholarshipDiscountDetails: { bestCamperEligible: true }, campFeeFinal: 1 });
  assert.equal(response.status, 200);
  const reg = JSON.parse([...store.entries()].find(([key]) => key.includes(':reg:'))[1]);
  assert.equal(reg.campFeeFinal, 350000);
  assert.equal(reg.depositAmount, 50000);
  assert.equal(reg.scholarshipDeferredReward, 100000);
  assert.equal(reg.scholarshipDiscountDetails.bestCamperEligible, true);
  assert.equal(reg.scholarshipPolicyVersion, policy.version);
});

test('API rejects unconfirmed Best Camper eligibility and excessive selections', async () => {
  assert.equal((await register({ scholarshipDiscounts: { excellent_camper: 1 } })).response.status, 400);
  assert.equal((await register({ scholarshipDiscounts: { sibling: 1, james_memory: 1, excellent_camper: 1 } })).response.status, 400);
});

test('group registration stores rewards and charges per eligible participant', async () => {
  const { response, store } = await register({ registrationType: 'group', groupCount: 2, participants: [{ name: 'A', gender: 'male' }, { name: 'B', gender: 'female' }], scholarshipDiscounts: { james_memory: 2 } });
  assert.equal(response.status, 200);
  const reg = JSON.parse([...store.entries()].find(([key]) => key.includes(':reg:'))[1]);
  assert.equal(reg.campFeeFinal, 1100000);
  assert.equal(reg.depositAmount, 100000);
  assert.equal(reg.scholarshipDeferredReward, 200000);
});

test('other camps keep their original pricing', async () => {
  const { response, store } = await register({ campId: '2026-inland-english-junior' });
  assert.equal(response.status, 200);
  const reg = JSON.parse([...store.entries()].find(([key]) => key.includes(':reg:'))[1]);
  assert.equal(reg.campFeeFinal, 499000);
  assert.equal(reg.scholarshipPolicyVersion, undefined);
});

test('admin uses original application date for Early Bird and preserves old policies', () => {
  const source = readFileSync(new URL('../functions/api/admin/registrations.js', import.meta.url), 'utf8');
  const fn = source.match(/function winterQuoteForRegistration\(reg, values, spots\) \{[\s\S]*?\n\}/)[0];
  const quoteFor = runInNewContext(`${fn}\nwinterQuoteForRegistration`, { WINTER_CAMP_POLICY: policy, winterCampQuote });
  const reg = { scholarshipPolicyVersion: policy.version, registeredAt: beforeDeadline };
  assert.equal(quoteFor(reg, { early_bird: 1 }, 1).campFeeFinal, 500000);
  assert.throws(() => quoteFor({ ...reg, registeredAt: '2026-11-06T00:00:00+09:00' }, { early_bird: 1 }, 1), /기한/);
  assert.equal(quoteFor({}, {}, 1), null);
  assert.equal(quoteFor(reg, { james_memory: 1 }, 1).scholarshipDeferredReward, 100000);
});

test('registration and admin scripts parse, and admin retains the new policy', () => {
  for (const path of ['src/pages/camp-register/index.astro', 'src/pages/wolkoadmin.astro']) {
    const page = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    for (const [, , script] of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!script.trim()) continue;
      const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: script, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
  }
  const admin = readFileSync(new URL('../functions/api/admin/registrations.js', import.meta.url), 'utf8');
  assert.equal((admin.match(/\.\.\.\(winterQuote \|\| \{\}\)/g) || []).length, 2);
});
