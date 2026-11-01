import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';

// 번역 도우미 화면(translate.js)을 가짜 화면(DOM)·가짜 서버로 끝까지 돌려 본다 (가짜 데이터만)
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const astro = read('src/pages/portal/campteam/translate.astro'), css = read('public/portal/campteam/translate.css');

const els = {}, handlers = {}, dict = { ko: {}, en: {} };
const stub = (id) => els[id] ||= { id, hidden: false, className: '', textContent: '', innerHTML: '', value: '', files: null, disabled: false, classList: { add() {}, remove() {} }, setAttribute() {}, contains: () => false, addEventListener(ev, fn) { (handlers[id] ||= {})[ev] = fn; } };
let apiImpl = async () => ({}), downloads = [], lang = 'ko', bootFn;
globalThis.window = globalThis;
globalThis.document = { getElementById: stub, querySelector: (q) => { const m = /data-act="(\w+)"/.exec(q); return m ? { dataset: { act: m[1] }, disabled: false } : null; }, addEventListener(ev, fn) { (handlers.document ||= {})[ev] = fn; }, createElement: () => { const a = { click() { downloads.push({ href: a.href, download: a.download }); }, remove() {} }; return a; }, body: { appendChild() {} } };
globalThis.addEventListener = () => {};
const realST = globalThis.setTimeout; globalThis.setTimeout = (f, ms, ...a) => { const t = realST(f, ms, ...a); if (ms >= 60000) t.unref?.(); return t; }; // 내려받기 주소 정리 타이머(60초)가 시험 종료를 막지 않게
const blobs = []; globalThis.URL.createObjectURL = (b) => (blobs.push(b), 'blob:' + blobs.length); globalThis.URL.revokeObjectURL = () => {};
globalThis.CT = { addDict(d) { for (const l of ['ko', 'en']) Object.assign(dict[l], d[l]); }, t: (k) => (k in dict[lang] ? dict[lang][k] : dict.ko[k] || k), esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), applyI18n() {}, api: (...a) => apiImpl(...a), boot(fn) { bootFn = fn; } };
vm.runInThisContext(read('public/portal/campteam/doc-translate.js'));
vm.runInThisContext(read('public/portal/campteam/translate.js'));
const T = globalThis.CTDocTranslate;

function makeZip(files) { return T.writeZip(files.map(([name, content]) => { const raw = Buffer.from(content), data = zlib.deflateRawSync(raw); return { nameBytes: Buffer.from(name), method: 8, crc: T.crc32(raw), csize: data.length, usize: raw.length, data: new Uint8Array(data), flags: 0x0800 }; })); }
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docxFile = (name, paras) => { const b = makeZip([['word/document.xml', `<w:document ${W}><w:body>${paras.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`]]); return { name, size: b.length, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
const fakeFile = (name, size = 10) => ({ name, size, arrayBuffer: async () => new ArrayBuffer(size) });
const until = async (fn, ms = 4000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('timeout: ' + els.trlWork.innerHTML.slice(0, 900) + ' MSG=' + els.trlMsg.textContent); await new Promise((r) => setTimeout(r, 5)); } };
const work = () => els.trlWork.innerHTML, msg = () => els.trlMsg.textContent;
const choose = async (f) => { els.trlFile.files = [f]; els.trlFile.onchange(); await until(() => msg() !== dict.ko.trlReading); };
const click = (act, extra = {}) => handlers.trlWork.click({ target: { closest: () => ({ dataset: { act, ...extra }, disabled: false }) } });

test('화면: 틀이 맞고(아이디·용어집 링크), 한국어·영어 문구가 짝이 맞고, 글 붙여넣기 칸은 없다', () => {
  for (const id of [...read('public/portal/campteam/translate.js').matchAll(/\$\('(\w+)'\)/g)].map((m) => m[1])) assert.ok(astro.includes(`id="${id}"`), id + ' 가 translate.astro 에 있어야 한다');
  assert.ok(astro.includes('href="/portal/campteam/settings/"') && astro.includes('data-t="trlGloss"'), '용어집 관리 링크 유지');
  assert.ok(!/<textarea/.test(astro) && !astro.includes('trlIn') && !astro.includes('trlGo'), '예전 붙여넣기 UI 제거');
  assert.ok(astro.includes('translate.css') && astro.includes('doc-translate.js') && astro.includes('accept=".docx,.pptx,.xlsx,.pdf"'));
  assert.deepEqual(Object.keys(dict.ko).sort(), Object.keys(dict.en).sort(), '번역 문구 키가 ko/en 에서 같다');
  for (const k of Object.keys(dict.ko)) assert.equal(typeof dict.ko[k], typeof dict.en[k], k);
  for (const k of ['trlLumi']) assert.ok(dict.ko[k].includes('루미') && dict.ko[k].includes('번역'));
  assert.ok(css.includes('@media(max-width:720px)'), '모바일 배치');
  for (const t of Object.values(dict.ko).flat()) if (typeof t === 'string') assert.ok(!/(payload|chunk|API|JSON|endpoint)/.test(t), '쉬운 말만: ' + t);
});

test('화면: 거절 안내 — 사진·구글 파일·옛 형식·큰 파일·돈 파일 이름은 읽지도 않는다', async () => {
  apiImpl = async () => ({ member: true, configured: true }); await bootFn();
  for (const [name, key] of [['a.png', 'trlImage'], ['a.gdoc', 'trlGoogle'], ['a.doc', 'trlOld'], ['a.hwp', 'trlOld'], ['a.zip', 'trlOther']]) { await choose(fakeFile(name)); assert.equal(msg(), dict.ko[key], name); assert.equal(work(), ''); }
  await choose(fakeFile('big.docx', 16 * 1024 * 1024)); assert.equal(msg(), dict.ko.trlBig('16.0'));
  let read = 0; const spy = { ...fakeFile('2027 예산안.xlsx'), arrayBuffer: async () => { read++; return new ArrayBuffer(1); } };
  await choose(spy); assert.equal(msg(), dict.ko.trlFin); assert.equal(read, 0, '이름이 돈 파일이면 파일을 열지도 않는다');
  await choose(fakeFile('broken.docx')); assert.equal(msg(), dict.ko.trlBadFile);
  await choose(docxFile('결산 자료.docx', ['안녕'])); assert.equal(msg(), dict.ko.trlFin);
  await choose(docxFile('a.docx', ['영수증 첨부', '정산 보고서'])); assert.equal(msg(), dict.ko.trlFin, '글에 돈 낱말이 많으면 한 글자도 보내지 않는다');
  await choose(docxFile('n.docx', ['2027', '12:30'])); assert.equal(msg(), dict.ko.trlNoText);
});

test('화면: 한국어 문서 → 자동 영어, 방향 바꾸기, 번역 진행·미리보기·내려받기(파일 이름 _en.docx)', async () => {
  const paras = Array.from({ length: 60 }, (_, i) => `${i + 1}번째 문단입니다. ` + '가나다라마바사 '.repeat(14));
  const calls = []; apiImpl = async (path, o) => { calls.push(o.body); return { out: o.body.units.map((u) => 'EN:' + u.slice(0, 12)) }; };
  await choose(docxFile('캠프 안내.docx', paras));
  assert.equal(msg(), ''); assert.ok(work().includes('한국어 → 영어') && work().includes('캠프 안내.docx') && work().includes('data-act="swap"') && work().includes('data-act="start"'));
  assert.match(work(), /번에 나눠 보내요/);
  click('swap'); assert.ok(work().includes('영어 → 한국어') && work().includes(dict.ko.trlNothing), '한국어 문서를 영→한으로 바꾸면 번역할 글이 없다고 안내');
  click('swap'); assert.ok(work().includes('한국어 → 영어'));
  click('start'); await until(() => work().includes('data-act="dl"'));
  assert.ok(calls.length >= 2 && calls.every((c) => c.action === 'doc' && c.to === 'en' && c.units.length <= 40 && c.units.join('').length <= 6000 && c.name === '캠프 안내.docx'));
  assert.ok(work().includes(dict.ko.trlDone) && work().includes('trl-pair') && work().includes('EN:1번째 문단입니다'), '미리보기');
  assert.equal((work().match(/class="trl-pair"/g) || []).length, 5, '앞 5문단만');
  click('dl'); await until(() => downloads.length === 1);
  assert.equal(downloads[0].download, '캠프 안내_en.docx');
  const out = new Uint8Array(await blobs[0].arrayBuffer()), back = await T.load(out, 'x.docx');
  assert.equal(back.texts.length, 60); assert.ok(back.texts.every((t) => t.startsWith('EN:')));
});

test('화면: 한도에 걸리면 멈추고 「이어서 번역」, 실패한 조각만 다시 시도, 멈추기', async () => {
  const paras = Array.from({ length: 40 }, (_, i) => `${i}번 ` + '가나다라 '.repeat(120));
  let n = 0; apiImpl = async (path, o) => { n++; if (n === 2) { const e = new Error('너무 빨라요. 1분쯤 뒤에 다시 해 주세요.'); e.status = 429; throw e; } return { out: o.body.units.map((u) => 'EN:' + u.slice(0, 5)) }; };
  await choose(docxFile('b.docx', paras)); click('start'); await until(() => work().includes('data-act="resume"'));
  assert.ok(work().includes('너무 빨라요') && !work().includes('data-act="dl"'));
  const doneBefore = (work().match(/class="ok"/g) || []).length; assert.ok(doneBefore >= 1);
  apiImpl = async (path, o) => ({ out: o.body.units.map((u) => 'EN:' + u.slice(0, 5)) }); click('resume'); await until(() => work().includes('data-act="dl"'));
  assert.ok(!/class="(wait|fail)"/.test(work()));
  // 한 조각이 계속 실패하면 그 조각만 「다시 시도」, 나머지는 그대로
  click('other'); let failNext = true; apiImpl = async (path, o) => { if (failNext && o.body.units[0].startsWith('0번')) { const e = new Error('서버가 바빠요'); e.status = 502; throw e; } return { out: o.body.units.map((u) => 'EN:' + u.slice(0, 5)) }; };
  await choose(docxFile('c.docx', paras)); click('start'); await until(() => work().includes('data-act="retry"'), 8000);
  assert.ok(work().includes('class="fail"') && work().includes('1번째 조각을 번역하지 못했어요') && work().includes(dict.ko.trlDlPart));
  failNext = false; click('retry', { i: '0' }); await until(() => work().includes(dict.ko.trlDone));
  assert.ok(!work().includes('data-act="retry"'));
  // 돈 파일 거절(서버 422)이면 전체가 멈춘다
  click('other'); apiImpl = async () => { const e = new Error('돈 파일은 안 보내요'); e.status = 422; throw e; };
  await choose(docxFile('d.docx', paras)); click('start'); await until(() => work().includes('data-act="resume"')); assert.ok(work().includes('돈 파일은 안 보내요'));
  // 멈추기
  click('other'); let calls = 0; apiImpl = async (path, o) => { calls++; if (calls === 1) click('cancel'); await new Promise((r) => setTimeout(r, 20)); return { out: o.body.units.map((u) => 'EN:' + u) }; };
  await choose(docxFile('e.docx', paras)); click('start'); await until(() => work().includes('data-act="resume"'));
  assert.ok(calls <= 3, '멈추기를 누르면 새 조각을 더 보내지 않는다');
});

test('화면: 영어 문서는 자동으로 한국어로, PDF 는 시작 전에 모양이 유지되지 않는다고 알린다', async () => {
  apiImpl = async (path, o) => ({ out: o.body.units.map((u) => '번역:' + u) });
  await choose(docxFile('Camp Notice.docx', ['Welcome to the winter camp.', 'Bring a Bible.']));
  assert.ok(work().includes('영어 → 한국어')); click('start'); await until(() => work().includes('data-act="dl"')); click('dl'); await until(() => downloads.length >= 2);
  assert.equal(downloads.at(-1).download, 'Camp Notice_ko.docx');
  const pdfBytes = (() => { const c = 'BT /F1 11 Tf 50 700 Td (Hello PDF world) Tj ET', d = zlib.deflateSync(Buffer.from(c)); return Buffer.concat([Buffer.from('%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n'), Buffer.from(`<< /Length ${d.length} /Filter /FlateDecode >>\nstream\n`), d, Buffer.from('\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 >>\nendobj\n')]); })();
  await choose({ name: 'a.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.length) });
  assert.ok(work().includes(dict.ko.trlPdfWarn) && work().includes('PDF'));
  click('start'); await until(() => work().includes('data-act="dl"')); click('dl'); await until(() => downloads.length >= 3); assert.equal(downloads.at(-1).download, 'a_ko.docx');
});

test('화면: 팀원이 아니거나 AI 가 꺼져 있으면 시작하지 않는다', async () => {
  apiImpl = async () => ({ member: false, configured: true }); await bootFn(); await choose(docxFile('a.docx', ['안녕하세요'])); assert.equal(msg(), dict.ko.trlNoMember);
  apiImpl = async () => ({ member: true, configured: false }); await bootFn(); await choose(docxFile('a.docx', ['안녕하세요'])); assert.equal(msg(), dict.ko.trlOff);
});
