import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../functions/api/portal/prayers.js';
import { parsePrayerInput, readPrayers, PRAYERS_KEY, DAILY_LIMIT, DASH_SHOWN } from '../functions/lib/prayers.js';
import { buildDashboard } from '../functions/lib/portalDashboard.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function setup() {
  const store = new Map();
  const CAMP_KV = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  const env = { CAMP_KV, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor', name = '') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: name || email, role, status: 'approved' }));
  const call = async (method, who, { query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await createHubSessionToken('secret', who[0], who[1]);
    const request = new Request(`https://t.co/api/portal/prayers${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const res = await { GET: api.onRequestGet, POST: api.onRequestPost, DELETE: api.onRequestDelete }[method]({ env, request });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, env, acc, call };
}
const anna = ['anna@wol.org', 'counselor'], ben = ['ben@wol.org', 'counselor'], admin = ['hkim3@wol.org', 'admin'];

test('기도제목 입력: 제목 필수(비우면 내용 첫 줄), 내용은 600자까지, 줄바꿈은 정리', () => {
  assert.ok(parsePrayerInput({ title: ' ', text: ' ' }).error);
  assert.equal(parsePrayerInput({ title: '캠프를 위해', text: '' }).value.text, '', '내용 없이 제목만도 된다');
  assert.equal(parsePrayerInput({ title: 'x'.repeat(100), text: 'a' }).value.title.length, 60);
  assert.equal(parsePrayerInput({ title: '', text: '첫 줄 제목\n두 번째 줄' }).value.title, '첫 줄 제목');
  assert.equal(parsePrayerInput({ title: 't', text: 'a'.repeat(700) }).value.text.length, 600);
  assert.equal(parsePrayerInput({ title: 't', text: 'a\n\n\n\nb' }).value.text, 'a\n\nb');
  assert.equal(parsePrayerInput({ title: 't', anonymous: true }).value.anonymous, true);
});

test('기도제목: 로그인 필요, 올리기·보기·함께 기도·지우기', async () => {
  const t = setup(); t.acc(anna[0], 'counselor', 'Anna Lee'); t.acc(ben[0], 'counselor', 'Ben Kim'); t.acc(admin[0], 'admin', 'Admin');
  assert.equal((await t.call('GET', null)).status, 401);
  assert.equal((await t.call('POST', null, { body: { text: 'x' } })).status, 401);
  assert.equal((await t.call('POST', anna, { body: { title: ' ', text: ' ' } })).status, 400);

  const posted = await t.call('POST', anna, { body: { title: '이번 주 캠프', text: '이번 주 캠프를 위해 기도해 주세요' } });
  assert.equal(posted.status, 201); assert.equal(posted.prayers.length, 1);
  assert.equal(posted.prayers[0].title, '이번 주 캠프'); assert.equal(posted.prayers[0].name, 'Anna Lee'); assert.equal(posted.prayers[0].mine, true); assert.equal(posted.prayers[0].canDelete, true);
  const id = posted.prayers[0].id;

  const asBen = (await t.call('GET', ben)).prayers[0];
  assert.equal(asBen.mine, false); assert.equal(asBen.canDelete, false); assert.equal(asBen.count, 0); assert.equal(asBen.prayed, false);
  assert.equal((await t.call('POST', ben, { body: { action: 'pray', id } })).count, 1);
  assert.deepEqual(await t.call('POST', ben, { body: { action: 'pray', id } }).then(r => [r.count, r.prayed]), [0, false], '다시 누르면 취소');
  await t.call('POST', ben, { body: { action: 'pray', id } });
  assert.equal((await t.call('GET', ben)).prayers[0].prayed, true);
  assert.equal((await t.call('GET', anna)).prayers[0].count, 1);
  assert.equal((await t.call('POST', ben, { body: { action: 'pray', id: 'nope' } })).status, 404);

  assert.equal((await t.call('DELETE', ben, { query: `?id=${id}` })).status, 403, '남의 것은 못 지운다');
  assert.equal((await t.call('GET', admin)).prayers[0].canDelete, true, '관리자는 지울 수 있다');
  assert.equal((await t.call('DELETE', anna, { query: `?id=${id}` })).status, 200);
  assert.equal((await t.call('GET', anna)).prayers.length, 0);
  assert.equal((await t.call('DELETE', anna, { query: `?id=${id}` })).status, 404);
});

test('기도제목: 익명이면 이름이 저장되지 않고, 누가 올렸고 누가 기도했는지는 어디에도 이메일로 남지 않는다', async () => {
  const t = setup(); t.acc(anna[0], 'counselor', 'Anna Lee'); t.acc(ben[0], 'counselor', 'Ben Kim');
  await t.call('POST', anna, { body: { title: '비공개 제목', text: '비공개로 나누는 기도제목', anonymous: true } });
  const id = (await t.call('GET', anna)).prayers[0].id;
  await t.call('POST', ben, { body: { action: 'pray', id } });
  const seen = await t.call('GET', ben);
  assert.equal(seen.prayers[0].anonymous, true); assert.equal(seen.prayers[0].name, '');
  assert.equal(/anna|Anna|ben|Ben|@/.test(JSON.stringify(seen)), false, '응답에 이름·이메일이 없다');
  assert.equal(/anna|Anna|ben|Ben|@/.test(t.store.get(PRAYERS_KEY)), false, '저장값에도 없다');
  assert.equal((await t.call('GET', anna)).prayers[0].mine, true, '본인은 자기 것을 알아본다');
});

test('기도제목: 하루 5개까지, 첫 화면은 최근 10개·전체 보기는 지난 것까지 모두(오래돼도 지우지 않는다)', async () => {
  const t = setup(); t.acc(anna[0]);
  for (let i = 0; i < DAILY_LIMIT; i++) assert.equal((await t.call('POST', anna, { body: { title: `기도 ${i}` } })).status, 201);
  assert.equal((await t.call('POST', anna, { body: { title: '여섯째' } })).status, 429);
  // 지난 기도제목 14개를 직접 넣어 둔다(1년 전 것 포함)
  const list = JSON.parse(t.store.get(PRAYERS_KEY));
  for (let i = 0; i < 14; i++) list.push({ id: `old${i}`, title: `지난 ${i}`, text: '', name: 'Old', owner: 'x', createdAt: new Date(Date.now() - (30 + i * 25) * 86400000).toISOString(), prayedBy: [] });
  t.store.set(PRAYERS_KEY, JSON.stringify(list));
  assert.equal((await readPrayers(t.env)).length, DAILY_LIMIT + 14, '오래된 것도 남아 있다');
  const dash = await t.call('GET', anna);
  assert.equal(dash.prayers.length, DASH_SHOWN); assert.equal(dash.total, DAILY_LIMIT + 14);
  assert.equal(dash.prayers[0].title.startsWith('기도'), true, '최근 것이 먼저');
  const all = await t.call('GET', anna, { query: '?all=1' });
  assert.equal(all.prayers.length, DAILY_LIMIT + 14); assert.equal(all.prayers.at(-1).title.startsWith('지난'), true);
  const d = await buildDashboard(t.env, { email: anna[0], role: 'counselor', name: 'Anna' }, Date.now());
  assert.equal(d.prayers.length, DASH_SHOWN); assert.equal(d.prayerTotal, DAILY_LIMIT + 14);
});

test('기도제목: 제목이 없던 예전 기도제목은 내용 첫 줄이 제목으로 보인다', async () => {
  const t = setup(); t.acc(anna[0]);
  t.store.set(PRAYERS_KEY, JSON.stringify([{ id: 'legacy', text: '예전 방식으로 올린 기도제목\n두 번째 줄', name: 'A', owner: 'x', createdAt: new Date().toISOString(), prayedBy: [] }]));
  const out = await t.call('GET', anna);
  assert.equal(out.prayers[0].title, '예전 방식으로 올린 기도제목');
  assert.equal(out.prayers[0].text.includes('두 번째 줄'), true);
});

// ── 자동 번역 ──
import { buildPrayerPrompt, parsePrayerTranslation, translatePrayer, hasHangul } from '../functions/lib/prayerTranslate.js';
const sse = text => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`)); c.close(); } }), { status: 200 });

test('기도제목 번역: 한글이면 영어로, 영어면 한글로 / 응답 정리 / 키가 없으면 건너뜀', async () => {
  assert.equal(hasHangul('온유의 쾌유'), true); assert.equal(hasHangul('Pray for Onyu'), false);
  assert.match(buildPrayerPrompt({ title: 't', text: 'x' }, 'en').system, /into English/);
  assert.match(buildPrayerPrompt({ title: 't', text: 'x' }, 'ko').system, /into Korean/);
  assert.deepEqual(parsePrayerTranslation('설명 {"title":"A","text":"B"} 끝'), { title: 'A', text: 'B' });
  assert.equal(parsePrayerTranslation('no json'), null);
  assert.equal(parsePrayerTranslation('{"title":"","text":""}'), null);
  assert.equal(await translatePrayer({}, { title: '제목', text: '' }), null, '키가 없으면 번역하지 않는다');
  let sent;
  const ko = await translatePrayer({ ANTHROPIC_API_KEY: 'k' }, { title: '캠프를 위해', text: '건강을 위해' }, { fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return sse('{"title":"For camp","text":"For health"}'); } });
  assert.deepEqual(ko, { lang: 'en', title: 'For camp', text: 'For health' });
  assert.match(sent.system, /into English/); assert.equal(JSON.parse(sent.messages[0].content).title, '캠프를 위해');
  const en = await translatePrayer({ ANTHROPIC_API_KEY: 'k' }, { title: 'For camp', text: '' }, { fetchImpl: async () => sse('{"title":"캠프를 위해","text":""}') });
  assert.deepEqual(en, { lang: 'ko', title: '캠프를 위해', text: '' });
  assert.equal(await translatePrayer({ ANTHROPIC_API_KEY: 'k' }, { title: 'x', text: '' }, { fetchImpl: async () => new Response('err', { status: 500 }) }), null, 'AI 오류여도 던지지 않는다');
});

test('기도제목: 저장하면 번역이 함께 저장되고 화면에는 번역도 내려간다 (번역이 안 돼도 저장은 된다)', async () => {
  const realFetch = globalThis.fetch;
  const t = setup(); t.acc(anna[0], 'counselor', 'Anna Lee'); t.env.ANTHROPIC_API_KEY = 'k';
  try {
    globalThis.fetch = async () => sse('{"title":"Hope for Onyu and her family","text":"Pray she endures chemotherapy."}');
    const ok = await t.call('POST', anna, { body: { title: '온유와 가족에게 희망을', text: '항암치료를 이겨내도록' } });
    assert.equal(ok.status, 201); assert.equal(ok.translated, true);
    const item = ok.prayers[0];
    assert.equal(item.title, '온유와 가족에게 희망을'); assert.equal(item.trLang, 'en'); assert.equal(item.trTitle, 'Hope for Onyu and her family'); assert.equal(item.trText, 'Pray she endures chemotherapy.');
    globalThis.fetch = async () => new Response('down', { status: 503 });
    const failed = await t.call('POST', anna, { body: { title: '다른 기도제목' } });
    assert.equal(failed.status, 201); assert.equal(failed.translated, false);
    assert.equal(failed.prayers[0].trTitle, '', '번역이 없으면 비어 있다');
  } finally { globalThis.fetch = realFetch; }
});
