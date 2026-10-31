import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backfillFormTranslations, needsFormTranslation, campBackfillItems, BACKFILL_LIMIT } from '../functions/lib/formTranslate.js';

// Claude API 스트림 흉내 — 받은 칸마다 가짜 번역
const sse = text => new Response(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
const fakeApi = (calls = []) => async (url, init) => {
  const items = JSON.parse(JSON.parse(init.body).messages[0].content);
  calls.push(items);
  return sse(JSON.stringify(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, (v.to === 'en' ? 'EN:' : 'KO:') + v.text]))));
};
const kv = (entries = {}) => { const store = new Map(Object.entries(entries).map(([k, v]) => [k, JSON.stringify(v)])); return { store, ANTHROPIC_API_KEY: 'test', CAMP_KV: { async get(k) { return store.get(k) ?? null; }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } } }; };
const read = (env, k) => JSON.parse(env.store.get(k));

test('예전 신청서 채우기: 번역이 없는 것만, 한 번에 정해진 건수까지, 원문 · 이름 · 연락처는 그대로', async () => {
  const recs = {};
  for (let i = 0; i < BACKFILL_LIMIT + 5; i++) recs[`rsvp:ev:${i}`] = { rsvpId: String(i), name: '이혁재', phone: '010-2637-8561', email: 'a@b.c', notes: '시흥중앙성결교회 ' + i };
  recs['rsvp:ev:done'] = { rsvpId: 'done', name: 'X', notes: 'See you soon', tr: { notes: { lang: 'ko', text: '곧 봬요' } } };
  recs['rsvp:ev:empty'] = { rsvpId: 'empty', name: 'Y', notes: '' };
  const env = kv(recs), calls = [];
  const items = Object.keys(recs).map(key => ({ kind: 'rsvp', key, record: JSON.parse(env.store.get(key)) }));
  const done = await backfillFormTranslations(env, items, { fetchImpl: fakeApi(calls) });
  assert.equal(done, BACKFILL_LIMIT);
  assert.equal(calls.length, BACKFILL_LIMIT);
  calls.forEach(c => assert.deepEqual(Object.keys(c), ['notes'], '메모만 보내고 이름 · 전화 · 이메일은 보내지 않는다'));
  const r0 = read(env, 'rsvp:ev:0');
  assert.equal(r0.notes, '시흥중앙성결교회 0'); assert.equal(r0.name, '이혁재'); assert.equal(r0.phone, '010-2637-8561');
  assert.deepEqual(r0.tr.notes, { lang: 'en', text: 'EN:시흥중앙성결교회 0' });
  assert.deepEqual(read(env, 'rsvp:ev:done').tr.notes, { lang: 'ko', text: '곧 봬요' }, '이미 번역된 것은 건드리지 않는다');
  assert.equal(read(env, `rsvp:ev:${BACKFILL_LIMIT + 1}`).tr, undefined, '정해진 건수 넘는 것은 다음 번에');
  assert.equal(env.store.has('formtr:backfill:lock'), false, '끝나면 잠금을 푼다');
  // 다음 번에 남은 것을 이어서 한다
  const items2 = Object.keys(recs).map(key => ({ kind: 'rsvp', key, record: JSON.parse(env.store.get(key)) }));
  assert.equal(await backfillFormTranslations(env, items2, { fetchImpl: fakeApi() }), 5);
});

test('예전 신청서 채우기: 실패하면 원문은 그대로 두고 시도 시각만 적어 6시간 뒤 다시', async () => {
  const env = kv({ 'camp:c1:reg:r1': { campId: 'c1', regId: 'r1', name: '김', church: '팽성침례교회' } });
  const items = () => campBackfillItems([JSON.parse(env.store.get('camp:c1:reg:r1'))]);
  const now = Date.parse('2026-10-31T12:00:00Z');
  assert.equal(await backfillFormTranslations(env, items(), { now, fetchImpl: async () => { throw new Error('down'); } }), 0);
  const r = read(env, 'camp:c1:reg:r1');
  assert.equal(r.church, '팽성침례교회'); assert.equal(r.tr, undefined); assert.ok(r.trTriedAt);
  let called = 0;
  assert.equal(await backfillFormTranslations(env, items(), { now: now + 3600e3, fetchImpl: async (...a) => { called++; return fakeApi()(...a); } }), 0, '6시간 안에는 다시 하지 않는다');
  assert.equal(called, 0);
  assert.equal(await backfillFormTranslations(env, items(), { now: now + 7 * 3600e3, fetchImpl: fakeApi() }), 1);
  assert.deepEqual(read(env, 'camp:c1:reg:r1').tr.church, { lang: 'en', text: 'EN:팽성침례교회' });
});

test('예전 신청서 채우기: 번역 설정이 없거나 이미 돌고 있으면 아무것도 하지 않고, 스태프 지원은 staff 칸으로', async () => {
  const env = kv({ 'camp:c1:reg:s1': { campId: 'c1', regId: 's1', registrationType: 'staff', introduction: '안녕하세요', church: 'Grace Church' } });
  const its = campBackfillItems([read(env, 'camp:c1:reg:s1')]);
  assert.equal(its[0].kind, 'staff');
  assert.equal(await backfillFormTranslations({ ...env, ANTHROPIC_API_KEY: '' }, its, { fetchImpl: fakeApi() }), 0);
  env.store.set('formtr:backfill:lock', '1');
  assert.equal(await backfillFormTranslations(env, its, { fetchImpl: fakeApi() }), 0, '다른 목록 열기가 돌고 있으면 건너뛴다');
  env.store.delete('formtr:backfill:lock');
  assert.equal(await backfillFormTranslations(env, its, { fetchImpl: fakeApi() }), 1);
  assert.ok(needsFormTranslation('staff', { introduction: '안녕' }));
  assert.ok(!needsFormTranslation('staff', { introduction: '안녕', tr: { introduction: { lang: 'en', text: 'Hi' } } }));
});

test('예전 신청서 채우기: 참석 신청 목록과 캠프 · 스태프 목록을 열 때 응답을 기다리지 않고 뒤에서 돈다', () => {
  const rsvp = readFileSync(new URL('../functions/api/rsvp.js', import.meta.url), 'utf8');
  assert.match(rsvp, /context\.waitUntil\(backfillFormTranslations\(env, backfill\)\)/);
  const regs = readFileSync(new URL('../functions/api/admin/registrations.js', import.meta.url), 'utf8');
  assert.match(regs, /context\.waitUntil\(backfillFormTranslations\(env, campBackfillItems\(allRegs\)\)\)/);
});
