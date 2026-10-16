import test from 'node:test';
import assert from 'node:assert/strict';
import { personDupeKey } from '../functions/lib/personDupe.js';

test('same name and phone map to the same key regardless of phone format', () => {
  const a = personDupeKey('winter', { registrationType: 'individual', name: 'Jaida  Morse', phone: '010-8862-4175' });
  const b = personDupeKey('winter', { registrationType: 'individual', name: 'jaida morse', phone: '01088624175' });
  assert.equal(a, b);
});

test('siblings sharing a parent phone and email are not duplicates', () => {
  const jaida = personDupeKey('winter', { registrationType: 'individual', name: 'Jaida Morse', phone: '010-8862-4175' });
  const carissa = personDupeKey('winter', { registrationType: 'individual', name: 'Carissa Morse', phone: '010-8862-4175' });
  assert.notEqual(jaida, carissa);
});

test('group and staff registrations are never blocked by the person key', () => {
  assert.equal(personDupeKey('winter', { registrationType: 'group', name: 'A', phone: '010-1111-2222' }), null);
  assert.equal(personDupeKey('winter', { registrationType: 'staff', name: 'A', phone: '010-1111-2222' }), null);
});

test('missing name or phone yields no key', () => {
  assert.equal(personDupeKey('winter', { registrationType: 'individual', name: '', phone: '010-1111-2222' }), null);
  assert.equal(personDupeKey('winter', { registrationType: 'individual', name: 'A', phone: '' }), null);
});
