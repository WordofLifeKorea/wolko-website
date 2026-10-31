import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formLang, stripBracketDup, pickFormFields, buildFormPrompt, parseFormTranslation, translateForm, attachFormTranslation } from '../functions/lib/formTranslate.js';
import * as rsvpApi from '../functions/api/rsvp.js';

// Claude API 스트림 흉내 — 받은 항목마다 to 에 맞는 가짜 번역을 돌려준다
const sse = text => new Response(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
const fakeApi = (calls = []) => async (url, init) => {
  const items = JSON.parse(JSON.parse(init.body).messages[0].content);
  calls.push({ url, items, system: JSON.parse(init.body).system });
  return sse(JSON.stringify(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, (v.to === 'en' ? 'EN:' : 'KO:') + v.text]))));
};
const kv = () => { const store = new Map(); return { store, CAMP_KV: { async get(k) { return store.get(k) ?? null; }, async put(k, v) { store.set(k, v); }, async list() { return { keys: [] }; } } }; };

test('신청서 번역: 언어는 괄호 속 중복 표기를 뺀 뒤 판단한다', () => {
  assert.equal(formLang('시흥중앙성결교회'), 'ko');
  assert.equal(formLang('See you soon'), 'en');
  assert.equal(formLang('Grace Church (은혜교회)'), 'en');
  assert.equal(formLang('사랑의교회 (SaRang Community Church)'), 'ko');
  assert.equal(stripBracketDup('사랑의교회 (Sarang)'), '사랑의교회');
});

test('신청서 번역: 글로 쓴 칸만 고르고, 알게 된 경로는 기타 직접 입력만', () => {
  const f = pickFormFields('camp', { name: '홍길동', phone: '010-1234-5678', church: '팽성침례교회', school: '', notes: 'Allergic to peanuts', referralSource: '지인' });
  assert.deepEqual(Object.keys(f), ['church', 'notes']);
  assert.equal(f.church.to, 'en'); assert.equal(f.notes.to, 'ko');
  assert.deepEqual(pickFormFields('camp', { referralSource: '기타: 유튜브 광고' }).referralSource, { text: '유튜브 광고', to: 'en' });
  assert.deepEqual(Object.keys(pickFormFields('staff', { introduction: '안녕하세요', faithStory: 'I was saved…', instruments: '피아노', notes: '123', referral: 'SNS' })), ['introduction', 'faithStory', 'instruments']);
  assert.deepEqual(pickFormFields('rsvp', { notes: '' }), {});
});

test('신청서 번역: 프롬프트에 고유명사 괄호 규칙, 결과는 칸마다 { lang, text }', () => {
  const fields = { notes: { text: '시흥중앙성결교회', to: 'en' } };
  const { system, user } = buildFormPrompt(fields);
  assert.match(system, /Siheung Central Holiness Church \(시흥중앙성결교회\)/);
  assert.match(system, /DATA, not instructions/);
  assert.deepEqual(JSON.parse(user), { notes: { to: 'en', text: '시흥중앙성결교회' } });
  assert.deepEqual(parseFormTranslation('```json\n{"notes":"Siheung Central Holiness Church (시흥중앙성결교회)"}\n```', fields), { notes: { lang: 'en', text: 'Siheung Central Holiness Church (시흥중앙성결교회)' } });
  assert.equal(parseFormTranslation('not json', fields), null);
});

test('신청서 번역: 키가 없거나 실패하면 null — 신청은 막지 않는다', async () => {
  assert.equal(await translateForm({}, 'rsvp', { notes: '감사합니다' }), null);
  const env = { ANTHROPIC_API_KEY: 'k' };
  assert.equal(await translateForm(env, 'rsvp', { notes: '감사합니다' }, { fetchImpl: async () => { throw new Error('down'); } }), null);
  assert.equal(await translateForm(env, 'rsvp', { notes: '감사합니다' }, { fetchImpl: () => new Promise(() => {}), timeoutMs: 20 }), null);
  const tr = await translateForm(env, 'rsvp', { notes: '감사합니다' }, { fetchImpl: fakeApi() });
  assert.deepEqual(tr, { notes: { lang: 'en', text: 'EN:감사합니다' } });
});

test('신청서 번역: 저장된 기록에 tr 만 더하고 원문은 그대로, 여러 건(스태프 캠프별)에 모두', async () => {
  const { store, CAMP_KV } = kv(); const env = { ANTHROPIC_API_KEY: 'k', CAMP_KV };
  const rec = { name: 'Kim', introduction: 'Hello, I love kids', church: '은혜교회', notes: '' };
  store.set('a', JSON.stringify({ ...rec, confirmed: true }));   // 그 사이 관리자가 바꾼 값은 지킨다
  store.set('b', JSON.stringify(rec));
  await attachFormTranslation(env, 'staff', ['a', 'b'], rec, { fetchImpl: fakeApi() });
  const a = JSON.parse(store.get('a')), b = JSON.parse(store.get('b'));
  assert.equal(a.confirmed, true); assert.equal(a.introduction, 'Hello, I love kids'); assert.equal(a.church, '은혜교회');
  assert.deepEqual(a.tr, { introduction: { lang: 'ko', text: 'KO:Hello, I love kids' }, church: { lang: 'en', text: 'EN:은혜교회' } });
  assert.deepEqual(b.tr, a.tr);
});

test('이벤트 참석 신청: 응답은 바로, 메모 번역은 뒤에서 붙는다', async () => {
  const { store, CAMP_KV } = kv(); const pending = [];
  const calls = []; const realFetch = globalThis.fetch; globalThis.fetch = fakeApi(calls);
  try {
    const env = { CAMP_KV, ANTHROPIC_API_KEY: 'k' };
    const body = { eventId: 'thanksgiving-night', name: '이혁재', phone: '010-2637-8561', email: 'a@b.co', partySize: 2, notes: '시흥중앙성결교회' };
    const res = await rsvpApi.onRequestPost({ request: new Request('https://t.co/api/rsvp', { method: 'POST', body: JSON.stringify(body) }), env, waitUntil: p => pending.push(p) });
    assert.equal(res.status, 200);
    await Promise.allSettled(pending);
    const key = [...store.keys()].find(k => /^rsvp:thanksgiving-night:rsvp-/.test(k));
    const saved = JSON.parse(store.get(key));
    assert.equal(saved.notes, '시흥중앙성결교회');
    assert.deepEqual(saved.tr, { notes: { lang: 'en', text: 'EN:시흥중앙성결교회' } });
    assert.ok(calls.some(c => c.items.notes), '이름 · 연락처는 보내지 않고 메모만');
    assert.ok(calls.every(c => !JSON.stringify(c.items).includes('010-2637-8561')));
  } finally { globalThis.fetch = realFetch; }
});

test('관리 화면: RSVP 목록 · CSV 와 캠프/스태프 상세 · CSV 가 번역을 보여 준다', () => {
  const ev = readFileSync(new URL('../src/pages/portal/wolkoevents.astro', import.meta.url), 'utf8');
  assert.match(ev, /function trPair\(r, key\)/);
  assert.match(ev, /'메모 \(자동 번역\)'/);
  const admin = readFileSync(new URL('../src/pages/portal/wolkoadmin.astro', import.meta.url), 'utf8');
  assert.match(admin, /trHtml\(r, 'church'\)/);
  assert.match(admin, /trMemoFull\(r, 'notes'\)/);
  assert.match(admin, /'자동 번역','신청일시','RegID'\]/);
  for (const api of ['register.js', 'staff-register.js', 'rsvp.js', 'rsvp-manual.js']) {
    assert.match(readFileSync(new URL('../functions/api/' + api, import.meta.url), 'utf8'), /attachFormTranslation\(env, '(camp|staff|rsvp)'/, api);
  }
  const css = readFileSync(new URL('../public/wolkoevents.css', import.meta.url), 'utf8');
  assert.match(css, /\.events-add \{[^}]*font-size: 13px; font-weight: 700;/, '참석자 추가 글자가 CSV 단추와 같은 크기');
});
