import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { WINTER_CAMP_POLICY as policy, usesWinterCampPolicy, winterCampQuote } from '../functions/lib/winterCampPolicy.js';
import { onRequestPost } from '../functions/api/register.js';

const beforeDeadline = '2026-11-04T23:59:59.999+09:00';

test('content schema retains deposits and the modal uses policy deposits after reset', () => {
  const config = readFileSync(new URL('../src/content/config.ts', import.meta.url), 'utf8');
  assert.match(config, /deposit_amount: z\.number\(\)\.int\(\)\.nonnegative\(\)\.optional\(\)/);
  const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  assert.match(page, /if \(winter\) campDepositInput\.value = String\(WINTER_CAMP_POLICY\.deposit\)/);
  assert.match(page, /getElementById\('crpForm'\)\.reset\(\);\s*setWinterScholarshipMode\(\)/);
  assert.match(page, /바로 지난 캠프의 Best Camper 수상자/);
  assert.match(policy.discounts.excellent_camper.note_ko, /바로 직전 캠프의 베스트 캠퍼만/);
});

test('winter union camp uses the same policy in the card, form and API', async () => {
  assert.equal(usesWinterCampPolicy('2027-unity-winter'), true);
  assert.equal(usesWinterCampPolicy('2026-inland-union'), false);
  const card = JSON.parse(readFileSync(new URL('../src/content/camp_schedules/2027-unity-winter.json', import.meta.url), 'utf8'));
  assert.equal(card.price_ko, '추후 공지');
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
  assert.throws(() => winterCampQuote({ early_bird: 1 }, 1, '2026-11-05T00:00:00+09:00'), /기한/);
});

test('memorization reward is deferred, never subtracted from payment', () => {
  const q = winterCampQuote({ james_memory: 1, excellent_camper: 1 });
  assert.equal(q.scholarshipDiscountAmount, 200000);
  assert.equal(q.campFeeFinal, 350000);
  assert.equal(q.scholarshipDeferredReward, 100000);
  assert.equal(q.scholarshipDeferredRewardStatus, 'pending_verification');
  assert.equal(winterCampQuote({ james_memory: 2 }, 2).campFeeFinal, 1100000);
});

test('Best Camper does not count toward the two-option limit', () => {
  assert.equal(winterCampQuote({ early_bird: 1, sibling: 1, excellent_camper: 1 }, 1, beforeDeadline).scholarshipDiscountAmount, 300000);
  assert.throws(() => winterCampQuote({ early_bird: 1, sibling: 1, james_memory: 1, excellent_camper: 1 }, 1, beforeDeadline), /두 항목/);
});

test('no more than two categories, including deferred rewards', () => {
  assert.throws(() => winterCampQuote({ early_bird: 1, sibling: 1, james_memory: 1 }, 1, beforeDeadline), /두 항목/);
  assert.throws(() => winterCampQuote({ sibling: 2 }, 1), /인원/);
  assert.throws(() => winterCampQuote({ sibling: -1 }), /인원/);
  assert.throws(() => winterCampQuote({ sibling: 0.5 }), /인원/);
  assert.throws(() => winterCampQuote({ wolbi_syme: 1 }), /지원하지/);
});

async function register(overrides = {}) {
  const store = new Map(Object.entries(overrides.__seed || {}));
  const env = { CAMP_KV: {
    get: async key => store.get(key) || null,
    put: async (key, value) => store.set(key, value),
  } };
  const background = [];
  const payload = { campId: policy.campId, name: 'Test Camper', phone: '01000000000', email: 'test@example.com', grade: '6', gender: 'male', birthDate: '2013-05-05', refundBank: 'test', refundAccount: '123', refundHolder: 'Test', mediaConsent: 'yes', ...overrides };
  const realNow = Date.now;
  Date.now = () => Date.parse(overrides.__now || '2026-10-20T12:00:00+09:00'); // 기본은 1차 신청창 안
  let response;
  try {
    response = await onRequestPost({ env, request: new Request('https://example.com/api/register', { method: 'POST', body: JSON.stringify(payload) }), waitUntil: task => background.push(task) });
  } finally { Date.now = realNow; }
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
  assert.throws(() => quoteFor({ ...reg, registeredAt: '2026-11-05T00:00:00+09:00' }, { early_bird: 1 }, 1), /기한/);
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

test('winter sibling discount collects names inline and does not require a camp choice', () => {
  const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../functions/api/register.js', import.meta.url), 'utf8');
  assert.match(page, /data-sibling-names/);
  assert.match(page, /!winter && !details\.sibling\.camp/);
  assert.match(api, /campOptional: usesWinterCampPolicy\(campId\)/);
});

import { registrationState, REGISTRATION_WINDOWS } from '../functions/lib/winterCampPolicy.js';

test('winter English camp registration windows: round 1, closed gap, round 2 (all KST)', () => {
  const at = iso => Date.parse(iso);
  const id = '2027-wolko-winter';
  assert.equal(registrationState(id, at('2026-10-15T09:59:59+09:00')).state, 'before');
  assert.equal(registrationState(id, at('2026-10-15T10:00:00+09:00')).state, 'open');
  assert.equal(registrationState(id, at('2026-11-04T23:59:59+09:00')).state, 'open');
  const gap = registrationState(id, at('2026-11-05T00:00:00+09:00'));
  assert.equal(gap.state, 'gap');
  assert.equal(gap.nextOpenAt, new Date(at('2026-11-18T10:00:00+09:00')).toISOString());
  assert.equal(registrationState(id, at('2026-11-17T23:59:59+09:00')).state, 'gap');
  assert.equal(registrationState(id, at('2026-11-18T09:59:59+09:00')).state, 'gap');
  assert.equal(registrationState(id, at('2026-11-18T10:00:00+09:00')).state, 'open');
  assert.equal(registrationState(id, at('2027-01-10T12:00:00+09:00')).state, 'open', '2차는 마감 시각이 없다');
  assert.equal(registrationState('2026-jeju-english', at('2026-11-10T00:00:00+09:00')).state, 'none');
});

test('Jeju Campus Day closes on Oct 21 at 2 PM KST', () => {
  const id = '2026-jeju-campus-day';
  assert.ok(REGISTRATION_WINDOWS[id]);
  assert.equal(registrationState(id, Date.parse('2026-10-21T13:59:59+09:00')).state, 'open');
  const closed = registrationState(id, Date.parse('2026-10-21T14:00:01+09:00'));
  assert.equal(closed.state, 'gap');
  assert.equal(closed.nextOpenAt, null);
});

test('API refuses to register outside the winter English camp registration window', async () => {
  const { response } = await register({ campId: '2027-wolko-winter', __now: '2026-11-10T12:00:00+09:00' });
  assert.equal(response.status, 403);
  const early = await register({ campId: '2027-wolko-winter', __now: '2026-10-14T12:00:00+09:00' });
  assert.equal(early.response.status, 403);
  const open = await register({ campId: '2027-wolko-winter', __now: '2026-11-18T10:00:01+09:00' });
  assert.equal(open.response.status, 200);
});

test('individual registration for the winter English camp checks the birth year range', async () => {
  const ok = await register({ campId: '2027-wolko-winter', birthDate: '2015-12-31' });
  assert.equal(ok.response.status, 200);
  const stored = JSON.parse([...ok.store.entries()].find(([key]) => key.includes(':reg:'))[1]);
  assert.equal(stored.birthDate, '2015-12-31');
  assert.equal((await register({ campId: '2027-wolko-winter', birthDate: '2011-01-01' })).response.status, 200);
  const young = await register({ campId: '2027-wolko-winter', birthDate: '2016-01-01' });
  assert.equal(young.response.status, 400);
  assert.equal((await young.response.json()).code, 'age-out-of-range');
  const old = await register({ campId: '2027-wolko-winter', birthDate: '2010-12-31' });
  assert.equal(old.response.status, 400);
  const missing = await register({ campId: '2027-wolko-winter', birthDate: '' });
  assert.equal(missing.response.status, 400);
  assert.equal((await missing.response.json()).code, 'birth-required');
  assert.equal((await register({ campId: '2027-wolko-winter', birthDate: '2013-02-30' })).response.status, 400, '없는 날짜');
});

import { birthYearCheck } from '../functions/lib/winterCampPolicy.js';
test('birthYearCheck only applies to camps with an age range', () => {
  assert.equal(birthYearCheck('2026-jeju-english', '1990-01-01').ok, true);
  assert.equal(birthYearCheck('2027-wolko-winter', '2013-06-15').ok, true);
  assert.equal(birthYearCheck('2027-wolko-winter', '2009-06-15').reason, 'out-of-range');
  assert.equal(birthYearCheck('2027-wolko-winter', 'abc').reason, 'invalid');
});

const WINTER = '2027-wolko-winter';
const seed = (male, female) => ({
  [`camp:${WINTER}:submissions`]: String(male + female),
  [`camp:${WINTER}:submissions:male`]: String(male),
  [`camp:${WINTER}:submissions:female`]: String(female),
});
const regOf = store => JSON.parse([...store.entries()].find(([key]) => key.includes(':reg:'))[1]);

test('gender capacity: 25 + 25 confirmed, then 5 + 5 waitlist per gender, then that gender is closed', async () => {
  const open = await register({ campId: WINTER, gender: 'male', __seed: seed(24, 25) });
  assert.equal(open.response.status, 200);
  assert.equal(regOf(open.store).isWaitlist, false, '남학생 25번째까지는 정상 접수');

  const first = await register({ campId: WINTER, gender: 'male', __seed: seed(25, 10) });
  assert.equal(first.response.status, 200);
  assert.equal(regOf(first.store).isWaitlist, true);
  assert.equal(regOf(first.store).waitlistNumber, 1, '남학생 예비 1번');

  const fifth = await register({ campId: WINTER, gender: 'male', __seed: seed(29, 10) });
  assert.equal(regOf(fifth.store).waitlistNumber, 5);

  const closed = await register({ campId: WINTER, gender: 'male', __seed: seed(30, 10) });
  assert.equal(closed.response.status, 409);
  assert.equal((await closed.response.json()).code, 'male-full');

  const girlStillOpen = await register({ campId: WINTER, gender: 'female', __seed: seed(30, 10) });
  assert.equal(girlStillOpen.response.status, 200, '남학생이 마감돼도 여학생은 계속 접수');
  assert.equal(regOf(girlStillOpen.store).isWaitlist, false);

  const girlClosed = await register({ campId: WINTER, gender: 'female', __seed: seed(10, 30) });
  assert.equal(girlClosed.response.status, 409);
  assert.equal((await girlClosed.response.json()).code, 'female-full');
});

import { GENDER_CAPACITY } from '../functions/lib/winterCampPolicy.js';
test('camp card data matches the server-side gender capacity', () => {
  const card = JSON.parse(readFileSync(new URL('../src/content/camp_schedules/2027-wolko-winter.json', import.meta.url), 'utf8'));
  assert.equal(card.capacity_male, GENDER_CAPACITY[WINTER].male);
  assert.equal(card.capacity_female, GENDER_CAPACITY[WINTER].female);
  assert.equal(card.capacity, GENDER_CAPACITY[WINTER].male + GENDER_CAPACITY[WINTER].female);
});

test('registration requires an explicit photo/video sharing choice and stores it', async () => {
  const mod = await import('../functions/api/register.js');
  const src = (await import('node:fs')).readFileSync(new URL('../functions/api/register.js', import.meta.url), 'utf8');
  assert.ok(mod.onRequestPost);
  assert.match(src, /mediaConsent !== 'yes' && mediaConsent !== 'no'/);
  const page = (await import('node:fs')).readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  assert.match(page, /name="mediaConsent"/);
  assert.match(page, /crpMediaWarning/);
});
