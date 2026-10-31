import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { normalizePhone } from '../functions/lib/phone.js';
import { onRequestPost as campRegister } from '../functions/api/register.js';
import * as staffRegister from '../functions/api/staff-register.js';

test('흔한 번호 실수는 자동으로 고친다: 빠뜨린 0 · 맨 앞 0 없음 · 전각 숫자', () => {
  for (const input of ['01-7334-7848', '1-7334-7848', '01 7334 7848', '0-7334-7848']) assert.equal(normalizePhone(input), '010-7334-7848', input);
  assert.equal(normalizePhone('10-1234-5678'), '010-1234-5678');
  assert.equal(normalizePhone('０１０-１２３４-５６７８'), '010-1234-5678');
});

test('고칠 근거가 없는 번호는 그대로 둔다', () => {
  assert.equal(normalizePhone('017-334-7848'), '017-334-7848', '옛 017 번호 모양은 진짜 옛 번호일 수 있다');
  assert.equal(normalizePhone('0173347848'), '017-334-7848', '숫자만 붙여 쓴 것은 어디서 0이 빠졌는지 알 수 없다');
  assert.equal(normalizePhone('01-234-5678'), '01-234-5678', '뒤가 8자리가 아니면 고치지 않는다');
  assert.equal(normalizePhone('02-123-4567'), '02-123-4567');
  assert.equal(normalizePhone('+1 (555) 123-4567'), '+15551234567');
});

async function campPost(overrides) {
  const store = new Map();
  const env = { CAMP_KV: { get: async k => store.get(k) || null, put: async (k, v) => store.set(k, v) } };
  const background = [];
  const payload = { campId: '2027-wolko-winter', name: 'Test Camper', phone: '01000000000', email: 'test@example.com', grade: '6', gender: 'male', birthDate: '2013-05-05', refundBank: 'test', refundAccount: '123', refundHolder: 'Test', mediaConsent: 'yes', ...overrides };
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-10-20T12:00:00+09:00');
  let response;
  try {
    response = await campRegister({ env, request: new Request('https://example.com/api/register', { method: 'POST', body: JSON.stringify(payload) }), waitUntil: t => background.push(t) });
  } finally { Date.now = realNow; }
  await Promise.all(background);
  return { response, reg: JSON.parse([...store.entries()].find(([k]) => k.includes(':reg:'))?.[1] || 'null') };
}

test('캠프 신청(개인 · 단체)은 고친 번호로 저장한다', async () => {
  const one = await campPost({ phone: '01-7334-7848' });
  assert.equal(one.response.status, 200);
  assert.equal(one.reg.phone, '010-7334-7848');
  const group = await campPost({ phone: '01-7334-7848', registrationType: 'group', groupCount: 2, organization: 'Test Church', gender: undefined, birthDate: undefined,
    participants: [{ name: 'A', gender: 'male', birthDate: '2013-03-02' }, { name: 'B', gender: 'female', birthDate: '2012-07-15' }] });
  assert.equal(group.response.status, 200);
  assert.equal(group.reg.phone, '010-7334-7848');
});

test('스태프 · 크루 지원도 고친 번호로 저장한다', async () => {
  const store = new Map();
  const env = { CAMP_KV: { get: async (k, type) => { const v = store.get(k); return v == null ? null : (type === 'json' ? JSON.parse(v) : v); }, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k) }, ADMIN_PASSWORD: 'secret' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ ok: true });
  try {
    const body = { role: 'staff', name: '김스태프', phone: '1-2222-3333', email: 'staff@example.com', gender: 'female', birthDate: '2000-05-05',
      introduction: '안녕하세요', faithStory: '교회에서', church: '평택교회', cultHistory: 'no', englishAbility: '3', mediaTech: '2',
      previousCamp: 'no', team1: '프로그램', availableCamps: ['2027-wolko-winter'], availableCampNames: ['겨울 월코 영어 캠프'] };
    const res = await staffRegister.onRequestPost({ env, request: new Request('https://x/api/staff-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), waitUntil: () => {} });
    assert.equal(res.status, 200, await res.clone().text());
    const reg = JSON.parse([...store.entries()].find(([k]) => k.includes(':reg:'))[1]);
    assert.equal(reg.phone, '010-2222-3333');
  } finally { globalThis.fetch = realFetch; }
});

test('신청서 번호 칸도 같은 규칙으로 고치고, 숫자를 고쳤으면 칸 아래에 알려 준다', () => {
  const src = readFileSync(new URL('../public/phone-input.js', import.meta.url), 'utf8');
  const fns = src.slice(src.indexOf('  function fmtKr('), src.indexOf('  function isEn('));
  const ctx = {};
  runInNewContext(fns + '; this.fixKr = fixKr;', ctx);
  for (const input of ['01-7334-7848', '010 7334 7848', '1-7334-7848', '17334-7848'.replace('17334', '1 7334')]) assert.equal(ctx.fixKr(input), '010-7334-7848', input);
  assert.equal(ctx.fixKr('017-334-7848'), '017-334-7848');
  assert.equal(ctx.fixKr('+1 555 123 4567'), null, '해외 번호는 건드리지 않는다');
  assert.match(src, /번호를 ' \+ fixed \+ ' 로 고쳤어요\. 맞는지 확인해 주세요\./);
  assert.match(src, /We corrected the number to /);
  const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  assert.match(page, /phone-input\.js\?v=3/);
});
