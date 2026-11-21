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
  for (let i = 0; i < 61; i++) last = await t.call(signApi, 'POST', '/api/agreements/sign', { body: good(), ip: '9.9.9.9' });
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
  assert.ok(text.includes('"=""010-1234-5678"""'), '휴대폰은 엑셀에서 앞의 0이 지워지지 않게 글자 그대로');
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
import { OPEN_QUESTIONS } from '../functions/lib/agreementDocsExtra.js';

test('초안 문서(아동보호 · 필수 규칙): 공개 목록에 나오지 않고 서명도 받지 않는다 · 신앙고백서는 그대로', async () => {
  assert.deepEqual(docList().map((d) => d.id), ['faith'], '확정 전 문서는 공개 페이지 목록에 없다');
  assert.deepEqual(docList({ includeDrafts: true }).map((d) => d.id), ['faith', 'childprotection', 'rules']);
  assert.ok(DOCS.childprotection.draft && DOCS.rules.draft && !DOCS.faith.draft);
  assert.equal(await docHash(DOCS.faith), 'cedc7ddf3cfc' + (await docHash(DOCS.faith)).slice(12), '신앙고백서 글 해시는 바뀌지 않았다');
  const t = await setup();
  for (const id of ['childprotection', 'rules']) {
    const r = await t.call(signApi, 'POST', '/api/agreements/sign', { body: { ...good(), doc: id, version: DOCS[id].version, declared: true } });
    assert.equal(r.status, 400, `${id} 초안은 서명을 받지 않는다`);
    assert.equal((await r.json()).field, 'doc');
  }
  assert.equal([...t.kv.store.keys()].filter((k) => k.startsWith('agree:v1:')).length, 0);
});

test('아동보호 서약서 내용: 디렉터가 정한 것들이 들어 있다(범죄경력 서류 · 담당자 · SNS · 크루) 그리고 한·영이 짝을 이룬다', () => {
  const d = DOCS.childprotection;
  const all = docSections(d).flatMap((s) => s.items);
  const ko = all.map((i) => i.ko).join('\n'), en = all.map((i) => i.en).join('\n');
  assert.ok(all.every((i) => i.ko && i.en), '모든 항목에 한국어와 영어가 있다');
  assert.ok(ko.includes('범죄경력') && ko.includes('지체 없이'), '월코가 요구하면 범죄경력 서류를 지체 없이 제공');
  assert.ok(/without delay/.test(en));
  assert.ok(ko.includes('캠프 기간 동안만 보관하고, 캠프가 끝나면 폐기') && /destroyed when the camp ends/.test(en), '제출한 범죄경력 서류는 캠프 기간 동안만 보관 후 폐기');
  assert.ok(ko.includes('Jason Anderson') && ko.includes('캠프팀 디렉터') && ko.includes('Aiden Park') && ko.includes('코디네이터'), '아동보호 담당자 · 부담당자');
  assert.ok(en.includes('Jason Anderson') && en.includes('Aiden Park'));
  assert.ok(/개인 SNS/.test(ko) && /personal social media/.test(en), '캠퍼와 개인 SNS 를 공유하지 않는다');
  assert.ok(/112/.test(ko), '신고는 112');
  assert.ok(ko.includes('역할 범위는 월코가 따로 정해'), '미성년 크루 역할 범위는 나중에 정한다는 원칙만');
  assert.ok(!ko.includes('시야'), '크루의 "시야 안" 같은 세부 규칙은 역할 범위를 정할 때 함께 정한다');
  assert.ok(d.declaration.ko.includes('유죄 판결') && d.declaration.en.includes('convicted'), '본인 진술 칸');
  assert.match(docText(d), /Jason Anderson/);
});

test('캠프 필수 규칙 초안: 경고 2회 중도 하차 · 문신 · 얼굴 장신구(귀걸이 한 세트까지) · 사역에 방해되는 SNS', () => {
  const d = DOCS.rules;
  const all = docSections(d).flatMap((s) => s.items);
  const ko = all.map((i) => i.ko).join('\n'), en = all.map((i) => i.en).join('\n');
  assert.ok(ko.includes('경고가 2회') && ko.includes('중도 하차'));
  assert.ok(ko.includes('문신이 보이지 않게') && /tattoo/i.test(en));
  assert.ok(ko.includes('두 세트 이상의 귀걸이') && ko.includes('코걸이') && ko.includes('혀 피어싱'), '얼굴 장신구 규칙');
  assert.ok(ko.includes('보이지 않게') && ko.includes('귀걸이는 한 쌍(한 세트)까지는 괜찮습니다') && /One pair \(one set\) of earrings is fine/.test(en), '귀걸이 한 쌍은 괜찮다(모든 스태프 · 크루 공통 — 문서가 스태프와 크루 모두의 서명용)');
  assert.ok(ko.includes('사역에 방해가 될 만한 내용을 SNS에 올리지 않습니다'));
  assert.ok(all.every((i) => i.ko && i.en));
});

test('초안 문서가 공개 페이지(빌드)에 새지 않는다 · 아직 정하지 못한 것 목록이 있다', () => {
  const page = readFileSync(new URL('../src/pages/staff-agreements/index.astro', import.meta.url), 'utf8');
  assert.match(page, /includeDrafts: process\.env\.WOLKO_SHOW_DRAFTS === '1'/);
  assert.ok(OPEN_QUESTIONS.length >= 4 && OPEN_QUESTIONS.some((q) => q.includes('크루')) && OPEN_QUESTIONS.some((q) => q.includes('열람자')));
});

test('캠프 필수 규칙 초안(결정 반영): 경고는 디렉터·코디네이터 · 즉시 하차 목록(성적 학대·폭력·잘못된 신학/교리) · 미성년 크루 귀가', () => {
  const d = DOCS.rules;
  const secs = docSections(d);
  const by = (title) => secs.find((s) => s.ko === title);
  const ko = secs.flatMap((s) => s.items).map((i) => i.ko).join('\n'), en = secs.flatMap((s) => s.items).map((i) => i.en).join('\n');
  assert.ok(ko.includes('캠프 디렉터와 코디네이터가 경고를 줍니다') && /Camp Director and the Coordinator give me a warning/.test(en), '경고는 디렉터와 코디네이터');
  const immediate = by('경고 없이 바로 하차하는 경우').items.map((i) => i.ko).join('\n');
  for (const must of ['성적 학대', '폭력', '잘못된 신학이나 교리', '아동보호 서약서', '술이나 불법 약물']) assert.ok(immediate.includes(must), `즉시 하차: ${must}`);
  const imm = by('경고 없이 바로 하차하는 경우').items.map((i) => i.en).join('\n');
  assert.ok(/sexual abuse/i.test(imm) && /violence/i.test(imm) && /false theology or doctrine/i.test(imm));
  for (const title of ['술, 담배, 약물', '이성 교제', '휴대폰', '외출', '시간', '숙소', '외모와 복장', '사역 태도', 'SNS', '하차한 뒤']) assert.ok(by(title), `${title} 항목이 있다`);
  assert.ok(ko.includes('보호자가 동의하면 혼자 귀가할 수 있고'), '크루 부모님이 동의하면 혼자 귀가 가능');
  assert.ok(ko.includes('디렉터가 보호자에게 직접 연락'), '하차 시 보호자 연락');
  assert.ok(ko.includes('경고 기록지는 캠프가 끝나면 폐기'), '경고 기록은 캠프가 끝나면 폐기');
  assert.ok(docSections(d).every((s) => s.items.every((i) => i.ko && i.en)), '한·영이 짝을 이룬다');
});

test('결정 반영(2): 본국 서류는 필요할 때만 · 담당자 연락처는 포탈 회원 정보 · 디렉터/코디네이터/풀타임 선교사는 경고·하차 제외 · 즉시 하차에 범죄·허위 서류', () => {
  const cp = docSections(DOCS.childprotection).flatMap((s) => s.items), rules = docSections(DOCS.rules).flatMap((s) => s.items);
  const cpKo = cp.map((i) => i.ko).join('\n'), cpEn = cp.map((i) => i.en).join('\n'), rKo = rules.map((i) => i.ko).join('\n'), rEn = rules.map((i) => i.en).join('\n');
  assert.ok(cpKo.includes('월코가 필요하다고 알려 준 경우에는 본국') && /only if WOLKO tells me it is needed/.test(cpEn), '본국 서류는 월코가 필요하다고 한 경우에만');
  assert.ok(!cpKo.includes('해외에서 지낸 적이 있으면'), '해외 거주자 모두에게 요구하지 않는다');
  assert.ok(cpKo.includes('월코 포탈의 회원 정보에서 확인') && /WOLKO Portal member information/.test(cpEn), '담당자 연락처는 포탈 회원 정보');
  assert.ok(rKo.includes('캠프 디렉터, 코디네이터, 풀타임 선교사에게는 적용하지 않습니다') && /full-time missionaries/.test(rEn), '경고·하차는 디렉터·코디네이터·풀타임 선교사 제외');
  assert.ok(rKo.includes('아동보호 서약서와 법에 따른 신고·조치는 모두에게'), '아동보호와 법에 따른 조치는 모두에게');
  assert.ok(rKo.includes('절도 등 범죄 행위') && rKo.includes('허위 서류'), '즉시 하차: 범죄 행위 · 허위 서류');
  assert.ok(!OPEN_QUESTIONS.some((q) => q.includes('연락처') || q.includes('보호자(법정대리인) 서명')), '해결된 질문은 목록에서 뺐다');
});

test('지각은 경고에 넣지 않는다(경미한 실수) · 허락 없이 자리를 비우는 것은 규칙 위반', () => {
  const time = docSections(DOCS.rules).find((s) => s.ko === '시간').items[0];
  assert.ok(time.ko.includes('지각은 경미한 실수로 보고 경고에 넣지 않습니다') && /Being late is treated as a minor mistake and is not counted as a warning/.test(time.en));
  assert.ok(time.ko.includes('허락 없이 자리를 비우는 것은 규칙을 어긴 것'), '허락 없이 자리를 비우는 것은 그대로 규칙 위반');
  assert.ok(!OPEN_QUESTIONS.some((q) => q.includes('지각')), '지각 기준 질문은 해결돼 뺐다');
});
