import test from 'node:test';
import assert from 'node:assert/strict';
import * as register from '../functions/api/staff-register.js';
import * as consent from '../functions/api/staff-consent.js';
import * as accept from '../functions/api/admin/staff-accept.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { canAccept, consentSmsText, CAMP_SMS_SENDER_DEFAULT } from '../functions/lib/staffCrew.js';

function setup() {
  const store = new Map();
  const kv = {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
  };
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    sent.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', RESEND_API_KEY: 'r' };
  const waits = [];
  const ctx = request => ({ env, request, waitUntil: p => waits.push(p) });
  const restore = () => { globalThis.fetch = realFetch; };
  return { store, env, sent, ctx, waits, restore };
}

const base = {
  name: '김크루', phone: '010-2222-3333', email: 'crew@example.com', gender: 'female', birthDate: '2010-05-05',
  introduction: '안녕하세요', faithStory: '교회에서', church: '평택교회', cultHistory: 'no', englishAbility: '3', mediaTech: '2',
  previousCamp: 'no', team1: '프로그램', availableCamps: ['2027-wolko-winter'], availableCampNames: ['겨울 월코 영어 캠프'],
};
const post = (url, body, headers = {}) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('크루 지원은 보호자 이름·관계와 휴대폰 또는 이메일이 있어야 한다', async () => {
  const t = setup();
  try {
    const res = await register.onRequestPost(t.ctx(post('https://x/api/staff-register', { ...base, role: 'crew' })));
    assert.equal(res.status, 400);
    const same = await register.onRequestPost(t.ctx(post('https://x/api/staff-register', { ...base, role: 'crew', guardianName: '김엄마', guardianRelation: '모', guardianPhone: base.phone })));
    assert.equal(same.status, 400, '보호자 번호가 지원자 번호와 같으면 안 된다');
  } finally { t.restore(); }
});

test('크루 지원 → 보호자에게 캠프 업무폰으로 문자 · 이메일 → 동의 전에는 수락 불가 → 동의 후 수락', async () => {
  const t = setup();
  try {
    const res = await register.onRequestPost(t.ctx(post('https://x/api/staff-register', {
      ...base, role: 'crew', guardianName: '김엄마', guardianRelation: '모', guardianPhone: '010-4444-5555', guardianEmail: 'mom@example.com',
    })));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.role, 'crew');
    assert.deepEqual(body.consentSent.sort(), ['email', 'sms']);

    const sms = t.sent.find(s => s.url.includes('solapi'));
    assert.equal(sms.body.message.from, CAMP_SMS_SENDER_DEFAULT, '캠프 업무 휴대폰 번호로 발송');
    assert.equal(sms.body.message.to, '01044445555');
    const token = sms.body.message.text.match(/t=([0-9a-f]{48})/)[1];
    assert.ok(t.sent.some(s => s.url.includes('resend') && s.body.to[0] === 'mom@example.com'));

    const regKey = [...t.store.keys()].find(k => k.startsWith('camp:2027-wolko-winter:reg:'));
    const reg = JSON.parse(t.store.get(regKey));
    assert.equal(reg.role, 'crew');
    assert.equal(reg.parentConsent.status, 'pending');
    assert.equal(canAccept(reg), false);

    const adminToken = await createHubSessionToken('secret', 'admin@wolko.org', 'admin');
    const auth = { Authorization: `Bearer ${adminToken}` };
    const blocked = await accept.onRequestPost({ env: t.env, request: post('https://x/api/admin/staff-accept', { action: 'accept', regId: reg.regId, campId: reg.campId }, auth) });
    assert.equal(blocked.status, 409, '보호자 동의 전에는 수락할 수 없다');

    const view = await (await consent.onRequestGet({ env: t.env, request: new Request(`https://x/api/staff-consent?t=${token}`) })).json();
    assert.equal(view.applicantName, '김크루');
    assert.equal(view.status, 'pending');
    assert.equal((await consent.onRequestPost(t.ctx(post('https://x/api/staff-consent', { t: token, agree: true })))).status, 400, '서명(이름)이 없으면 안 된다');
    const agreed = await (await consent.onRequestPost(t.ctx(post('https://x/api/staff-consent', { t: token, agree: true, signerName: '김엄마' })))).json();
    assert.equal(agreed.status, 'agreed');
    assert.equal(JSON.parse(t.store.get(regKey)).parentConsent.signerName, '김엄마');

    const ok = await accept.onRequestPost({ env: t.env, request: post('https://x/api/admin/staff-accept', { action: 'accept', regId: reg.regId, campId: reg.campId }, auth) });
    assert.equal(ok.status, 200);
    assert.equal(JSON.parse(t.store.get(regKey)).accepted, true);
  } finally { t.restore(); }
});

test('스태프(성인)는 보호자 없이 지원 · 바로 수락 가능 · 잘못된 동의 링크는 404', async () => {
  const t = setup();
  try {
    const res = await register.onRequestPost(t.ctx(post('https://x/api/staff-register', { ...base, email: 'adult@example.com', role: 'staff' })));
    assert.equal(res.status, 200);
    assert.ok(!t.sent.some(s => s.url.includes('solapi')), '스태프는 보호자 문자를 보내지 않는다');
    const reg = JSON.parse([...t.store.entries()].find(([k]) => k.startsWith('camp:2027-wolko-winter:reg:'))[1]);
    assert.equal(reg.role, 'staff');
    assert.equal(canAccept(reg), true);
    assert.equal((await consent.onRequestGet({ env: t.env, request: new Request('https://x/api/staff-consent?t=abc') })).status, 404);
  } finally { t.restore(); }
});

test('일반 포탈 멤버는 스태프를 수락할 수 없다', async () => {
  const t = setup();
  try {
    t.store.set('hub:account:member@wolko.org', JSON.stringify({ email: 'member@wolko.org', name: 'm', role: 'counselor', status: 'approved' }));
    t.store.set('camp:c1:reg:r1', JSON.stringify({ regId: 'r1', campId: 'c1', registrationType: 'staff', role: 'staff' }));
    const token = await createHubSessionToken('secret', 'member@wolko.org', 'counselor');
    const res = await accept.onRequestPost({ env: t.env, request: post('https://x/api/admin/staff-accept', { action: 'accept', regId: 'r1', campId: 'c1' }, { Authorization: `Bearer ${token}` }) });
    assert.equal(res.status, 403);
  } finally { t.restore(); }
});

test('보호자 문자에 동의 링크가 들어간다', () => {
  const text = consentSmsText({ applicantName: '김크루', token: 'a'.repeat(48) });
  assert.match(text, /https:\/\/wolko\.org\/camp-register\/consent\/\?t=a{48}/);
});
