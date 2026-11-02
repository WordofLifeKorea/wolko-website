import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import * as Camps from '../functions/api/campteam/camps.js';
import * as Cal from '../functions/api/campteam/calendar.js';
import * as Feed from '../functions/api/campteam/calendar-feed.js';
import * as Templates from '../functions/api/campteam/templates.js';
import * as Forms from '../functions/api/campteam/camp-forms.js';
import { cleanPrep, prepOf, prepForForm } from '../functions/lib/campteamPrepPeriod.js';
import { cleanContent, checkReady, starterContent, SNIPPETS } from '../functions/lib/campForms.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const J = (r) => r.json();
const callCamps = async (env, who, method, body, qs = '') => { const r = await Camps['onRequest' + method[0] + method.slice(1).toLowerCase()]({ env, request: await req(who, { method, body, url: 'http://localhost:8788/api/campteam/camps' + qs }) }); return { status: r.status, body: await r.json() }; };
const listCamps = async (env, who = U.mem) => (await callCamps(env, who, 'GET')).body.types.flatMap((t) => t.camps);
const typeOf = async (env) => (await callCamps(env, U.mem, 'GET')).body.types[0].id;
const newCamp = async (env, o = {}) => { const r = await callCamps(env, U.mem, 'POST', { kind: 'camp', typeId: await typeOf(env), nameKo: '준비주간 테스트 캠프', startDate: '2099-07-12', endDate: '2099-07-17', ...o }); return r; };

test('0039 마이그레이션은 덧붙이기만 한다 (준비기간 칸 2개 + 자동 적용 스위치)', () => {
  const sql = readFileSync(root + 'camp-team/db/0039_prep_period.sql', 'utf8').replace(/--.*$/gm, '');
  assert.ok(/ALTER TABLE camps ADD COLUMN prepStart TEXT/.test(sql) && /ALTER TABLE camps ADD COLUMN prepEnd TEXT/.test(sql));
  assert.ok(/ALTER TABLE checklist_templates ADD COLUMN autoApply INTEGER NOT NULL DEFAULT 0/.test(sql));
  assert.equal(/DROP|DELETE|UPDATE\s|INSERT/i.test(sql), false);
});

test('준비기간 검사: 둘 다 있거나 둘 다 없어야 하고, 끝이 시작보다 빠르면 안 된다', () => {
  assert.deepEqual(cleanPrep({ prepStart: '2099-07-05', prepEnd: '2099-07-11' }), { prepStart: '2099-07-05', prepEnd: '2099-07-11', touched: true });
  assert.deepEqual(cleanPrep({ prepStart: '', prepEnd: '' }, { prepStart: '2099-07-05', prepEnd: '2099-07-11' }), { prepStart: null, prepEnd: null, touched: true }, '둘 다 비우면 준비기간 없음');
  assert.deepEqual(cleanPrep({ nameKo: 'x' }, { prepStart: '2099-07-05', prepEnd: '2099-07-11' }), { prepStart: '2099-07-05', prepEnd: '2099-07-11', touched: false }, '안 보내면 그대로');
  assert.deepEqual(cleanPrep({}, {}), { prepStart: null, prepEnd: null, touched: false });
  for (const bad of [{ prepStart: '2099-07-05' }, { prepEnd: '2099-07-05' }, { prepStart: '2099-07-12', prepEnd: '2099-07-05' }, { prepStart: '07/05', prepEnd: '07/11' }, { prepStart: '2099-13-01', prepEnd: '2099-13-02' }]) {
    const r = cleanPrep(bad); assert.ok(r.error && /[가-힣]/.test(r.error), JSON.stringify(bad) + ' → 한국어 안내');
  }
  assert.equal(prepOf({ prepStart: '2099-07-05', prepEnd: '2099-07-11' }).end, '2099-07-11'); assert.equal(prepOf({ prepStart: '2099-07-05', prepEnd: null }), null); assert.equal(prepOf(null), null);
});

test('캠프 API: 준비기간 저장·수정·지우기, 잘못된 값은 친절한 한국어 400, 목록의 모든 캠프에 칸이 있다', async () => {
  const env = makeEnv(fakeD1());
  assert.ok((await listCamps(env)).every((c) => 'prepStart' in c && 'prepEnd' in c), '기존 캠프도 칸이 있다(없으면 null)');
  assert.ok((await listCamps(env)).every((c) => c.prepStart === null && c.prepEnd === null));
  const bad1 = await newCamp(env, { prepStart: '2099-07-05' }); assert.equal(bad1.status, 400); assert.match(bad1.body.error, /준비기간/);
  const bad2 = await newCamp(env, { prepStart: '2099-07-12', prepEnd: '2099-07-05' }); assert.equal(bad2.status, 400); assert.match(bad2.body.error, /종료일/);
  assert.equal((await newCamp(env, { prepStart: 'abc', prepEnd: 'def' })).status, 400);
  const c = await newCamp(env, { prepStart: '2099-07-05', prepEnd: '2099-07-11' }); assert.equal(c.status, 201);
  let got = (await listCamps(env)).find((x) => x.id === c.body.id); assert.equal(got.prepStart, '2099-07-05'); assert.equal(got.prepEnd, '2099-07-11');
  const none = await newCamp(env, { nameKo: '준비주간 없는 캠프', prepStart: '', prepEnd: '' }); assert.equal(none.status, 201);
  got = (await listCamps(env)).find((x) => x.id === none.body.id); assert.equal(got.prepStart, null);
  // 수정: 안 보내면 그대로, 한쪽만 보내면 거절, 둘 다 비우면 지워진다
  assert.equal((await callCamps(env, U.mem, 'PATCH', { nameKo: '이름만 바꿈' }, `?kind=camp&id=${c.body.id}`)).status, 200);
  got = (await listCamps(env)).find((x) => x.id === c.body.id); assert.equal(got.nameKo, '이름만 바꿈'); assert.equal(got.prepStart, '2099-07-05', '준비기간은 보내지 않으면 안 바뀐다');
  const half = await callCamps(env, U.mem, 'PATCH', { prepEnd: '' }, `?kind=camp&id=${c.body.id}`); assert.equal(half.status, 400); assert.match(half.body.error, /함께/);
  assert.equal((await listCamps(env)).find((x) => x.id === c.body.id).prepEnd, '2099-07-11', '거절되면 아무것도 안 바뀐다');
  assert.equal((await callCamps(env, U.mem, 'PATCH', { prepStart: '2099-07-01', prepEnd: '2099-07-10' }, `?kind=camp&id=${c.body.id}`)).status, 200);
  assert.equal((await listCamps(env)).find((x) => x.id === c.body.id).prepStart, '2099-07-01');
  assert.equal((await callCamps(env, U.mem, 'PATCH', { prepStart: '', prepEnd: '' }, `?kind=camp&id=${c.body.id}`)).status, 200);
  assert.equal((await listCamps(env)).find((x) => x.id === c.body.id).prepEnd, null);
  assert.equal((await callCamps(env, U.view, 'PATCH', { prepStart: '2099-07-01', prepEnd: '2099-07-10' }, `?kind=camp&id=${c.body.id}`)).status, 403, '조회만 하는 계정은 못 바꾼다');
});

test('0039 가 아직 없는 DB: 목록·평소 캠프 만들기는 그대로 되고, 준비기간을 넣으려 할 때만 안내가 나온다', async () => {
  const env = makeEnv(fakeD1()); env.DB.sqlite.exec('ALTER TABLE camps DROP COLUMN prepStart; ALTER TABLE camps DROP COLUMN prepEnd; ALTER TABLE checklist_templates DROP COLUMN autoApply;');
  const camps = await listCamps(env); assert.ok(camps.length > 0 && camps.every((c) => c.prepStart === null && c.prepEnd === null));
  assert.equal((await newCamp(env)).status, 201, '준비기간 없이 만들기는 그대로');
  const r = await newCamp(env, { nameKo: '다른 캠프', prepStart: '2099-07-05', prepEnd: '2099-07-11' }); assert.equal(r.status, 400); assert.match(r.body.error, /0039/);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM camps WHERE nameKo='다른 캠프'").get().n, 0, '반쯤 만들어진 캠프가 남지 않는다');
  const id = camps[0].id; assert.equal((await callCamps(env, U.mem, 'PATCH', { nameKo: '수정 OK' }, `?kind=camp&id=${id}`)).status, 200, '준비기간 없이 수정은 그대로');
  assert.equal((await callCamps(env, U.mem, 'PATCH', { prepStart: '2099-07-05', prepEnd: '2099-07-11' }, `?kind=camp&id=${id}`)).status, 400);
  // 달력·템플릿 목록도 열린다
  assert.equal((await Cal.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost/api/campteam/calendar?from=2026-01-01&to=2026-02-12' }) })).status, 200);
  const tl = await J(await Templates.onRequestGet({ env, request: await req(U.mem) })); assert.ok(tl.templates.every((t) => t.autoApply === 0));
});

test('달력: 준비기간이 범위에 걸리면 캠프 기간이 범위 밖이어도 내려가고, 폰 달력(ICS)에 종일 일정이 생긴다', async () => {
  const env = { ...makeEnv(fakeD1()), CAMPTEAM_PHONE_TOOLS: 'on' };
  const c = await newCamp(env, { nameKo: '달력 시험 캠프', startDate: '2099-07-12', endDate: '2099-07-17', prepStart: '2099-07-05', prepEnd: '2099-07-11' });
  const cal = async (from, to) => (await J(await Cal.onRequestGet({ env, request: await req(U.mem, { url: `http://localhost/api/campteam/calendar?from=${from}&to=${to}` }) }))).camps.filter((x) => x.id === c.body.id);
  const inPrep = await cal('2099-07-01', '2099-07-09'); assert.equal(inPrep.length, 1, '캠프 시작 전의 달력에도 준비기간 때문에 내려간다'); assert.equal(inPrep[0].prepStart, '2099-07-05'); assert.equal(inPrep[0].prepEnd, '2099-07-11');
  assert.equal((await cal('2099-07-13', '2099-07-30')).length, 1, '캠프 기간 쪽은 그대로'); assert.equal((await cal('2099-06-01', '2099-06-30')).length, 0, '범위 밖이면 안 내려간다');
  const none = await newCamp(env, { nameKo: '준비 없는 캠프', startDate: '2099-09-12', endDate: '2099-09-17' });
  assert.equal((await J(await Cal.onRequestGet({ env, request: await req(U.mem, { url: 'http://localhost/api/campteam/calendar?from=2099-09-01&to=2099-09-09' }) }))).camps.filter((x) => x.id === none.body.id).length, 0);
  // 화면 코드: 띠 + 범례
  const js = readFileSync(root + 'public/portal/campteam/calendar.js', 'utf8');
  assert.ok(/c\.prepStart && c\.prepEnd\) span\(c\.prepStart, c\.prepEnd, \{ cls: 'prep'/.test(js), '준비기간 띠'); assert.ok(js.includes("['prep', 'lgPrep']") && js.includes("lgPrep: '캠프 준비 주'") && js.includes("lgPrep: 'Camp prep week'"));
  const css = readFileSync(root + 'public/portal/campteam/campteam.css', 'utf8'); for (const sel of ['.ci.prep', '.dot.prep', '.dayrow.prep']) assert.ok(css.includes(sel), sel);
  // ICS
  const row = env.DB.sqlite.prepare("SELECT token FROM calendar_tokens LIMIT 1").get();
  await Feed.onRequestGet({ env, request: await req(U.admin, { url: 'http://localhost/api/campteam/calendar-feed' }) });
  const token = env.DB.sqlite.prepare('SELECT token FROM calendar_tokens LIMIT 1').get().token; assert.ok(token && row === undefined);
  const ics = await (await Feed.onRequestGet({ env, request: new Request('http://localhost/api/campteam/calendar-feed?token=' + token) })).text();
  assert.ok(ics.includes(`UID:prep-${c.body.id}@campteam.wolko`)); assert.ok(ics.includes('SUMMARY:🧳 달력 시험 캠프 준비'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20990705') && ics.includes('DTEND;VALUE=DATE:20990712'), '종일 일정(끝 날짜는 다음 날 0시 규칙)');
  assert.equal(ics.includes(`UID:prep-${none.body.id}@`), false, '준비기간이 없으면 일정도 없다');
});

// ── 신청서: {준비기간} 글자와 「준비기간 안내」 칸 ──
function mkDoc() {
  const el = (tag) => ({ tag, children: [], dataset: {}, style: {}, attrs: {}, className: '', _t: '', appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; },
    set textContent(v) { this.children = []; this._t = String(v); }, get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); } });
  return { createElement: el };
}
function loadRender() { const win = {}, sb = { window: win, document: mkDoc() }; vm.runInNewContext(readFileSync(root + 'public/portal/campteam/form-render.js', 'utf8'), sb); return { W: win.WolkoForm, doc: sb.document }; }
const hasClass = (e, c) => String(e.className).split(' ').includes(c);
const walk = (e, fn) => { fn(e); e.children.forEach((x) => walk(x, fn)); };
const blocks = [
  { id: 'b1', type: 'paragraph', label: { ko: '준비기간은 {준비기간} 이에요.', en: 'Prep is {준비기간}.' }, help: { ko: '', en: '' } },
  { id: 'b2', type: 'prepinfo', label: { ko: '📅 준비기간 안내', en: '📅 Prep period notice' }, help: { ko: '', en: '' } },
  { id: 'b3', type: 'text', label: { ko: '이름', en: 'Name' }, help: { ko: '{준비기간} 에 참석 가능해야 해요', en: 'Must attend {준비기간}' }, required: true },
  { id: 'b4', type: 'radio', label: { ko: '참석', en: 'Attend' }, help: { ko: '', en: '' }, options: [{ ko: '{준비기간} 모두 참석', en: 'All of {준비기간}' }, { ko: '일부만', en: 'Part' }] },
];
const PREP = { start: '2025-12-20', end: '2025-12-26' }; // 토 ~ 금

test('신청서 그리기: {준비기간} 은 날짜로 바뀌고 「준비기간 안내」 칸은 문장으로 채워진다 (한국어·영어·둘 다)', () => {
  const { W, doc } = loadRender();
  assert.deepEqual(JSON.parse(JSON.stringify(W.prepText(PREP))), { ko: '12/20(토) ~ 12/26(금)', en: 'Sat 12/20 – Fri 12/26' });
  assert.equal(W.prepText(null), null); assert.equal(W.prepText({ start: '2025-12-26', end: '2025-12-20' }), null); assert.equal(W.prepText({ start: 'x', end: 'y' }), null);
  const ko = doc.createElement('div'); W.renderForm(ko, { blocks, prep: PREP }, 'ko'); const kt = ko.textContent;
  assert.ok(kt.includes('준비기간은 12/20(토) ~ 12/26(금) 이에요.')); assert.ok(kt.includes('캠프 준비기간: 12/20(토) ~ 12/26(금) — 이 기간에 먼저 와서 교육·준비를 해요'));
  assert.ok(kt.includes('12/20(토) ~ 12/26(금) 에 참석 가능해야 해요'), '도움말 글에도'); assert.ok(kt.includes('12/20(토) ~ 12/26(금) 모두 참석'), '선택지에도'); assert.equal(kt.includes('{준비기간}'), false);
  const en = doc.createElement('div'); W.renderForm(en, { blocks, prep: PREP }, 'en'); const et = en.textContent;
  assert.ok(et.includes('Prep is Sat 12/20 – Fri 12/26.') && et.includes('Camp prep period: Sat 12/20 – Fri 12/26 — please arrive early'));
  const both = doc.createElement('div'); W.renderForm(both, { blocks, prep: PREP }, 'both'); let spans = 0; walk(both, (e) => { if (hasClass(e, 'wl-ko') || hasClass(e, 'wl-en')) spans++; }); assert.ok(spans > 6, '둘 다: 사이트의 언어 전환용 칸이 함께 있다');
  assert.ok(both.textContent.includes('12/20(토) ~ 12/26(금)') && both.textContent.includes('Sat 12/20 – Fri 12/26'));
  let info = 0; walk(ko, (e) => { if (hasClass(e, 'cf-prepinfo')) info++; }); assert.equal(info, 1);
});

test('신청서 그리기: 준비기간이 없으면 안내 칸은 그려지지 않고 {준비기간} 은 아무것도 남기지 않는다', () => {
  const { W, doc } = loadRender();
  for (const prep of [null, undefined, { start: '', end: '' }]) {
    const root0 = doc.createElement('div'); W.renderForm(root0, { blocks, prep }, 'ko'); const t = root0.textContent;
    let info = 0; walk(root0, (e) => { if (hasClass(e, 'cf-prepinfo')) info++; }); assert.equal(info, 0, '안내 칸 없음');
    assert.equal(t.includes('{준비기간}'), false); assert.equal(t.includes('캠프 준비기간'), false); assert.ok(t.includes('준비기간은  이에요.'), '글자만 사라진다');
  }
  // 그리기 사이에 값이 남아 새는 일이 없다: 앞에서 준비기간이 있었어도 prep 없이 다시 그리면 사라진다
  const r1 = doc.createElement('div'); W.renderForm(r1, { blocks, prep: PREP }, 'ko'); const r2 = doc.createElement('div'); W.renderForm(r2, { blocks, prep: null }, 'ko'); assert.equal(r2.textContent.includes('12/20'), false);
});

test('신청서 내용: 준비기간 안내 칸은 글 없이도 저장·검토 점검을 통과하고, 가져올 캠프 번호는 모양이 맞을 때만 남는다', () => {
  const snip = SNIPPETS.find((s) => s.key === 'prep_info'); assert.ok(snip && snip.block.type === 'prepinfo' && snip.group === 'staff');
  const c = cleanContent({ ...starterContent('staff'), blocks: [...starterContent('staff').blocks, { type: 'prepinfo', label: { ko: '', en: '' } }], prepCampId: 'camp-w27' });
  const b = c.blocks.find((x) => x.type === 'prepinfo'); assert.ok(b && !('required' in b) && !('options' in b)); assert.equal(c.prepCampId, 'camp-w27');
  assert.equal('prepCampId' in cleanContent({ ...starterContent('staff'), prepCampId: "x'; DROP" }), false, '이상한 값은 버린다'); assert.equal('prepCampId' in cleanContent(starterContent('staff')), false);
  const card = { ...c.card, titleKo: '가', titleEn: 'a', startDate: '2099-07-12T09:00' };
  const r = checkReady({ ...c, card }, 'staff', {}); assert.equal(r.problems.some((p) => p.includes('이름이 비어 있는')), false, '글이 비어 있다는 불평이 없다');
  assert.equal(cleanContent({ blocks: [{ type: 'nonsense' }] }).blocks.length, 0, '모르는 종류는 그대로 버려진다');
});

const url = 'http://localhost/api/campteam/camp-forms';
const fcall = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { method: o.method || 'GET', url: url + (o.qs || ''), body: o.body }) }); return { status: r.status, body: await r.json() }; };
const feedDir = root + 'src/content/camp_schedules/';
const withFeed = (env) => ({ ...env, ASSETS: { fetch: async () => new Response(JSON.stringify({ items: readdirSync(feedDir).map((f) => { const raw = JSON.parse(readFileSync(feedDir + f, 'utf8')); return { id: f.replace(/\.json$/, ''), titleKo: raw.title_ko, campType: raw.camp_type, startDate: (raw.start_date || '').slice(0, 10), raw }; }) }), { headers: { 'content-type': 'application/json' } }) } });

test('신청서 API: 신청서가 가리키는 캠프 하나의 준비기간 날짜만 나가고(시작일 자동 연결 또는 고른 캠프), 없으면 null', async () => {
  const env = withFeed(makeEnv(fakeD1()));
  assert.equal((await fcall(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir], approver: [U.admin], deployer: [U.tre] } })).status, 200);
  const a = await newCamp(env, { nameKo: '비밀 이름 캠프 A', notes: '내부 메모 A', startDate: '2099-07-12', endDate: '2099-07-17', prepStart: '2099-07-05', prepEnd: '2099-07-11' });
  const b = await newCamp(env, { nameKo: '비밀 이름 캠프 B', startDate: '2099-08-02', endDate: '2099-08-07', prepStart: '2099-07-26', prepEnd: '2099-08-01' });
  const none = await newCamp(env, { nameKo: '준비 없는 캠프 C', startDate: '2099-09-12', endDate: '2099-09-17' });
  const made = await fcall(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'staff', campType: 'english' } }); assert.equal(made.status, 201); const id = made.body.id;
  const get = async () => (await fcall(Forms.onRequestGet, env, U.mem, { qs: '?id=' + id })).body;
  const save = async (patch) => { const d = await get(), content = d.form.content; Object.assign(content.card, patch.card || {}); if ('prepCampId' in patch) content.prepCampId = patch.prepCampId; content.blocks.push({ type: 'prepinfo', label: { ko: '', en: '' }, help: { ko: '', en: '' } }); return fcall(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { content } }); };
  assert.equal((await save({ card: { startDate: '2099-07-12T09:00' } })).status, 200);
  let d = await get(); assert.deepEqual(d.prep, { start: '2099-07-05', end: '2099-07-11' }, '시작일이 같은 캠프의 준비기간(자동)');
  assert.equal(JSON.stringify(d.prep).includes('비밀'), false, '캠프 이름 같은 다른 정보는 나가지 않는다'); assert.deepEqual(Object.keys(d.prep).sort(), ['end', 'start']);
  assert.equal(JSON.stringify(d).includes('내부 메모 A'), false);
  assert.equal((await save({ prepCampId: b.body.id })).status, 200); d = await get(); assert.deepEqual(d.prep, { start: '2099-07-26', end: '2099-08-01' }, '고른 캠프가 먼저'); assert.equal(d.form.content.prepCampId, b.body.id);
  assert.equal((await save({ prepCampId: none.body.id })).status, 200); assert.equal((await get()).prep, null, '고른 캠프에 준비기간이 없으면 없음');
  assert.equal((await save({ prepCampId: '', card: { startDate: '2099-09-12T09:00' } })).status, 200); assert.equal((await get()).prep, null, '같은 시작일의 캠프에 준비기간이 없으면 없음');
  assert.equal((await save({ prepCampId: '', card: { startDate: '2098-01-01T09:00' } })).status, 200); assert.equal((await get()).prep, null, '맞는 캠프가 없으면 없음');
  // 취소된 캠프의 준비기간은 자동 연결에서 빠진다
  env.DB.sqlite.prepare("UPDATE camps SET status='canceled' WHERE id=?").run(a.body.id); assert.equal((await save({ card: { startDate: '2099-07-12T09:00' } })).status, 200); assert.equal((await get()).prep, null);
  assert.equal(await prepForForm(env, null), null);
  // 0039 전의 DB
  const old = makeEnv(fakeD1()); old.DB.sqlite.exec('ALTER TABLE camps DROP COLUMN prepStart; ALTER TABLE camps DROP COLUMN prepEnd;'); assert.equal(await prepForForm(old, { card: { startDate: '2099-07-12T09:00' } }), null);
});

// ── 템플릿 자동 적용 스위치 ──
test('템플릿 API: autoApply 읽기·쓰기 (기본 꺼짐, 보낸 때만 바뀐다)', async () => {
  const env = makeEnv(fakeD1());
  const tcall = async (m, who, body, qs = '') => { const r = await Templates['onRequest' + m]({ env, request: await req(who, { method: m.toUpperCase(), body, url: 'http://localhost/api/campteam/templates' + qs }) }); return { status: r.status, body: await r.json() }; };
  const flagOf = async (id) => (await tcall('Get', U.mem)).body.templates.find((t) => t.id === id).autoApply;
  const a = await tcall('Post', U.mem, { kind: 'template', nameKo: '기본 템플릿' }); assert.equal(a.status, 201); assert.equal(await flagOf(a.body.id), 0, '기본은 묻지 않음');
  const b = await tcall('Post', U.mem, { kind: 'template', nameKo: '묻는 템플릿', autoApply: '1' }); assert.equal(b.status, 201); assert.equal(await flagOf(b.body.id), 1);
  assert.equal((await tcall('Patch', U.mem, { nameKo: '이름만', description: 'd' }, `?kind=template&id=${b.body.id}`)).status, 200); assert.equal(await flagOf(b.body.id), 1, '안 보내면 그대로');
  assert.equal((await tcall('Patch', U.mem, { autoApply: '0' }, `?kind=template&id=${b.body.id}`)).status, 200); assert.equal(await flagOf(b.body.id), 0);
  assert.equal((await tcall('Patch', U.mem, { autoApply: true }, `?kind=template&id=${a.body.id}`)).status, 200); assert.equal(await flagOf(a.body.id), 1);
  assert.equal((await tcall('Patch', U.mem, { autoApply: 'banana' }, `?kind=template&id=${a.body.id}`)).status, 200); assert.equal(await flagOf(a.body.id), 0, '이상한 값은 꺼짐');
  assert.equal((await tcall('Patch', U.view, { autoApply: '1' }, `?kind=template&id=${a.body.id}`)).status, 403);
});

// ── 새 캠프를 만든 직후의 「적용할까요?」 창 (tpl-auto.js) ──
function loadTplAuto({ can = true, templates = [], previews = {}, applyFail = false } = {}) {
  const calls = [], created = [], els = {};
  const mkDlg = () => { const d = { id: '', className: '', isConnected: true, opened: 0, closed: 0, _html: '', _els: {}, _checks: null,
    set innerHTML(v) { d._html = v; d._els = {}; d._checks = null; }, get innerHTML() { return d._html; },
    showModal() { d.opened++; }, close() { d.closed++; },
    querySelector(sel) { return (d._els[sel] = d._els[sel] || { hidden: true, textContent: '', disabled: false, onclick: null, dataset: {} }); },
    querySelectorAll() { if (!d._checks) d._checks = [...d._html.matchAll(/data-tpl="([^"]+)" (checked)?/g)].map((m) => ({ dataset: { tpl: m[1] }, checked: !!m[2] })); return d._checks; } }; return d; };
  const doc = { body: { appendChild(d) { els.dlg = d; } }, createElement: () => mkDlg() };
  const dict = { ko: {}, en: {} };
  const CT = { addDict(d) { Object.assign(dict.ko, d.ko); Object.assign(dict.en, d.en); }, lang: () => 'ko', t: (k) => dict.ko[k] ?? k, esc: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), pick: (o) => o.nameKo || o.name || '', can: () => can,
    api: async (u, o) => { const body = o && o.body ? JSON.parse(JSON.stringify(o.body)) : undefined; calls.push({ u, method: (o && o.method) || 'GET', body });
      if (u.endsWith('/templates')) return { templates };
      if (body && body.preview) { const p = previews[body.templateId]; if (p === 'fail') throw new Error('x'); return p || { preview: true, summary: { campHasDate: true, toCreate: 3, skipped: 0 }, plan: [] }; }
      if (applyFail) throw new Error('적용 실패');
      created.push(body.templateId); return { created: 4, skipped: 0, summary: {} }; } };
  const win = {}; vm.runInNewContext(readFileSync(root + 'public/portal/campteam/tpl-auto.js', 'utf8'), { CT, window: win, document: doc, Array, Promise, JSON, Number });
  return { A: win.CTTplAuto, calls, created, els, dict, CT };
}
const T = (id, o = {}) => ({ id, nameKo: '템플릿 ' + id, typeId: null, autoApply: 1, items: [{ id: 'i1' }, { id: 'i2' }], ...o });
const applies = (calls) => calls.filter((c) => c.u.endsWith('/apply-template') && !c.body.preview);

test('새 캠프 창: 물어볼 템플릿 고르기 (스위치 켠 것 · 유형이 맞거나 유형이 없는 것 · 항목이 있는 것)', () => {
  const { A } = loadTplAuto();
  const list = [T('all'), T('typeA', { typeId: 'A' }), T('typeB', { typeId: 'B' }), T('off', { autoApply: 0 }), T('empty', { items: [] }), T('numstr', { autoApply: '1' })];
  const ids = (typeId) => Array.from(A.pick(list, typeId).map((t) => t.id));
  assert.deepEqual(ids('A'), ['all', 'typeA', 'numstr'], '유형 A 캠프: 유형이 없는 것 + A 것'); assert.deepEqual(ids('B'), ['all', 'typeB', 'numstr']); assert.deepEqual(ids('Z'), ['all', 'numstr'], '아무 유형에도 안 맞으면 유형 없는 것만');
  assert.deepEqual(ids(''), ['all', 'numstr']); assert.equal(A.pick(null, 'A').length, 0); assert.equal(A.pick([T('x', { autoApply: 0 })], 'A').length, 0);
});

test('새 캠프 창: 묻기만 한다 — 「나중에」·닫기는 아무것도 만들지 않고, 「적용」을 눌러야 고른 것만 만든다', async () => {
  const { A, calls, created, els } = loadTplAuto({ templates: [T('all'), T('typeA', { typeId: 'A' }), T('typeB', { typeId: 'B' })] });
  await A.offer({ id: 'camp1', typeId: 'A', startDate: '2099-07-12', nameKo: '새 캠프' });
  const d = els.dlg; assert.equal(d.opened, 1, '창이 뜬다'); assert.ok(d.innerHTML.includes('이 캠프에 체크리스트를 적용할까요?'));
  assert.ok(d.innerHTML.includes('템플릿 all') && d.innerHTML.includes('템플릿 typeA') && !d.innerHTML.includes('템플릿 typeB'), '유형이 다른 템플릿은 안 보인다');
  assert.ok(d.innerHTML.includes('항목 2개') && d.innerHTML.includes('새로 3개 만들어져요'), '항목 수 + 미리보기 숫자'); assert.equal((d.innerHTML.match(/ checked>/g) || []).length, 2, '모두 처음엔 체크됨');
  assert.equal(applies(calls).length, 0, '창이 떠 있는 동안 아무 업무도 만들어지지 않는다 (미리보기만)'); assert.ok(calls.filter((c) => c.body && c.body.preview).length === 2);
  assert.ok(d.innerHTML.includes('적용') && d.innerHTML.includes('나중에'));
  d.querySelector('#tplAutoLater').onclick(); assert.equal(d.closed, 1); assert.equal(applies(calls).length, 0, '「나중에」는 아무것도 만들지 않는다');
  // 다시 열어서 하나만 체크 해제하고 적용
  await A.offer({ id: 'camp1', typeId: 'A', startDate: '2099-07-12', nameKo: '새 캠프' });
  d.querySelectorAll()[1].checked = false; await d.querySelector('#tplAutoGo').onclick();
  assert.deepEqual(created, ['all'], '체크한 것만 적용한다'); assert.deepEqual(applies(calls).map((c) => c.body.campId), ['camp1']); assert.ok(d.innerHTML.includes('4개의 업무를 만들었어요'));
  assert.deepEqual(Object.keys(applies(calls)[0].body).sort(), ['campId', 'templateId'], '담당자 같은 것은 보내지 않는다(제안으로만 남는다)');
});

test('새 캠프 창: 하나도 안 고르면 안내만, 실패하면 창이 남아 다시 할 수 있다', async () => {
  const { A, els, created } = loadTplAuto({ templates: [T('all')] });
  await A.offer({ id: 'c', typeId: 'A', startDate: '2099-07-12' }); const d = els.dlg;
  d.querySelectorAll()[0].checked = false; await d.querySelector('#tplAutoGo').onclick(); assert.equal(created.length, 0); assert.equal(d.querySelector('#tplAutoErr').hidden, false); assert.ok(d.querySelector('#tplAutoErr').textContent.includes('하나 이상'));
  const f = loadTplAuto({ templates: [T('all')], applyFail: true }); await f.A.offer({ id: 'c', typeId: 'A', startDate: '2099-07-12' });
  await f.els.dlg.querySelector('#tplAutoGo').onclick(); assert.equal(f.els.dlg.closed, 0, '실패해도 창은 닫히지 않는다'); assert.equal(f.els.dlg.querySelector('#tplAutoErr').textContent, '적용 실패');
});

test('새 캠프 창: 물어볼 템플릿이 없거나 업무 작성 권한이 없으면 아무것도 안 뜨고, 시작일이 없으면 안내가 붙는다', async () => {
  const a = loadTplAuto({ templates: [T('off', { autoApply: 0 }), T('typeB', { typeId: 'B' })] }); await a.A.offer({ id: 'c', typeId: 'A', startDate: '2099-07-12' }); assert.equal(a.els.dlg, undefined, '창을 만들지도 않는다'); assert.equal(a.calls.length, 1, '목록만 읽는다');
  const b = loadTplAuto({ can: false, templates: [T('all')] }); await b.A.offer({ id: 'c', typeId: 'A' }); assert.equal(b.calls.length, 0, '권한이 없으면 서버도 부르지 않는다'); assert.equal(b.els.dlg, undefined);
  await b.A.offer(null); await b.A.offer({}); // 조용히 무시
  const c = loadTplAuto({ templates: [T('all')], previews: { all: { preview: true, summary: { campHasDate: false, toCreate: 2, skipped: 0 }, plan: [] } } }); await c.A.offer({ id: 'c', typeId: 'A' });
  assert.ok(c.els.dlg.innerHTML.includes('시작일이 없어서 마감일 없이 만들어져요'), '시작일이 없으면 안내');
  const d = loadTplAuto({ templates: [T('all')], previews: { all: 'fail' } }); await d.A.offer({ id: 'c', typeId: 'A', startDate: '2099-07-12' }); assert.equal(d.els.dlg.opened, 1, '미리보기가 실패해도 창은 뜬다'); assert.equal(d.els.dlg.innerHTML.includes('새로'), false);
  const e = loadTplAuto({ templates: [T('all')], previews: { all: 'fail' } }); await e.A.offer({ id: 'c', typeId: 'A' }); assert.ok(e.els.dlg.innerHTML.includes('시작일이 없어서'), '미리보기 없이도 camp.startDate 로 판단');
});

test('템플릿 편집창 스위치: 숨은 칸(autoApply)에 0/1 이 담겨 폼과 같이 저장된다', () => {
  const { A } = loadTplAuto(); const box = { innerHTML: '', _q: {}, querySelector(s) { return (box._q[s] = box._q[s] || { checked: /id="tplAutoCk" checked/.test(box.innerHTML), value: (/id="tplAutoVal" value="(\d)"/.exec(box.innerHTML) || [])[1], addEventListener(t, fn) { this.fn = fn; } }); } };
  A.mountSwitch(box, { autoApply: 0, typeId: null }); assert.ok(box.innerHTML.includes('새 캠프를 만들면 이 체크리스트를 적용할지 물어보기') && box.innerHTML.includes('name="autoApply"') && box.innerHTML.includes('value="0"') && box.innerHTML.includes('모든 새 캠프에 물어봐요'));
  const ck = box.querySelector('#tplAutoCk'), val = box.querySelector('#tplAutoVal'); ck.checked = true; ck.fn(); assert.equal(val.value, '1'); ck.checked = false; ck.fn(); assert.equal(val.value, '0');
  box.innerHTML = ''; box._q = {}; A.mountSwitch(box, { autoApply: 1, typeId: 'T1' }); assert.ok(box.innerHTML.includes('id="tplAutoCk" checked') && box.innerHTML.includes('value="1"') && box.innerHTML.includes('정해 둔 캠프 유형'));
  assert.doesNotThrow(() => A.mountSwitch(null, {}));
});

test('화면 연결: 캠프 저장창의 준비기간 칸·채우기 버튼, 새 캠프 직후 물어보기, 템플릿 스위치 자리, 스크립트 불러오기', () => {
  const camps = readFileSync(root + 'public/portal/campteam/camps.js', 'utf8');
  for (const s of ['name="prepStart"', 'name="prepEnd"', '스태프가 캠프 시작 전에 먼저 모여 교육·준비하는 기간이에요. 비워 두면 준비기간이 없는 캠프예요.', '캠프 시작 직전 1주로 채우기', 'id="prepFill"']) assert.ok(camps.includes(s), s);
  const fn = new Function('return ' + /function addDaysStr[\s\S]*?\n  }/.exec(camps)[0].replace(/^function addDaysStr/, 'function'))();
  assert.equal(fn('2026-12-27', -7), '2026-12-20'); assert.equal(fn('2026-12-27', -1), '2026-12-26'); assert.equal(fn('2027-01-03', -7), '2026-12-27', '해를 넘겨도 맞다'); assert.equal(fn('2028-03-01', -1), '2028-02-29');
  assert.ok(/prepStart'\)\.value = addDaysStr\(st, -7\); q\('prepEnd'\)\.value = addDaysStr\(st, -1\)/.test(camps), '끝=시작 전날, 시작=7일 전');
  assert.ok(/created = await CT\.api\('\/api\/campteam\/camps', \{ method: 'POST'/.test(camps) && /if \(created && kind === 'camp' && window\.CTTplAuto\) CTTplAuto\.offer\(/.test(camps), '새로 만들 때만 물어본다(수정에서는 안 물음)');
  const tasks = readFileSync(root + 'public/portal/campteam/tasks.js', 'utf8'); assert.ok(tasks.includes('id="tplAutoMount"') && tasks.includes('CTTplAuto.mountSwitch($(\'tplAutoMount\'), t)'));
  for (const [page, js] of [['camps', 'camps.js'], ['tasks', 'tasks.js']]) { const a = readFileSync(root + `src/pages/portal/campteam/${page}.astro`, 'utf8'); const i = a.indexOf('/portal/campteam/tpl-auto.js'), j = a.indexOf('/portal/campteam/' + js); assert.ok(i > 0 && i < j, `${page}: tpl-auto.js 가 ${js} 보다 먼저`); }
  const forms = readFileSync(root + 'public/portal/campteam/prep-forms.js', 'utf8'); assert.ok(forms.includes('fPrepCamp') && forms.includes('prepinfo') && forms.includes("W.setPrep(prepFor())") && forms.includes('prep: prepFor()'));
  const css = readFileSync(root + 'public/portal/campteam/campteam.css', 'utf8'); assert.ok(css.includes('/* ==== batch-D prep-period ==== */') && css.includes('/* ==== /batch-D prep-period ==== */')); assert.ok(readFileSync(root + 'public/portal/campteam/form-render.css', 'utf8').includes('.cf-prepinfo'));
});
