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
// 진짜 PNG 머리글(8바이트 서명 + IHDR 가로 600 · 세로 180) 뒤에 채움을 붙인 서명 그림 — 서버는 머리글 모양과 크기를 본다
const pngWith = (w, h, fill = 3000) => { const ihdr = Buffer.alloc(25); ihdr.writeUInt32BE(13, 0); ihdr.write('IHDR', 4); ihdr.writeUInt32BE(w, 8); ihdr.writeUInt32BE(h, 12); return 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ihdr, Buffer.alloc(fill, 7)]).toString('base64'); };
const bigPng = () => pngWith(600, 180);
const good = () => ({ doc: 'faith', version: DOCS.faith.version, role: 'staff', name: '김섬김', email: 'Serve@Example.com', agree: true, consent: true, signature: bigPng(), lang: 'ko' });

// 아동보호 서약서는 지금은 캠프 선택 없이 한 번만 쓴다(perCamp:false). '캠프마다 쓰는 문서' 기능은 켜 둔 채로도 되도록 남겨 두었으므로, 그 기능을 시험할 때만 잠시 켠다
const testPerCamp = (name, fn) => test(name, async (t) => { DOCS.childprotection.perCamp = true; try { await fn(t); } finally { DOCS.childprotection.perCamp = false; } });

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

test('신앙고백서: 교단에 상관없이 함께 고백하는 핵심 7개(한·영), 문서 버전과 글 해시가 있다', async () => {
  const d = DOCS.faith;
  assert.equal(d.items.length, 7);
  assert.ok(d.items.every((i) => i.ko.startsWith('우리는') && i.en.startsWith('We believe')));
  assert.ok(d.items[6].ko.includes('한 남자와 한 여자'), '결혼 · 생명 항목이 들어 있다');
  const all = d.items.map((i) => i.ko + i.en).join(' ');
  assert.doesNotMatch(all, /대환난|천년|휴거|방언|tribulation|1000-year|tongues|eternally saved/, '특정 교단의 교리는 뺐다');
  assert.ok(d.acceptVersions.includes('2026-11-v3'), '예전 11개에 서명한 분은 그대로 인정');
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

test('서명 제출 검사: 문서 · 버전 · 구분 · 이름 · 이메일 · 동의 · 서명 그림 · 함정 칸', async () => {
  const t = await setup();
  const post = async (patch) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), ...patch } }); return { status: r.status, ...(await r.json()) }; };
  assert.equal((await post({ doc: 'nope' })).field, 'doc');
  const stale = await post({ version: '1999-01-v1' }); assert.equal(stale.status, 409); assert.equal(stale.field, 'version');
  assert.equal((await post({ role: 'guest' })).field, 'role');
  assert.equal((await post({ name: '김' })).field, 'name');
  assert.equal((await post({ email: 'nope' })).field, 'email');
  assert.equal((await post({ email: '' })).field, 'email', '이메일 필수');
  const withPhone = await post({ email: 'phone@x.org', phone: '010-1234-5678' });
  assert.equal(withPhone.status, 200, '예전 화면이 보낸 휴대폰 값은 무시한다');
  assert.ok(![...t.kv.store.values()].some((v) => JSON.stringify(v).includes('010-1234-5678')), '휴대폰은 저장하지 않는다');
  assert.equal((await post({ agree: 'yes' })).field, 'agree');
  assert.equal((await post({ consent: false })).field, 'consent');
  assert.equal((await post({ signature: '' })).field, 'signature');
  assert.equal((await post({ signature: 'data:image/png;base64,iVBORw0KGgo=' })).field, 'signature', '아무것도 안 그린 작은 그림');
  assert.equal((await post({ signature: 'data:image/jpeg;base64,' + 'A'.repeat(4000) })).field, 'signature', 'PNG 가 아닌 것');
  assert.equal((await post({ signature: 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(3000, 1)]).toString('base64') })).field, 'signature', 'PNG 머리글이 온전하지 않은 것');
  assert.equal((await post({ signature: pngWith(10, 10) })).field, 'signature', '가로 · 세로 크기가 이상한 것');
  assert.equal((await post({ signature: bigPng() + 'A' })).field, 'signature', 'base64 길이가 4의 배수가 아닌 것');
  assert.equal((await post({ signature: 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(300 * 1024, 1)]).toString('base64') })).field, 'signature', '너무 큰 것');
  assert.equal((await post({ website: 'http://spam' })).field, 'website');
  assert.ok(checkSignature(bigPng()) > 600);
  assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('agree:v1:')).length, 1, '통과한 한 건(휴대폰 비움)만 저장됐다');
});

test('서명 제출: 짧은 시간에 너무 많이 하면 429', async () => {
  const t = await setup();
  let last;
  for (let i = 0; i < 61; i++) last = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), email: `p${i}@x.org` }, ip: '9.9.9.9' });
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
  assert.ok(one.record.signature.startsWith('data:image/png')); assert.equal(one.doc.items.length, 7);
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements?code=bad', { token: t.admin })).status, 400);
  assert.equal((await t.call(adminApi, 'GET', '/api/portal/agreements?code=AG-AAAAAA', { token: t.admin })).status, 404);
  const csv = await t.call(adminApi, 'GET', '/api/portal/agreements?format=csv', { token: t.admin });
  const text = await csv.text();
  assert.ok(text.includes('serve@example.com') && text.includes('신앙고백서') && !text.includes('data:image'));
  assert.ok(!text.includes('휴대폰') && !text.includes('010-'), 'CSV 에 휴대폰 열이 없다');
  // 문구만 고치고 버전을 안 올렸다면(글 해시가 다르면) 서명한 글로 보여 주지 않는다
  const [[k]] = [...t.kv.store.entries()].filter(([key]) => key.includes(a.code));
  const rec = JSON.parse(t.kv.store.get(k).value); rec.textHash = 'x'.repeat(64); t.kv.store.set(k, { value: JSON.stringify(rec), metadata: t.kv.store.get(k).metadata });
  assert.equal((await (await t.call(adminApi, 'GET', `/api/portal/agreements?code=${a.code}`, { token: t.admin })).json()).doc, null);
  assert.equal((await t.call(adminApi, 'DELETE', `/api/portal/agreements?code=${a.code}`, { token: t.member })).status, 403);
  assert.equal((await (await t.call(adminApi, 'DELETE', `/api/portal/agreements?code=${a.code}`, { token: t.admin })).json()).removed, 1);
  assert.equal((await (await t.call(adminApi, 'GET', '/api/portal/agreements', { token: t.admin })).json()).items.length, 1);
});

test('공개 서명 페이지: 검색 제외 · 신앙고백서 11항목 · 서명판 · 휴대폰/마우스 입력 · 제출 주소', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /noindex/);
  assert.match(page, /pointerdown/); assert.match(page, /touch-action: none/);
  assert.match(page, /\/api\/agreements\/sign/);
  assert.match(page, /docList\(\{ includeDrafts/);
  assert.ok(!/border-left\s*:|●/.test(page.replace(/border-left:\s*0/g, '')), '왼쪽 띠 · 점 장식 없음');
  const admin = readFileSync(new URL('../src/pages/portal/agreements/index.astro', import.meta.url), 'utf8');
  assert.match(admin, /noindex/); assert.match(admin, /\/api\/portal\/agreements/);
});

/* ── 아동보호 서약서 · 캠프 필수 규칙(초안) ── */
import { docList, docSections } from '../functions/lib/staffAgreements.js';
import { OPEN_QUESTIONS, CHILD_PROTECTION_DECLARATION_LATER } from '../functions/lib/agreementDocsExtra.js';

test('세 서약서(신앙고백서 · 아동보호 서약서 · 필수 규칙)가 모두 공개 · 초안(draft) 표시를 하면 목록에서 빠지고 서명도 거절한다 · 신앙고백서 글 해시는 그대로', async () => {
  assert.deepEqual(docList().map((d) => d.id), ['faith', 'childprotection', 'rules'], '세 문서가 공개 페이지에 나온다');
  assert.ok(!DOCS.childprotection.draft && !DOCS.rules.draft && !DOCS.faith.draft);
  assert.match(await docHash(DOCS.faith), /^[0-9a-f]{64}$/);
  const t = await setup();
  // 초안으로 돌리면(draft: true) 목록에서 빠지고 서명도 받지 않는다
  DOCS.childprotection.draft = true;
  try {
    assert.deepEqual(docList().map((d) => d.id), ['faith', 'rules']);
    const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc: 'childprotection', version: DOCS.childprotection.version, declared: true } });
    assert.equal(r.status, 400); assert.equal((await r.json()).field, 'doc');
  } finally { DOCS.childprotection.draft = false; }
  assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('agree:v1:')).length, 0);
  // 공개된 문서는 서명을 받는다
  assert.equal((await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc: 'rules', version: DOCS.rules.version } })).status, 200);
});

test('아동보호 서약서: 본인 진술(유죄 판결 · 수사 · 재판 없음) 체크는 공개 페이지에 두지 않는다 — 문서에 붙어 있지 않고 서명에 필요 없다(나중에 서명 칸 아래에 넣을 문구만 따로 보관) · 켜면 필수로 동작', async () => {
  assert.ok(!DOCS.childprotection.declaration, '지금은 본인 진술 칸이 없다');
  assert.ok(CHILD_PROTECTION_DECLARATION_LATER.ko.includes('유죄 판결') && CHILD_PROTECTION_DECLARATION_LATER.en.includes('convicted'), '나중에 쓸 문구는 보관');
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /유죄 판결|convicted/, '공개 페이지 원본에는 본인 진술 문구가 없다');
  const t = await setup();
  const body = { ...good(), doc: 'childprotection', version: DOCS.childprotection.version };
  assert.equal((await t.call(signApi, 'POST', '/api/agreements/sign', { body })).status, 200, '진술 없이도 서명된다');
  // 나중에 문서에 다시 붙이면(declaration 이 있으면) 필수로 동작한다
  DOCS.childprotection.declaration = CHILD_PROTECTION_DECLARATION_LATER;
  try {
    const t2 = await setup();
    const no = await t2.call(signApi, 'POST', '/api/agreements/sign', { body: { ...body, version: DOCS.childprotection.version } });
    assert.equal(no.status, 400); assert.equal((await no.json()).field, 'declared');
    assert.equal((await t2.call(signApi, 'POST', '/api/agreements/sign', { body: { ...body, declared: 'true' } })).status, 400, '문자열 "true" 는 안 된다');
    assert.equal((await t2.call(signApi, 'POST', '/api/agreements/sign', { body: { ...body, declared: true } })).status, 200);
  } finally { delete DOCS.childprotection.declaration; }
});

test('아동보호 서약서 내용: 원본 문서(Child Protection Code of Conduct)의 글 그대로 — I WILL 다섯 항목 · 3가지 T · 3가지 W · 3가지 R · 맺음말, 한·영이 짝을 이룬다', () => {
  const d = DOCS.childprotection;
  const secs = docSections(d), all = secs.flatMap((s) => s.items);
  const ko = all.map((i) => i.ko).join('\n'), en = all.map((i) => i.en).join('\n');
  assert.ok(all.every((i) => i.ko && i.en) && secs.every((x) => x.ko && x.en), '모든 항목 · 소제목에 한국어와 영어가 있다');
  assert.equal(d.en.title, 'Child Protection Code of Conduct');
  assert.deepEqual(secs.map((x) => x.items.length), [5, 5, 7, 3, 6, 2, 4, 3, 3], '원본의 묶음과 항목 수 그대로');
  assert.deepEqual(secs.map((x) => x.en), ['I will', 'Three T’s: Appropriate TOUCH', 'Three T’s: Not Appropriate TOUCH', 'Three T’s: Appropriate TALK', 'Three T’s: Not Appropriate TALK', 'Three T’s: Appropriate TERRITORY', 'Three T’s: Not Appropriate TERRITORY', 'Three W’s: Who, What & Where', 'Three R’s: Recognize, Respond & Report']);
  assert.ok(ko.includes('나는 48시간 이내 상태를 보고해야 하는 방침에 따라 모든 우려 사항이나 증거 없는 혐의 사실에 대해 대응할 것입니다.') && en.includes('according to the Reporting Protocol within 48 hours'));
  assert.ok(ko.includes('신체 은밀한 부분을 만지는 것 (절대금지 예외 없음)') && en.includes('touching of private parts (no exceptions!)'));
  assert.ok(ko.includes('사적인 일대일 대화 (교실 창문을 가려서는 안 됩니다.)') && en.includes('private one-on-one talks (do NOT cover windows)'));
  assert.ok(ko.includes('아동학대를 보거나 들은 경우 리더에게 보고 해야 합니다') && en.includes('REPORT to your authority if you see or hear that a child has been abused.'));
  assert.equal(d.ko.pledge, '저는 WOLKO 행동 수칙을 주의 깊게 읽고 명확하게 이해했습니다.\n본인은 위의 행동 수칙에 설명된 행동 기준을 항상 준수할 것에 동의합니다.');
  assert.equal(d.en.pledge, 'I have carefully read and clearly understand the WOL Code of Conduct.\nI agree to uphold at all times the standards of behavior described in the Code of Conduct above.');
  assert.ok(!/Jason Anderson|112|범죄경력/.test(ko + en + docText(d)), '예전(v14까지) 서약서의 항목은 남아 있지 않다');
  assert.ok(!secs.some((x) => x.roles), '구분(스태프 · 크루)에 따라 갈리는 묶음이 없다');
});

test('캠프 필수 규칙 초안: 경고 2회 제명 · 문신 · 얼굴 장신구(귀걸이 한 세트까지) · 사역에 방해되는 SNS', () => {
  const d = DOCS.rules;
  const all = docSections(d).flatMap((s) => s.items);
  const ko = all.map((i) => i.ko).join('\n'), en = all.map((i) => i.en).join('\n');
  assert.ok(d.ko.pledge.includes('경고를 2회 받으면 캠프에서 제명') && ko.includes('제명') && !ko.includes('하차'));
  assert.ok(ko.includes('문신이 보이지 않게') && /tattoo/i.test(en));
  assert.ok(ko.includes('두 세트 이상의 귀걸이') && ko.includes('코걸이') && ko.includes('혓바닥 피어싱') && ko.includes('과도한 액세서리를 착용하지 않는 것에 동의합니다'), '장신구 규칙(동의합니다 투)');
  assert.ok(ko.includes('귀걸이는 한 쌍(한 세트)까지는 괜찮습니다') && /One pair \(one set\) of earrings is fine/.test(en), '귀걸이 한 쌍은 괜찮다(모든 스태프 · 크루 공통 — 문서가 스태프와 크루 모두의 서명용)');
  assert.ok(ko.includes('사역에 방해가 될 만한 내용을 SNS에 올리지 않는 것에 동의합니다'));
  assert.ok(all.every((i) => i.ko && i.en));
});

test('초안 문서가 공개 페이지(빌드)에 새지 않는다 · 아직 정하지 못한 것 목록이 있다', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /includeDrafts: process\.env\.WOLKO_SHOW_DRAFTS === '1'/);
  assert.ok(OPEN_QUESTIONS.length >= 4 && OPEN_QUESTIONS.some((q) => q.includes('크루')) && OPEN_QUESTIONS.some((q) => q.includes('열람자')));
});

test('캠프 필수 규칙 초안(결정 반영): 1번은 한 문장 · 즉시 제명 목록(성적 학대·폭력·잘못된 신학/교리) · 미성년 크루 귀가', () => {
  const d = DOCS.rules;
  const secs = docSections(d);
  const by = (title) => secs.find((s) => s.ko === title);
  const ko = secs.flatMap((s) => s.items).map((i) => i.ko).join('\n'), en = secs.flatMap((s) => s.items).map((i) => i.en).join('\n');
  const first = docSections(DOCS.rules)[0].items[0];
  assert.ok(first.ko === '아래 캠프 규칙을 반복적으로 어기면 경고를 받거나 월코 캠프에서 제명당할 수 있습니다.' && /repeatedly break the camp rules below/.test(first.en), '1번은 이 한 문장만(경고 절차 · 제외 대상 설명은 문서에 넣지 않는다)');
  assert.ok(!JSON.stringify(DOCS.rules.ko) .includes('하차') && !JSON.stringify(DOCS.rules.sections).includes('하차'), '필수 규칙 문서는 "제명"으로 통일');
  assert.match(DOCS.rules.version, /v9$/);
  const itemsOf = (t) => docSections(DOCS.rules).find((x) => x.ko === t).items.map((i) => i.ko);
  assert.ok(itemsOf('숙소')[0].includes('캠퍼는 스태프 방에, 스태프는 캠퍼 숙소에 혼자 들어가지 않으며') && itemsOf('숙소')[0].endsWith('숙소를 깨끗하게 사용하는 것에 동의합니다.'), '숙소 문구');
  assert.ok(itemsOf('외모와 복장')[0] === '문신이 보이지 않게 가리는 것에 동의합니다.', '문신 문구');
  assert.ok(itemsOf('제명된 뒤')[1].endsWith('귀가합니다.') && !itemsOf('제명된 뒤')[1].includes('보호자 본인'), '보호자 본인 확인 문장은 넣지 않는다');
  assert.equal(itemsOf('제명된 뒤')[0], '만에 하나 제명이 결정되면, 월코의 결정을 존중하고, 제명된 일을 SNS에 올리거나 캠퍼에게 험담을 하는 행위를 자제하는 것에 동의합니다.');
  assert.ok(itemsOf('외모와 복장')[2] === '개인위생을 청결히 유지하고, 단정한 복장을 착용하는 것에 동의합니다.', '위생 · 복장 문구');
  assert.ok(itemsOf('이성 교제')[0] === '어떠한 경우에도 캠퍼와 교제하지 않는 것에 동의합니다.', '캠퍼와 교제: 어떠한 경우에도');
  assert.ok(itemsOf('이성 교제')[1].startsWith('캠프 기간 및 준비기간에 스태프·크루 사이에서도') && itemsOf('이성 교제')[1].endsWith('부부와 가족은 예외로 합니다.'), '스태프·크루 사이: 캠프 기간 및 준비기간');
  assert.equal(itemsOf('휴대폰')[0], '캠프 기간 동안 휴대폰 사용, SNS, 게임을 최대한 지양하는 것에 동의합니다. 캠프 사역에 필요한 휴대폰 및 전자기기 사용은 예외로 간주합니다.');
  const imm2 = docSections(DOCS.rules).find((x) => x.ko === '경고 없이 바로 제명될 수 있는 경우').items.map((i) => i.ko).join('\n');
  assert.ok(imm2.includes('특히 아동보호 서약과 관련된 문제를 야기할 경우 필요에 따라 경찰에 보고할 수 있습니다.') && !imm2.includes('경찰에 신고합니다'), '경찰 보고는 아동보호 관련 문제일 때 필요에 따라');
  // 규칙 항목은 '저는'을 빼고 '~에 동의합니다' 투(맺음말 · 경고 안내 제외)
  const ruleItems = docSections(DOCS.rules).flatMap((x) => x.items.map((i) => ({ sec: x.ko, ko: i.ko })));
  assert.ok(!ruleItems.some((i) => /저는|제가|저에게/.test(i.ko)), '규칙 항목에는 "저는"이 없다');
  for (const sec of ['술, 담배, 약물', '이성 교제', '휴대폰', '외출', '시간', '숙소', '외모와 복장', '사역 태도', 'SNS']) assert.ok(ruleItems.filter((i) => i.sec === sec).every((i) => i.ko.includes('동의합니다')), sec + ': 동의합니다 투');
  assert.equal(docSections(DOCS.rules).find((x) => x.ko === '경고와 제명').items.length, 1, '경고와 제명은 1번 하나로 설명한다');
  const after = docSections(DOCS.rules).find((x) => x.ko === '제명된 뒤').items.map((i) => i.ko).join('\n');
  assert.ok(after.includes('미성년 크루') && !after.includes('터미널') && !after.includes('귀가 비용'), '성인 스태프 귀가 · 비용 문구는 넣지 않는다');
  assert.ok(!ko.includes('경고 기록지') && !ko.includes('24시간'), '경고 절차(기록지 · 이의 24시간)는 문서에 넣지 않는다 — 운영 지침으로 따로');
  const immediate = by('경고 없이 바로 제명될 수 있는 경우').items.map((i) => i.ko).join('\n');
  for (const must of ['성적 학대', '폭력', '잘못된 신학이나 교리', '아동보호 서약서', '술이나 불법 약물']) assert.ok(immediate.includes(must), `즉시 하차: ${must}`);
  const imm = by('경고 없이 바로 제명될 수 있는 경우').items.map((i) => i.en).join('\n');
  assert.ok(/sexual abuse/i.test(imm) && /violence/i.test(imm) && /false theology or doctrine/i.test(imm) && /deliberately/.test(imm));
  assert.ok(immediate.includes('즉, 월코 신앙고백서에 어긋나는 내용을 캠퍼, 스태프, 크루에게 고의로 가르치거나 전달하는 것을 의미합니다') && immediate.includes('좋은 의도로 토론하고 함께 배우는 것은 이 항목에 해당되지 않습니다') && !immediate.includes('함께 판단'), '잘못된 신학: 고의 · 좋은 의도의 토론은 제외');
  for (const title of ['술, 담배, 약물', '이성 교제', '휴대폰', '외출', '시간', '숙소', '외모와 복장', '사역 태도', 'SNS', '제명된 뒤']) assert.ok(by(title), `${title} 항목이 있다`);
  assert.ok(ko.includes('보호자가 동의하면 혼자 귀가할 수 있고'), '크루 부모님이 동의하면 혼자 귀가 가능');
  assert.ok(ko.includes('디렉터가 보호자에게 직접 연락'), '제명 시 보호자 연락');
  assert.ok(docSections(d).every((s) => s.items.every((i) => i.ko && i.en)), '한·영이 짝을 이룬다');
});

test('결정 반영(2): 경고 절차 · 적용 제외는 필수 규칙 문서에서 뺐다 · 즉시 제명에 범죄·허위 서류', () => {
  const rules = docSections(DOCS.rules).flatMap((s) => s.items);
  const rKo = rules.map((i) => i.ko).join('\n'), rEn = rules.map((i) => i.en).join('\n');
  assert.ok(!rKo.includes('풀타임 선교사') && !/full-time missionaries/.test(rEn), '경고·제명 절차의 적용 제외 설명은 문서에 넣지 않는다(운영 지침으로 따로)');
  assert.ok(rKo.includes('절도 등 범죄 행위') && rKo.includes('허위 서류'), '즉시 제명: 범죄 행위 · 허위 서류');
  assert.ok(!OPEN_QUESTIONS.some((q) => q.includes('연락처') || q.includes('보호자(법정대리인) 서명')), '해결된 질문은 목록에서 뺐다');
});

test('시간 · 외출 항목은 짧은 "동의합니다" 한 문장(지각 · 자리 비움 같은 세부 설명은 문서에 넣지 않는다)', () => {
  const time = docSections(DOCS.rules).find((x) => x.ko === '시간').items;
  assert.deepEqual(time.map((i) => i.ko), ['캠프 일정(기상, 모임, 사역, 팀 미팅, 소등)을 지키려고 노력하는 것에 동의합니다.']);
  const out = docSections(DOCS.rules).find((x) => x.ko === '외출').items;
  assert.equal(out.length, 1);
  assert.ok(out[0].ko.includes('캠프 디렉터나 코디네이터 또는 팀 리더와 꼭 소통') && out[0].ko.includes('동일 성별 1인 이상') && out[0].ko.includes('제3자를 포함해 3인이 동행') && out[0].ko.endsWith('동의합니다.') && out[0].ko.includes('밤에는 외출을 지양'));
  assert.ok(/Camp Director or the Coordinator/.test(out[0].en) && /third person/.test(out[0].en));
  });

/* ── 스태프·크루 필수 서약: 공개된 문서를 모두 작성해야 수락 ── */
import * as acceptApi from '../functions/api/admin/staff-accept.js';
import * as statusApi from '../functions/api/admin/staff-agreements.js';
import { requiredDocs, signedMap, missingDocs } from '../functions/lib/staffAgreements.js';

test('필수 서약서 = 공개된 문서 세 개(신앙고백서 · 아동보호 서약서 · 필수 규칙)', () => {
  assert.deepEqual(requiredDocs().map((d) => d.id), ['faith', 'childprotection', 'rules']);
});

testPerCamp('서명 → 이메일별 작성 현황(signedMap) · 현재 버전만 센다 · 미작성 문서 목록(missingDocs)', async () => {
  const t = await setup();
  const sign = (doc, email, campId = 'camp-a') => t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc, version: DOCS[doc].version, email, declared: true, campId } });
  assert.equal((await sign('faith', 'A@x.org')).status, 200);
  let map = await signedMap(t.env);
  assert.deepEqual(map['a@x.org'], ['faith']);
  assert.deepEqual(missingDocs(map, 'a@x.org', 'camp-a').map((d) => d.id), ['childprotection', 'rules'], '아동보호 서약서와 필수 규칙이 남았다');
  assert.deepEqual(missingDocs(map, 'nobody@x.org', 'camp-a').map((d) => d.id), ['faith', 'childprotection', 'rules']);
  assert.equal((await sign('childprotection', 'a@x.org', 'camp-a')).status, 200);
  assert.equal((await sign('rules', 'a@x.org')).status, 200);
  map = await signedMap(t.env);
  assert.deepEqual(missingDocs(map, 'A@X.ORG', 'camp-a').map((d) => d.id), [], '대소문자 상관없이 모두 작성');
  // 아동보호 서약서는 캠프마다 — 다른 캠프에는 다시 작성해야 한다(신앙고백서 · 필수 규칙은 그대로 인정)
  assert.deepEqual(missingDocs(map, 'a@x.org', 'camp-b').map((d) => d.id), ['childprotection'], '다른 캠프는 아동보호 서약서만 다시');
  assert.ok(map['a@x.org'].includes('childprotection@camp-a') && !map['a@x.org'].includes('childprotection'));
  assert.equal((await sign('childprotection', 'a@x.org', 'camp-b')).status, 200);
  assert.deepEqual(missingDocs(await signedMap(t.env), 'a@x.org', 'camp-b').map((d) => d.id), [], '캠프 b 도 작성하면 완료');
  // 문서 버전이 바뀌면 예전 서명은 세지 않는다
  const [[key]] = [...t.kv.store.entries()].filter(([k, v]) => k.includes(':rules:') && v.metadata?.e === 'a@x.org');
  const old = t.kv.store.get(key); t.kv.store.set(key, { value: old.value, metadata: { ...old.metadata, v: '1999-01-v1' } });
  assert.deepEqual(missingDocs(await signedMap(t.env), 'a@x.org', 'camp-b').map((d) => d.id), ['rules']);
});

test('서약서는 캠프 트레이닝 위크에 작성한다 — 수락 조건이 아니다 · 현황 API 는 관리자만(작성 현황 표시용)', async () => {
  const t = await setup();
  const reg = { regId: 'r1', campId: '2026-test', registrationType: 'staff', role: 'staff', email: 'serve@example.com', name: '김섬김', accepted: false };
  t.kv.store.set('camp:2026-test:reg:r1', { value: JSON.stringify(reg) });
  // 서약서를 하나도 쓰지 않아도 수락할 수 있다(트레이닝 위크에 작성)
  const ok = await t.call(acceptApi, 'POST', '/api/admin/staff-accept', { token: t.admin, body: { action: 'accept', regId: 'r1', campId: '2026-test' } });
  assert.equal(ok.status, 200); assert.equal((await ok.json()).reg.accepted, true);
  // 현황 API
  const noLogin = await t.call(statusApi, 'GET', '/api/admin/staff-agreements');
  assert.equal(noLogin.status, 401);
  t.kv.store.set('hub:account:member@wolko.org', { value: JSON.stringify({ email: 'member@wolko.org', name: 'm', role: 'counselor', status: 'approved' }) });
  assert.equal((await t.call(statusApi, 'GET', '/api/admin/staff-agreements', { token: t.member })).status, 403);
  await t.call(signApi, 'POST', '/api/agreements/sign', { body: good() });   // 신앙고백서(serve@example.com)
  const st = await (await t.call(statusApi, 'GET', '/api/admin/staff-agreements', { token: t.admin })).json();
  assert.deepEqual(st.required.map((d) => d.id), ['faith', 'childprotection', 'rules']); assert.deepEqual(st.signed['serve@example.com'], ['faith']);
  assert.ok(!JSON.stringify(st).includes('data:image'), '서명 그림은 없다');
});

test('연결: 서명 페이지의 필수 목록(트레이닝 위크 안내) · 지원서 완료 화면에는 서약서 안내를 넣지 않는다 · 관리자 목록 표시', () => {
  const camp = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(camp, /staffAgreeLink|staff-agreements/, '서약서는 지원할 때가 아니라 캠프 트레이닝 위크에 작성한다');
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /data-need/); assert.match(page, /캠프 트레이닝 위크/); assert.match(page, /function continueWho\(/); assert.match(page, /\?name&email&role|QS\.get\('name'\)/);
  const admin = readFileSync(new URL('../src/pages/portal/wolkoadmin.astro', import.meta.url), 'utf8');
  assert.match(admin, /\/api\/admin\/staff-agreements/); assert.doesNotMatch(admin, /acceptNeedsAgreements/, '수락 조건이 아니다');
  const accept = readFileSync(new URL('../functions/api/admin/staff-accept.js', import.meta.url), 'utf8');
  assert.doesNotMatch(accept, /staffAgreements/, '수락은 서약서와 무관');
});

test('서명 페이지: 서약서를 한 화면에 늘어놓지 않고, 목록의 항목을 누르면 그 서약서만 열린다 · 존댓말은 "저는"', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /class="sa-doc"[^>]*\bhidden\b/, '서약서는 처음에 닫혀 있다');
  assert.match(page, /data-open-doc=/); assert.match(page, /aria-expanded/); assert.match(page, /function openDoc\(/);
  assert.match(page, /#doc-/, '주소의 #doc-… 로 바로 열 수 있다'); assert.match(page, /data-next/); assert.match(page, /data-back/);
  for (const d of [DOCS.faith, DOCS.rules]) {   // 아동보호 서약서는 원본 문서의 글 그대로라 원본의 '나는'을 그대로 둔다
    const ko = JSON.stringify(d.ko) + JSON.stringify(d.sections || d.items) + JSON.stringify(d.declaration || {});
    assert.ok(!/(^|[^가-힣])(나는|내가|나에게|나에 대한|내 문화|내 개인)/.test(ko), `${d.id}: "나는" 대신 "저는" (낱말 안의 "…나는" 은 그대로)`);
    assert.ok(/저는|제가/.test(ko), `${d.id}: 저는 / 제가 를 쓴다`);
  }
  assert.match(DOCS.faith.version, /v7$/, '문구를 고쳤으니 문서 버전을 올렸다');
  assert.ok(DOCS.faith.ko.pledge.startsWith('※ 위 신앙고백서는 월코의 전체 Statement of Faith가 아닌 요약본임을 미리 고지드립니다.\n\n저는 위 신앙고백서를') && DOCS.faith.en.pledge.startsWith('※ Please note that the Statement of Faith above is a summary, not WOLKO'), '맺음말 앞에 요약본 안내');
  assert.ok(DOCS.faith.ko.pledge.includes('동의하지 않는 내용이 있다면') && DOCS.faith.ko.pledge.includes('camp@wolko.org') && DOCS.faith.en.pledge.includes('camp@wolko.org'), '신앙고백서 맺음말에 문의 이메일 안내');
});

testPerCamp('아동보호 서약서는 참여하는 캠프마다 작성: 캠프 필수 · 알 수 없는 캠프는 거절 · 기록에 캠프가 남는다 · 관리자 목록/CSV 에 캠프 열', async () => {
  assert.equal(DOCS.childprotection.perCamp, true);
  assert.ok(!DOCS.faith.perCamp && !DOCS.rules.perCamp, '신앙고백서 · 필수 규칙은 캠프마다가 아니다');
  const t = await setup();
  const base = { ...good(), doc: 'childprotection', version: DOCS.childprotection.version, declared: true };
  const post = async (patch) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...base, ...patch } }); return { status: r.status, ...(await r.json()) }; };
  assert.equal((await post({})).field, 'campId', '캠프를 안 고르면 거절');
  assert.equal((await post({ campId: 'bad id!' })).field, 'campId');
  // 캠프 일정을 읽을 수 있을 때는 목록에 없는 캠프를 거절한다
  t.env.ASSETS = { fetch: async () => new Response(JSON.stringify([{ id: '2027-wolko-winter', titleKo: '2027 겨울 월코 영어 캠프', titleEn: 'Winter', startDate: '2027-01-11', endDate: '2027-01-16' }])) };
  const { resetScheduleCache } = await import('../functions/lib/gospelCamps.js'); resetScheduleCache();
  try {
  assert.equal((await post({ campId: 'no-such-camp' })).field, 'campId', '일정에 없는 캠프는 거절');
  const ok = await post({ campId: '2027-wolko-winter' });
  assert.equal(ok.status, 200);
  const [[, val]] = [...t.kv.store.entries()].filter(([k]) => k.startsWith('agree:v1:childprotection:'));
  const rec = JSON.parse(val.value);
  assert.equal(rec.campId, '2027-wolko-winter'); assert.equal(rec.campName, '2027 겨울 월코 영어 캠프'); assert.equal(val.metadata.c, '2027-wolko-winter');
  // 다른 서약서(신앙고백서)는 캠프를 요구하지도 기록하지도 않는다
  assert.equal((await t.call(signApi, 'POST', '/api/agreements/sign', { body: good() })).status, 200);
  const faith = [...t.kv.store.entries()].find(([k]) => k.startsWith('agree:v1:faith:'))[1];
  assert.ok(!('campId' in JSON.parse(faith.value)) && !('c' in faith.metadata));
  // 관리자 목록 · CSV
  const list = await (await t.call(adminApi, 'GET', '/api/portal/agreements', { token: t.admin })).json();
  assert.ok(list.items.some((i) => i.doc === 'childprotection' && i.camp === '2027-wolko-winter'));
  const csv = await (await t.call(adminApi, 'GET', '/api/portal/agreements?format=csv', { token: t.admin })).text();
  assert.ok(csv.split('\r\n')[0].includes('캠프') && csv.includes('2027-wolko-winter'));
  } finally { resetScheduleCache(); }
});

test('서명 페이지: 캠프 선택(아동보호 서약서) · 다른 캠프로 다시 작성 · 서약서가 열릴 때 초점 · 한·영 캠프 이름', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /data-camp-select/); assert.match(page, /name="campId"/); assert.match(page, /function fillCampSelects\(/);
  assert.match(page, /data-again/); assert.match(page, /\?camp=|QS\.get\('camp'\)/);
  assert.match(page, /campRenderKey/, '스크롤마다 캠프 선택칸을 다시 그리지 않는다'); assert.match(page, /data-camp-none/); assert.doesNotMatch(page, /staff_application_hidden/, '지원 목록에서 숨긴 캠프도 서약은 할 수 있다'); assert.match(page, /hashchange/); assert.match(page, /h\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /\.sa-need \{ scroll-margin-top: 96px; \}/);
  const fix = readFileSync(new URL('../functions/lib/agreementDocsExtra.js', import.meta.url), 'utf8');
  assert.ok(!fix.includes('어긋저는') && fix.includes('어긋나는'), '"나는"→"저는" 치환이 낱말 안(어긋나는)을 건드리지 않았다');
  const admin = readFileSync(new URL('../src/pages/portal/wolkoadmin.astro', import.meta.url), 'utf8');
  assert.match(admin, /d\.perCamp \? `\$\{d\.id\}@\$\{r\.campId\}` : d\.id/, '관리자 목록의 서약서 n/m 은 캠프별');
});

test('서약서 페이지는 검색으로 찾을 수 없다: 페이지 noindex · 서버 헤더(X-Robots-Tag) · 사이트맵 · 안에서 걸린 링크 없음 · robots.txt 로 막지는 않는다(막으면 noindex 를 읽지 못한다)', async () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  assert.match(read('../src/pages/staff-agreements/index.astro'), /^\s*noindex\s*$/m, '페이지 meta robots noindex');
  const headers = read('../public/_headers');
  assert.match(headers, /\/staff-agreements\n\s+X-Robots-Tag: noindex, nofollow, noarchive, nosnippet/);
  assert.match(headers, /\/staff-agreements\/\*\n\s+X-Robots-Tag: noindex, nofollow, noarchive, nosnippet/);
  assert.ok(!read('../public/sitemap.xml').includes('staff-agreements'), '사이트맵에 없다');
  assert.doesNotMatch(read('../public/robots.txt'), /staff-agreements/, 'robots.txt 에는 적지 않는다(주소가 드러나고, 막으면 noindex 를 못 읽는다)');
  // 공개 페이지 어디에서도 이 주소로 걸린 링크가 없다(링크로만 접근)
  const { execSync } = (await import('node:child_process'));
  const hits = execSync("grep -rl 'staff-agreements' src public --include=*.astro --include=*.html --include=*.xml --include=*.txt --include=*.json || true", { cwd: new URL('..', import.meta.url).pathname }).toString().split('\n').filter(Boolean);
  assert.deepEqual(hits.sort(), ['public/_headers', 'src/pages/portal/agreements/index.astro', 'src/pages/portal/wolkoadmin.astro', 'src/pages/staff-agreements/index.astro'].filter((f) => hits.includes(f)).sort(), '공개 페이지에서 걸린 링크 없음');
  assert.ok(!hits.some((f) => /^src\/(pages\/(index|about|camp|camp-register|team|people|contact|give)|layouts|components)/.test(f)), '메뉴 · 본문 · 레이아웃에 링크가 없다');
});

/* ── 이름 + 이메일로 '이미 작성하셨습니다' ── */
import * as statusApi2 from '../functions/api/agreements/status.js';
import { signedFor, normName } from '../functions/lib/staffAgreements.js';

testPerCamp('서명 현황 확인(status): 이름 + 이메일이 둘 다 맞아야 알려 준다 · 대소문자 · 공백 무시 · 캠프별 · 서명 그림은 없다', async () => {
  const t = await setup();
  const sign = (doc, patch = {}) => t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc, version: DOCS[doc].version, declared: true, campId: 'camp-a', ...patch } });
  assert.equal((await sign('faith')).status, 200);
  assert.equal((await sign('childprotection', { campId: 'camp-a' })).status, 200);
  assert.equal((await sign('childprotection', { campId: 'camp-b' })).status, 200);
  const ask = async (body, ip) => { const r = await t.call(statusApi2, 'POST', '/api/agreements/status', { body, ip }); return { status: r.status, ...(await r.json()) }; };
  const r = await ask({ name: '  김섬김 ', email: ' SERVE@example.com ' });
  assert.equal(r.status, 200);
  assert.ok(r.signed.faith.at && !r.signed.rules, '신앙고백서만 서명했다');
  assert.deepEqual(Object.keys(r.signed.childprotection).sort(), ['camp-a', 'camp-b'], '아동보호 서약서는 캠프별');
  assert.ok(!JSON.stringify(r).includes('data:image') && !JSON.stringify(r).includes('AG-'), '서명 그림 · 확인번호는 돌려주지 않는다');
  // 이메일만 맞고 이름이 다르면 '서명 없음'(남의 서명 여부를 알아내지 못하게)
  assert.deepEqual((await ask({ name: '박다른', email: 'serve@example.com' })).signed, {});
  assert.deepEqual((await ask({ name: '김섬김', email: 'other@example.com' })).signed, {});
  // 잘못된 값 · 횟수 제한
  assert.equal((await ask({ name: '김', email: 'serve@example.com' })).status, 400);
  assert.equal((await ask({ name: '김섬김', email: 'nope' })).status, 400);
  let last; for (let i = 0; i < 61; i++) last = await ask({ name: `이름${i}번`, email: 'serve@example.com' }, '9.9.9.9');
  assert.equal(last.status, 429, '이름을 바꿔 가며 알아내려는 시도는 횟수 제한에 걸린다');
  // 문서 버전이 바뀌면 예전 서명은 '서명함'으로 세지 않는다
  const [[key]] = [...t.kv.store.entries()].filter(([k]) => k.includes(':faith:'));
  const old = t.kv.store.get(key); t.kv.store.set(key, { value: old.value, metadata: { ...old.metadata, v: '1999-01-v1' } });
  assert.ok(!(await signedFor(t.env, 'serve@example.com', '김섬김')).faith);
  assert.equal(normName('  Kim   섬김 '), 'kim 섬김');
});

testPerCamp('중복 서명 막기: 같은 이름 + 이메일이 같은 서약서에 다시 서명하면 409 이미 작성하셨습니다(캠프마다 쓰는 서약서는 같은 캠프만)', async () => {
  const t = await setup();
  const post = async (doc, patch = {}) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc, version: DOCS[doc].version, declared: true, campId: 'camp-a', ...patch } }); return { status: r.status, ...(await r.json()) }; };
  assert.equal((await post('rules')).status, 200);
  const dup = await post('rules', { name: ' 김섬김 ', email: 'SERVE@example.com' });
  assert.equal(dup.status, 409); assert.equal(dup.field, 'duplicate'); assert.ok(dup.signedAt); assert.match(dup.error, /이미 작성하셨습니다/);
  assert.equal((await post('rules', { name: '박다른' })).status, 200, '다른 사람(이름이 다름)은 같은 이메일이어도 새로 쓴다');
  assert.equal((await post('rules', { email: 'second@x.org' })).status, 200, '다른 이메일은 새로 쓴다');
  // 아동보호 서약서: 같은 캠프는 막고 다른 캠프는 새로 받는다
  assert.equal((await post('childprotection', { campId: 'camp-a' })).status, 200);
  assert.equal((await post('childprotection', { campId: 'camp-a' })).status, 409, '같은 캠프는 이미 작성');
  assert.equal((await post('childprotection', { campId: 'camp-b' })).status, 200, '다른 캠프는 새로');
  assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('agree:v1:rules:')).length, 3, '중복은 저장되지 않았다');
});

test('서명 페이지 구조: 맨 위 내 정보(이름 · 이메일 · 구분) → 확인 → 이미 작성한 것은 안내 · "작성 전" 표시와 휴대폰 칸은 없다', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /data-who-form/); assert.match(page, /name="who-email"/); assert.match(page, /name="who-name"/); assert.match(page, /who-role/);
  assert.match(page, /\/api\/agreements\/status/); assert.match(page, /async function lookupSigned\(/); assert.match(page, /data-already/);
  assert.match(page, /이미 작성하셨습니다/); assert.match(page, /This agreement is signed again|You have already signed/);
  assert.doesNotMatch(page, /작성 전|Not yet/, '"작성 전(Not yet)" 표시를 없앴다');
  assert.doesNotMatch(page, /name="phone"|type="tel"|휴대폰|Mobile/, '휴대폰 칸이 없다');
  // 서명 칸 폼에는 이름 · 이메일 · 구분을 다시 묻지 않는다
  const forms = page.slice(page.indexOf('<form class="sa-form"'), page.indexOf('</form>', page.indexOf('<form class="sa-form"')));
  assert.doesNotMatch(forms, /name="name"|name="email"|name=\{`role-/);
});

import { nameKey } from '../functions/lib/staffAgreements.js';

test('이름 비교(nameKey): 40자가 넘는 긴 이름 · 유니코드 분해형 · 40번째 글자 뒤 공백도 같은 사람으로 본다', async () => {
  const long = '가'.repeat(39) + ' ' + '나'.repeat(10);   // 40번째 글자가 공백 — 기록에는 앞 40자만 남는다
  assert.equal(nameKey(long), nameKey(long.slice(0, 40)));
  assert.equal(nameKey('한글'.normalize('NFD')), nameKey('한글'.normalize('NFC')));
  const nfd = '가나다라마바사아자차카타파하'.repeat(3).normalize('NFD');   // 분해형으로 오면 자르는 위치가 달라질 수 있는 긴 이름
  assert.equal(nameKey(nfd), nameKey(nfd.normalize('NFC')));
  const t = await setup();
  const sign = (patch) => t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), ...patch } });
  assert.equal((await sign({ name: long })).status, 200);
  const again = await sign({ name: long });
  assert.equal(again.status, 409, '긴 이름도 다시 서명하면 이미 작성하셨습니다');
  const r = await t.call(statusApi2, 'POST', '/api/agreements/status', { body: { name: long, email: 'serve@example.com' } });
  assert.ok((await r.json()).signed.faith, '긴 이름도 서명 여부를 찾는다');
});

test('서명 · 확인 API: JSON 으로 보낸 요청만 받고(415) 다른 사이트용 CORS 허용 머리글이 없다', async () => {
  const t = await setup();
  for (const [mod, url] of [[signApi, '/api/agreements/sign'], [statusApi2, '/api/agreements/status']]) {
    const bad = await mod.onRequestPost({ env: t.env, request: new Request('https://wolko.test' + url, { method: 'POST', headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '5.5.5.5' }, body: JSON.stringify(good()) }) });
    assert.equal(bad.status, 415, url + ' text/plain 은 거절');
    assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
    const ok = await t.call(mod, 'POST', url, { body: good() });
    assert.equal(ok.headers.get('Access-Control-Allow-Origin'), null, url + ' 에 CORS 허용이 없다');
  }
});

test('서명 페이지 동작(원본 검사): 정보 고치기 · 사람이 바뀌면 서명 칸을 비운다 · 오래된 조회 답 무시 · 언어 전환 문구 · 주소 값 우선', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /article\.saReset = function/, '문서마다 처음 상태로 되돌리는 함수가 있다');
  assert.match(page, /function editWho\(\) \{[\s\S]*?resetArticles\(\)/, '정보 고치기는 서명 칸을 비운다');
  assert.match(page, /async function continueWho[\s\S]*?if \(STATE\.info && !same\) resetArticles\(\)/, '다른 사람이 들어오면 비운다');
  assert.match(page, /lookupSeq/, '늦게 온 이전 조회 답을 버린다');
  assert.match(page, /function refreshLangText\(/, '한·영 전환 때 JS 문구도 바꾼다');
  assert.match(page, /if \(STATE\.info && !same\) resetArticles\(\)/, '처음 들어올 때는 ?camp= 로 고른 캠프를 지우지 않는다');
  assert.match(page, /var fromUrl = /, '주소의 값이 있으면 저장된 값과 섞지 않는다');
  assert.match(page, /data-who-status role="status" aria-live="polite"/);
  assert.doesNotMatch(page, /normKey/);
  // 이미 작성 안내는 본문 목록보다 위에 있다
  assert.ok(page.indexOf('data-already hidden') < page.indexOf('<ol class="sa-items">'), '이미 작성하셨습니다 안내가 문서 위쪽');
});

test('아동보호 서약서는 캠프 선택 없이 한 번만 작성: 캠프 칸이 없고 · 문서에 "캠프마다" 문장이 없고 · 같은 사람이 다시 쓰면 409', async () => {
  assert.equal(DOCS.childprotection.perCamp, false);
  assert.ok(!JSON.stringify(DOCS.childprotection.sections).includes('캠프마다 이 서약서를 새로'), '캠프마다 새로 작성한다는 문장을 뺐다');
  assert.match(DOCS.childprotection.version, /v15$/, '글을 바꿨으니 문서 버전을 올렸다');
  assert.ok(!/퇴출|해임|하차/.test(JSON.stringify({ ko: DOCS.rules.ko, en: DOCS.rules.en, sections: DOCS.rules.sections })), '필수 규칙은 "제명"으로 통일');
  const t = await setup();
  const post = async (patch = {}) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc: 'childprotection', version: DOCS.childprotection.version, declared: true, ...patch } }); return { status: r.status, ...(await r.json()) }; };
  assert.equal((await post()).status, 200, '캠프를 안 보내도 서명된다');
  const [[, val]] = [...t.kv.store.entries()].filter(([k]) => k.includes(':childprotection:'));
  assert.ok(!('c' in val.metadata) && !('campId' in JSON.parse(val.value)), '캠프는 기록하지 않는다');
  assert.equal((await post({ campId: 'camp-b' })).status, 409, '다른 캠프를 보내도 이미 작성');
  const r = await t.call(statusApi2, 'POST', '/api/agreements/status', { body: { name: '김섬김', email: 'serve@example.com' } });
  const out = await r.json();
  assert.ok(out.signed.childprotection.at, '확인 결과는 캠프 없이 서명 시각만');
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /\{doc\.perCamp && \(/, '캠프 선택칸은 캠프마다 쓰는 문서에만 그린다');
});

test('서약서 항목은 문장이 끝나는 마침표 뒤에서 줄바꿈해 보여 준다(화면 · 인쇄본) ', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /const sentences = \(t\) =>/, '화면용 문장 줄바꿈 도우미');
  assert.match(page, /\{sentences\(it\.ko\)\}/); assert.match(page, /white-space: pre-line/);
  assert.match(page, /esc\(sentences\(it\[k\]\)\)/, '인쇄본도 같은 줄바꿈');
  const f = (t) => String(t).replace(/([.!?])[ \t]+(?=\S)/g, '$1\n');
  assert.equal(f('저는 읽었습니다. 동의합니다.'), '저는 읽었습니다.\n동의합니다.');
  assert.equal(f('동의합니다.\n\n연락해 주세요.'), '동의합니다.\n\n연락해 주세요.', '원문의 빈 줄은 그대로');
  assert.equal(f('(귀걸이는 한 쌍까지는 괜찮습니다.)'), '(귀걸이는 한 쌍까지는 괜찮습니다.)', '괄호 안 마침표는 건드리지 않는다');
});

test('서명 페이지 위쪽 설명도 문장마다 한 줄(블록)로 나눈다', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /<span class="sa-ln">캠프에서 섬기는 모든 분이 읽고 동의하며 서명하는 문서예요\.<\/span><span class="sa-ln">폰에서는/);
  assert.match(page, /\.sa-ln \{ display: block; \}/);
});

test('서약서 항목마다 체크하는 칸은 없다: 맨 아래 동의 칸 하나로 받는다 · 소제목은 가는 선 + 글자 · 인쇄본은 번호로 참조', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /counter-reset: sa|counter\(sa/, '화면에는 항목 번호를 매기지 않는다');
  assert.doesNotMatch(page, /data-item-check|sa-item-box|data-ack|ackCount|itemTotal|is-ack-error|saPop/, '항목 체크박스와 진행 표시(n / m)를 뺐다');
  assert.doesNotMatch(page, /acks:/, '체크한 항목 수를 보내지 않는다');
  assert.match(page, /<div class="sa-item"><span class="wl-ko">\{sentences\(it\.ko\)\}<\/span><span class="wl-en">\{sentences\(it\.en\)\}<\/span><\/div>/, '항목은 글만 보여 준다');
  assert.match(page, /<input type="checkbox" name="agree">/, '문서 전체에 대한 동의 칸은 그대로');
  assert.match(page, /if \(!form\.elements\.agree\.checked\) bad\('agree'/, '동의 칸을 체크해야 서명할 수 있다');
  assert.match(page, /\['declared', 'agree', 'consent'\]\.forEach\(function \(n\) \{ if \(form\.elements\[n\]\) form\.elements\[n\]\.checked = false; \}\)/, '사람이 바뀌면 동의 칸을 비운다');
  assert.match(page, /\.sa-items li\.sa-sec > span::before \{ content: ''; display: inline-block; width: 24px; height: 2px/, '소제목: 가는 선 + 글자');
  assert.doesNotMatch(page.slice(page.indexOf('.sa-items {'), page.indexOf('.sa-pledge {')), /border-left|box-shadow: inset|●/, '왼쪽 줄무늬 · ● 없음');
  assert.match(page, /String\(n0\)\.padStart\(2, '0'\)/, '인쇄본에는 항목 번호가 남는다');
});

test('서명 제출: 지금 화면은 항목 체크 수(acks)를 보내지 않는다 — 열려 있던 예전 화면이 보냈다면 문서의 항목 수와 같아야 하고 기록에 남는다', async () => {
  const t = await setup();
  const total = docSections(DOCS.faith).reduce((n, x) => n + x.items.length, 0);
  const post = async (patch) => { const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), ...patch } }); return { status: r.status, ...(await r.json()) }; };
  const few = await post({ acks: total - 1 }); assert.equal(few.status, 400); assert.equal(few.field, 'items');
  assert.equal((await post({ acks: 'all' })).field, 'items');
  const ok = await post({ acks: total, email: 'acks@x.org' }); assert.equal(ok.status, 200);
  const rec = [...t.kv.store.values()].map((v) => JSON.parse(v.value)).find((r) => r.email === 'acks@x.org');
  assert.equal(rec.itemsAcknowledged, total, '확인한 항목 수가 기록에 남는다');
  assert.equal((await post({ email: 'old@x.org' })).status, 200, 'acks 를 안 보낸 지금 화면을 받는다');
});

test('신앙고백서 v4: 예전 11개(v3)에 서명한 분도 서명 완료로 센다 — 그 밖의 예전 버전은 세지 않는다', async () => {
  const { signedMap, signedFor, versionOk } = await import('../functions/lib/staffAgreements.js');
  assert.equal(versionOk(DOCS.faith, '2026-11-v3'), true);
  assert.equal(versionOk(DOCS.faith, '2026-11-v2'), false);
  const store = new Map();
  const env = { CAMP_KV: { list: async ({ prefix }) => ({ keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, metadata]) => ({ name, metadata })), list_complete: true }) } };
  store.set('agree:v1:faith:202611:AG-OLD111', { t: Date.now(), d: 'faith', v: '2026-11-v3', r: 'staff', n: '홍길동', e: 'old@example.com' });
  store.set('agree:v1:faith:202611:AG-OLD222', { t: Date.now(), d: 'faith', v: '2026-11-v2', r: 'staff', n: '김철수', e: 'older@example.com' });
  const map = await signedMap(env);
  assert.ok((map['old@example.com'] || []).includes('faith'));
  assert.ok(!(map['older@example.com'] || []).includes('faith'));
  assert.ok((await signedFor(env, 'old@example.com', '홍길동')).faith);
});

test('신앙고백서 v7: 맺음말 앞에 요약본 안내(v6 은 "발췌문") — v6 · v5 · v4 · v3 서명은 그대로 서명 완료, 보관본의 글 해시는 그때 서명에 남은 해시와 같다', async () => {
  const { archivedDoc, versionOk, docHash } = await import('../functions/lib/staffAgreements.js');
  const d = DOCS.faith;
  assert.ok(['2026-11-v7', '2026-11-v6', '2026-11-v5', '2026-11-v4', '2026-11-v3'].every((v) => versionOk(d, v)) && !versionOk(d, '2026-11-v2'));
  assert.equal(await docHash(archivedDoc(d, '2026-11-v5')), '3e2186a53ee493ff8bed6f8a3bf3d74b0e1aaf2d4433586c0d862d9cc9341da1');
  assert.equal(await docHash(archivedDoc(d, '2026-11-v4')), '7375b2d9101850029d5f04bd8b3f5a206cb6ca07842a9f6a88e928022b07e264');
  assert.equal(await docHash(archivedDoc(d, '2026-11-v3')), '4e9e84276add850ee8a3841d61609d6ce623c0c4d81f5ceac7a45f8e92f6a857');
  assert.equal(await docHash(archivedDoc(d, '2026-11-v6')), '32a120b66d3816197179ff1b6365fa91fe2ba754b08fb626fc23c8ca61e7437a');
  assert.ok(!/발췌문|요약본/.test(archivedDoc(d, '2026-11-v5').ko.pledge) && archivedDoc(d, '2026-11-v6').ko.pledge.includes('일부 발췌문') && d.ko.pledge.includes('요약본') && !d.ko.pledge.includes('발췌문'), '안내는 v6 부터, 요약본은 v7 부터');
});

test('신앙고백서: 예전 11개(v3) 글을 보관해 관리자 화면에서 예전 서명의 글을 보여 줄 수 있다', async () => {
  const { archivedDoc } = await import('../functions/lib/staffAgreements.js');
  const v3 = archivedDoc(DOCS.faith, '2026-11-v3');
  assert.equal(v3.items.length, 11); assert.equal(v3.version, '2026-11-v3');
  assert.ok(v3.items[2].ko.includes('7년 대환난'), '예전 문구 그대로');
  assert.equal(archivedDoc(DOCS.faith, '2026-11-v2'), null);
  assert.match(readFileSync(new URL('../functions/api/portal/agreements.js', import.meta.url), 'utf8'), /archivedDoc\(cur, record\.version\)/);
});

test('아동보호 서약서 v15: 원본 문서로 글이 통째로 바뀌었다 — v14 · v13 서명은 그대로 서명 완료로 세고(2026-11-26 결정), 관리자는 그때 글을 그대로 볼 수 있다', async () => {
  const { archivedDoc, versionOk, docHash, signedMap } = await import('../functions/lib/staffAgreements.js');
  const d = DOCS.childprotection;
  assert.ok(versionOk(d, '2026-11-v15') && versionOk(d, '2026-11-v14') && versionOk(d, '2026-11-v13') && !versionOk(d, '2026-11-v12'));
  const v14 = archivedDoc(d, '2026-11-v14'), v13 = archivedDoc(d, '2026-11-v13');
  assert.equal(v14.version, '2026-11-v14'); assert.equal(v13.version, '2026-11-v13');
  assert.equal(v14.en.title, 'Child Protection Agreement', '제목 · 안내 · 맺음말도 그때 것');
  assert.ok(v14.ko.pledge.includes('월코 캠프에 참여하는 캠퍼를 지키기 위해') && v13.ko.pledge === v14.ko.pledge);
  assert.ok(docSections(v14).flatMap((x) => x.items).some((i) => i.ko.includes('신체적·정서적 위협으로부터')), 'v14 글 그대로 보관');
  assert.ok(docSections(v13).flatMap((x) => x.items).some((i) => i.ko.includes('신체적·정서적·성적 해악')), 'v13 글 그대로 보관');
  // 이미 받은 서명에 남은 글 해시와 보관본의 해시가 같다(글을 옮기면서 한 글자도 바뀌지 않았다)
  assert.equal(await docHash(v14), '5bec7e13e435eac3e9e6fc95529c957fef75a6f6970417bec793efa8d02ea13f');
  assert.equal(await docHash(v13), '1244b6f6e72055f5c224d85819af51f914f7d87879be732e1054e1e235c31ad4');
  const store = new Map([['agree:v1:childprotection:202611:AG-OLD014', { t: 1, d: 'childprotection', v: '2026-11-v14', r: 'staff', n: '홍길동', e: 'old14@example.com' }], ['agree:v1:childprotection:202611:AG-NEW015', { t: 2, d: 'childprotection', v: '2026-11-v15', r: 'staff', n: '김새롬', e: 'new15@example.com' }]]);
  const env = { CAMP_KV: { list: async ({ prefix }) => ({ keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, metadata]) => ({ name, metadata })), list_complete: true }) } };
  const map = await signedMap(env);
  assert.equal(await docHash(d), 'ba9a55462696a9fdb22c86fbed0c33774dbdddc0e8ef37e466294e890722b7a1', 'v15 글 전체의 해시 — 글을 한 글자라도 고치면 version 을 올리고 이 값을 바꾼다');
  assert.ok((map['old14@example.com'] || []).includes('childprotection'), 'v14 서명은 그대로 서명 완료');
  assert.ok((map['new15@example.com'] || []).includes('childprotection'));
});

test('구분(스태프 · 크루)에 따라 갈리는 묶음: 지금 문서에는 없지만(항목 수가 같다) 장치는 남아 있다', async () => {
  const { itemCountFor, sectionsFor } = await import('../functions/lib/staffAgreements.js');
  for (const d of Object.values(DOCS)) assert.equal(itemCountFor(d, 'crew'), itemCountFor(d, 'staff'), d.id);
  const fake = { sections: [{ ko: '모두', en: 'All', items: [{ ko: 'a', en: 'a' }] }, { ko: '크루', en: 'Crew', roles: ['crew'], items: [{ ko: 'b', en: 'b' }] }] };
  assert.ok(!sectionsFor(fake, 'staff').some((x) => x.ko === '크루') && sectionsFor(fake, 'crew').some((x) => x.ko === '크루'));
  assert.equal(itemCountFor(fake, 'crew') - itemCountFor(fake, 'staff'), 1);
  const sign = readFileSync(new URL('../functions/api/agreements/sign.js', import.meta.url), 'utf8');
  assert.match(sign, /const itemTotal = itemCountFor\(doc, role\);/);
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /data-roles=\{sec\.roles \? sec\.roles\.join\(' '\) : undefined\}/);
  assert.match(page, /article\.saApplyRole = applyRole;/);
});

test("서약서 페이지: 숨긴 묶음(스태프에게 '크루' 소제목)은 실제로 보이지 않는다 — 소제목의 display:block 보다 [hidden] 규칙이 뒤", () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  const a = page.indexOf('.sa-items li.sa-sec { display: block;'), b = page.indexOf('.sa-items li[hidden] { display: none; }');
  assert.ok(a > 0 && b > a);
});
