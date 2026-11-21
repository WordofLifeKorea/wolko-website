// 교재 배포 — 신청 검사 · 일회용 주소 · 한 번만 세기 · 기록 집계 · 관리자 화면 API · PDF 워터마크
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PDFDocument, rgb } from 'pdf-lib';
import * as listApi from '../functions/api/materials/index.js';
import * as requestApi from '../functions/api/materials/request.js';
import * as getApi from '../functions/api/materials/get.js';
import * as publishApi from '../functions/api/portal/material-publish.js';
import * as reportApi from '../functions/api/portal/material-downloads.js';
import { cleanRegistrant, newCode, summarizeLogs, logsToCsv, kstDateTime, RATE_PER_HOUR, rateLimited, publishedGroups } from '../functions/lib/materials.js';
import { stampPdf, loadStampFont, resetStampFontCache, stampLineOf, layoutLine } from '../functions/lib/pdfStamp.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

/* ── 가짜 KV: 값 · 메타데이터 · 목록 ── */
function fakeKV() {
  const store = new Map();
  const toBytes = (v) => (typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof ArrayBuffer ? new Uint8Array(v) : v);
  const convert = (v, type) => {
    if (v == null) return null;
    if (type === 'json') return JSON.parse(typeof v === 'string' ? v : new TextDecoder().decode(toBytes(v)));
    if (type === 'stream') return new Response(toBytes(v)).body;
    if (type === 'arrayBuffer') { const b = toBytes(v); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
    return typeof v === 'string' ? v : new TextDecoder().decode(toBytes(v));
  };
  const typeOf = (o) => (typeof o === 'string' ? o : o?.type) || 'text';
  return {
    store,
    get: async (k, o) => (store.has(k) ? convert(store.get(k).value, typeOf(o)) : null),
    getWithMetadata: async (k, o) => (store.has(k) ? { value: convert(store.get(k).value, typeOf(o)), metadata: store.get(k).metadata ?? null } : { value: null, metadata: null }),
    put: async (k, v, o = {}) => { if (o.metadata && new TextEncoder().encode(JSON.stringify(o.metadata)).length > 1024) throw new Error('metadata too big'); store.set(k, { value: v, metadata: o.metadata }); },
    delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '', cursor, limit = 1000 } = {}) => {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = all.slice(start, start + limit);
      const done = start + limit >= all.length;
      return { keys: page.map((name) => ({ name, metadata: store.get(name).metadata })), list_complete: done, cursor: done ? undefined : String(start + limit) };
    },
  };
}

async function samplePdf(pages = 3) {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) { const p = d.addPage([595, 842]); p.drawText('Lesson page ' + (i + 1), { x: 60, y: 760, size: 22, color: rgb(0, 0, 0) }); }
  return d.save();
}

const fontFile = process.env.WOLKO_FONT_FILE;   // 있으면 한글 워터마크까지 실제로 시험(없으면 영문 대체 경로를 시험)
async function setup({ withFont = false } = {}) {
  resetStampFontCache();
  const kv = fakeKV();
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  const pdf = await samplePdf(3);
  kv.store.set('portal:resources:v1', { value: JSON.stringify({ items: [
    { id: 'item1', title: '큐티 교재 1권', translation: 'QT Book 1', detail: '1과~12과', thumbnailData: '', files: [
      { id: 'f1', fileName: 'lesson1.pdf', fileType: 'application/pdf', fileSize: pdf.length, uploadedAt: '2026-11-01T00:00:00Z' },
      { id: 'f2', fileName: 'notes.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 10, uploadedAt: '2026-11-02T00:00:00Z' },
      { id: 'f3', fileName: 'secret-draft.pdf', fileType: 'application/pdf', fileSize: pdf.length, uploadedAt: '2026-11-03T00:00:00Z' },
    ] },
    { id: 'item2', title: '제작 중 교재', files: [{ id: 'g1', fileName: 'wip.pdf', fileType: 'application/pdf', fileSize: 1 }] },
  ] }) });
  kv.store.set('portal:resource-file:item1:f1', { value: pdf, metadata: { fileName: 'lesson1.pdf', fileType: 'application/pdf' } });
  kv.store.set('portal:resource-file:item1:f2', { value: new Uint8Array([80, 75, 3, 4]), metadata: { fileName: 'notes.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
  kv.store.set('portal:resource-file:item1:f3', { value: pdf, metadata: { fileName: 'secret-draft.pdf', fileType: 'application/pdf' } });
  const admin = await createHubSessionToken('secret', 'admin@wolko.org', 'admin');
  const member = await createHubSessionToken('secret', 'member@wolko.org', 'counselor');
  const call = (mod, method, url, { body, token, ip = '1.2.3.4' } = {}) => {
    const headers = { 'CF-Connecting-IP': ip, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const request = new Request('https://wolko.test' + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const fn = mod['onRequest' + method[0] + method.slice(1).toLowerCase()];
    return fn({ env, request });
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (withFont && fontFile && String(url).includes('GmarketSans')) return new Response(readFileSync(fontFile));
    return new Response('nope', { status: 503 });
  };
  const restore = () => { globalThis.fetch = realFetch; resetStampFontCache(); };
  const publish = (itemId, fileId, on = true) => call(publishApi, 'POST', '/api/portal/material-publish', { token: admin, body: { itemId, fileId, on } });
  return { kv, env, call, admin, member, publish, restore, pdf };
}

const church = { itemId: 'item1', fileId: 'f1', kind: 'church', name: '김목사', church: '은혜제일교회', email: 'Grace@Example.com', agree: true, lang: 'ko' };

/* ── 신청 검사 ── */
test('신청 검사: 구분별 필수 항목 · 동의 · 함정 칸 · 이메일 모양', () => {
  assert.equal(cleanRegistrant({ ...church }).ok, true);
  assert.equal(cleanRegistrant({ ...church }).value.email, 'grace@example.com', '이메일은 소문자로');
  assert.equal(cleanRegistrant({ ...church, kind: 'x' }).field, 'kind');
  assert.equal(cleanRegistrant({ ...church, name: '김' }).field, 'name');
  assert.equal(cleanRegistrant({ ...church, church: '' }).field, 'church', '교회는 교회 이름이 필수');
  assert.equal(cleanRegistrant({ ...church, kind: 'group', church: '' }).field, 'church', '단체도 이름이 필수');
  assert.equal(cleanRegistrant({ ...church, email: '' }).field, 'email', '교회는 이메일 필수');
  assert.equal(cleanRegistrant({ ...church, email: 'nope' }).field, 'email');
  assert.equal(cleanRegistrant({ ...church, agree: 'yes' }).field, 'agree', 'true 만 동의');
  assert.equal(cleanRegistrant({ ...church, website: 'http://spam' }).field, 'website', '함정 칸이 차 있으면 막는다');
  const person = cleanRegistrant({ kind: 'individual', name: '홍길동', email: '', agree: true });
  assert.equal(person.ok, true, '개인은 이메일 · 교회 없이도 된다');
  assert.equal(cleanRegistrant({ kind: 'individual', name: '홍길동', email: 'bad', agree: true }).field, 'email', '적었다면 모양은 맞아야 한다');
  const xss = cleanRegistrant({ ...church, name: '<b>김</b> 목사', church: '은혜\n교회' }).value;
  assert.ok(!/[<>\n]/.test(xss.name + xss.church), '꺾쇠 · 줄바꿈은 지운다');
  assert.match(newCode(), /^WL-[A-HJ-NP-Z2-9]{6}$/);
});

/* ── 목록 ── */
test('공개 목록: 배포 표시한 파일만, 자료별로 묶어서 — 표시 안 한 파일 · 제작 중 자료는 보이지 않는다', async () => {
  const t = await setup();
  try {
    assert.deepEqual((await (await t.call(listApi, 'GET', '/api/materials')).json()).items, [], '표시 전에는 비어 있다');
    assert.equal((await t.publish('item1', 'f1')).status, 200);
    assert.equal((await t.publish('item1', 'f2')).status, 200);
    const body = await (await t.call(listApi, 'GET', '/api/materials')).json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].title, '큐티 교재 1권');
    assert.ok(!('titleEn' in body.items[0]) && !('desc' in body.items[0]), '포탈의 내부 메모(진행 메모 · 번역/제작 내용)는 공개 목록에 내지 않는다');
    assert.ok(!JSON.stringify(body).includes('1과~12과') && !JSON.stringify(body).includes('QT Book 1'));
    assert.deepEqual(body.items[0].files.map((f) => [f.id, f.ext, f.stamp]), [['f1', 'pdf', true], ['f2', 'docx', false]]);
    assert.ok(!JSON.stringify(body).includes('secret-draft'), '표시 안 한 파일 이름이 새어 나가지 않는다');
    assert.ok(!JSON.stringify(body).includes('wip.pdf'));
    // 표시를 끄면 사라진다
    await t.publish('item1', 'f2', false);
    assert.deepEqual((await (await t.call(listApi, 'GET', '/api/materials')).json()).items[0].files.map((f) => f.id), ['f1']);
  } finally { t.restore(); }
});

test('배포 표시: 관리자만 바꾼다 · 없는 파일은 404 · 로그인한 멤버는 볼 수 있다', async () => {
  const t = await setup();
  try {
    const noLogin = await t.call(publishApi, 'POST', '/api/portal/material-publish', { body: { itemId: 'item1', fileId: 'f1', on: true } });
    assert.equal(noLogin.status, 401);
    const asMember = await t.call(publishApi, 'POST', '/api/portal/material-publish', { token: t.member, body: { itemId: 'item1', fileId: 'f1', on: true } });
    assert.equal(asMember.status, 403);
    assert.equal((await t.publish('item1', 'nope')).status, 404);
    assert.equal((await t.publish('item1', 'f1')).status, 200);
    const seen = await (await t.call(publishApi, 'GET', '/api/portal/material-publish', { token: t.member })).json();
    assert.ok(seen.files['item1:f1'].on);
    assert.equal((await t.call(publishApi, 'GET', '/api/portal/material-publish')).status, 401);
  } finally { t.restore(); }
});

/* ── 신청 → 내려받기 → 한 번만 세기 ── */
test('내려받기: 신청 → 일회용 주소 → 받으면 한 줄 기록, 같은 주소로 다시 받아도 한 줄 (횟수 = 신청 한 번)', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1');
    const req = await t.call(requestApi, 'POST', '/api/materials/request', { body: church });
    assert.equal(req.status, 200);
    const { url, code } = await req.json();
    assert.match(code, /^WL-/);
    assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:')).length, 0, '신청만으로는 세지 않는다 — 실제로 받을 때 센다');

    const got = await t.call(getApi, 'GET', url);
    assert.equal(got.status, 200);
    assert.match(got.headers.get('content-disposition'), /attachment; filename\*=UTF-8''lesson1\.pdf/);
    assert.equal(got.headers.get('cache-control'), 'private, no-store', '캐시되면 횟수를 놓친다');
    const out = new Uint8Array(await got.arrayBuffer());
    assert.equal(String.fromCharCode(...out.slice(0, 5)), '%PDF-');
    assert.equal(got.headers.get('x-wolko-stamp'), 'applied-ascii', '글꼴을 못 읽으면 영문 번호 워터마크로 대신한다');
    const doc = await PDFDocument.load(out);
    assert.equal(doc.getPageCount(), 3);
    assert.ok(doc.getKeywords().includes(`wolko-dl:${code}`), '문서 정보에 확인번호가 남는다');

    // 같은 주소로 다시 · HEAD 요청은 세지 않는다
    assert.equal((await t.call(getApi, 'GET', url)).status, 200);
    assert.equal((await t.call(getApi, 'HEAD', url)).status, 200);
    const logs = [...t.kv.store.entries()].filter(([k]) => k.startsWith('matdl:log:'));
    assert.equal(logs.length, 1, '한 번만 센다');
    const meta = logs[0][1].metadata;
    assert.equal(meta.k, 'church'); assert.equal(meta.c, '은혜제일교회'); assert.equal(meta.n, '김목사'); assert.equal(meta.e, 'grace@example.com');
    assert.equal(meta.w, 'A'); assert.ok(!('h' in meta) && !('ip' in logs[0][1]), '내려받은 기록에는 IP 정보를 넣지 않는다');
    assert.ok(!JSON.stringify(logs[0][1]).includes('1.2.3.4'), 'IP 원문은 저장하지 않는다');
    assert.ok(logs[0][0].endsWith(':' + code));

    // 다시 신청하면 새 확인번호 · 새 기록
    const again = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    assert.notEqual(again.code, code);
    await t.call(getApi, 'GET', again.url);
    assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:')).length, 2);
  } finally { t.restore(); }
});

test('내려받기: PDF 가 아닌 파일은 그대로(워터마크 없음), 표시 안 한 파일 · 만료된 주소 · 이상한 값은 받을 수 없다', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f2');
    const docx = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: { ...church, fileId: 'f2' } })).json();
    const got = await t.call(getApi, 'GET', docx.url);
    assert.equal(got.status, 200);
    assert.deepEqual([...new Uint8Array(await got.arrayBuffer())], [80, 75, 3, 4], '원본 그대로');
    assert.equal(got.headers.get('x-wolko-stamp'), 'none');
    assert.equal([...t.kv.store.values()].find((v) => v.metadata?.w === '-') ? 1 : 0, 1, '기록에는 PDF 아님으로');

    // 표시하지 않은 파일은 신청 단계에서 막힌다(누가 알아낸 id 로도)
    assert.equal((await t.call(requestApi, 'POST', '/api/materials/request', { body: { ...church, fileId: 'f3' } })).status, 404);
    assert.equal((await t.call(requestApi, 'POST', '/api/materials/request', { body: { ...church, itemId: 'item2', fileId: 'g1' } })).status, 404);
    // 만료 · 가짜 토큰
    assert.equal((await t.call(getApi, 'GET', '/api/materials/get?t=nope')).status, 410);
    assert.equal((await t.call(getApi, 'GET', '/api/materials/get')).status, 410);
    // 받는 사이에 표시를 껐다면 주지 않는다
    await t.publish('item1', 'f1');
    const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    await t.publish('item1', 'f1', false);
    assert.equal((await t.call(getApi, 'GET', r.url)).status, 410);
    // 잘못된 신청
    const bad = await t.call(requestApi, 'POST', '/api/materials/request', { body: { ...church, agree: false } });
    assert.equal(bad.status, 400); assert.equal((await bad.json()).field, 'agree');
  } finally { t.restore(); }
});

test('큰 PDF(12MB 초과로 기록된 파일)는 메모리에 올리지 않고 그대로 내려주며, 워터마크 대신 기록에 크기 초과로 남는다', async () => {
  const t = await setup();
  try {
    const data = JSON.parse(t.kv.store.get('portal:resources:v1').value);
    data.items[0].files.find((f) => f.id === 'f1').fileSize = 50 * 1024 * 1024;   // NAS 에 있는 큰 파일처럼
    t.kv.store.set('portal:resources:v1', { value: JSON.stringify(data) });
    await t.publish('item1', 'f1');
    const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    const got = await t.call(getApi, 'GET', r.url);
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('x-wolko-stamp'), 'skipped-size');
    assert.deepEqual([...new Uint8Array(await got.arrayBuffer())], [...t.pdf], '원본 그대로');
    assert.equal([...t.kv.store.values()].find((v) => v.metadata?.w === 's') ? 1 : 0, 1, '기록에는 크기 초과(원본)로');
  } finally { t.restore(); }
});

test('남용 방지: 같은 곳에서 한 시간에 너무 많이 신청하면 429', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1');
    let last;
    for (let i = 0; i < RATE_PER_HOUR + 1; i++) last = await t.call(requestApi, 'POST', '/api/materials/request', { body: church, ip: '9.9.9.9' });
    assert.equal(last.status, 429);
    assert.equal((await t.call(requestApi, 'POST', '/api/materials/request', { body: church, ip: '8.8.8.8' })).status, 200, '다른 곳은 영향 없다');
  } finally { t.restore(); }
});

/* ── 관리자 현황 ── */
test('현황: 관리자만 · 개인/교회/단체 구분 · 교회 수 · 월별 · CSV · 이메일로 삭제', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1'); await t.publish('item1', 'f2');
    const go = async (body) => { const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: { itemId: 'item1', fileId: 'f1', agree: true, ...body }, ip: String(Math.random()) })).json(); return t.call(getApi, 'GET', r.url); };
    await go({ kind: 'church', name: '김목사', church: '은혜제일교회', email: 'a@x.org' });
    await go({ kind: 'church', name: '박전도사', church: '은혜 제일교회', email: 'b@x.org' });          // 띄어쓰기만 다른 같은 교회
    await go({ kind: 'church', name: '이집사', church: '사랑교회', email: 'c@x.org', fileId: 'f2' });
    await go({ kind: 'individual', name: '홍길동', email: '' });
    await go({ kind: 'group', name: '최간사', church: '대학 선교회', email: 'd@x.org' });

    assert.equal((await t.call(reportApi, 'GET', '/api/portal/material-downloads')).status, 401);
    assert.equal((await t.call(reportApi, 'GET', '/api/portal/material-downloads', { token: t.member })).status, 403);
    const rep = await (await t.call(reportApi, 'GET', '/api/portal/material-downloads', { token: t.admin })).json();
    assert.equal(rep.totals.downloads, 5);
    assert.deepEqual([rep.totals.individual, rep.totals.church, rep.totals.group], [1, 3, 1]);
    assert.equal(rep.totals.churches, 3, '띄어쓰기만 다른 교회는 한 교회(은혜제일 · 사랑 · 대학 선교회)');
    assert.equal(rep.byMaterial.find((m) => m.fileId === 'f1').total, 4);
    assert.match(rep.byMaterial.find((m) => m.fileId === 'f1').title, /큐티 교재 1권/);
    assert.equal(rep.byMonth.length, 1);
    assert.equal(rep.recent.length, 5);
    assert.ok(rep.churches.some((c) => c.church.replace(/\s/g, '') === '은혜제일교회' && c.downloads === 2));

    const csv = await t.call(reportApi, 'GET', '/api/portal/material-downloads?format=csv', { token: t.admin });
    const raw = new Uint8Array(await csv.arrayBuffer());
    assert.deepEqual([...raw.slice(0, 3)], [0xef, 0xbb, 0xbf], '엑셀에서 한글이 깨지지 않게 BOM');
    const text = new TextDecoder().decode(raw);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.equal(text.trim().split('\r\n').length, 6, '머리줄 + 5건');
    assert.match(text, /은혜제일교회/);

    const bad = await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?email=nope', { token: t.admin });
    assert.equal(bad.status, 400);
    assert.equal((await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?email=a@x.org', { token: t.member })).status, 403);
    const del = await (await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?email=a@x.org', { token: t.admin })).json();
    assert.equal(del.removed, 1);
    assert.equal((await (await t.call(reportApi, 'GET', '/api/portal/material-downloads', { token: t.admin })).json()).totals.downloads, 4);
  } finally { t.restore(); }
});

test('집계 · CSV 보조: 엑셀 수식으로 읽히는 글자는 막고 시각은 한국 시간', () => {
  const rows = [{ t: Date.parse('2026-11-30T16:30:00Z'), code: 'WL-AAAAAA', itemId: 'i', fileId: 'f', title: '=1+1', kind: 'church', name: '+가', church: '@교회', email: '', lang: 'ko', stamp: 'a' }];
  assert.equal(kstDateTime(rows[0].t), '2026-12-01 01:30', '한국 시간(UTC+9)으로 날짜가 넘어간다');
  const csv = logsToCsv(rows);
  assert.ok(csv.includes("'=1+1") && csv.includes("'+가") && csv.includes("'@교회"));
  assert.equal(summarizeLogs(rows).byMonth[0].month, '2026-12');
});

/* ── 워터마크 ── */
test('워터마크: 모든 쪽에 같은 그림을 올리고, 쪽 수 · 내용은 그대로, 글줄 모양', async () => {
  const src = await samplePdf(5);
  const r = await stampPdf(src, { label: '은혜제일교회', code: 'WL-7K3F9Q', date: '2026-11-21', font: null });
  assert.equal(r.status, 'applied-ascii');
  assert.equal(r.pages, 5);
  assert.equal((await PDFDocument.load(r.bytes)).getPageCount(), 5);
  assert.equal(stampLineOf({ label: '은혜교회', code: 'WL-1', date: '2026-11-21' }), 'WOLKO · 은혜교회 · 2026-11-21 · WL-1');
  // 큰 파일 · 깨진 파일 · 암호 PDF 는 원본을 그대로 주고 이유를 남긴다
  assert.equal((await stampPdf(src, { label: 'x', code: 'c', date: 'd', maxBytes: 10 })).status, 'skipped-size');
  assert.equal((await stampPdf(src, { label: 'x', code: 'c', date: 'd', maxPages: 2 })).status, 'skipped-size');
  const garbage = await stampPdf(new Uint8Array([1, 2, 3]), { label: 'x', code: 'c', date: 'd' });
  assert.equal(garbage.status, 'failed'); assert.deepEqual([...garbage.bytes], [1, 2, 3]);
});

test('워터마크 글꼴: 못 읽으면 null 로 두고 곧바로 다시 시도하지 않는다(60초), 읽으면 한 번만 읽는다', async () => {
  resetStampFontCache();
  let calls = 0;
  assert.equal(await loadStampFont({ fetchImpl: async () => { calls++; return new Response('x', { status: 500 }); } }), null);
  assert.equal(await loadStampFont({ fetchImpl: async () => { calls++; return new Response('x', { status: 500 }); } }), null);
  assert.equal(calls, 1, '실패 직후에는 다시 부르지 않는다');
  resetStampFontCache();
});

test('워터마크(한글): 글꼴 파일이 있으면 한글 이름을 윤곽선으로 찍고, 100쪽도 빠르다', { skip: !fontFile || !existsSync(fontFile) }, async () => {
  const font = await loadStampFont({ fetchImpl: async () => new Response(readFileSync(fontFile)) });
  assert.ok(font);
  const src = await samplePdf(100);
  const t0 = performance.now();
  const r = await stampPdf(src, { label: '은혜제일교회', code: 'WL-7K3F9Q', date: '2026-11-21', font });
  assert.equal(r.status, 'applied');
  assert.ok(performance.now() - t0 < 3000);
  assert.ok(r.bytes.length < src.length + 100 * 400, '쪽마다 그림을 새로 그리지 않아 용량이 조금만 늘어난다');
  resetStampFontCache();
});


/* ── 검토 반영: 주소 수명 · 기록 실패 · HEAD · 횟수 제한 · 삭제 · 집계 ── */
test('일회용 주소: 처음 받아도 10분이 늘어나지 않고, 기록이 실패하면 다시 열 때 다시 기록한다', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1');
    const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    const tokenKey = 'matdl:tok:' + new URL('https://x' + r.url).searchParams.get('t');
    const before = t.kv.store.get(tokenKey).value;
    // 기록 쓰기가 한 번 실패 → 파일은 받고, 기록은 비어 있다
    const realPut = t.kv.put; let failOnce = true;
    t.kv.put = async (k, v, o) => { if (failOnce && k.startsWith('matdl:log:')) { failOnce = false; throw new Error('kv down'); } return realPut(k, v, o); };
    assert.equal((await t.call(getApi, 'GET', r.url)).status, 200, '기록이 실패해도 받는 사람에게는 파일을 준다');
    assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:')).length, 0);
    // 다시 열면 그때 기록된다(한 줄)
    assert.equal((await t.call(getApi, 'GET', r.url)).status, 200);
    assert.equal((await t.call(getApi, 'GET', r.url)).status, 200);
    assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:')).length, 1);
    assert.equal(t.kv.store.get(tokenKey).value, before, '주소 자체는 다시 쓰지 않는다(10분이 늘어나지 않게)');
  } finally { t.restore(); }
});

test('HEAD 요청은 PDF 를 통째로 읽지 않고, 세지도 않는다', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1');
    const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    const realGet = t.kv.get; let wholeReads = 0;
    t.kv.get = async (k, o) => { if (k.startsWith('portal:resource-file:') && (o === 'arrayBuffer' || o?.type === 'arrayBuffer')) wholeReads += 1; return realGet(k, o); };
    const head = await t.call(getApi, 'HEAD', r.url);
    assert.equal(head.status, 200);
    assert.equal(wholeReads, 0);
    assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:')).length, 0);
  } finally { t.restore(); }
});

test('횟수 제한: 저장소가 오류를 내도 신청은 막지 않고(어림잡은 방어), 한 곳에서 교재 여러 개를 받아도 걸리지 않는다', async () => {
  const env = { CAMP_KV: { get: async () => { throw new Error('kv limit'); }, put: async () => { throw new Error('kv limit'); } } };
  assert.equal(await rateLimited(env, 'abc'), false, '오류가 나도 막지 않는다');
  assert.ok(RATE_PER_HOUR >= 30, '교회 한 곳에서 교재 여러 권을 연달아 받아도 429 가 나지 않을 만큼');
});

test('삭제 요청: 이메일을 적지 않은 개인도 확인번호로 지울 수 있다 · 잘못된 번호는 400', async () => {
  const t = await setup();
  try {
    await t.publish('item1', 'f1');
    const person = { itemId: 'item1', fileId: 'f1', kind: 'individual', name: '홍길동', email: '', agree: true };
    const r = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: person })).json();
    await t.call(getApi, 'GET', r.url);
    const other = await (await t.call(requestApi, 'POST', '/api/materials/request', { body: church })).json();
    await t.call(getApi, 'GET', other.url);
    const logKeys = () => [...t.kv.store.keys()].filter((k) => k.startsWith('matdl:log:'));
    assert.equal(logKeys().length, 2);
    const bad = await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?code=nope', { token: t.admin });
    assert.equal(bad.status, 400);
    assert.equal((await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?code=' + r.code, { token: t.admin })).status, 200);
    assert.deepEqual(logKeys().map((k) => k.split(':').pop()), [other.code], '그 한 줄만 지워진다');
    assert.equal((await t.call(reportApi, 'DELETE', '/api/portal/material-downloads?code=' + other.code, { token: t.member })).status, 403, '관리자만');
  } finally { t.restore(); }
});

test('집계: 개인이 적은 교회 이름은 교회 수에 넣지 않는다', () => {
  const rows = [
    { t: 1, itemId: 'a', fileId: 'b', kind: 'individual', name: '홍', church: '은혜교회', email: '' },
    { t: 2, itemId: 'a', fileId: 'b', kind: 'church', name: '김', church: '소망교회', email: 'k@x.org' },
  ];
  const sum = summarizeLogs(rows);
  assert.equal(sum.totals.churches, 1);
  assert.equal(sum.byMaterial[0].churches, 1, '교재별 교회 수도 같은 기준');
});

test('워터마크 상자: 글자 위 · 아래가 상자 안에 모두 들어가고(윗부분이 잘리지 않는다), 돌아간 쪽 · 좁은 쪽에서도 폭을 넘지 않는다', async () => {
  // 대문자 높이 0.85em · 글줄 아래로 0.2em 내려가는 가짜 글꼴
  const fakeFont = {
    unitsPerEm: 1000,
    charToGlyph: (ch) => ({ index: 1, advanceWidth: 600, getPath: (x, y, size) => ({
      getBoundingBox: () => ({ x1: x, x2: x + size * 0.6, y1: y - size * 0.85, y2: y + (ch === 'g' ? size * 0.2 : 0) }),
      toPathData: () => `M${x} ${y}h${size * 0.5}v${-size * 0.85}h${-size * 0.5}z`,
    }) }),
  };
  const lay = layoutLine(fakeFont, 'WOLKO g', 7.5);
  assert.ok(Math.abs(lay.top - 7.5 * 0.85) < 1e-9 && Math.abs(lay.bottom - 7.5 * 0.2) < 1e-9, '글자의 실제 위 · 아래 높이를 잰다');
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  const r = await stampPdf(new Uint8Array(await src.save()), { label: '은혜제일교회', code: 'WL-ABC234', date: '2026-11-21', font: fakeFont });
  assert.equal(r.status, 'applied');
  // 찍힌 그림(Form XObject)의 상자 높이가 (글자 위 + 아래 + 여백) 이상이어야 한다
  const out = await PDFDocument.load(r.bytes);
  const forms = [];
  out.context.enumerateIndirectObjects().forEach(([, obj]) => {
    const dict = obj?.dict;
    const bbox = dict?.lookup?.(out.context.obj('BBox'));
    if (bbox?.asArray) forms.push(bbox.asArray().map((n) => n.asNumber()));
  });
  assert.ok(forms.length >= 1, '쪽마다 다시 쓰는 그림이 하나 들어 있다');
  const [x0, y0, x1, y1] = forms[0];
  assert.ok(y1 - y0 >= lay.top + lay.bottom, `상자 높이 ${y1 - y0} 가 글자 높이 ${lay.top + lay.bottom} 이상`);
  // 좁은 쪽(90도 돌아간 쪽): 눈으로 보이는 가로 폭 안에 들어간다
  const narrow = await PDFDocument.create();
  const np = narrow.addPage([842, 200]); np.setRotation({ type: 'degrees', angle: 90 });   // 보이는 가로 = 200
  const rr = await stampPdf(new Uint8Array(await narrow.save()), { label: '아주아주 긴 교회 이름 아주아주 긴 교회 이름 아주아주', code: 'WL-ABC234', date: '2026-11-21', font: fakeFont });
  assert.equal(rr.status, 'applied');
  const o2 = await PDFDocument.load(rr.bytes);
  const f2 = [];
  o2.context.enumerateIndirectObjects().forEach(([, obj]) => { const bb = obj?.dict?.lookup?.(o2.context.obj('BBox')); if (bb?.asArray) f2.push(bb.asArray().map((n) => n.asNumber())); });
  assert.ok(f2[0][2] - f2[0][0] <= 200, `돌아간 쪽에서도 그림 폭 ${f2[0][2] - f2[0][0]} 이 보이는 폭(200) 안`);
});


/* ── 재검토 반영 ── */
const fontFor = (w) => ({
  unitsPerEm: 1000,
  charToGlyph: () => ({ index: 1, advanceWidth: w, getPath: (x, y, size) => ({ getBoundingBox: () => ({ x1: x, x2: x + size * 0.6, y1: y - size * 0.85, y2: y }), toPathData: () => `M${x} ${y}h${size * 0.5}v${-size * 0.85}h${-size * 0.5}z` }) }),
});
const formBoxes = (doc) => { const out = []; doc.context.enumerateIndirectObjects().forEach(([, o]) => { const bb = o?.dict?.lookup?.(doc.context.obj('BBox')); if (bb?.asArray) out.push(bb.asArray().map((n) => n.asNumber())); }); return out; };

test('워터마크(글꼴 없이 영문): 쪽에 붙은 글꼴 참조가 실제 개체를 가리킨다(손상된 PDF 가 아니다)', async () => {
  const src = await PDFDocument.create(); src.addPage([595, 842]);
  const r = await stampPdf(new Uint8Array(await src.save()), { label: 'Grace Church', code: 'WL-ABC234', date: '2026-11-21', font: null });
  assert.equal(r.status, 'applied-ascii');
  const doc = await PDFDocument.load(r.bytes);
  let checked = 0;
  doc.context.enumerateIndirectObjects().forEach(([, o]) => {
    const res = o?.dict?.lookup?.(doc.context.obj('Resources'));
    const fonts = res?.lookup?.(doc.context.obj('Font'));
    for (const [, ref] of fonts?.entries?.() || []) { checked += 1; assert.ok(doc.context.lookup(ref), '글꼴 참조가 비어 있다'); }
  });
  assert.ok(checked >= 1, '글꼴 참조를 하나 이상 확인했다');
});

test('워터마크: 좁은 쪽(작은 책자)은 폭에 맞춰 이름을 줄여 확인번호를 지키고, 같은 문서의 넓은 쪽은 기본 크기를 유지한다', async () => {
  const font = fontFor(600);   // 글자당 0.6em
  const src = await PDFDocument.create();
  src.addPage([595, 842]); src.addPage([150, 200]);
  const r = await stampPdf(new Uint8Array(await src.save()), { label: '아주 긴 교회 이름 '.repeat(5), code: 'WL-ABC234', date: '2026-11-21', font });
  assert.equal(r.status, 'applied');
  const boxes = formBoxes(await PDFDocument.load(r.bytes)).map(([a, , b]) => b - a).sort((x, y) => x - y);
  assert.equal(boxes.length, 2, '넓은 쪽 · 좁은 쪽 그림이 각각 하나');
  assert.ok(boxes[0] <= 150 * 0.9 + 4.5, `좁은 쪽 그림 폭 ${boxes[0]} 이 쪽 폭 안`);
  // 확인번호는 끝까지 남는다: 좁은 그림도 '날짜 · 확인번호' 글줄(가짜 글꼴로 21자 이상)이 들어 있다
  const narrowLay = layoutLine(font, stampLineOf({ label: '', code: 'WL-ABC234', date: '2026-11-21' }), 4.5);
  assert.ok(boxes[0] >= narrowLay.width * 0.9, '이름을 줄여도 날짜 · 확인번호는 남는다');
  assert.ok(boxes[1] > boxes[0], '넓은 쪽은 더 큰 그림');
});

test('기록 읽기: 아주 많아도 최근 것을 남기고, 잘렸으면 truncated 로 알린다', async () => {
  const kv = fakeKV();
  const env = { CAMP_KV: kv };
  const mk = (month, i) => [`matdl:log:${month}:WL-${String(i).padStart(6, '0')}`, { value: '{}', metadata: { t: Number(month) * 1e6 + i, i: 'a', f: 'b', k: 'church', n: 'x', c: 'y' } }];
  for (let i = 0; i < 2500; i++) kv.store.set(...mk('202610', i));
  for (let i = 0; i < 500; i++) kv.store.set(...mk('202611', i));
  const { readDownloadLogs } = await import('../functions/lib/materials.js');
  const all = await readDownloadLogs(env, { max: 100000 });
  assert.equal(all.rows.length, 3000); assert.equal(all.truncated, false);
  const cut = await readDownloadLogs(env, { max: 400 });
  assert.equal(cut.rows.length, 400); assert.equal(cut.truncated, true, '잘렸으면 알린다');
  assert.ok(cut.rows.every((r) => r.key.includes(':202611:')) , '자를 때도 최근 달이 남는다');
});

test('집계: 월 표는 기록 키의 달을 따른다(월 필터와 같은 기준)', () => {
  const rows = [{ t: Date.UTC(2026, 11, 1, 0, 2) - 9 * 3600e3, key: 'matdl:log:202611:WL-AAAAAA', itemId: 'a', fileId: 'b', kind: 'church', name: '김', church: '소망교회', email: '' }];
  assert.deepEqual(summarizeLogs(rows).byMonth.map((m) => m.month), ['2026-11']);
});
