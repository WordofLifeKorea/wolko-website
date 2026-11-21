// 캠프 스태프 · 크루 서약서 — 신앙고백서 내용 · 서명 제출 검사 · 저장 · 관리자 보기/CSV/삭제 · 공개 페이지 구성
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as signApi from '../functions/api/agreements/sign.js';
import * as adminApi from '../functions/api/portal/agreements.js';
import { DOCS, docHash, checkSignature, docText } from '../functions/lib/staffAgreements.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function fakeKV() {
  const store = new Map();
  const conv = (v, t) => (v == null ? null : (t === 'json' || t?.type === 'json') ? JSON.parse(v) : v);
  return {
    store,
    get: async (k, o) => (store.has(k) ? conv(store.get(k).value, o) : null),
    put: async (k, v, o = {}) => { store.set(k, { value: v, metadata: o.metadata }); },
    delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '', cursor, limit = 1000 } = {}) => {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const done = start + limit >= all.length;
      return { keys: all.slice(start, start + limit).map((name) => ({ name, metadata: store.get(name).metadata })), list_complete: done, cursor: done ? undefined : String(start + limit) };
    },
  };
}
// 아무것도 안 그린 것보다 큰, 진짜 PNG 모양(머리글 + 채움)의 서명 그림
const bigPng = () => 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(3000, 7)]).toString('base64');
const good = () => ({ doc: 'faith', version: DOCS.faith.version, role: 'staff', name: '김섬김', email: 'Serve@Example.com', phone: '010-1234-5678', agree: true, consent: true, signature: bigPng(), lang: 'ko' });

async function setup() {
  const kv = fakeKV();
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  const admin = await createHubSessionToken('secret', 'admin@wolko.org', 'admin');
  const member = await createHubSessionToken('secret', 'member@wolko.org', 'counselor');
  const call = (mod, method, url, { body, token, ip = '1.2.3.4' } = {}) => {
    const headers = { 'CF-Connecting-IP': ip, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const request = new Request('https://wolko.test' + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return mod['onRequest' + method[0] + method.slice(1).toLowerCase()]({ env, request });
  };
  return { kv, env, admin, member, call };
}

test('신앙고백서: 예전 About 페이지의 11개 항목 그대로(한·영), 문서 버전과 글 해시가 있다', async () => {
  const d = DOCS.faith;
  assert.equal(d.items.length, 11);
  assert.ok(d.items.every((i) => i.ko.startsWith('우리는') && /^(We believe|Since every person)/.test(i.en)));
  assert.ok(d.items[8].ko.includes('한 남자와 한 여자'), '결혼 항목이 들어 있다');
  assert.match(d.version, /^\d{4}-\d{2}-v\d+$/);
  assert.match(await docHash(d), /^[0-9a-f]{64}$/);
  assert.ok(docText(d).includes(d.ko.pledge) && docText(d).includes(d.en.pledge));
  // 글이 바뀌면 해시가 바뀐다
  const changed = { ...d, items: [{ ko: d.items[0].ko + '!', en: d.items[0].en }, ...d.items.slice(1)] };
  assert.notEqual(await docHash(changed), await docHash(d));
});

test('서명 제출: 저장되고(서명 그림 포함) 확인번호 · 서버 시각 · 문서 버전/해시가 남는다, 목록용 메타데이터에는 그림이 없다', async () => {
  const t = await setup();
  const res = await t.call(signApi, 'POST', '/api/agreements/sign', { body: good() });
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.match(out.code, /^AG-[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(Math.abs(Date.parse(out.signedAt) - Date.now()) < 5000, '서명 시각은 서버 시각');
  const [[key, val]] = [...t.kv.store.entries()].filter(([k]) => k.startsWith('agree:v1:'));
  assert.match(key, new RegExp(`^agree:v1:faith:\\d{6}:${out.code}$`));
  const rec = JSON.parse(val.value);
  assert.equal(rec.email, 'serve@example.com'); assert.equal(rec.role, 'staff'); assert.equal(rec.version, DOCS.faith.version);
  assert.equal(rec.textHash, await docHash(DOCS.faith)); assert.ok(rec.signature.startsWith('data:image/png;base64,'));
  assert.ok(!('signature' in val.metadata) && JSON.stringify(val.metadata).length < 600, '메타데이터에는 그림 없이 목록 칸만');
  assert.ok(!JSON.stringify(rec).includes('1.2.3.4'), 'IP 는 저장하지 않는다');
});

test('서명 제출 검사: 문서 · 버전 · 구분 · 이름 · 이메일 · 휴대폰 · 동의 · 서명 그림 · 함정 칸', async () => {
  const t = await setup();
  const post = async (patch) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), ...patch } }); return { status: r.status, ...(await r.json()) }; };
  assert.equal((await post({ doc: 'nope' })).field, 'doc');
  const stale = await post({ version: '1999-01-v1' }); assert.equal(stale.status, 409); assert.equal(stale.field, 'version');
  assert.equal((await post({ role: 'guest' })).field, 'role');
  assert.equal((await post({ name: '김' })).field, 'name');
  assert.equal((await post({ email: 'nope' })).field, 'email');
  assert.equal((await post({ email: '' })).field, 'email', '이메일 필수');
  assert.equal((await post({ phone: 'abc' })).field, 'phone');
  assert.equal((await post({ phone: '' })).status, 200, '휴대폰은 선택');
  assert.equal((await post({ agree: 'yes' })).field, 'agree');
  assert.equal((await post({ consent: false })).field, 'consent');
  assert.equal((await post({ signature: '' })).field, 'signature');
  assert.equal((await post({ signature: 'data:image/png;base64,iVBORw0KGgo=' })).field, 'signature', '아무것도 안 그린 작은 그림');
  assert.equal((await post({ signature: 'data:image/jpeg;base64,' + 'A'.repeat(4000) })).field, 'signature', 'PNG 가 아닌 것');
  assert.equal((await post({ signature: 'data:image/png;base64,' + Buffer.alloc(3000, 1).toString('base64') })).field, 'signature', 'PNG 머리글이 없는 것');
  assert.equal((await post({ signature: 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(300 * 1024, 1)]).toString('base64') })).field, 'signature', '너무 큰 것');
  assert.equal((await post({ website: 'http://spam' })).field, 'website');
  assert.ok(checkSignature(bigPng()) > 600);
  assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('agree:v1:')).length, 1, '통과한 한 건(휴대폰 비움)만 저장됐다');
});

test('서명 제출: 짧은 시간에 너무 많이 하면 429', async () => {
  const t = await setup();
  let last;
  for (let i = 0; i < 21; i++) last = await t.call(signApi, 'POST', '/api/agreements/sign', { body: good(), ip: '9.9.9.9' });
  assert.equal(last.status, 429);
  assert.equal((await t.call(signApi, 'POST', '/api/agreements/sign', { body: good(), ip: '8.8.8.8' })).status, 200, '다른 곳은 영향 없다');
});

test('관리자 보기: 관리자만 · 목록(그림 없음) · 한 건(그림+문서 글) · CSV · 삭제', async () => {
  const t = await setup();
  const a = await (await t.call(signApi, 'POST', '/api/agreements/sign', { body: good() })).json();
  await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), role: 'crew', name: '박크루', email: 'crew@example.com' } });
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements')).status, 401);
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements', { token: t.member })).status, 403);
  const list = await (await t.call(adminApi, 'GET', '/api/portal/agreements', { token: t.admin })).json();
  assert.equal(list.items.length, 2);
  assert.ok(!JSON.stringify(list).includes('data:image'), '목록에는 서명 그림이 없다');
  assert.deepEqual(list.items.map((i) => i.role).sort(), ['crew', 'staff']);
  const one = await (await t.call(adminApi, 'GET', `/api/portal/agreements?code=${a.code}`, { token: t.admin })).json();
  assert.ok(one.record.signature.startsWith('data:image/png')); assert.equal(one.doc.items.length, 11);
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements?code=bad', { token: t.admin })).status, 400);
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements?code=AG-AAAAAA', { token: t.admin })).status, 404);
  const csv = await t.call(adminApi, 'GET', '/api/portal/agreements?format=csv', { token: t.admin });
  const text = await csv.text();
  assert.ok(text.includes('serve@example.com') && text.includes('신앙고백서') && !text.includes('data:image'));
  assert.equal((await t.call(adminApi, 'DELETE', `/api/portal/agreements?code=${a.code}`, { token: t.member })).status, 403);
  assert.equal((await (await t.call(adminApi, 'DELETE', `/api/portal/agreements?code=${a.code}`, { token: t.admin })).json()).removed, 1);
  assert.equal((await (await t.call(adminApi, 'GET', '/api/portal/agreements', { token: t.admin })).json()).items.length, 1);
});

test('공개 서명 페이지: 검색 제외 · 신앙고백서 11항목 · 서명판 · 휴대폰/마우스 입력 · 제출 주소', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /noindex/);
  assert.match(page, /pointerdown/); assert.match(page, /touch-action: none/);
  assert.match(page, /\/api\/agreements\/sign/);
  assert.match(page, /docList\(\)/);
  assert.ok(!/border-left\s*:|●/.test(page.replace(/border-left:\s*0/g, '')), '왼쪽 띠 · 점 장식 없음');
  const admin = readFileSync(new URL('../src/pages/portal/agreements/index.astro', import.meta.url), 'utf8');
  assert.match(admin, /noindex/); assert.match(admin, /\/api\/portal\/agreements/);
});
