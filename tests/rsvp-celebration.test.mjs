import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { celebrationState, initCelebration } from '../public/rsvp-celebration.js';

test('invitation replaces the large counter with decorative gifts and reduced-motion support', async () => {
  const page = await readFile(new URL('../src/pages/rsvp/thanksgiving.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /invCountNumber|inv-count-number/);
  assert.match(page, /id="invGathering" data-event-id=\{event\.id\}/);
  assert.match(page, /class="inv-gifts" aria-hidden="true"/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /rsvp-celebration\.js\?v=1/);
  assert.match(page, /document\.dispatchEvent\(new Event\('rsvp:submitted'\)\)/);
});

test('gifts unlock at visual milestones and the gauge stays bounded', () => {
  assert.deepEqual(celebrationState(0), { total: 0, progress: 0, gifts: 0 });
  assert.deepEqual(celebrationState(4), { total: 4, progress: .08, gifts: 1 });
  assert.equal(celebrationState(10).gifts, 2);
  assert.equal(celebrationState(20).gifts, 3);
  assert.equal(celebrationState(35).gifts, 4);
  assert.deepEqual(celebrationState(120), { total: 120, progress: 1, gifts: 5 });
  for (const invalid of [-1, NaN, Infinity, 'bad']) assert.equal(celebrationState(invalid).total, 0);
});

test('successful counts reveal gifts and a submitted RSVP refreshes the display', async () => {
  const classes = () => ({ values: new Set(), add(key) { this.values.add(key); }, toggle(key, on) { on ? this.values.add(key) : this.values.delete(key); } });
  const gifts = Array.from({ length: 5 }, () => ({ classList: classes() }));
  const box = { hidden: true, dataset: { eventId: 'thanksgiving-night' }, classList: classes(), style: { setProperty() {} }, querySelectorAll: () => gifts };
  const status = { textContent: '' };
  const listeners = {};
  const doc = { getElementById: id => id === 'invGathering' ? box : status, addEventListener: (event, fn) => { listeners[event] = fn; } };
  let total = 4;
  const request = async url => {
    assert.equal(url, '/api/rsvp-count?eventId=thanksgiving-night');
    return { ok: true, json: async () => ({ totalGuests: total }) };
  };
  initCelebration(doc, request);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(box.hidden, false);
  assert.match(status.textContent, /4명/);
  assert.equal(gifts.filter(gift => gift.classList.values.has('is-filled')).length, 1);
  total = 10;
  await listeners['rsvp:submitted']();
  assert.equal(gifts.filter(gift => gift.classList.values.has('is-filled')).length, 2);
  assert.equal(gifts[0].classList.values.has('is-new'), false);
  assert.equal(gifts[1].classList.values.has('is-new'), true);
});
