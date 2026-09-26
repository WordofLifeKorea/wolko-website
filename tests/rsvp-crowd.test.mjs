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

test('invitation shows a wandering real-headcount crowd with a quiet hint, no gift boxes/gauge, no numeric status', async () => {
  const page = await readFile(new URL('../src/pages/rsvp/thanksgiving.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /inv-gift|inv-gauge|inv-gathering-title|inv-crowd-status|invGatheringStatus/);
  assert.match(page, /id="invPeople" data-event-id=\{event\.id\} hidden aria-hidden="true"/);
  assert.match(page, /id="invPeopleDolls"/);
  assert.match(page, /inv-people-caption/, 'a subtle caption should explain what the dolls represent');
  assert.match(page, /is-walk-r|is-walk-l/);
  assert.doesNotMatch(page, /left:-8%|left:108%/, 'roaming range must stay on-screen, not run past the edges');
  assert.match(page, /animation-direction:alternate/, 'roamers should bounce back and forth, not teleport');
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /rsvp-crowd\.js\?v=\d+/);
  assert.match(page, /document\.dispatchEvent\(new Event\('rsvp:submitted'\)\)/);
});

test('personMarkup renders one figure with the given palette and a roam direction', () => {
  const html = personMarkup(PALETTES[0], 0);
  assert.match(html, /class="inv-person is-walk-r"/);
  assert.match(html, new RegExp(PALETTES[0].shirt));
  assert.match(html, new RegExp(PALETTES[0].hair));
  assert.match(html, new RegExp(PALETTES[0].pants));

  const oddHtml = personMarkup(PALETTES[1], 1);
  assert.match(oddHtml, /class="inv-person is-walk-l"/);
});

test('renderCrowd caps the visible crowd and clears at zero', () => {
  const container = { innerHTML: '' };
  renderCrowd(container, 4);
  assert.equal((container.innerHTML.match(/class="inv-person is-walk-[rl]"/g) || []).length, 4);

  renderCrowd(container, MAX_VISIBLE + 50);
  assert.equal((container.innerHTML.match(/class="inv-person is-walk-[rl]"/g) || []).length, MAX_VISIBLE);

  renderCrowd(container, 0);
  assert.equal(container.innerHTML, '');
});

test('pickRoles hands out at most one role per person and never more roles than people', () => {
  const identity = () => 0.999999; // Fisher-Yates with this rng leaves index order unchanged
  assert.deepEqual(pickRoles(0, identity), {});
  assert.deepEqual(pickRoles(1, identity), { 0: 'wave' });
  const roles5 = pickRoles(5, identity);
  assert.deepEqual(roles5, { 0: 'wave', 1: 'lookup' });

  const shuffled = pickRoles(2, () => 0); // a different rng still yields exactly 2 distinct roles
  assert.equal(Object.keys(shuffled).length, 2);
  assert.deepEqual(new Set(Object.values(shuffled)), new Set(['wave', 'lookup']));
});

test('the wave hand shares the arm animation class and both are removed together', () => {
  installFakeSvgDocument();
  try {
    const container = { children: [makeMockPerson(), makeMockPerson()] };
    applyRoles(container, { 0: 'wave' });
    const armParts = container.children[0].querySelectorAll('.inv-person-wave-arm');
    assert.equal(armParts.length, 2); // line + hand
    // SVG <g> 그룹은 이 렌더러에서 CSS animation(transform)이 재생되지 않으므로,
    // 손(circle)도 팔(line)과 똑같이 inv-person-arm 애니메이션 클래스를 들고 있어야
    // 같은 각도로 같이 돈다 — 그룹으로 묶어서 하나만 애니메이션하면 손이 멈춰 보인다.
    armParts.forEach(el => assert.equal(el.getAttribute('class').includes('inv-person-arm'), true));

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
    const wrapper = { hidden: true, dataset: { eventId: 'thanksgiving-night' } };
    const dolls = { innerHTML: '' };
    const listeners = {};
    const doc = {
      getElementById: id => ({ invPeople: wrapper, invPeopleDolls: dolls })[id],
      addEventListener: (event, fn) => { listeners[event] = fn; },
    };
    let total = 4;
    const request = async url => {
      assert.equal(url, '/api/rsvp-count?eventId=thanksgiving-night');
      return { ok: true, json: async () => ({ totalGuests: total }) };
    };
    initCrowd(doc, request);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(wrapper.hidden, false);
    assert.equal((dolls.innerHTML.match(/class="inv-person is-walk-[rl]"/g) || []).length, 4);

    total = 0;
    await listeners['rsvp:submitted']();
    assert.equal(wrapper.hidden, true);
    assert.equal(dolls.innerHTML, '');
  } finally {
    delete globalThis.matchMedia;
  }
});
