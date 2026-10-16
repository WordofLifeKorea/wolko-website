import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../functions/api/admin/registrations.js', import.meta.url), 'utf8');
const grab = name => {
  const start = source.indexOf(`function ${name}(`);
  const from = source.lastIndexOf('\n', start) + 1;
  return source.slice(from, source.indexOf('\n}', start) + 2);
};
const code = ['isFinalConfirmed', 'countsTowardGauge', 'registrationSpots', 'syncConfirmedCounters'].map(grab).join('\n');
const sync = runInNewContext(`${code}\nsyncConfirmedCounters`);

const person = (status, gender, extra = {}) => ({ registrationType: 'individual', status, gender, ...extra });

test('homepage gauge counts registrations once the deposit is verified, not only after final confirmation', async () => {
  const store = new Map();
  const env = { CAMP_KV: { put: async (k, v) => { store.set(k, v); } } };
  const counts = await sync(env, 'camp-1', [
    person('pending', 'male'),
    person('deposit', 'male'),
    person('deposit', 'female'),
    person('confirmed', 'female'),
    person(undefined, 'male', { confirmed: true }), // legacy confirmed record
    person(undefined, 'female', { confirmed: false }), // legacy unconfirmed record
    { registrationType: 'staff', status: 'deposit' },
  ]);
  assert.deepEqual({ ...counts }, { count: 4, countMale: 2, countFemale: 2 });
  assert.equal(store.get('camp:camp-1:count'), '4');
  assert.equal(store.get('camp:camp-1:count:male'), '2');
  assert.equal(store.get('camp:camp-1:count:female'), '2');
});

test('group registrations count each named participant once the deposit is verified', async () => {
  const env = { CAMP_KV: { put: async () => {} } };
  const counts = await sync(env, 'camp-1', [
    { registrationType: 'group', status: 'deposit', participants: [{ name: 'A', gender: 'male' }, { name: 'B', gender: 'female' }, { name: '', gender: 'male' }] },
    { registrationType: 'group', status: 'pending', participants: [{ name: 'C', gender: 'male' }] },
  ]);
  assert.deepEqual({ ...counts }, { count: 2, countMale: 1, countFemale: 1 });
});
