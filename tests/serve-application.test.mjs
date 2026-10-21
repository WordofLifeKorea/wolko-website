import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as C from '../functions/api/contact.js';
import * as I from '../functions/api/portal/serve-inquiries.js';
import * as A from '../functions/api/portal/serve-applications.js';
import { missingRequired, cleanApplicationValues, sealSensitive, openSensitive } from '../functions/lib/serveApplication.js';
import { SERVE_APPLICATION_FIELDS } from '../functions/lib/serveApplicationSchema.js';

const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

function setup(extraEnv = {}) {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x', ...extraEnv };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  const acc = email => kv.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role: 'counselor', status: 'approved' }));
  const call = async (mod, method, who, { query = '', body } = {}) => {
    const req = new Request('https://t.co/api/portal/x' + query, { method, headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const fn = { GET: mod.onRequestGet, POST: mod.onRequestPost, PUT: mod.onRequestPut, PATCH: mod.onRequestPatch, DELETE: mod.onRequestDelete }[method];
    const res = await fn({ env, request: req });
    return { ...(await res.json()), status: res.status };
  };
  // 영어 문의를 하나 접수하고 "인터뷰 진행 승인"까지
  const approvedInquiry = async (lang = 'en') => {
    const tasks = [];
    await C.onRequestPost({ env, request: new Request('https://t.co/api/contact', { method: 'POST', body: JSON.stringify(lang === 'en'
      ? { type: 'serve', name: 'Anna Lee', email: 'anna@x.com', phone: '01012345678', message: 'I would like to serve at WOLKO as a camp counselor next summer.' }
      : { type: 'serve', name: '김철수', email: 'cs@x.com', phone: '01099998888', message: '월코에서 섬기고 싶습니다. 인터뷰 부탁드립니다.' }) }), waitUntil: t => tasks.push(t) });
    const id = (await call(I, 'GET', master)).inquiries.find(i => i.lang === lang).id;
    await call(I, 'PATCH', master, { body: { id, action: 'interview' } });
    return id;
  };
  return { env, store, acc, call, approvedInquiry, restore: () => { globalThis.fetch = realFetch; } };
}
const master = ['admin@wolko.org', 'master'];
const estelle = ['esooy@wol.org', 'counselor'];
const ella = ['hlim@wol.org', 'counselor'];
const other = ['other@wol.org', 'counselor'];

const FULL = {
  prefix: 'Ms.', firstName: 'Anna', lastName: 'Lee', gender: 'female', birthDate: '1995-04-12', phone: '010-1234-5678', email: 'anna@x.com',
  maritalStatus: 'single', divorced: 'yes', divorcedNote: 'SECRET-DIVORCE-NOTE', criminal: 'no', abuse: 'no', hasChildren: 'no', occupation: 'Teacher', heardFrom: 'friend',
  spiritualHabits: 'daily', testimony: 'My testimony', serviceHistory: 'youth group', gifts: 'teaching', servingWays: 'camp', education: 'BA',
  health: 'SECRET-HEALTH', allergies: 'SECRET-PEANUT',
  ref1FirstName: 'Paul', ref1LastName: 'Kim', ref1NameKo: '김바울', ref1Relationship: 'Pastor', ref1Email: 'p@x.com', ref1Phone: '010', ref1Years: '5',
  ref2FirstName: 'Mary', ref2LastName: 'Park', ref2NameKo: '박마리아', ref2Relationship: 'Friend', ref2Email: 'm@x.com', ref2Phone: '010', ref2Years: '3',
  consent: true,
};

test('신청서 정의: 필수 항목 검사는 보이는 항목만, 선택값·길이는 정리한다', () => {
  assert.ok(missingRequired({}).includes('firstName'));
  assert.deepEqual(missingRequired(FULL), []);
  // divorced=no 이면 설명 칸은 검사하지 않고, 이메일 형식은 확인한다
  assert.ok(missingRequired({ ...FULL, email: 'bad' }).includes('email'));
  assert.ok(missingRequired({ ...FULL, consent: false }).includes('consent'));
  const clean = cleanApplicationValues({ gender: 'alien', birthDate: 'tomorrow', firstName: 'x'.repeat(500), bogus: 'z', consent: 'true' });
  assert.equal(clean.gender, undefined);
  assert.equal(clean.birthDate, undefined);
  assert.equal(clean.firstName.length, 80);
  assert.equal(clean.bogus, undefined);
  assert.equal(clean.consent, true);
});

test('민감 항목 암호화: 키가 있으면 평문이 저장되지 않고 복호화되며, 키가 없으면 열 수 없다', async () => {
  const sealed = await sealSensitive({ SERVE_APP_KEY: KEY }, { health: 'SECRET-HEALTH' });
  assert.equal(sealed.enc, true);
  assert.ok(!JSON.stringify(sealed).includes('SECRET-HEALTH'));
  assert.deepEqual(await openSensitive({ SERVE_APP_KEY: KEY }, sealed), { health: 'SECRET-HEALTH' });
  await assert.rejects(() => openSensitive({}, sealed), /SERVE_APP_KEY/);
  const plain = await sealSensitive({}, { health: 'x' });
  assert.equal(plain.enc, false);
  assert.deepEqual(await openSensitive({}, plain), { health: 'x' });
});

test('신청서 흐름: 승인된 문의로만 생성 · 문의 정보 미리 채움 · 민감 항목 분리 저장(암호화) · 제출 검사 · 열람 기록', async () => {
  const t = setup({ SERVE_APP_KEY: KEY });
  try {
    await t.acc('esooy@wol.org'); await t.acc('hlim@wol.org'); await t.acc('other@wol.org');
    const inquiryId = await t.approvedInquiry('en');
    const made = await t.call(A, 'POST', estelle, { body: { inquiryId } });
    assert.equal(made.status, 200);
    const id = made.application.id;
    assert.equal((await t.call(A, 'POST', estelle, { body: { inquiryId } })).existing, true, '이미 있으면 같은 신청서');
    const first = await t.call(A, 'GET', estelle, { query: `?id=${id}` });
    assert.equal(first.application.values.firstName, 'Anna');
    assert.equal(first.application.values.email, 'anna@x.com');
    assert.equal(first.application.values.phone, '010-1234-5678');
    // 저장: 일반 항목은 serve:app, 민감 항목은 serve:appsens(암호화)
    assert.equal((await t.call(A, 'PUT', estelle, { body: { id, values: FULL } })).status, 200);
    const general = t.store.get(`serve:app:${id}`);
    assert.ok(!general.includes('SECRET-'), '일반 저장소에 민감 값이 없다');
    assert.ok(general.includes('Teacher'));
    const sens = t.store.get(`serve:appsens:${id}`);
    assert.ok(!sens.includes('SECRET-'), '민감 저장소도 암호화되어 평문이 없다');
    // 불러오면 합쳐서 복호화
    const loaded = await t.call(A, 'GET', estelle, { query: `?id=${id}` });
    assert.equal(loaded.application.values.health, 'SECRET-HEALTH');
    assert.equal(loaded.application.values.divorcedNote, 'SECRET-DIVORCE-NOTE');
    // 권한: 다른 직원·다른 언어 담당자는 못 연다, 목록에는 자기 것만
    assert.equal((await t.call(A, 'GET', other, { query: `?id=${id}` })).status, 403);
    assert.equal((await t.call(A, 'GET', ella, { query: `?id=${id}` })).status, 403);
    assert.equal((await t.call(A, 'GET', ella)).applications.length, 0);
    assert.equal((await t.call(A, 'GET', estelle)).applications.length, 1);
    assert.equal((await t.call(A, 'GET', master)).applications.length, 1);
    // 목록 응답에는 입력값이 없다
    assert.ok(!JSON.stringify(await t.call(A, 'GET', master)).includes('Teacher'));
    // 제출: 필수 항목이 비면 거절, 채우면 제출
    assert.equal((await t.call(A, 'PUT', estelle, { body: { id, values: { occupation: '' }, submit: true } })).status, 400);
    const sub = await t.call(A, 'PUT', estelle, { body: { id, values: { occupation: 'Teacher' }, submit: true } });
    assert.equal(sub.status, 200); assert.equal(sub.appStatus, 'submitted');
    // 열람 기록: 같은 사람의 연속 열람은 한 번만
    await t.call(A, 'GET', estelle, { query: `?id=${id}` }); await t.call(A, 'GET', estelle, { query: `?id=${id}` });
    const audit = (await t.call(A, 'GET', master, { query: `?id=${id}&export=1` })).application.audit;
    assert.equal(audit.filter(a => a.by === 'esooy@wol.org' && a.action === 'view').length, 1);
    assert.ok(audit.some(a => a.action === 'submit'));
    assert.ok(audit.some(a => a.by === 'admin@wolko.org' && a.action === 'export'));
    assert.ok(!JSON.stringify(audit).includes('SECRET-'), '열람 기록에 민감 값이 없다');
  } finally { t.restore(); }
});

test('신청서 결정: 승인·보류·거절 · 다시 열기 · 결정 후 수정 불가 · 삭제는 마스터만 · 12개월 지난 거절/보류는 자동 삭제', async () => {
  const t = setup();
  try {
    await t.acc('esooy@wol.org');
    const inquiryId = await t.approvedInquiry('en');
    const id = (await t.call(A, 'POST', estelle, { body: { inquiryId } })).application.id;
    assert.equal((await t.call(A, 'PATCH', estelle, { body: { id, action: 'decide', status: 'approved' } })).status, 409, '제출 전에는 결정할 수 없다');
    await t.call(A, 'PUT', estelle, { body: { id, values: FULL, submit: true } });
    const rejected = await t.call(A, 'PATCH', estelle, { body: { id, action: 'decide', status: 'rejected', note: '시기 부적합' } });
    assert.equal(rejected.application.status, 'rejected');
    assert.equal((await t.call(A, 'PUT', estelle, { body: { id, values: { occupation: 'x' } } })).status, 409);
    assert.equal((await t.call(A, 'PATCH', estelle, { body: { id, action: 'reopen' } })).application.status, 'submitted');
    assert.equal((await t.call(A, 'PATCH', estelle, { body: { id, action: 'decide', status: 'approved' } })).application.status, 'approved');
    // 삭제는 마스터만
    assert.equal((await t.call(A, 'DELETE', estelle, { query: `?id=${id}` })).status, 403);
    // 12개월 지난 거절 건은 목록을 읽을 때 지워진다
    await t.call(A, 'PATCH', estelle, { body: { id, action: 'decide', status: 'hold' } });
    const rec = JSON.parse(t.store.get(`serve:app:${id}`)); rec.decidedAt = new Date(Date.now() - 400 * 86400000).toISOString();
    t.store.set(`serve:app:${id}`, JSON.stringify(rec));
    assert.equal((await t.call(A, 'GET', master)).applications.length, 0);
    assert.equal(t.store.has(`serve:app:${id}`), false);
    assert.equal(t.store.has(`serve:appsens:${id}`), false);
  } finally { t.restore(); }
});

test('신청서 정의에는 기존 Jotform 항목이 모두 있다', () => {
  const ids = SERVE_APPLICATION_FIELDS.map(f => f.id);
  for (const id of ['firstName', 'lastName', 'nameKo', 'gender', 'birthDate', 'phone', 'email', 'maritalStatus', 'divorced', 'criminal', 'abuse', 'hasChildren', 'occupation', 'heardFrom',
    'spiritualHabits', 'testimony', 'serviceHistory', 'church', 'pastor', 'gifts', 'servingWays', 'education', 'health', 'allergies', 'ref1FirstName', 'ref2Years']) assert.ok(ids.includes(id), id);
});

test('승인(인터뷰 진행) 전 문의로는 신청서를 만들 수 없고, 권한 없는 사람은 만들 수 없다', async () => {
  const t = setup();
  try {
    await t.acc('esooy@wol.org'); await t.acc('other@wol.org');
    const tasks = [];
    await C.onRequestPost({ env: t.env, request: new Request('https://t.co', { method: 'POST', body: JSON.stringify({ type: 'serve', name: 'Anna Lee', email: 'anna@x.com', message: 'I would like to serve at WOLKO as a counselor.' }) }), waitUntil: p => tasks.push(p) });
    const inquiryId = (await t.call(I, 'GET', master)).inquiries[0].id;
    assert.equal((await t.call(A, 'POST', estelle, { body: { inquiryId } })).status, 409);
    await t.call(I, 'PATCH', master, { body: { id: inquiryId, action: 'interview' } });
    assert.equal((await t.call(A, 'POST', other, { body: { inquiryId } })).status, 403);
    assert.equal((await t.call(A, 'POST', estelle, { body: { inquiryId } })).status, 200);
  } finally { t.restore(); }
});
