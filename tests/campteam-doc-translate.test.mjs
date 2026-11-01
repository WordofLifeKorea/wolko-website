import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { financeReason as srvFinance, FIN_NAME_SRC, FIN_WORDS_SRC, AMOUNT_SRC } from '../functions/lib/campteamTranslateDoc.js';

// 브라우저용 엔진을 그대로 불러와 Node 에서 시험한다 (가짜 데이터만 쓴다)
vm.runInThisContext(readFileSync(new URL('../public/portal/campteam/doc-translate.js', import.meta.url), 'utf8'));
const T = globalThis.CTDocTranslate;

// 시험용 zip: [이름, 내용(문자열|Buffer), 압축할지]
function makeZip(files) {
  return T.writeZip(files.map(([name, content, deflate]) => {
    const raw = Buffer.from(content), data = deflate ? zlib.deflateRawSync(raw) : raw;
    return { nameBytes: Buffer.from(name), method: deflate ? 8 : 0, crc: T.crc32(raw), csize: data.length, usize: raw.length, data: new Uint8Array(data), flags: 0x0800 };
  }));
}
const entry = (z, name) => z.entries.find((e) => e.name === name);
const text = async (bytes, name) => Buffer.from(await T.entryBytes(T.readZip(bytes), entry(T.readZip(bytes), name))).toString('utf8');
const rawOf = (bytes, name) => { const z = T.readZip(bytes), e = entry(z, name); const lp = e.lho, s = lp + 30 + z.dv.getUint16(lp + 26, true) + z.dv.getUint16(lp + 28, true); return Buffer.from(z.buf.subarray(s, s + e.csize)); };
const dict = (pairs) => new Map(pairs);
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3, 250, 251, 252]);

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docxXml = `<?xml version="1.0"?><w:document ${W}><w:body>
<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>2027 겨울 </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>월코 캠프</w:t></w:r></w:p>
<w:p w14:paraId="x"/>
<w:p><w:r><w:t>이름</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>홍길동</w:t></w:r></w:p>
<w:p><w:r><w:t>2027</w:t></w:r></w:p>
<w:p><w:r><w:t>첫 줄</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>둘째 줄 &amp; 셋째</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>시간</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>내용</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
<w:p><w:r><w:t>바깥</w:t></w:r><w:r><mc:AlternateContent xmlns:mc="m"><w:drawing><w:txbxContent><w:p><w:r><w:t>글상자 안</w:t></w:r></w:p></w:txbxContent></w:drawing></mc:AlternateContent></w:r><w:r><w:t>끝</w:t></w:r></w:p>
</w:body></w:document>`;
const docxFiles = () => [['[Content_Types].xml', '<Types/>', true], ['word/document.xml', docxXml, true], ['word/header1.xml', `<w:hdr ${W}><w:p><w:r><w:t>머리말 글</w:t></w:r></w:p></w:hdr>`, true], ['word/styles.xml', '<w:styles><w:style w:styleId="Title"/></w:styles>', true], ['word/media/image1.png', PNG, false]];
const KO_EN = dict([['2027 겨울 월코 캠프', '2027 Winter WOLKO Camp'], ['이름', 'Name'], ['홍길동', 'Gil-dong Hong'], ['첫 줄', 'First line'], ['둘째 줄 & 셋째', 'Second & third line'], ['시간', 'Time'], ['내용', 'Content'], ['바깥', 'Outside'], ['글상자 안', 'Inside box'], ['끝', 'End'], ['머리말 글', 'Header text']]);

test('docx: 글 칸만 바뀌고 나머지 파일은 바이트 그대로, 서식(첫 칸)·숫자·필드는 유지', async () => {
  const src = makeZip(docxFiles()), doc = await T.load(src, '캠프.docx');
  assert.equal(doc.type, 'docx'); assert.equal(T.detectSource(doc.texts), 'ko');
  assert.ok(doc.texts.includes('2027 겨울 월코 캠프') && doc.texts.includes('둘째 줄 & 셋째') && doc.texts.includes('글상자 안') && doc.texts.includes('머리말 글'));
  assert.ok(!doc.texts.includes('PAGE'), '필드 명령은 글이 아니다');
  const out = await doc.build(KO_EN);
  for (const n of ['[Content_Types].xml', 'word/styles.xml', 'word/media/image1.png']) assert.ok(rawOf(src, n).equals(rawOf(out, n)), n + ' 는 압축된 바이트까지 같아야 한다');
  const x = await text(out, 'word/document.xml');
  assert.ok(x.includes('<w:rPr><w:b/></w:rPr><w:t xml:space="preserve">2027 Winter WOLKO Camp</w:t>'), '첫 칸(굵게)에 번역 전체');
  assert.ok(x.includes('<w:rPr><w:i/></w:rPr><w:t xml:space="preserve"></w:t>') || /<w:i\/><\/w:rPr><w:t[^>]*><\/w:t>/.test(x), '나머지 칸은 비움');
  assert.ok(x.includes('<w:t>2027</w:t>') && x.includes('<w:instrText> PAGE </w:instrText>') && x.includes('<w:t>1</w:t>'), '숫자·필드는 그대로');
  assert.ok(x.includes('<w:tab/>') && x.includes('<w:br/>') && x.includes('w14:paraId="x"/>'), '탭·줄바꿈·빈 문단 유지');
  assert.ok(x.includes('Second &amp; third line') && x.includes('Inside box') && x.includes('Outside') && x.includes('>End<'));
  assert.ok((await text(out, 'word/header1.xml')).includes('Header text'));
  // 새 파일을 같은 엔진으로 다시 읽을 수 있다
  if (process.env.DOCTR_DUMP) writeFileSync(process.env.DOCTR_DUMP + '/out.docx', out); // 손으로 열어 볼 때만
  const again = await T.load(out, 'x_en.docx'); assert.ok(again.texts.includes('2027 Winter WOLKO Camp') && again.texts.includes('Time') && T.detectSource(again.texts) === 'en');
  // 번역이 없는 글은 원문 그대로
  const part = await text(await doc.build(dict([['이름', 'Name']])), 'word/document.xml'); assert.ok(part.includes('>Name<') && part.includes('홍길동'));
});

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
test('pptx: 슬라이드·발표자 노트 글만 바뀌고 슬라이드 번호 필드·레이아웃은 그대로', async () => {
  const s1 = `<p:sld ${A}><p:txBody><a:p><a:r><a:rPr b="1"/><a:t>환영합니다</a:t></a:r><a:r><a:t> 여러분</a:t></a:r></a:p><a:p><a:r><a:t>첫째</a:t></a:r><a:br/><a:r><a:t>둘째</a:t></a:r></a:p><a:p><a:fld type="slidenum"><a:t>‹#›</a:t></a:fld></a:p></p:txBody></p:sld>`;
  const src = makeZip([['ppt/presentation.xml', '<p/>', true], ['ppt/slides/slide10.xml', s1.replace('환영합니다', '열번째'), true], ['ppt/slides/slide2.xml', s1, true], ['ppt/notesSlides/notesSlide2.xml', `<p:notes ${A}><a:p><a:r><a:t>발표 메모</a:t></a:r></a:p></p:notes>`, true], ['ppt/slideLayouts/slideLayout1.xml', `<p:sldLayout ${A}><a:p><a:r><a:t>제목 입력</a:t></a:r></a:p></p:sldLayout>`, true], ['ppt/media/a.png', PNG, false]]);
  const doc = await T.load(src, 'a.pptx');
  assert.deepEqual(doc.texts.slice(0, 2), ['환영합니다 여러분', '첫째'], '슬라이드 번호 순서(2 → 10)');
  assert.ok(!doc.texts.includes('제목 입력') && !doc.texts.includes('‹#›'));
  const out = await doc.build(dict([['환영합니다 여러분', 'Welcome everyone'], ['첫째', 'First'], ['둘째', 'Second'], ['발표 메모', 'Speaker note']]));
  const x = await text(out, 'ppt/slides/slide2.xml');
  assert.ok(x.includes('<a:rPr b="1"/><a:t>Welcome everyone</a:t></a:r><a:r><a:t></a:t>') && x.includes('<a:br/>') && x.includes('<a:t>‹#›</a:t>') && x.includes('First') && x.includes('Second'));
  assert.ok((await text(out, 'ppt/notesSlides/notesSlide2.xml')).includes('Speaker note'));
  assert.ok(rawOf(src, 'ppt/slideLayouts/slideLayout1.xml').equals(rawOf(out, 'ppt/slideLayouts/slideLayout1.xml')) && rawOf(src, 'ppt/media/a.png').equals(rawOf(out, 'ppt/media/a.png')));
});

test('xlsx: 공유 문자열·칸 안 글만 바뀌고 수식·숫자·날짜는 한 글자도 안 바뀐다', async () => {
  const sst = '<sst count="4" uniqueCount="4"><si><t>이름</t></si><si><r><rPr><b/></rPr><t>합계 </t></r><r><t>금액표</t></r><rPh sb="0" eb="2"><t>ガッケイ</t></rPh></si><si><t>2027</t></si><si><t xml:space="preserve"> 메모 </t></si></sst>';
  const sheet = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2"><v>45123</v></c><c r="B2" s="3"><f>SUM(A2:A9)</f><v>12.5</v></c><c r="C2" t="str"><f>IF(A2&gt;1,"예","아니오")</f><v>예</v></c><c r="D2" t="inlineStr"><is><t>인라인 글</t></is></c></row></sheetData></worksheet>';
  const plain = '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c><c r="B1"><f>A1*2</f><v>2</v></c></row></sheetData></worksheet>';
  const src = makeZip([['xl/workbook.xml', '<workbook><sheets><sheet name="명단" sheetId="1"/></sheets></workbook>', true], ['xl/sharedStrings.xml', sst, true], ['xl/worksheets/sheet1.xml', sheet, true], ['xl/worksheets/sheet2.xml', plain, true]]);
  const doc = await T.load(src, 'a.xlsx');
  assert.deepEqual(doc.texts, ['이름', '합계 금액표', '2027', '메모', '인라인 글']);
  assert.ok(doc.texts.includes('합계 금액표') && doc.texts.includes('메모') && doc.texts.includes('인라인 글') && !doc.texts.some((t) => t.includes('ガッケイ')));
  const out = await doc.build(dict([['이름', 'Name'], ['합계 금액표', 'Total chart'], ['메모', 'Memo'], ['인라인 글', 'Inline text']]));
  const s2 = await text(out, 'xl/sharedStrings.xml');
  assert.ok(s2.includes('<t xml:space="preserve">Total chart</t>') && s2.includes('<rPr><b/></rPr>') && !s2.includes('rPh') && s2.includes('<t xml:space="preserve"> Memo </t>') && s2.includes('<t>2027</t>'));
  const sh = await text(out, 'xl/worksheets/sheet1.xml');
  assert.ok(sh.includes('<f>SUM(A2:A9)</f><v>12.5</v>') && sh.includes('<v>45123</v>') && sh.includes('<f>IF(A2&gt;1,"예","아니오")</f><v>예</v>') && sh.includes('Inline text'), '수식·숫자·수식 결과 글은 그대로');
  assert.ok(rawOf(src, 'xl/worksheets/sheet2.xml').equals(rawOf(out, 'xl/worksheets/sheet2.xml')) && rawOf(src, 'xl/workbook.xml').equals(rawOf(out, 'xl/workbook.xml')), '시트 이름·글 없는 시트는 그대로');
  if (process.env.DOCTR_DUMP) writeFileSync(process.env.DOCTR_DUMP + '/out.xlsx', out);
  assert.ok((await T.load(out, 'o.xlsx')).texts.includes('Total chart'));
});

test('잘못된 파일: 압축 파일이 아니거나 필수 칸이 없거나 폭탄이면 코드가 있는 오류', async () => {
  await assert.rejects(T.load(new Uint8Array(Buffer.from('not a zip at all, long enough to scan')), 'a.docx'), { code: 'notzip' });
  await assert.rejects(T.load(makeZip([['x.txt', 'hi', false]]), 'a.docx'), { code: 'badoffice' });
  await assert.rejects(T.load(new Uint8Array(1), 'a.png'), { code: 'unsupported' });
  const bomb = makeZip([['word/document.xml', '<w:t>' + 'a'.repeat(41 * 1024 * 1024) + '</w:t>', true]]);
  await assert.rejects(T.load(bomb, 'a.docx'), { code: 'toobig' });
});

// ── PDF ────────────────────────────────────────────────────────────────
function pdf(objs, trailer = '<< /Root 1 0 R >>') { // objs: {번호: 문자열|Buffer(스트림 사전+본문)}
  const parts = [Buffer.from('%PDF-1.5\n')];
  for (const [n, o] of Object.entries(objs)) parts.push(Buffer.from(`${n} 0 obj\n`), Buffer.from(o), Buffer.from('\nendobj\n'));
  parts.push(Buffer.from(`trailer\n${trailer}\n%%EOF`)); return new Uint8Array(Buffer.concat(parts));
}
const flate = (s) => { const d = zlib.deflateSync(Buffer.from(s, 'latin1')); return Buffer.concat([Buffer.from(`<< /Length ${d.length} /Filter /FlateDecode >>\nstream\n`), d, Buffer.from('\nendstream')]); };
const hexs = (str, glyphs) => '<' + [...str].map((c) => glyphs.indexOf(c).toString(16).padStart(4, '0')).join('') + '>';
const GL = ' \u0000안녕하세요월코캠프참가자는모두오세요'; // 글자 번호표 (0 은 비워 둠)
const cmap = () => { const lines = [...GL].map((c, i) => c === '\u0000' ? '' : `<${i.toString(16).padStart(4, '0')}> <${c.charCodeAt(0).toString(16).padStart(4, '0')}>`).filter(Boolean); return `/CIDInit /ProcSet findresource begin begincmap 1 begincodespacerange <0000> <FFFF> endcodespacerange ${lines.length} beginbfchar\n${lines.join('\n')}\nendbfchar endcmap`; };
function koPdf({ objStm = false } = {}) {
  const content = `BT /F1 12 Tf 72 700 Td ${hexs('안녕하세요 월코', GL)} Tj 0 -14 Td ${hexs('캠프 참가자는', GL)} Tj 0 -45 Td ${hexs('모두 오세요', GL)} Tj ET`;
  const page = '<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>';
  const font = '<< /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H /ToUnicode 6 0 R >>';
  if (!objStm) return pdf({ 1: '<< /Type /Catalog /Pages 2 0 R >>', 2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 3: page, 4: flate(content), 5: font, 6: flate(cmap()) });
  const inner = [[1, '<< /Type /Catalog /Pages 2 0 R >>'], [2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'], [3, page], [5, font]]; let head = '', body = '';
  for (const [n, t] of inner) { head += `${n} ${body.length} `; body += t + '\n'; }
  const d = zlib.deflateSync(Buffer.from(head + body));
  return pdf({ 7: Buffer.concat([Buffer.from(`<< /Type /ObjStm /N 4 /First ${head.length} /Length ${d.length} /Filter /FlateDecode >>\nstream\n`), d, Buffer.from('\nendstream')]), 4: flate(content), 6: flate(cmap()) }, '<< /Root 1 0 R >>');
}
test('PDF(한글, ToUnicode 글꼴): 글을 뽑아 문단으로 묶고, 번역을 넣어 새 docx 를 만든다', async () => {
  for (const objStm of [false, true]) {
    const doc = await T.load(koPdf({ objStm }), '안내.pdf');
    assert.deepEqual(doc.texts, ['안녕하세요 월코 캠프 참가자는', '모두 오세요'], 'objStm=' + objStm);
    assert.equal(T.detectSource(doc.texts), 'ko');
    const out = await doc.build(dict([['안녕하세요 월코 캠프 참가자는', 'Hello WOLKO camp participants'], ['모두 오세요', 'Everyone please come & join']]), 'en');
    const x = await text(out, 'word/document.xml');
    assert.ok(x.includes('Hello WOLKO camp participants') && x.includes('Everyone please come &amp; join') && x.includes('Calibri'));
    assert.deepEqual((await T.load(out, 'a_en.docx')).texts, ['Hello WOLKO camp participants', 'Everyone please come & join']);
  }
});
test('PDF(영어, 기본 글꼴·괄호 글자·간격 숫자): 읽고, 글 없는/암호 PDF 는 코드 오류', async () => {
  const content = 'BT /F1 11 Tf 50 700 Td [(Hel) -20 (lo \\(wor) 5 (ld\\)) -400 (again)] TJ 0 -13 Td (second line) Tj ET';
  const doc = await T.load(pdf({ 1: '<< /Type /Catalog /Pages 2 0 R >>', 2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 3: '<< /Type /Page /Parent 2 0 R /Contents [4 0 R] /Resources << /Font << /F1 5 0 R >> >> >>', 4: flate(content), 5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' }), 'a.pdf');
  assert.deepEqual(doc.texts, ['Hello (world) again second line']);
  const scan = pdf({ 1: '<< /Type /Catalog /Pages 2 0 R >>', 2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 3: '<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << >> >>', 4: flate('q 100 0 0 100 0 0 cm /Im1 Do Q') });
  await assert.rejects(T.load(scan, 'scan.pdf'), { code: 'notext' });
  await assert.rejects(T.load(pdf({ 1: '<< /Type /Catalog >>' }, '<< /Root 1 0 R /Encrypt 9 0 R >>'), 'x.pdf'), { code: 'encrypted' });
  await assert.rejects(T.load(new Uint8Array(Buffer.from('hello')), 'x.pdf'), { code: 'badpdf' });
});

// ── 방향·조각·돈 막기 ─────────────────────────────────────────────────
test('방향 자동 · 이미 목표 언어인 칸은 안 보냄 · 겹친 글은 한 번 · 조각 한도 · 병합', () => {
  assert.equal(T.detectSource(['안녕하세요', 'OK']), 'ko'); assert.equal(T.detectSource(['Hello team', '가']), 'en'); assert.equal(T.detectSource(['123', '!!']), '');
  assert.equal(T.needs('Hello', 'en'), false); assert.equal(T.needs('안녕', 'en'), true); assert.equal(T.needs('안녕', 'ko'), false); assert.equal(T.needs('2027', 'en'), false);
  const texts = ['안녕', '안녕', 'Hello', '12', ...Array.from({ length: 95 }, (_, i) => '문장 ' + i + ' ' + '가'.repeat(120))];
  const pl = T.plan(texts, 'en');
  assert.equal(pl.pieces.length, 96, '중복 한 번 · 영어/숫자는 제외'); assert.ok(pl.chunks.length >= 3);
  for (const c of pl.chunks) { assert.ok(c.length <= 40); assert.ok(c.reduce((n, i) => n + pl.pieces[i].length, 0) <= T.CHUNK_CHARS); }
  assert.deepEqual(pl.chunks.flat(), pl.pieces.map((_, i) => i), '순서 유지·빠짐 없음');
  const outs = []; pl.pieces.forEach((p, i) => { if (i !== 1) outs[i] = 'T:' + p; });
  const map = T.merge(pl, outs); assert.equal(map.get('안녕'), 'T:안녕'); assert.equal(map.has(texts[4]), false, '번역이 빠진 칸은 map 에 없다(원문 유지)');
  const long = ('가나다라마바사. '.repeat(600)).trim(), p2 = T.plan([long], 'en'); assert.ok(p2.pieces.length >= 2 && p2.pieces.every((p) => p.length <= 2500));
  assert.equal(T.merge(p2, p2.pieces.map(() => 'X')).get(long), p2.owners.get(long).map(() => 'X').join(' '));
  assert.equal(T.outName('캠프 안내.docx', 'en', 'docx'), '캠프 안내_en.docx'); assert.equal(T.outName('a.b.pdf', 'ko', 'pdf'), 'a.b_ko.docx'); assert.equal(T.outName('x.xlsx', 'ko', 'xlsx'), 'x_ko.xlsx');
});
test('파일 종류 안내', () => {
  const k = (n) => T.classify(n).kind;
  assert.deepEqual(['a.DOCX', 'a.pptx', 'a.xlsx', 'a.pdf', 'a.png', 'a.gdoc', 'a.doc', 'a.hwp', 'a.zip', 'noext'].map(k), ['docx', 'pptx', 'xlsx', 'pdf', 'image', 'google', 'oldoffice', 'oldoffice', 'other', 'other']);
});
test('돈 파일 막기: 이름·낱말·금액 · 서버와 같은 규칙', () => {
  assert.equal(T.financeReason('2027 예산안.xlsx', ''), 'name'); assert.equal(T.financeReason('Camp_Budget.xlsx', ''), 'name'); assert.equal(T.financeReason('receipt.pdf', ''), 'name');
  assert.equal(T.financeReason('a.docx', '결산 보고서 영수증 첨부'), 'words'); assert.equal(T.financeReason('a.docx', '입금 ' + '50,000원 '.repeat(5)), 'words');
  assert.equal(T.financeReason('a.docx', Array(10).fill('10,000원').join(' ') + ' 항목'), 'amounts');
  assert.equal(T.financeReason('캠프 안내.docx', '여름 수련회 안내입니다. 참가비는 50,000원이며 입금 후 신청이 완료됩니다.'), '');
  assert.equal(T.financeReason('설교.docx', '주님의 은혜가 여러분과 함께하시길 바랍니다.'), '');
  assert.deepEqual(T.FINANCE, { name: FIN_NAME_SRC, words: FIN_WORDS_SRC, amount: AMOUNT_SRC }, '서버·브라우저 규칙이 같아야 한다');
  for (const [n, t] of [['x.docx', '장부 결산'], ['예산.xlsx', ''], ['a.docx', '평범한 글'], ['a.docx', Array(12).fill('₩1,000').join(' ')]]) assert.equal(srvFinance(n, t), T.financeReason(n, t));
});
