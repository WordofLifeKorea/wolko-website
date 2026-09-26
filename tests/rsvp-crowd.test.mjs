import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { personMarkup, renderCrowd, pickRoles, applyRoles, initCrowd, PALETTES, MAX_VISIBLE } from '../public/rsvp-crowd.js';

// setRole()이 svg에 실제 DOM 노드(line/circle)를 붙였다 뗐다 하므로, 최소한의 가짜 DOM으로 검증한다.
function makeMockPerson() {
  const classes = new Set();
  const svgChildren = [];
  const svg = {
    appendChild(el) {
      svgChildren.push(el);
      el.remove = () => { const idx = svgChildren.indexOf(el); if (idx >= 0) svgChildren.splice(idx, 1); };
    },
    querySelectorAll(sel) {
      const cls = sel.replace('.', '');
      return svgChildren.filter(el => (el.getAttribute('class') || '').split(' ').includes(cls));
    },
  };
  return {
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      contains: c => classes.has(c),
    },
    querySelector: sel => (sel === 'svg' ? svg : null),
    querySelectorAll: sel => svg.querySelectorAll(sel),
  };
}

function installFakeSvgDocument() {
  globalThis.document = {
    createElementNS: () => {
      const attrs = {};
      return {
        setAttribute: (k, v) => { attrs[k] = String(v); },
        getAttribute: k => attrs[k],
      };
    },
  };
}

test('invitation shows a real-headcount crowd instead of gift boxes and a gauge', async () => {
  const page = await readFile(new URL('../src/pages/rsvp/thanksgiving.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /inv-gift|inv-gauge|inv-gathering-title/);
  assert.match(page, /id="invGathering" data-event-id=\{event\.id\}/);
  assert.match(page, /id="invPeople" aria-hidden="true"/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /rsvp-crowd\.js\?v=\d+/);
  assert.match(page, /document\.dispatchEvent\(new Event\('rsvp:submitted'\)\)/);
});

test('personMarkup renders one figure with the given palette', () => {
  const html = personMarkup(PALETTES[0], 0);
  assert.match(html, /class="inv-person"/);
  assert.match(html, new RegExp(PALETTES[0].shirt));
  assert.match(html, new RegExp(PALETTES[0].hair));
  assert.match(html, new RegExp(PALETTES[0].pants));
});

test('renderCrowd caps the visible crowd and clears at zero', () => {
  const container = { innerHTML: '' };
  renderCrowd(container, 4);
  assert.equal((container.innerHTML.match(/class="inv-person"/g) || []).length, 4);

  renderCrowd(container, MAX_VISIBLE + 50);
  assert.equal((container.innerHTML.match(/class="inv-person"/g) || []).length, MAX_VISIBLE);

  renderCrowd(container, 0);
  assert.equal(container.innerHTML, '');
});

test('pickRoles hands out at most one role per person and never more roles than people', () => {
  const identity = () => 0.999999; // Fisher-Yates with this rng leaves index order unchanged
  assert.deepEqual(pickRoles(0, identity), {});
  assert.deepEqual(pickRoles(1, identity), { 0: 'wave' });
  assert.deepEqual(pickRoles(2, identity), { 0: 'wave', 1: 'lookup' });
  const roles5 = pickRoles(5, identity);
  assert.equal(Object.keys(roles5).length, 3);
  assert.equal(new Set(Object.values(roles5)).size, 3); // wave/lookup/walk all distinct

  const shuffled = pickRoles(3, () => 0); // a different rng still yields exactly 3 distinct roles
  assert.equal(Object.keys(shuffled).length, 3);
  assert.deepEqual(new Set(Object.values(shuffled)), new Set(['wave', 'lookup', 'walk']));
});

test('moving the wave role off a person removes both the arm and the hand dot', () => {
  installFakeSvgDocument();
  try {
    const container = { children: [makeMockPerson(), makeMockPerson()] };
    applyRoles(container, { 0: 'wave' });
    assert.equal(container.children[0].querySelectorAll('.inv-person-wave-arm').length, 2); // line + hand

    applyRoles(container, { 1: 'wave' }); // role moves to the other person
    assert.equal(container.children[0].querySelectorAll('.inv-person-wave-arm').length, 0, 'no leftover dot on the old waver');
    assert.equal(container.children[1].querySelectorAll('.inv-person-wave-arm').length, 2);
  } finally {
    delete globalThis.document;
  }
});

test('successful counts populate the crowd and a submitted RSVP refreshes it', async () => {
  globalThis.matchMedia = () => ({ matches: true }); // reduced-motion path: skip role rotation, no DOM needed for it
  try {
    const box = { hidden: true, dataset: { eventId: 'thanksgiving-night' } };
    const people = { innerHTML: '' };
    const status = { textContent: '' };
    const listeners = {};
    const doc = {
      getElementById: id => ({ invGathering: box, invPeople: people, invGatheringStatus: status })[id],
      addEventListener: (event, fn) => { listeners[event] = fn; },
    };
    let total = 4;
    const request = async url => {
      assert.equal(url, '/api/rsvp-count?eventId=thanksgiving-night');
      return { ok: true, json: async () => ({ totalGuests: total }) };
    };
    initCrowd(doc, request);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(box.hidden, false);
    assert.match(status.textContent, /4명/);
    assert.equal((people.innerHTML.match(/class="inv-person"/g) || []).length, 4);

    total = 0;
    await listeners['rsvp:submitted']();
    assert.equal(status.textContent, '가장 먼저 함께해 주세요');
    assert.equal(people.innerHTML, '');
  } finally {
    delete globalThis.matchMedia;
  }
});
