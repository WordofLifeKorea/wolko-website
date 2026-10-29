import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';

// 브라우저용 파일을 그대로 불러와 (가짜 window 없이) 시험한다
const ctx = { TextDecoder, DecompressionStream, Blob, Response, File, btoa, console };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/portal/campteam/doc-text.js', import.meta.url), 'utf8'), ctx);
const D = ctx.CTDocText;

// 시험용 zip 만들기 (저장만 하는 방식 0 / 압축 방식 8)
function crc32(buf) { let c, crc = ~0; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function zip(files) {
  const parts = [], cd = []; let off = 0;
  for (const [name, text, deflate] of files) {
    const raw = Buffer.from(text), data = deflate ? zlib.deflateRawSync(raw) : raw, nm = Buffer.from(name), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(deflate ? 8 : 0, 8); h.writeUInt32LE(crc32(raw), 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nm.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(deflate ? 8 : 0, 10); c.writeUInt32LE(crc32(raw), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, nm, data); cd.push(c, nm); off += 30 + nm.length + data.length;
  }
  const cdBuf = Buffer.concat(cd), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cdBuf.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdBuf, e]);
}
const file = (buf, name) => new File([buf], name);

test('Word(docx): 문단 글만 꺼낸다 (태그·특수문자 정리)', async () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>2027 겨울 월코 영어 캠프</w:t></w:r></w:p><w:p><w:r><w:t>Week 1 &amp; 2 lesson</w:t></w:r></w:p></w:body></w:document>';
  const r = await D.prepare(file(zip([['word/document.xml', xml, true], ['word/styles.xml', '<x/>', false]]), '수업안.docx'));
  assert.equal(r.kind, 'text'); assert.equal(r.text, '2027 겨울 월코 영어 캠프\nWeek 1 & 2 lesson');
});

test('PowerPoint(pptx): 슬라이드 순서대로 글을 모은다', async () => {
  const s = (t) => `<p:sld><a:t>${t}</a:t></p:sld>`;
  const r = await D.prepare(file(zip([['ppt/slides/slide10.xml', s('열 번째'), true], ['ppt/slides/slide2.xml', s('둘째'), true], ['ppt/slides/slide1.xml', s('첫째'), false]]), 'a.pptx'));
  assert.equal(r.text.split('\n').filter(Boolean).join('|'), '첫째|둘째|열 번째');
});

test('Excel(xlsx): 시트 이름과 칸 글자를 모은다', async () => {
  const r = await D.prepare(file(zip([['xl/workbook.xml', '<workbook><sheets><sheet name="명단" sheetId="1"/><sheet name="일정" sheetId="2"/></sheets></workbook>', true], ['xl/sharedStrings.xml', '<sst><si><t>이름</t></si><si><t>연락처</t></si></sst>', true]]), 'a.xlsx'));
  assert.ok(r.text.startsWith('Sheets: 명단, 일정') && r.text.includes('이름 | 연락처'));
});

test('글 파일은 앞부분만, 긴 글은 6,000자에서 자른다', async () => {
  const r = await D.prepare(file(Buffer.from('가'.repeat(20000)), 'x.txt')); assert.equal(r.kind, 'text'); assert.equal(r.text.length, 6000);
  const csv = await D.prepare(file(Buffer.from('a,b\n1,2'), 'x.csv')); assert.equal(csv.kind, 'text'); assert.equal(csv.text, 'a,b\n1,2');
});

test('PDF 는 그대로(8MB 이하), 너무 크거나 모르는 형식·깨진 파일은 이름만 쓴다', async () => {
  const pdf = await D.prepare(file(Buffer.from('%PDF-1.4 hi'), 'a.pdf')); assert.equal(pdf.kind, 'pdf'); assert.equal(Buffer.from(pdf.data, 'base64').toString(), '%PDF-1.4 hi');
  assert.equal((await D.prepare(file(Buffer.alloc(8 * 1024 * 1024 + 1), 'big.pdf'))).kind, 'none');
  assert.equal((await D.prepare(file(Buffer.from('x'), 'video.mp4'))).kind, 'none');
  assert.equal((await D.prepare(file(Buffer.from('not a zip'), 'broken.docx'))).kind, 'none');
});

test('압축 폭탄 방지: 풀면 8MB 가 넘는 칸은 읽지 않는다', async () => {
  const big = zip([['word/document.xml', '<w:t>' + 'a'.repeat(9 * 1024 * 1024) + '</w:t>', true]]);
  assert.equal((await D.prepare(file(big, 'bomb.docx'))).kind, 'none');
});
