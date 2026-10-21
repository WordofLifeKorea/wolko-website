import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as C from '../functions/api/contact.js';
import * as P from '../functions/api/portal/serve-inquiries.js';
import { detectInquiryLanguage, canViewServeInquiry, SERVE_REVIEWER_EMAILS } from '../functions/lib/serveInquiry.js';

function setup() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'x' };
  const emails = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (String(url).includes('resend.com')) emails.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); };
  const acc = (email, role = 'counselor') => kv.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  const send = async body => {
    const tasks = [];
    const res = await C.onRequestPost({ env, request: new Request('https://t.co/api/contact', { method: 'POST', headers: { 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify(body) }), waitUntil: t => tasks.push(t) });
    await Promise.all(tasks);
    return res;
  };
  const portal = async (method, who, body) => {
    const req = new Request('https://t.co/api/portal/serve-inquiries', { method, headers: { Authorization: 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const res = await (method === 'GET' ? P.onRequestGet : P.onRequestPatch)({ env, request: req });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, emails, acc, send, portal, restore: () => { globalThis.fetch = realFetch; } };
}
const master = ['admin@wolko.org', 'master'];
const estelle = ['esooy@wol.org', 'counselor'];
const stranger = ['other@wol.org', 'counselor'];

test('문의 언어: 내용의 한글 비율 > 폼 언어 > 이름 순으로 정한다', () => {
  assert.equal(detectInquiryLanguage({ name: 'John', message: '월코에서 섬기고 싶습니다. 인터뷰 하고 싶어요.' }), 'ko');
  assert.equal(detectInquiryLanguage({ name: '김철수', message: 'I would like to serve at WOLKO as a camp counselor.' }), 'en');
  assert.equal(detectInquiryLanguage({ name: 'Anna', message: 'Hi', hint: 'ko' }), 'ko');
  assert.equal(detectInquiryLanguage({ name: '홍길동', message: 'Hi' }), 'ko');
  assert.equal(detectInquiryLanguage({ name: 'Anna', message: 'Hi' }), 'en');
});

test('섬김 문의: 저장 · 문의 언어별 담당자 + 마스터에게 알림(내용 없이) · 접수 확인 메일', async () => {
  const t = setup();
  try {
    const res = await t.send({ type: 'serve', name: 'Anna Lee', email: 'anna@x.com', phone: '01012345678', message: 'I would like to serve at WOLKO as a counselor next summer.' });
    assert.equal(res.status, 200);
    const stored = [...t.store.entries()].filter(([k]) => k.startsWith('serve:inq:'));
    assert.equal(stored.length, 1);
    const rec = JSON.parse(stored[0][1]);
    assert.equal(rec.lang, 'en');
    assert.equal(rec.status, 'new');
    assert.equal(rec.phone, '010-1234-5678');
    // 메일: 기존 문의 메일 + 담당자/마스터 알림 + 접수 확인
    const notify = t.emails.find(e => (e.subject || '').includes('Serve with WOLKO') && Array.isArray(e.to) && e.to.includes('esooy@wol.org'));
    assert.ok(notify, '영어 문의는 Estelle 에게 알림');
    assert.ok(notify.to.includes('admin@wolko.org'));
    assert.ok(!notify.html.includes('Anna') && !notify.html.includes('counselor'), '알림 메일에는 이름·내용을 넣지 않는다');
    assert.ok(t.emails.some(e => e.to.includes('anna@x.com')), '문의한 사람에게 접수 확인');
  } finally { t.restore(); }
});

test('섬김 문의: 일반 문의는 저장하지 않고, 자동 입력 칸이 채워지면 무시하고, 연속 접수는 막는다', async () => {
  const t = setup();
  try {
    await t.send({ type: 'general', name: 'A', email: 'a@x.com', message: 'hello there friend' });
    assert.equal([...t.store.keys()].filter(k => k.startsWith('serve:inq:')).length, 0);
    const bot = await t.send({ type: 'serve', name: 'Bot', email: 'bot@x.com', message: 'spam spam spam spam', website: 'http://spam' });
    assert.equal(bot.status, 200);
    assert.equal([...t.store.keys()].filter(k => k.startsWith('serve:inq:')).length, 0);
    for (let i = 0; i < 3; i++) assert.equal((await t.send({ type: 'serve', name: 'Dup', email: 'dup@x.com', message: 'I want to serve at WOLKO please.' })).status, 200);
    assert.equal((await t.send({ type: 'serve', name: 'Dup', email: 'dup@x.com', message: 'I want to serve at WOLKO please.' })).status, 429);
  } finally { t.restore(); }
});

test('받은함: 마스터는 전체, 영어 담당자는 영어 문의만, 다른 사람은 거절', async () => {
  const t = setup();
  try {
    await t.acc('esooy@wol.org'); await t.acc('other@wol.org');
    await t.send({ type: 'serve', name: 'Anna', email: 'anna@x.com', message: 'I would like to serve at WOLKO as a counselor.' });
    await t.send({ type: 'serve', name: '철수', email: 'cs@x.com', message: '월코에서 섬기고 싶습니다. 인터뷰 부탁드립니다.' });
    assert.equal((await t.portal('GET', master)).inquiries.length, 2);
    const mine = await t.portal('GET', estelle);
    assert.equal(mine.inquiries.length, 1);
    assert.equal(mine.inquiries[0].lang, 'en');
    assert.equal((await t.portal('GET', stranger)).status, 403);
    assert.equal(canViewServeInquiry({ role: 'counselor', email: 'esooy@wol.org' }, { lang: 'ko' }), false);
    assert.deepEqual(SERVE_REVIEWER_EMAILS.ko, ['hlim@wol.org'], '한글 문의 담당자는 Ella');
    assert.equal(canViewServeInquiry({ role: 'counselor', email: 'hlim@wol.org' }, { lang: 'ko' }), true);
    assert.equal(canViewServeInquiry({ role: 'counselor', email: 'hlim@wol.org' }, { lang: 'en' }), false);
  } finally { t.restore(); }
});

test('처리: 인터뷰 진행 승인 · 보류 · 거절 · 다시 열기 · 언어 담당 변경, 권한 없는 사람은 거절', async () => {
  const t = setup();
  try {
    await t.acc('esooy@wol.org'); await t.acc('other@wol.org');
    await t.send({ type: 'serve', name: 'Anna', email: 'anna@x.com', message: 'I would like to serve at WOLKO as a counselor.' });
    const id = (await t.portal('GET', master)).inquiries[0].id;
    assert.equal((await t.portal('PATCH', stranger, { id, action: 'interview' })).status, 403);
    const ok = await t.portal('PATCH', estelle, { id, action: 'interview', note: '다음 주 화요일 인터뷰' });
    assert.equal(ok.inquiry.status, 'interview');
    assert.equal(ok.inquiry.approvedBy, 'esooy@wol.org');
    assert.equal(ok.inquiry.history.at(-1).note, '다음 주 화요일 인터뷰');
    assert.equal((await t.portal('PATCH', estelle, { id, action: 'hold' })).inquiry.status, 'hold');
    assert.equal((await t.portal('PATCH', estelle, { id, action: 'reject' })).inquiry.status, 'rejected');
    assert.equal((await t.portal('PATCH', master, { id, action: 'reopen' })).inquiry.status, 'new');
    assert.equal((await t.portal('PATCH', master, { id, action: 'reassign' })).inquiry.lang, 'ko');
    // 넘겨진 뒤에는 영어 담당자가 더 이상 볼 수 없다
    assert.equal((await t.portal('PATCH', estelle, { id, action: 'hold' })).status, 403);
    assert.equal((await t.portal('PATCH', master, { id, action: 'bogus' })).status, 400);
    assert.equal((await t.portal('PATCH', master, { id: 'nope', action: 'hold' })).status, 404);
  } finally { t.restore(); }
});
