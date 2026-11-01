import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import * as Forms from '../functions/api/campteam/camp-forms.js';
import { mergeRequests } from '../functions/api/campteam/camp-forms.js';
import { cleanContent, checkReady, starterContent, copyContent, cardFromCms, cardToCms, cleanCard, unchangedFields, suggestCampId, FIELDS, isoToKst, kstToIso } from '../functions/lib/campForms.js';
import { inboxFor, syncLive } from '../functions/lib/campFormFlow.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const url = 'http://localhost/api/campteam/camp-forms';
const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { method: o.method || 'GET', url: url + (o.qs || ''), body: o.body }) }); return { status: r.status, body: await r.json() }; };
const dir = root + 'src/content/camp_schedules/', real = (f) => JSON.parse(readFileSync(dir + f, 'utf8'));
const feedOf = (extra = []) => readdirSync(dir).map((f) => { const raw = real(f); return { id: f.replace(/\.json$/, ''), titleKo: raw.title_ko, campType: raw.camp_type, startDate: (raw.start_date || '').slice(0, 10), raw }; }).concat(extra);
const withFeed = (env, extra) => ({ ...env, ASSETS: { fetch: async () => new Response(JSON.stringify({ items: feedOf(extra) }), { headers: { 'content-type': 'application/json' } }) } });
async function setup(extraFeed) {
  const env = withFeed(makeEnv(fakeD1()), extraFeed);
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir, U.fin], approver: [U.admin], deployer: [U.tre] } })).status, 200); return env;
}
const mk = async (env, o = {}) => { const c = await call(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'camper', campType: 'english', ...o } }); assert.equal(c.status, 201, JSON.stringify(c.body)); return c.body.id; };
const act = (env, id, who, action, extra = {}) => call(Forms.onRequestPost, env, who, { method: 'POST', qs: '?id=' + id, body: { action, ...extra } });
const detail = async (env, id, who = U.mem) => (await call(Forms.onRequestGet, env, who, { qs: '?id=' + id })).body;
/** 지난 캠프 값을 새 캠프 값으로 고친다 (이름·날짜·대상 등) — 같은 값으로 남는 항목은 일부러 몇 개 둔다 */
async function fill(env, id, extra = {}) {
  const d = (await detail(env, id)).form, c = d.content; c.card = { ...c.card, titleKo: '2099 여름 테스트 캠프', titleEn: '2099 Summer Test Camp', dateKo: '2099년 7월 12일', dateEn: 'July 12, 2099', targetKo: '초6 – 중3', targetEn: 'Grades 6–9', startDate: '2099-07-12T09:00', ...extra.card };
  return call(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { content: c, ...extra.body } });
}

test('홈페이지 캠프 파일 ↔ 카드 항목: 실제 캠프 파일 전부가 손실 없이 왕복한다', () => {
  const norm = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { if (v === '' || v === null || v === false || v === undefined || v === 'false') continue; r[k] = /_date$/.test(k) ? Date.parse(v) : v === 'true' ? true : v; } if (r.capacity === undefined) r.capacity = 40; return r; };
  const files = readdirSync(dir); assert.ok(files.length >= 10);
  for (const f of files) { const raw = real(f), out = cardToCms(cardFromCms(raw)); assert.deepEqual(norm(out), norm(raw), f + ' 가 왕복하면서 달라졌어요'); }
  const out = cardToCms(cleanCard({ titleKo: '가', titleEn: 'a', campType: 'union', dateKo: 'd', dateEn: 'd', targetKo: 't', targetEn: 't', startDate: '2099-01-02T03:04', status: 'upcoming' }));
  for (const k of ['title_ko', 'title_en', 'camp_type', 'date_ko', 'date_en', 'target_ko', 'target_en', 'status']) assert.ok(out[k] !== undefined, k + ' 는 홈페이지 파일의 필수 칸이에요');
  assert.ok(['english', 'jeju', 'union'].includes(out.camp_type) && ['open', 'closed', 'upcoming', 'full'].includes(out.status)); assert.equal(out.start_date, '2099-01-02T03:04:00+09:00'); assert.equal(out.capacity, 40); assert.equal(out.order, 99);
  assert.equal(isoToKst('2027-01-11T00:00:00.000Z'), '2027-01-11T09:00'); assert.equal(kstToIso('2027-01-11T09:00'), '2027-01-11T09:00:00+09:00'); assert.equal(new Set(FIELDS.map((f) => f.key)).size, FIELDS.length);
});

test('파일 이름 제안: 지난 캠프 형식에 연도·계절만 맞춘다', () => {
  assert.equal(suggestCampId({ startDate: '2027-07-12T09:00', campType: 'english' }, '2027-wolko-winter', []), '2027-wolko-summer');
  assert.equal(suggestCampId({ startDate: '2028-01-10T09:00', campType: 'english' }, '2027-wolko-winter', []), '2028-wolko-winter');
  assert.equal(suggestCampId({ startDate: '2028-01-10T09:00', campType: 'english' }, '2027-wolko-winter', ['2028-wolko-winter']), '2028-wolko-winter-2');
  assert.equal(suggestCampId({ startDate: '2027-07-12T09:00', campType: 'union' }, '', []), '2027-unity-summer'); assert.equal(suggestCampId({ startDate: '2027-07-12T09:00', campType: 'english' }, '2026-jeju-english', []), '2027-jeju-english');
});

test('바뀌지 않은 항목 찾기와 검토 전 점검', () => {
  const base = cardFromCms(real('2027-wolko-winter.json')), card = { ...base, titleKo: '새 캠프', startDate: '2099-07-12T09:00' };
  const un = unchangedFields(card, base); assert.ok(un.includes('titleEn') && un.includes('priceKo') && un.includes('contactPhone') && !un.includes('titleKo') && !un.includes('startDate') && !un.includes('status') && !un.includes('campType'));
  const content = { ...starterContent('camper'), card, base }; content.card.titleEn = 'New'; content.card.dateKo = 'x'; content.card.dateEn = 'x';
  const ok = { campId: '2099-summer-test', taken: [] };
  let r = checkReady(content, 'camper', { ...ok, ack: false }); assert.deepEqual(r.problems, []); assert.equal(r.needAck, true, '같은 값이 남아 있으면 확인 체크가 필요하다'); assert.equal(checkReady(content, 'camper', { ...ok, ack: true }).needAck, false);
  r = checkReady({ ...content, card: { ...card, startDate: '2020-01-01T09:00' } }, 'camper', { ...ok, ack: true }); assert.ok(r.problems.some((x) => x.includes('이미 지났')), '지난 날짜는 막는다');
  assert.ok(checkReady(content, 'camper', { campId: 'AB', taken: [], ack: true }).problems.some((x) => x.includes('파일 이름'))); assert.ok(checkReady(content, 'camper', { campId: '2099-summer-test', taken: ['2099-summer-test'], ack: true }).problems.some((x) => x.includes('이미 있는')));
  assert.ok(checkReady({ ...content, card: { ...content.card, capacityMale: 30, capacityFemale: 30, capacity: 40 } }, 'camper', { ...ok, ack: true }).problems.some((x) => x.includes('합')));
  assert.ok(checkReady({ ...content, card: { ...content.card, useExternalForm: true, registrationUrl: '' } }, 'camper', { ...ok, ack: true }).problems.some((x) => x.includes('링크')));
  assert.ok(!starterContent('staff').blocks.some((b) => !b.label.ko), '기본 양식은 비어 있는 질문이 없다'); const ids = new Set(copyContent(content).blocks.map((b) => b.id)); assert.ok(!content.blocks.some((b) => ids.has(b.id)));
});

test('역할: 관리자만 정하고, 팀 명단에 있는 사람만 (배포 담당 포함)', async () => {
  const env = withFeed(makeEnv(fakeD1()));
  assert.equal((await call(Forms.onRequestPut, env, U.mem, { method: 'PUT', body: { editor: [U.mem] } })).status, 403);
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { deployer: ['nobody@example.com'] } })).status, 400);
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir], approver: [U.admin], deployer: [U.tre] } })).body.roles.deployer.length, 1);
  const meta = (await call(Forms.onRequestGet, env, U.tre, { qs: '?meta=1' })).body; assert.equal(meta.me.deployer, true); assert.equal(meta.me.editor, false); assert.ok(meta.snippets.length > 10 && meta.fields.length >= 28 && meta.groups.adv);
  assert.equal((await call(Forms.onRequestGet, env, U.out)).status, 403, '명단 밖');
});

test('새 신청서: 지난 캠프의 CMS 내용을 불러오고, 파일 이름을 제안하며, 바뀐 것만 고치게 한다', async () => {
  const env = await setup(), id = await mk(env), d = (await detail(env, id)).form;
  const latest = feedOf().filter((x) => x.campType === 'english').sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  assert.equal(d.baseCampId, latest.id, '같은 유형의 가장 최근 캠프가 자동으로 불러와진다'); assert.equal(d.content.card.titleKo, latest.raw.title_ko); assert.equal(d.content.card.status, 'upcoming'); assert.deepEqual(d.content.base.titleKo, latest.raw.title_ko);
  assert.match(d.campId, /^\d{4}-[a-z0-9-]+$/); assert.ok(!feedOf().some((x) => x.id === d.campId), '이미 있는 파일 이름과 겹치지 않는다');
  const pick = await mk(env, { baseCamp: '2027-unity-winter', campType: 'union' }); assert.equal((await detail(env, pick)).form.content.card.priceKo, real('2027-unity-winter.json').price_ko);
  const un = (await detail(env, id)).unchanged; assert.ok(un.length > 5, '처음에는 같은 값이 많이 남아 있다');
  assert.equal((await call(Forms.onRequestPost, env, U.view, { method: 'POST', body: { kind: 'camper' } })).status, 403, '작성 담당이 아니면 못 만든다');
});

test('AI 빈 칸 채우기: 한쪽만 있는 한국어·영어 칸만 채우고 지난 캠프 말투를 예시로 준다', async () => {
  const env = { ...(await setup()), ANTHROPIC_API_KEY: 'k', CAMPTEAM_AI_URL: 'http://ai.test/v1/messages' }, id = await mk(env), real0 = globalThis.fetch, calls = [];
  globalThis.fetch = async (u, init) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"dateEn":"July 12–17, 2099","targetEn":"Grades 6–9","evil":"x"}' }] }), { status: 200 }); };
  try {
    const card = { ...(await detail(env, id)).form.content.card, dateKo: '2099년 7월 12일 – 17일', dateEn: '', targetKo: '초6 – 중3', targetEn: '' };
    const r = await act(env, id, U.mem, 'aifill', { card }); assert.deepEqual(r.body.fills, { dateEn: 'July 12–17, 2099', targetEn: 'Grades 6–9' }, '요청한 빈 칸만 채워진다');
    assert.ok(calls[0].system.includes('KO:') && calls[0].system.includes('EN:'), '지난 캠프의 한/영 쌍을 말투 예시로 준다'); assert.equal(JSON.parse(calls[0].messages[0].content).length, 2);
    assert.equal((await act(env, id, U.view, 'aifill', { card })).status, 403);
  } finally { globalThis.fetch = real0; }
  assert.equal((await act({ ...env, ANTHROPIC_API_KEY: '' }, id, U.mem, 'aifill', { card: {} })).status, 503);
});

test('코드 요청 합치기: 작성 중에는 글만, 최종 확인에서는 상태·PR 링크·설명만', () => {
  const a = mergeRequests([], [{ text: '장학금을 바꿔 주세요' }, { text: '  ' }], 'draft', 'ella@example.com'); assert.equal(a.length, 1); assert.equal(a[0].state, 'requested');
  const b = mergeRequests(a, [{ id: a[0].id, state: 'ready', prUrl: 'https://github.com/WordofLifeKorea/wolko-website/pull/77', note: '설명', text: '몰래 바꿈' }], 'final', 'aiden@example.com');
  assert.equal(b[0].text, '장학금을 바꿔 주세요', '최종 확인자는 글을 바꿀 수 없다'); assert.equal(b[0].state, 'ready'); assert.equal(b[0].prUrl.endsWith('/pull/77'), true);
  assert.equal(mergeRequests(a, [{ id: a[0].id, state: 'ready', prUrl: 'https://evil.example.com/x', note: 'n' }], 'final', 'x')[0].prUrl, '', 'GitHub 변경 요청 주소만 받는다');
  assert.equal(mergeRequests(b, [{ id: b[0].id, text: '글 고침' }], 'draft', 'x')[0].text, '장학금을 바꿔 주세요', '처리가 시작된 요청은 글을 바꿀 수 없다');
});

test('인계 전체 흐름: 작성 → 검토 → 최종 확인(코드 요청 마무리) → 환규님께 알림 → 확인 → 팀 완료 알림 → 홈페이지 반영 확인과 캠프별 공간', async () => {
  const env = await setup(), id = await mk(env);
  assert.equal((await act(env, id, U.mem, 'submit')).status, 400, '비어 있거나 지난 날짜면 검토를 요청할 수 없다');
  assert.equal((await fill(env, id, { body: { codeRequests: [{ text: '이번 캠프 장학금은 야고보서 대신 요한복음 암송, 할인 5만원' }] } })).status, 200);
  const cid = (await detail(env, id)).form.campId;
  const sub = await act(env, id, U.mem, 'submit'); assert.equal(sub.status, 400); assert.equal(sub.body.needAck, true, '바뀌지 않은 항목이 있으면 확인 체크가 필요하다'); assert.ok(sub.body.unchanged.length >= 1);
  assert.equal((await act(env, id, U.mem, 'submit', { ack: true })).body.status, 'review');
  const n = (role) => env.DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE sourceKey LIKE ?1`).bind(`form:${id}:${role}:%`).first().then((x) => x.n);
  assert.equal(await n('reviewer'), 2); assert.equal((await call(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { title: 'x' } })).status, 400, '검토 중에는 작성자도 고칠 수 없다');
  assert.equal((await act(env, id, U.admin, 'approve')).status, 403, '최종 확인자도 검토 단계에서는 승인할 수 없다'); assert.equal((await act(env, id, U.dir, 'approve')).body.waiting, true); assert.equal((await act(env, id, U.fin, 'approve')).body.status, 'final'); assert.equal(await n('approver'), 1);
  const stuck = await act(env, id, U.admin, 'approve'); assert.equal(stuck.status, 400); assert.ok(stuck.body.problems[0].includes('코드 요청'), '코드 요청이 남아 있으면 인계할 수 없다');
  assert.equal((await call(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { title: 'x' } })).status, 400, '최종 확인 단계에서는 작성자가 고칠 수 없다');
  const d1 = (await detail(env, id, U.admin)).form;
  assert.equal((await call(Forms.onRequestPatch, env, U.admin, { method: 'PATCH', qs: '?id=' + id, body: { notify: true, content: d1.content, codeRequests: [{ id: d1.codeRequests[0].id, state: 'ready', prUrl: 'https://github.com/WordofLifeKorea/wolko-website/pull/99', note: '야고보서를 요한복음으로 바꾸는 코드예요', text: '무시됨' }] } })).status, 200);
  const ann = await env.DB.prepare(`SELECT a.id, a.link FROM announcements a WHERE a.title LIKE '캠프팀:%고쳤어요'`).first(); assert.ok(ann && ann.link.includes(id), 'Aiden 이 고치면 Ella·Jason 에게 알림이 간다');
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM announcement_recipients WHERE announcementId = ?1').bind(ann.id).first()).n, 3, '작성자 1명 + 검토자 2명');
  assert.equal((await inboxFor(env, U.tre)).length, 0, '인계 전에는 환규님 알림이 없다');
  assert.equal((await act(env, id, U.admin, 'approve')).body.status, 'handed');
  const bell = await inboxFor(env, U.tre); assert.equal(bell.length, 1); assert.ok(bell[0].title.includes('캠프팀에서 온 요청 (새 캠프 카드)') && bell[0].href.includes(id) && bell[0].kind === 'camp_handoff');
  assert.equal((await inboxFor(env, U.dir)).length, 0, '다른 사람에게는 가지 않는다'); assert.equal((await inboxFor(env, U.admin)).length, 0);
  const hd = await detail(env, id, U.tre); assert.equal(hd.form.status, 'handed'); assert.equal(hd.cms.title_ko, '2099 여름 테스트 캠프'); assert.equal(hd.cms.start_date, '2099-07-12T09:00:00+09:00'); assert.equal(hd.form.codeRequests[0].state, 'ready');
  assert.equal((await act(env, id, U.admin, 'confirm')).status, 403, '배포 담당만 확인할 수 있다'); assert.equal((await act(env, id, U.dir, 'confirm')).status, 403);
  assert.equal((await act(env, id, U.tre, 'confirm')).body.status, 'confirmed');
  assert.equal((await inboxFor(env, U.tre)).length, 0, '확인하면 환규님 알림이 사라진다');
  for (const who of [U.mem, U.dir, U.fin, U.admin]) { const l = await inboxFor(env, who); assert.equal(l.length, 1, who + ' 에게 완료 알림'); assert.ok(l[0].kind === 'camp_done' && l[0].title.includes('확인했어요')); }
  const done = await env.DB.prepare(`SELECT a.id FROM announcements a WHERE a.title LIKE '%확인했어요'`).first(); assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM announcement_recipients WHERE announcementId = ?1').bind(done.id).first()).n, 4, '캠프팀 포털 알림도 4명에게');
  await detail(env, id, U.mem); assert.equal((await inboxFor(env, U.mem)).length, 0, '신청서를 열면 완료 알림은 읽음 처리된다'); assert.equal((await inboxFor(env, U.dir)).length, 1);
  // 홈페이지에 아직 없으면 반영 완료가 아니다. 파일 이름이 홈페이지 목록에 보이면 표시하고 캠프별 공간을 만든다
  const camps0 = (await env.DB.prepare('SELECT COUNT(*) AS n FROM camps').first()).n; await call(Forms.onRequestGet, env, U.mem); assert.equal((await detail(env, id)).form.liveAt, null); assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM camps').first()).n, camps0);
  const live = withFeed(env, [{ id: cid, titleKo: '2099 여름 테스트 캠프', campType: 'english', startDate: '2099-07-12', raw: cardToCms((await detail(env, id)).form.content.card) }]);
  await call(Forms.onRequestGet, live, U.mem); assert.ok((await detail(live, id)).form.liveAt, '홈페이지 반영 완료 표시');
  const camp = await env.DB.prepare('SELECT nameKo, startDate, endDate, capacity, registrationCampId FROM camps WHERE registrationCampId = ?1').bind(cid).first(); assert.ok(camp && camp.nameKo === '2099 여름 테스트 캠프' && camp.startDate === '2099-07-12', '캠프별 공간 자동 생성');
  await syncLive(live, new Request('http://x/')); assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM camps WHERE registrationCampId = ?1').bind(cid).first()).n, 1, '두 번 만들지 않는다');
});

test('환규님이 되돌리면 최종 확인으로 돌아가고 팀에 알림이 간다', async () => {
  const env = await setup(), id = await mk(env); await fill(env, id);
  await act(env, id, U.mem, 'submit', { ack: true }); await act(env, id, U.dir, 'approve'); await act(env, id, U.fin, 'approve'); assert.equal((await act(env, id, U.admin, 'approve')).body.status, 'handed');
  assert.equal((await act(env, id, U.tre, 'dreturn')).status, 400, '이유가 필요하다'); assert.equal((await act(env, id, U.admin, 'dreturn', { comment: 'x' })).status, 403);
  assert.equal((await act(env, id, U.tre, 'dreturn', { comment: '참가비 표기를 통일해 주세요' })).body.status, 'final');
  assert.equal((await inboxFor(env, U.tre)).length, 0); const l = await inboxFor(env, U.admin); assert.ok(l.some((x) => x.kind === 'camp_return' && x.title.includes('되돌아왔어요')));
  const det = await detail(env, id, U.admin); assert.ok(det.approvals.some((a) => a.decision === 'return' && a.comment.includes('참가비')));
  assert.equal((await act(env, id, U.admin, 'approve')).body.status, 'handed', '다시 인계하면 환규님 알림이 또 온다'); assert.equal((await inboxFor(env, U.tre)).length, 1);
});

test('인계 전 점검: 배포 담당이 없으면 검토를 요청할 수 없고, 이유 없이는 되돌릴 수 없다', async () => {
  const env = withFeed(makeEnv(fakeD1())); await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir], approver: [U.admin] } });
  const id = await mk(env); await fill(env, id); const r = await act(env, id, U.mem, 'submit', { ack: true }); assert.equal(r.status, 400); assert.ok(r.body.error.includes('배포 담당'));
  const env2 = await setup(), id2 = await mk(env2); await fill(env2, id2); await act(env2, id2, U.mem, 'submit', { ack: true }); assert.equal((await act(env2, id2, U.dir, 'return')).status, 400);
  assert.equal((await act(env2, id2, U.dir, 'return', { comment: '날짜 확인' })).body.status, 'draft'); assert.equal((await act(env2, id2, U.mem, 'duplicate')).status, 201);
});

test('이번 기능은 홈페이지와 연결되어 있지 않다: 홈페이지용 파일·API 가 없고 기존 신청 페이지는 그대로', async () => {
  for (const f of ['functions/api/camp-forms', 'src/pages/camp-apply', 'public/camp-forms']) assert.equal(existsSync(root + f), false, f + ' 는 없어야 한다');
  assert.ok(!readFileSync(root + 'src/pages/camp-register/index.astro', 'utf8').includes('portalForms'), '기존 신청 페이지에 끼워 넣은 것이 없다');
});

test('월코 포털 종 알림: 받은 요청이 있는 계정의 대시보드에만 한 줄이 더해지고, 없거나 표가 없어도 기존 알림은 그대로', async () => {
  const { buildDashboard } = await import('../functions/lib/portalDashboard.js'), { inboxAdd } = await import('../functions/lib/campFormFlow.js');
  const store = new Map(), kv = { get: async (k, t) => { const v = store.get(k); return v === undefined ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); }, delete: async (k) => { store.delete(k); }, list: async ({ prefix }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) };
  const env = { ADMIN_PASSWORD: 'secret', CAMP_KV: kv, DB: fakeD1() }, NOW = Date.parse('2026-10-28T03:00:00Z');
  await inboxAdd(env, ['hkim3@wol.org'], 'camp_handoff', '캠프팀에서 온 요청 (새 캠프 카드): 테스트', '/portal/campteam/prep/?tab=forms&form=abc', 'abc');
  const me = async (email, e = env) => (await buildDashboard(e, { email, role: 'counselor', name: 'X' }, NOW)).me;
  const hk = await me('hkim3@wol.org'); assert.equal(hk.campRequests.length, 1); assert.equal(hk.campRequests[0].title, '캠프팀에서 온 요청 (새 캠프 카드): 테스트'); assert.ok(hk.campRequests[0].href.startsWith('/portal/campteam/'));
  assert.deepEqual((await me('someone@wol.org')).campRequests, [], '다른 계정에는 없다');
  const noDb = await me('hkim3@wol.org', { ADMIN_PASSWORD: 'secret', CAMP_KV: kv }); assert.deepEqual(noDb.campRequests, []); assert.ok(Array.isArray(noDb.kitchen) && 'gospelPending' in noDb, '표가 없어도 주방·차량·복음 알림은 그대로');
  assert.ok(/\/portal\\\/campteam/.test(readFileSync(root + 'src/pages/portal.astro', 'utf8')) && readFileSync(root + 'src/pages/portal.astro', 'utf8').includes('todayCampGo'), '종 알림 목록에 캠프팀 줄이 연결되어 있다');
});
