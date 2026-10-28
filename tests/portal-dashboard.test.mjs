import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, noticesForWeek, parseNoticeInput, recentChurches, doneSteps, kitchenToday, carToday } from '../functions/lib/portalDashboard.js';
import * as noticeApi from '../functions/api/portal/notices.js';
import { createHubSessionToken, MASTER_EMAILS, ADMIN_EMAILS } from '../functions/lib/hubAccounts.js';

function kvEnv(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return { store, env: { ADMIN_PASSWORD: 'secret', CAMP_KV: {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
  } } };
}
const TODAY = '2026-10-28'; // Wednesday
const NOW = Date.parse(`${TODAY}T03:00:00Z`);

test('notices show only for their own week; pinned first, then newest', () => {
  const list = [
    { id: '1', body: 'a', weekStart: '2026-10-26', createdAt: '2026-10-26T01:00:00Z' },
    { id: '2', body: 'b', weekStart: '2026-10-26', createdAt: '2026-10-27T01:00:00Z' },
    { id: '3', body: 'c', weekStart: '2026-10-26', createdAt: '2026-10-25T01:00:00Z', pinned: true },
    { id: '4', body: 'next week', weekStart: '2026-11-02', createdAt: '2026-10-27T05:00:00Z' },
  ];
  assert.deepEqual(noticesForWeek(list, '2026-10-26').map(n => n.id), ['3', '2', '1']);
});

test('notice input: body required, this/next week, trimmed', () => {
  assert.ok(parseNoticeInput({ body: '   ' }, TODAY).error);
  assert.equal(parseNoticeInput({ body: ' hello ', week: 'this' }, TODAY).value.weekStart, '2026-10-26');
  assert.equal(parseNoticeInput({ body: 'x', week: 'next' }, TODAY).value.weekStart, '2026-11-02');
  assert.equal(parseNoticeInput({ body: 'x', title: '  T  ', pinned: true }, TODAY).value.title, 'T');
});

test('notice due date: optional, must be a real date, and keeps a notice visible after its week until the due date', () => {
  assert.equal(parseNoticeInput({ body: 'x' }, TODAY).value.dueDate, '');
  assert.equal(parseNoticeInput({ body: 'x', dueDate: ' 2026-11-05 ' }, TODAY).value.dueDate, '2026-11-05');
  assert.ok(parseNoticeInput({ body: 'x', dueDate: '2026-02-30' }, TODAY).error, '없는 날짜');
  assert.ok(parseNoticeInput({ body: 'x', dueDate: '11/5' }, TODAY).error, '형식이 다르면 거절');
  const list = [
    { id: 'old-due', body: 'a', weekStart: '2026-10-19', dueDate: '2026-10-30', createdAt: '2026-10-20T00:00:00Z' },
    { id: 'old-over', body: 'b', weekStart: '2026-10-19', dueDate: '2026-10-25', createdAt: '2026-10-20T00:00:00Z' },
    { id: 'old-none', body: 'c', weekStart: '2026-10-19', createdAt: '2026-10-20T00:00:00Z' },
    { id: 'now', body: 'd', weekStart: '2026-10-26', createdAt: '2026-10-27T00:00:00Z' },
  ];
  assert.deepEqual(noticesForWeek(list, '2026-10-26').map(n => n.id), ['now'], 'today 를 안 주면 이번 주 공지만');
  assert.deepEqual(noticesForWeek(list, '2026-10-26', TODAY).map(n => n.id).sort(), ['now', 'old-due'], '마감일이 안 지난 지난 주 공지는 계속 보인다');
  assert.deepEqual(noticesForWeek(list, '2026-10-26', '2026-10-30').map(n => n.id).sort(), ['now', 'old-due'], '마감일 당일까지');
  assert.deepEqual(noticesForWeek(list, '2026-10-26', '2026-10-31').map(n => n.id), ['now'], '마감일 다음 날부터는 사라진다');
});

test('kitchen duty today lists only meals that have people', async () => {
  const { env } = kvEnv({ [`kitchen:day:${TODAY}`]: { lunch_prep: [{ email: 'a@b.c', name: 'Amy' }], dinner_clean: [{ email: 'd@e.f', name: 'Dan' }, { email: 'g@h.i', name: 'Eve' }] } });
  const out = await kitchenToday(env, TODAY);
  assert.deepEqual(out.map(m => m.meal), ['lunch', 'dinner']);
  assert.equal(out[1].clean.length, 2);
  assert.deepEqual(await kitchenToday(kvEnv().env, TODAY), []);
});

test('car drivers today: pickup and drop-off, null when nobody', async () => {
  const { env } = kvEnv({ [`drive:slot:${TODAY}:pickup`]: { email: 'a@b.c', name: 'Amy' } });
  const out = await carToday(env, TODAY);
  assert.ok(out.pickup);
  assert.equal(out.dropoff, null);
  assert.deepEqual(out.closed, { pickup: false, dropoff: false }, '수요일은 기본으로 열려 있다');
});

test('car slots closed by default (Sat) or by an admin show as closed, unless someone already signed up', async () => {
  const SAT = '2026-10-31';
  assert.deepEqual((await carToday(kvEnv().env, SAT)).closed, { pickup: true, dropoff: true });
  const { env } = kvEnv({ 'drive:closed:2026-10-19': { [TODAY + ':dropoff']: { by: 'x', at: 1 } }, [`drive:slot:${SAT}:pickup`]: { email: 'a@b.c', name: 'Amy' } });
  assert.deepEqual((await carToday(env, TODAY)).closed, { pickup: false, dropoff: true });
  assert.deepEqual((await carToday(env, SAT)).closed, { pickup: false, dropoff: true });
});

test('recent churches are sorted by update time and expose only name and dates', () => {
  const out = recentChurches({
    a: { churchName: 'Old', updatedAt: 100, phone: '010-1' },
    b: { churchName: 'New', updatedAt: 300, lastVisitDate: '2026-10-20', pastorEmail: 'x@y.z' },
    c: { churchName: 'Never updated' },
    d: { updatedAt: 500 },
  });
  assert.deepEqual(out.map(c => c.name), ['New', 'Old']);
  assert.deepEqual(Object.keys(out[0]).sort(), ['done', 'lastVisitDate', 'name', 'next', 'pastor', 'steps', 'updatedAt', 'visitor']);
  assert.ok(!JSON.stringify(out).includes('x@y.z') && !JSON.stringify(out).includes('010-1'));
  const detail = recentChurches({ z: { churchName: 'Z', updatedAt: 1, region: '경기', district: '평택', pastorName: '김 목사', lastVisitVisitor: 'Amy', stepsVersion: 3, steps: { 1: true, 2: [{ date: '2026-10-01' }], 3: false, 5: 'x', 6: [] } } })[0];
  assert.deepEqual({ ...detail }, { name: 'Z', updatedAt: 1, lastVisitDate: '', visitor: 'Amy', pastor: '김 목사', steps: 3, done: [1, 2, 5], next: 3 });
});

test('church steps recorded in an older numbering are read with the current numbers', () => {
  // v1(10단계): 1번(목사 만남·소개) → 지금 2·3번, 8번(선교사 설교) → 지금도 8번
  assert.deepEqual(doneSteps({ steps: { 1: true, 8: true } }), [2, 3, 8]);
  // v2(12단계, 옛 순서): 4번(God Ask) → 지금 9번
  assert.deepEqual(doneSteps({ stepsVersion: 2, steps: { 4: true } }), [9]);
  assert.equal(recentChurches({ a: { churchName: 'A', updatedAt: 1, stepsVersion: 3, steps: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, true])) } })[0].next, null);
});

test('dashboard keeps working when optional sources are not connected', async () => {
  const { env } = kvEnv();
  const d = await buildDashboard(env, { role: 'counselor' }, NOW);
  assert.equal(d.today, TODAY);
  assert.equal(d.canEditNotices, false);
  assert.deepEqual(d.notices, []);
  assert.deepEqual(d.kitchen, []);
  assert.equal(d.events, null);
  assert.equal(d.churches, null);
  assert.equal((await buildDashboard(env, { role: 'admin' }, NOW)).canEditNotices, true);
});

test('only admins can add and delete notices', async () => {
  const { env, store } = kvEnv();
  const call = async (fn, role, url, init = {}) => {
    const token = await createHubSessionToken('secret', role === 'master' ? MASTER_EMAILS[0] : ADMIN_EMAILS[0], role);
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  const anon = await noticeApi.onRequestPost({ env, request: new Request('https://x/api/portal/notices', { method: 'POST', body: '{}' }) });
  assert.equal(anon.status, 401);
  const empty = await call(noticeApi.onRequestPost, 'master', 'https://x/api/portal/notices', { method: 'POST', body: JSON.stringify({ body: '' }) });
  assert.equal(empty.status, 400);
  const made = await call(noticeApi.onRequestPost, 'master', 'https://x/api/portal/notices', { method: 'POST', body: JSON.stringify({ body: '이번 주 공지', week: 'this' }) });
  assert.equal(made.status, 201);
  assert.equal(JSON.parse(store.get('portal:notices')).length, 1);
  const del = await call(noticeApi.onRequestDelete, 'master', `https://x/api/portal/notices?id=${made.body.notice.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal(JSON.parse(store.get('portal:notices')).length, 0);
});

test('내 오늘 할 일: 오늘 내 주방·차량 칸, 월 후반에 아직 안 낸 복음 통계 보고(제외 계정은 빼고)', async () => {
  const { mySchedule } = await import('../functions/lib/portalDashboard.js');
  const { ownerOf, currentMonthKst, reportMonth } = await import('../functions/lib/gospelStats.js');
  const { env, store } = kvEnv({
    [`kitchen:day:${TODAY}`]: { lunch_prep: [{ email: 'amy@wol.org', name: 'Amy' }, { email: 'bob@wol.org', name: 'Bob' }], dinner_clean: [{ email: 'Amy@wol.org', name: 'Amy' }] },
    [`drive:slot:${TODAY}:dropoff`]: { email: 'amy@wol.org', name: 'Amy' },
    [`drive:slot:${TODAY}:pickup`]: { email: 'bob@wol.org', name: 'Bob' },
  });
  const amy = { email: 'amy@wol.org', role: 'counselor', name: 'Amy Lee' };
  const out = await mySchedule(env, amy, TODAY);                        // TODAY 는 28일
  assert.deepEqual(out.kitchen, ['lunch_prep', 'dinner_clean']);
  assert.deepEqual(out.car, ['dropoff']);
  assert.equal(out.name, 'Amy Lee');
  assert.equal(out.gospelPending, true, '지난달 보고가 없으면 알린다');
  assert.equal(out.gospelMonth, '2026-09', '10월이면 9월분을 알린다');
  assert.equal((await mySchedule(env, amy, '2026-10-10')).gospelPending, true, '월초에도 알린다');
  const month = reportMonth(Date.parse(`${TODAY}T12:00:00+09:00`));
  store.set(`gospel:rep:${month}:abc`, JSON.stringify({ id: 'abc', month, owner: await ownerOf(env, amy.email), scope: 'individual', location: 'mainland', values: {} }));
  assert.equal((await mySchedule(env, amy, TODAY)).gospelPending, false, '보고했으면 알리지 않는다');
  store.set('gospel:exempt:bob@wol.org', JSON.stringify({ by: 'x' }));
  assert.equal((await mySchedule(env, { email: 'bob@wol.org', role: 'counselor' }, TODAY)).gospelPending, false, '보고 제외 계정은 알리지 않는다');
  assert.equal((await mySchedule(env, { email: 'admin@wolko.org', role: 'master' }, TODAY)).gospelPending, false, '관리자(고정 제외)도 알리지 않는다');
  assert.equal((await mySchedule(env, { role: 'counselor' }, TODAY)), null, '이메일이 없으면 없음');
  assert.deepEqual((await mySchedule(env, { email: 'zed@wol.org', role: 'counselor' }, TODAY)).kitchen, []);
});

// ── 공지 자동 번역 ──
const sseText = text => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`)); c.close(); } }), { status: 200 });

test('공지 번역: 올릴 때 한↔영 번역이 함께 저장되고, 번역이 없던 공지는 뒤에서 채워진다(실패하면 1시간 뒤에 다시)', async () => {
  const { translateMissingNotices, NOTICES_KEY } = await import('../functions/lib/portalDashboard.js');
  const { env, store } = kvEnv();
  env.ANTHROPIC_API_KEY = 'k';
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => sseText('{"title":"MRIC 교육","text":"모든 스태프는 영상을 시청해 주세요."}');
    const token = await createHubSessionToken('secret', MASTER_EMAILS[0], 'master');
    const post = await noticeApi.onRequestPost({ env, request: new Request('https://x/api/portal/notices', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ title: 'MRIC Training', body: 'Every staff should watch the video.', week: 'this' }) }) });
    assert.equal(post.status, 201);
    const saved = (await post.json()).notice;
    assert.deepEqual(saved.tr, { lang: 'ko', title: 'MRIC 교육', text: '모든 스태프는 영상을 시청해 주세요.' });

    // 이미 올라가 있던 번역 없는 공지 — 뒤에서 번역
    const old = [{ id: 'old1', title: 'MRIC Training', body: 'Every single staff should watch.', weekStart: '2026-10-26', createdAt: '2026-10-26T00:00:00Z' }, { id: 'has', title: '제목', body: '내용', tr: { lang: 'en', title: 'x', text: 'y' }, weekStart: '2026-10-26', createdAt: '2026-10-26T00:00:00Z' }];
    store.set(NOTICES_KEY, JSON.stringify(old));
    assert.equal(await translateMissingNotices(env, { now: 1000 }), 1, '번역이 없는 것만');
    const after = JSON.parse(store.get(NOTICES_KEY));
    assert.equal(after[0].tr.lang, 'ko'); assert.equal(after[1].tr.title, 'x', '이미 있던 번역은 그대로');

    // 실패하면 표시만 해 두고 1시간 안에는 다시 시도하지 않는다
    store.set(NOTICES_KEY, JSON.stringify([{ id: 'n2', title: 'T', body: 'B', weekStart: '2026-10-26', createdAt: '2026-10-26T00:00:00Z' }]));
    globalThis.fetch = async () => new Response('down', { status: 503 });
    assert.equal(await translateMissingNotices(env, { now: 5000 }), 0);
    assert.equal(JSON.parse(store.get(NOTICES_KEY))[0].trTry, 5000);
    let calls = 0; globalThis.fetch = async () => { calls++; return sseText('{"title":"티","text":"비"}'); };
    assert.equal(await translateMissingNotices(env, { now: 5000 + 600000 }), 0); assert.equal(calls, 0, '10분 뒤에는 아직 다시 시도하지 않는다');
    assert.equal(await translateMissingNotices(env, { now: 5000 + 3700000 }), 1); assert.equal(calls, 1, '1시간이 지나면 다시 시도');
    assert.equal(await translateMissingNotices({ ...env, ANTHROPIC_API_KEY: '' }, { now: 1 }), 0, '키가 없으면 아무것도 하지 않는다');
  } finally { globalThis.fetch = realFetch; }
});

test('공지 담당 계정(esooy): 올릴 수 있고 자기가 올린 공지만 지울 수 있다 · 일반 계정은 못 올린다', async () => {
  const { env } = kvEnv();
  const put = (email, role) => env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  await put('esooy@wol.org', 'counselor'); await put('anna@wol.org', 'counselor'); await put(MASTER_EMAILS[0], 'master');
  const call = async (fn, who, url, init = {}) => {
    const token = await createHubSessionToken('secret', who[0], who[1]);
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  const estelle = ['esooy@wol.org', 'counselor'], anna = ['anna@wol.org', 'counselor'], master = [MASTER_EMAILS[0], 'master'];
  const url = 'https://x/api/portal/notices';
  assert.equal((await call(noticeApi.onRequestPost, anna, url, { method: 'POST', body: JSON.stringify({ body: '일반 계정' }) })).status, 403);
  const mine = await call(noticeApi.onRequestPost, estelle, url, { method: 'POST', body: JSON.stringify({ title: '키친 안내', body: '이번 주 주방 안내' }) });
  assert.equal(mine.status, 201); assert.equal('byEmail' in mine.body.notice, false, '응답에 이메일은 없다');
  const adminMade = await call(noticeApi.onRequestPost, master, url, { method: 'POST', body: JSON.stringify({ body: '관리자 공지' }) });
  // 첫 화면: 공지 담당 계정은 올리기 폼이 보이고, 자기 공지에만 삭제 버튼이 있다
  const dash = await buildDashboard(env, { email: 'esooy@wol.org', role: 'counselor', name: 'Estelle' }, NOW);
  assert.equal(dash.canEditNotices, true);
  const byTitle = Object.fromEntries(dash.notices.map(n => [n.body, n.canDelete]));
  assert.deepEqual(byTitle, { '이번 주 주방 안내': true, '관리자 공지': false });
  assert.ok(dash.notices.every(n => !('byEmail' in n)));
  assert.equal((await buildDashboard(env, { email: 'anna@wol.org', role: 'counselor' }, NOW)).canEditNotices, false);
  assert.ok((await buildDashboard(env, { email: MASTER_EMAILS[0], role: 'master' }, NOW)).notices.every(n => n.canDelete), '마스터는 모두 지울 수 있다');
  assert.equal((await call(noticeApi.onRequestDelete, estelle, `${url}?id=${adminMade.body.notice.id}`, { method: 'DELETE' })).status, 403, '남이 올린 공지는 못 지운다');
  assert.equal((await call(noticeApi.onRequestDelete, estelle, `${url}?id=${mine.body.notice.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await call(noticeApi.onRequestDelete, anna, `${url}?id=${adminMade.body.notice.id}`, { method: 'DELETE' })).status, 403);
});

test('공지 고치기: 제목·내용·마감일·고정을 바꾸고 번역은 새로 만든다 · 지울 수 있는 사람만', async () => {
  const { env } = kvEnv();
  const put = (email, role) => env.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  await put('esooy@wol.org', 'counselor'); await put('anna@wol.org', 'counselor'); await put(MASTER_EMAILS[0], 'master');
  const call = async (fn, who, init = {}, url = 'https://x/api/portal/notices') => {
    const token = await createHubSessionToken('secret', who[0], who[1]);
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  const estelle = ['esooy@wol.org', 'counselor'], anna = ['anna@wol.org', 'counselor'], master = [MASTER_EMAILS[0], 'master'];
  const mine = (await call(noticeApi.onRequestPost, estelle, { method: 'POST', body: JSON.stringify({ title: '처음', body: '처음 내용', week: 'next' }) })).body.notice;
  const others = (await call(noticeApi.onRequestPost, master, { method: 'POST', body: JSON.stringify({ body: '관리자 공지' }) })).body.notice;
  const edit = (who, id, extra) => call(noticeApi.onRequestPost, who, { method: 'POST', body: JSON.stringify({ action: 'edit', id, ...extra }) });
  assert.equal((await edit(anna, mine.id, { body: '남이 고침' })).status, 403);
  assert.equal((await edit(estelle, others.id, { body: '남의 공지' })).status, 403, '공지 담당 계정은 남이 올린 공지를 못 고친다');
  assert.equal((await edit(estelle, mine.id, { body: ' ' })).status, 400);
  assert.equal((await edit(estelle, 'nope', { body: 'x' })).status, 404);
  const ok = await edit(estelle, mine.id, { title: '바뀐 제목', body: '바뀐 내용', dueDate: '2026-11-05', pinned: true });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.body.notice.title, ok.body.notice.body, ok.body.notice.dueDate, ok.body.notice.pinned], ['바뀐 제목', '바뀐 내용', '2026-11-05', true]);
  assert.equal(ok.body.notice.weekStart, mine.weekStart, '올린 주는 그대로');
  assert.equal('byEmail' in ok.body.notice, false);
  assert.equal((await edit(master, others.id, { body: '마스터가 고침' })).status, 200, '관리자는 모두 고칠 수 있다');
  assert.equal(JSON.parse(await env.CAMP_KV.get('portal:notices'))?.length, 2);
});
