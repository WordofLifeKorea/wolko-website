// 민감정보 별도 동의 — 캠프 신청(개인: 특이사항에 글을 적을 때만)과 스태프 · 크루 지원(항상)은
// 개인정보 동의와 따로 받고, 서버가 확인해서 동의 시각을 신청 기록에 남긴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost as campRegister } from '../functions/api/register.js';
import * as staffRegister from '../functions/api/staff-register.js';
import { fakeAssets } from './helpers/campSchedulesAssets.mjs';

async function campPost(overrides) {
  const store = new Map();
  const env = { ASSETS: fakeAssets(), CAMP_KV: { get: async k => store.get(k) || null, put: async (k, v) => store.set(k, v) } };
  const background = [];
  const payload = { campId: '2027-wolko-winter', name: 'Test Camper', phone: '01000000000', email: 'test@example.com', grade: '6', gender: 'male', birthDate: '2013-05-05', refundBank: 'test', refundAccount: '123', refundHolder: 'Test', mediaConsent: 'yes', ...overrides };
  const realNow = Date.now;
  Date.now = () => Date.parse('2026-10-20T12:00:00+09:00');
  let response;
  try {
    response = await campRegister({ env, request: new Request('https://example.com/api/register', { method: 'POST', body: JSON.stringify(payload) }), waitUntil: t => background.push(t) });
  } finally { Date.now = realNow; }
  await Promise.all(background);
  const reg = JSON.parse([...store.entries()].find(([k]) => k.includes(':reg:'))?.[1] || 'null');
  return { response, reg, body: await response.clone().json().catch(() => null) };
}

test('캠프 신청(개인): 특이사항에 글을 적으면 민감정보 별도 동의가 있어야 한다', async () => {
  const blocked = await campPost({ notes: '땅콩 알레르기, 천식 약 복용 중' });
  assert.equal(blocked.response.status, 400);
  assert.equal(blocked.body.code, 'sensitive-consent-required');
  assert.equal(blocked.reg, null, '동의가 없으면 저장하지 않는다');
  for (const bad of ['true', 1, 'yes', null, false]) {
    const res = await campPost({ notes: '천식', sensitiveConsent: bad });
    assert.equal(res.response.status, 400, `true 가 아닌 값(${JSON.stringify(bad)})은 동의가 아니다`);
  }
  const blank = await campPost({ notes: '   ' });
  assert.equal(blank.response.status, 200, '공백만 적은 것은 글을 적은 것이 아니다');
});

test('캠프 신청(개인): 동의하면 저장하고 동의 시각을 남긴다', async () => {
  const ok = await campPost({ notes: '땅콩 알레르기', sensitiveConsent: true });
  assert.equal(ok.response.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.reg.notes, '땅콩 알레르기');
  assert.equal(ok.reg.sensitiveConsent, true);
  assert.ok(!Number.isNaN(Date.parse(ok.reg.sensitiveConsentAt)), '동의 시각이 ISO 날짜');
});

test('캠프 신청(개인): 특이사항을 비우면 동의 없이 신청하고, 동의 기록도 남기지 않는다', async () => {
  const none = await campPost({});
  assert.equal(none.response.status, 200);
  assert.equal(none.reg.sensitiveConsent, undefined);
  const stray = await campPost({ notes: '', sensitiveConsent: true });
  assert.equal(stray.response.status, 200);
  assert.equal(stray.reg.sensitiveConsentAt, undefined, '민감정보를 받지 않았으면 동의했다는 기록도 남기지 않는다');
});

test('캠프 신청(단체): 건강 정보를 받는 칸이 아니라서 동의 없이도 접수된다', async () => {
  const group = await campPost({ registrationType: 'group', groupCount: 2, organization: 'Test Church', gender: undefined, birthDate: undefined, notes: '버스는 10시에 도착해요',
    participants: [{ name: 'A', gender: 'male', birthDate: '2013-03-02' }, { name: 'B', gender: 'female', birthDate: '2012-07-15' }] });
  assert.equal(group.response.status, 200, JSON.stringify(group.body));
  assert.equal(group.reg.sensitiveConsent, undefined);
});

async function staffPost(overrides) {
  const store = new Map();
  const env = { CAMP_KV: { get: async (k, type) => { const v = store.get(k); return v == null ? null : (type === 'json' ? JSON.parse(v) : v); }, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k) }, ADMIN_PASSWORD: 'secret' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ ok: true });
  try {
    const body = { role: 'staff', name: '김스태프', phone: '010-2222-3333', email: 'staff@example.com', gender: 'female', birthDate: '2000-05-05',
      introduction: '안녕하세요', faithStory: '교회에서', church: '평택교회', cultHistory: 'no', englishAbility: '3', mediaTech: '2',
      previousCamp: 'no', team1: '프로그램', availableCamps: ['2027-wolko-winter'], availableCampNames: ['겨울 월코 영어 캠프'], ...overrides };
    const res = await staffRegister.onRequestPost({ env, request: new Request('https://x/api/staff-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), waitUntil: () => {} });
    const reg = JSON.parse([...store.entries()].find(([k]) => k.includes(':reg:'))?.[1] || 'null');
    return { res, reg, body: await res.clone().json().catch(() => null) };
  } finally { globalThis.fetch = realFetch; }
}

test('스태프 · 크루 지원: 민감정보 별도 동의가 없으면 받지 않는다', async () => {
  for (const sensitiveConsent of [undefined, false, 'true', 1]) {
    const r = await staffPost({ sensitiveConsent });
    assert.equal(r.res.status, 400, `동의 값 ${JSON.stringify(sensitiveConsent)}`);
    assert.equal(r.body.code, 'sensitive-consent-required');
    assert.equal(r.reg, null, '동의가 없으면 저장하지 않는다');
  }
});

test('스태프 · 크루 지원: 동의하면 저장하고 동의 시각을 남긴다 (크루도 같다)', async () => {
  const staff = await staffPost({ sensitiveConsent: true, notes: '건강 문제 없음' });
  assert.equal(staff.res.status, 200, JSON.stringify(staff.body));
  assert.equal(staff.reg.sensitiveConsent, true);
  assert.equal(staff.reg.sensitiveConsentAt, staff.reg.registeredAt);
  const crew = await staffPost({ role: 'crew', birthDate: '2010-05-05', email: 'crew@example.com', sensitiveConsent: true, crewPledge: true, referral: '네이버 카페',
    guardianName: '김엄마', guardianRelation: '모', guardianPhone: '010-9999-8888', team1: '키친' });
  assert.equal(crew.res.status, 200, JSON.stringify(crew.body));
  assert.equal(crew.reg.sensitiveConsent, true);
});

test('신청 화면: 개인정보 동의와 따로 있는 민감정보 동의 칸이 있고 서버로 보낸다', () => {
  const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  // 캠프 신청: 특이사항 칸 바로 아래, 처음에는 숨김
  assert.match(page, /id="crpSensitiveWrap" hidden/);
  assert.match(page, /<input type="checkbox" id="crpSensitiveConsent"/);
  assert.ok(page.indexOf('id="crpNotes"') < page.indexOf('id="crpSensitiveWrap"') && page.indexOf('id="crpSensitiveWrap"') < page.indexOf('id="crpConsent"'), '특이사항 → 민감정보 동의 → 개인정보 동의 순서');
  assert.match(page, /sensitiveConsent: !!document\.getElementById\('crpNotes'\)\.value\.trim\(\) && document\.getElementById\('crpSensitiveConsent'\)\.checked/);
  assert.match(page, /byId\('crpNotes'\)\.value\.trim\(\) && !byId\('crpSensitiveConsent'\)\.checked/);
  assert.match(page, /function crpSyncSensitive\(\)/);
  assert.match(page, /crpSyncSensitive\(\);\s*return true;/, '임시 저장을 되살린 뒤에도 동의 칸을 맞춘다');
  // 스태프 · 크루 지원: 개인정보 동의 바로 아래, 항상 필수
  assert.match(page, /<input type="checkbox" id="staffSensitiveConsent">/);
  assert.ok(page.indexOf('id="staffPrivacyConsent"') < page.indexOf('id="staffSensitiveConsent"'));
  assert.match(page, /sensitiveConsent: byId\('staffSensitiveConsent'\)\.checked/);
  assert.match(page, /\[!byId\('staffSensitiveConsent'\)\.checked, 'staffSensitiveConsent'/);
});
