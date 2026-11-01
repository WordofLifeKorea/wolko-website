/* 문서 번역 엔진 (브라우저 안에서만 돈다 — 파일은 포털에 올라가지 않고, AI 로는 「글 조각」만 나간다).
   Word(docx)·PowerPoint(pptx)·Excel(xlsx): 문서 안 XML 의 글 칸(w:t · a:t · 공유 문자열)만 바꾸고 나머지 파일(그림·스타일·표 모양·수식)은 압축된 바이트 그대로 복사해서 다시 zip 으로 묶는다.
   PDF: 글만 뽑아서(가벼운 읽기) 새 Word 파일을 만든다 — PDF 의 모양·표·그림은 유지되지 않는다.
   doc-text.js 처럼 window 와 module.exports 둘 다에 내보내서 Node 시험에서도 그대로 돌린다. */
(function (root) {
  'use strict';
  var MAX_FILE = 15 * 1024 * 1024, MAX_CHARS = 60000, MAX_UNITS = 40, CHUNK_CHARS = 4500, MAX_PIECE = 2500, MAX_ENTRY = 40 * 1024 * 1024;
  var enc = new TextEncoder(), dec = new TextDecoder('utf-8');
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  function concat(parts) { var n = 0, i, o, p = 0; for (i = 0; i < parts.length; i++) n += parts[i].length; o = new Uint8Array(n); for (i = 0; i < parts.length; i++) { o.set(parts[i], p); p += parts[i].length; } return o; }

  /* ───────── 파일 종류 ───────── */
  function classify(name) {
    var m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')), e = m ? m[1].toLowerCase() : '';
    if (e === 'docx' || e === 'pptx' || e === 'xlsx' || e === 'pdf') return { kind: e, ext: e };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'tif', 'tiff', 'svg'].indexOf(e) >= 0) return { kind: 'image', ext: e };
    if (['gdoc', 'gslides', 'gsheet', 'gform', 'gdraw'].indexOf(e) >= 0) return { kind: 'google', ext: e };
    if (['doc', 'ppt', 'xls', 'hwp', 'hwpx', 'odt', 'odp', 'ods', 'rtf', 'pages', 'key', 'numbers'].indexOf(e) >= 0) return { kind: 'oldoffice', ext: e };
    return { kind: 'other', ext: e };
  }

  /* ───────── 돈 파일 막기: 서버(functions/lib/campteamTranslateDoc.js)와 같은 규칙 — 시험이 두 곳이 같은지 확인한다 ───────── */
  var FIN_NAME_SRC = '장부|예산|결산|영수증|정산|회계|입출금|지출|청구서|세금계산서|ledger|budget|expense|invoice|receipt|accounting|payroll|급여|월급|통장';
  var FIN_WORDS_SRC = '장부|예산|결산|영수증|정산|회계|입출금|세금계산서|청구서|잔액|입금|출금|지출\\s*내역|ledger|budget|expense|invoice|receipt|accounting|payroll|account number|balance sheet';
  var AMOUNT_SRC = '(?:[₩$]\\s?\\d[\\d,]*(?:\\.\\d+)?|\\d{1,3}(?:,\\d{3})+\\s?원?|\\d+\\s?(?:원|만원|천원|달러|USD|KRW))';
  /** 돈 문서처럼 보이면 이유 코드('name'|'words'|'amounts'), 아니면 '' */
  function financeReason(name, text) {
    if (name && new RegExp(FIN_NAME_SRC, 'i').test(String(name))) return 'name';
    var t = String(text || ''), hits = t.match(new RegExp(FIN_WORDS_SRC, 'gi')) || [], amts = t.match(new RegExp(AMOUNT_SRC, 'g')) || [], words = t.split(/\s+/).filter(Boolean).length, seen = {}, distinct = 0;
    hits.forEach(function (h) { h = h.toLowerCase(); if (!seen[h]) { seen[h] = 1; distinct++; } });
    if (distinct >= 2 || hits.length >= 4 || (hits.length >= 1 && amts.length >= 5)) return 'words';
    if (amts.length >= 8 && amts.length / Math.max(words, 1) >= 0.2) return 'amounts';
    return '';
  }

  /* ───────── zip 읽기·쓰기 ───────── */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function stream(u8, ctor, fmt, cap) { // 압축/풀기. cap 을 넘게 풀리면 중단(압축 폭탄 방지)
    var rd = new Blob([u8]).stream().pipeThrough(new ctor(fmt)).getReader(), parts = [], n = 0;
    for (;;) { var r = await rd.read(); if (r.done) break; n += r.value.length; if (cap && n > cap) { rd.cancel(); throw fail('toobig'); } parts.push(r.value); }
    return concat(parts);
  }
  var inflate = function (u8, fmt) { return stream(u8, DecompressionStream, fmt || 'deflate-raw', MAX_ENTRY); };
  async function deflate(u8) { return typeof CompressionStream === 'undefined' ? null : stream(u8, CompressionStream, 'deflate-raw', 0); }

  function readZip(buf) {
    var dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), i = buf.length - 22, min = Math.max(0, buf.length - 22 - 65535);
    while (i >= min && dv.getUint32(i, true) !== 0x06054b50) i--;
    if (i < min) throw fail('notzip');
    var count = dv.getUint16(i + 10, true), p = dv.getUint32(i + 16, true), entries = [];
    if (count === 0xffff || p === 0xffffffff) throw fail('zip64');
    for (var k = 0; k < count; k++) {
      if (p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) throw fail('notzip');
      var nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), nb = buf.subarray(p + 46, p + 46 + nl);
      entries.push({ name: dec.decode(nb), nameBytes: nb, made: dv.getUint16(p + 4, true), flags: dv.getUint16(p + 8, true), method: dv.getUint16(p + 10, true), time: dv.getUint16(p + 12, true), date: dv.getUint16(p + 14, true), crc: dv.getUint32(p + 16, true), csize: dv.getUint32(p + 20, true), usize: dv.getUint32(p + 24, true), attr: dv.getUint32(p + 38, true), lho: dv.getUint32(p + 42, true) });
      if (entries[k].flags & 1) throw fail('encrypted');
      p += 46 + nl + xl + cl;
    }
    return { buf: buf, dv: dv, entries: entries };
  }
  function rawData(z, e) { // 압축된 채로의 바이트(그대로 복사할 때 쓴다)
    var lp = e.lho;
    if (lp + 30 > z.buf.length || z.dv.getUint32(lp, true) !== 0x04034b50) throw fail('notzip');
    var s = lp + 30 + z.dv.getUint16(lp + 26, true) + z.dv.getUint16(lp + 28, true);
    if (s + e.csize > z.buf.length) throw fail('notzip');
    return z.buf.subarray(s, s + e.csize);
  }
  async function entryBytes(z, e) {
    if (e.usize > MAX_ENTRY) throw fail('toobig');
    var raw = rawData(z, e);
    if (e.method === 0) return raw;
    if (e.method === 8) return inflate(raw);
    throw fail('badmethod');
  }
  /** files: [{ nameBytes, method, crc, csize, usize, data, flags, time, date, attr, made }] → zip 바이트. 데이터 설명자(bit3)는 쓰지 않고 크기를 머리말에 직접 적는다. */
  function writeZip(files) {
    var parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nb = f.nameBytes, fl = (f.flags == null ? 0x0800 : f.flags) & ~8 & ~1, h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, fl, true); h.setUint16(8, f.method, true); h.setUint16(10, f.time || 0, true); h.setUint16(12, f.date || 0x5821, true); h.setUint32(14, f.crc, true); h.setUint32(18, f.csize, true); h.setUint32(22, f.usize, true); h.setUint16(26, nb.length, true);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, f.made || 20, true); c.setUint16(6, 20, true); c.setUint16(8, fl, true); c.setUint16(10, f.method, true); c.setUint16(12, f.time || 0, true); c.setUint16(14, f.date || 0x5821, true); c.setUint32(16, f.crc, true); c.setUint32(20, f.csize, true); c.setUint32(24, f.usize, true); c.setUint16(28, nb.length, true); c.setUint32(38, f.attr || 0, true); c.setUint32(42, off, true);
      parts.push(new Uint8Array(h.buffer), nb, f.data); cd.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + f.data.length;
    });
    var cdb = concat(cd), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdb.length, true); e.setUint32(16, off, true);
    return concat(parts.concat([cdb, new Uint8Array(e.buffer)]));
  }
  /** 새로 만든 칸(글) → zip 칸. 줄어들면 압축, 아니면 그냥 저장 */
  async function newFile(name, bytes, base) {
    var d = await deflate(bytes), packed = d && d.length < bytes.length;
    return Object.assign({}, base || {}, { nameBytes: enc.encode(name), flags: 0x0800, method: packed ? 8 : 0, crc: crc32(bytes), csize: packed ? d.length : bytes.length, usize: bytes.length, data: packed ? d : bytes });
  }
  /** 이름 → 바이트 로 새 zip 을 만든다 (PDF → docx 용) */
  async function zipFromMap(list) { var files = []; for (var i = 0; i < list.length; i++) files.push(await newFile(list[i][0], enc.encode(list[i][1]))); return writeZip(files); }

  /* ───────── XML 글 칸 찾기 ───────── */
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function unent(s) { return String(s).replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { return safeCp(parseInt(h, 16)); }).replace(/&#(\d+);/g, function (m, n) { return safeCp(Number(n)); }).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }
  function safeCp(n) { try { return String.fromCodePoint(n); } catch (e) { return ''; } }
  function natural(a, b) { return a.name.replace(/\d+/g, function (n) { return n.padStart(6, '0'); }) < b.name.replace(/\d+/g, function (n) { return n.padStart(6, '0'); }) ? -1 : 1; }
  var TAG = /<(\/?)([A-Za-z0-9_]+:[A-Za-z0-9_]+)((?:\s[^>]*?)?)(\/?)>/g;
  /* 문단 안에서, 줄바꿈·탭·필드·그림 같은 「끊는 표시」 사이의 글 칸 묶음을 한 조각(segment)으로 본다.
     조각 안의 글은 한 번에 번역하고, 끊는 표시들은 제자리에 그대로 둔다. 글상자처럼 문단 안의 문단은 바깥 문단과 따로 센다. */
  var CFG = {
    docx: { p: 'w:p', t: 'w:t', pres: true, nl: ' ', bounds: ['w:br', 'w:tab', 'w:cr', 'w:fldChar', 'w:instrText', 'w:drawing', 'w:pict', 'w:object', 'w:sym', 'w:ptab'], skip: '' },
    pptx: { p: 'a:p', t: 'a:t', pres: false, nl: ' ', bounds: ['a:br'], skip: 'a:fld' }
  };
  function scanParas(xml, cfg) {
    var re = new RegExp(TAG.source, 'g'), m, stack = [], segs = [], skipDepth = 0, bset = {}, fld = cfg.skip;
    cfg.bounds.forEach(function (b) { bset[b] = 1; });
    function close(f) { if (f && f.cur && f.cur.runs.length) segs.push(f.cur); if (f) f.cur = null; }
    while ((m = re.exec(xml))) {
      var closing = m[1] === '/', name = m[2], self = m[4] === '/', top = stack[stack.length - 1];
      if (name === cfg.p) { if (closing) { close(stack.pop()); } else if (!self) stack.push({ cur: null }); continue; }
      if (fld && name === fld) { close(top); if (!self) skipDepth += closing ? -1 : 1; if (skipDepth < 0) skipDepth = 0; continue; }
      if (!top || closing) continue;
      if (name === cfg.t) {
        if (self || skipDepth) continue;
        var cs = m.index + m[0].length, ce = xml.indexOf('<', cs); if (ce < 0) continue;
        (top.cur || (top.cur = { runs: [], cuts: [] })).runs.push({ ts: m.index, cs: cs, ce: ce }); re.lastIndex = ce; continue;
      }
      if (bset[name]) close(top);
    }
    return segs;
  }
  /* xlsx: 글 칸은 공유 문자열(<si>)과 칸 안 글(<is>). 후리가나(<rPh>)는 번역하면 틀려지니 빼 버린다. 수식(<f>)·숫자(<v>)는 읽지도 않는다. */
  function scanBlocks(xml, tag) {
    var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'g'), segs = [], m;
    while ((m = re.exec(xml))) {
      if (/\/\s*>$/.test(m[0].slice(0, m[0].length - m[1].length - tag.length - 3))) continue;
      var base = m.index + m[0].length - m[1].length - tag.length - 3, inner = m[1], cuts = [], r2 = /<rPh(?:\s[^>]*)?>[\s\S]*?<\/rPh>/g, c, seg = { runs: [], cuts: [] };
      while ((c = r2.exec(inner))) cuts.push([base + c.index, base + c.index + c[0].length]);
      var rt = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g, t;
      while ((t = rt.exec(inner))) { var s = base + t.index; if (cuts.some(function (x) { return s >= x[0] && s < x[1]; })) continue; seg.runs.push({ ts: s, cs: s + t[0].indexOf('>') + 1, ce: s + t[0].length - 4 }); }
      if (seg.runs.length) { seg.cuts = cuts; segs.push(seg); }
    }
    return segs;
  }
  function finishSegs(xml, segs) { // 글·앞뒤 공백·열쇠(key)를 채우고 빈 조각은 뺀다
    var out = [];
    segs.forEach(function (sg) {
      var text = sg.runs.map(function (r) { return unent(xml.slice(r.cs, r.ce)); }).join(''), k = text.trim();
      if (!k) return;
      sg.lead = /^\s*/.exec(text)[0]; sg.trail = /\s*$/.exec(text)[0]; sg.key = k; out.push(sg);
    });
    return out;
  }
  function withPreserve(open) { return /\sxml:space\s*=/.test(open) ? open.replace(/(\sxml:space\s*=\s*)("[^"]*"|'[^']*')/, '$1"preserve"') : open.replace(/\s*>$/, ' xml:space="preserve">'); }
  function cleanTr(s, nl) { s = String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, ''); if (nl === ' ') s = s.replace(/\s*[\r\n]+\s*/g, ' '); return s.trim(); }
  /* 한 조각에 번역을 넣는다: 첫 글 칸에 번역 전체를 넣고 나머지 칸은 비운다 → 첫 칸의 글꼴·굵기가 번역 전체에 적용된다(「문단에 여러 칸이 있을 때」의 한계) */
  function segEdits(sg, tr, part) {
    var out = [], t = cleanTr(tr, part.cfg.nl);
    sg.runs.forEach(function (r, i) {
      if (i) out.push({ s: r.cs, e: r.ce, r: '' });
      else { var open = part.xml.slice(r.ts, r.cs); out.push({ s: r.ts, e: r.ce, r: (part.cfg.pres ? withPreserve(open) : open) + esc(sg.lead + t + sg.trail) }); }
    });
    sg.cuts.forEach(function (c) { out.push({ s: c[0], e: c[1], r: '' }); });
    return out;
  }
  function applyEdits(xml, edits) { edits.sort(function (a, b) { return a.s - b.s; }); var o = [], p = 0; edits.forEach(function (x) { o.push(xml.slice(p, x.s), x.r); p = x.e; }); o.push(xml.slice(p)); return o.join(''); }

  var PARTS = {
    docx: { main: 'word/document.xml', re: /^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/, cfg: CFG.docx, rank: function (n) { return n === 'word/document.xml' ? 0 : 1; } },
    pptx: { main: 'ppt/presentation.xml', re: /^ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+|diagrams\/(data|drawing)\d+)\.xml$/, cfg: CFG.pptx, rank: function (n) { return /\/slides\//.test(n) ? 0 : /diagrams/.test(n) ? 1 : 2; } /* 미리보기에 슬라이드 글이 먼저 나오게 */ },
    xlsx: { main: 'xl/workbook.xml', re: /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/, rank: function (n) { return /sharedStrings/.test(n) ? 0 : 1; } }
  };
  async function loadOffice(buf, name, type) {
    var z = readZip(buf), def = PARTS[type], names = {}; z.entries.forEach(function (e) { names[e.name] = e; });
    if (!names[def.main]) throw fail('badoffice');
    var parts = [], texts = [];
    var list = z.entries.filter(function (e) { return def.re.test(e.name); }).sort(function (a, b) { return (def.rank(a.name) - def.rank(b.name)) || natural(a, b); });
    for (var i = 0; i < list.length; i++) {
      var xml = dec.decode(await entryBytes(z, list[i])), part = { name: list[i].name, xml: xml, cfg: def.cfg || { pres: true, nl: '\n' } }, segs;
      if (type === 'xlsx') segs = /sharedStrings/.test(part.name) ? scanBlocks(xml, 'si') : scanBlocks(xml, 'is'); else segs = scanParas(xml, def.cfg);
      part.segs = finishSegs(xml, segs); if (part.segs.length) { parts.push(part); part.segs.forEach(function (sg) { texts.push(sg.key); }); }
    }
    return {
      type: type, name: name, texts: texts,
      /** map: 원문(글) → 번역. 없는 글은 원문 그대로 둔다. 결과는 새 파일의 바이트 */
      build: async function (map) {
        var repl = {}; parts.forEach(function (p) { var ed = []; p.segs.forEach(function (sg) { var tr = map.get(sg.key); if (tr != null && String(tr).trim()) ed.push.apply(ed, segEdits(sg, tr, p)); }); if (ed.length) repl[p.name] = applyEdits(p.xml, ed); });
        var files = [];
        for (var k = 0; k < z.entries.length; k++) {
          var e = z.entries[k];
          if (repl[e.name] != null) files.push(await newFile(e.name, enc.encode(repl[e.name]), { time: e.time, date: e.date, attr: e.attr, made: e.made }));
          else files.push({ nameBytes: e.nameBytes, method: e.method, crc: e.crc, csize: e.csize, usize: e.usize, data: rawData(z, e), flags: e.flags, time: e.time, date: e.date, attr: e.attr, made: e.made });
        }
        return writeZip(files);
      }
    };
  }

  /* ───────── PDF: 글만 뽑기 (가벼운 읽기) ─────────
     글 위치(Td·Tm 등)로 줄을 나누고, 줄 사이가 넓으면 문단을 나눈다. 글꼴의 ToUnicode 표로 한글을 되돌린다.
     암호 PDF·스캔본(글 없음)은 읽지 못한다. 표는 줄 단위 글로만 나오고 그림은 빠진다. */
  var l1 = function (u8) { var s = '', n = 0x8000; for (var i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return s; };
  var u8of = function (s) { var o = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 255; return o; };
  function dictVal(d, key) { // 사전 문자열 안에서 /Key 의 값(사전·배열·참조·낱말)을 원문 그대로 꺼낸다
    var m = new RegExp('\\/' + key + '(?![A-Za-z0-9])\\s*').exec(d); if (!m) return '';
    var i = m.index + m[0].length, c = d[i];
    if (c === '<' && d[i + 1] === '<') { var dp = 0, j = i; for (; j < d.length; j++) { if (d[j] === '<' && d[j + 1] === '<') { dp++; j++; } else if (d[j] === '>' && d[j + 1] === '>') { dp--; j++; if (!dp) return d.slice(i, j + 1); } } return d.slice(i); }
    if (c === '[') { var e = d.indexOf(']', i); return e < 0 ? d.slice(i) : d.slice(i, e + 1); }
    var r = /^(\d+)\s+(\d+)\s+R/.exec(d.slice(i, i + 24)); if (r) return r[0];
    var w = /^\/?[^\s\/<>\[\]()]+/.exec(d.slice(i)); return w ? w[0] : '';
  }
  var refNum = function (v) { var m = /^(\d+)\s+\d+\s+R/.exec(String(v).trim()); return m ? Number(m[1]) : 0; };
  async function pdfStream(o) { // 압축 풀린 스트림 글자(latin1) — 모르는 방식이면 ''
    if (!o || !o.data) return '';
    var f = dictVal(o.dict, 'Filter');
    if (!f) return l1(o.data);
    if (!/^\[?\s*\/FlateDecode\s*\]?$/.test(f.trim()) || /Predictor/.test(o.dict)) return '';
    try { return l1(await stream(o.data, DecompressionStream, 'deflate', MAX_ENTRY)); } catch (e) { return ''; }
  }
  function hexU16(h) { h = h.replace(/\s+/g, ''); if (h.length % 4) h = h.padStart(h.length + 4 - (h.length % 4), '0'); var s = ''; for (var i = 0; i < h.length; i += 4) s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return s; }
  function parseCMap(t) {
    var map = {}, len = 0, m, cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(t); if (cs) len = cs[1].length / 2;
    var bc = /beginbfchar([\s\S]*?)endbfchar/g, re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
    while ((m = bc.exec(t))) { var p; re.lastIndex = 0; while ((p = re.exec(m[1]))) { map[parseInt(p[1], 16)] = hexU16(p[2]); if (!len) len = p[1].length / 2; } }
    var br = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((m = br.exec(t))) {
      var rr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[[^\]]*\]|<[0-9A-Fa-f]*>)/g, q;
      while ((q = rr.exec(m[1]))) {
        var lo = parseInt(q[1], 16), hi = Math.min(parseInt(q[2], 16), lo + 0xffff); if (!len) len = q[1].length / 2;
        if (q[3][0] === '[') { var items = q[3].match(/<([0-9A-Fa-f]*)>/g) || []; for (var a = 0; a < items.length && lo + a <= hi; a++) map[lo + a] = hexU16(items[a].slice(1, -1)); }
        else { var dst = hexU16(q[3].slice(1, -1)); for (var c = lo; c <= hi; c++) map[c] = dst.slice(0, -1) + String.fromCharCode(dst.charCodeAt(dst.length - 1) + (c - lo)); }
      }
    }
    return { map: map, len: len || 2 };
  }
  function pdfShow(raw, font, st) { // 글자 문자열 바이트 → 화면 글자
    var out = '', i;
    if (font && font.cmap) { var L = font.cmap.len; for (i = 0; i + L <= raw.length; i += L) { var code = 0; for (var k = 0; k < L; k++) code = code * 256 + (raw.charCodeAt(i + k) & 255); out += font.cmap.map[code] != null ? font.cmap.map[code] : (L === 1 && code >= 32 && code < 127 ? String.fromCharCode(code) : ''); } return out; }
    if (font && font.type0) { st.lost = true; return ''; }
    return raw.replace(/[\u0000-\u001F]/g, '');
  }
  function* pdfTokens(c) { // 내용 스트림을 낱말로 쪼갠다: {t:'s'|'n'|'name'|'op'|'[', v}
    var i = 0, n = c.length, m;
    while (i < n) {
      var ch = c[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '%') { while (i < n && c[i] !== '\n' && c[i] !== '\r') i++; continue; }
      if (ch === '(') { var dp = 1, s = ''; i++; while (i < n && dp) { var x = c[i]; if (x === '\\') { var y = c[i + 1]; if (/[0-7]/.test(y)) { var o = /^[0-7]{1,3}/.exec(c.slice(i + 1, i + 4))[0]; s += String.fromCharCode(parseInt(o, 8) & 255); i += 1 + o.length; continue; } s += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[y] || (y === '\n' || y === '\r' ? '' : y); i += 2; continue; } if (x === '(') dp++; else if (x === ')') { dp--; if (!dp) { i++; break; } } s += x; i++; } yield { t: 's', v: s }; continue; }
      if (ch === '<' && c[i + 1] === '<') { i += 2; yield { t: 'op', v: '<<' }; continue; }
      if (ch === '>' && c[i + 1] === '>') { i += 2; yield { t: 'op', v: '>>' }; continue; }
      if (ch === '<') { var e = c.indexOf('>', i); if (e < 0) return; var h = c.slice(i + 1, e).replace(/\s+/g, ''); if (h.length % 2) h += '0'; var s2 = ''; for (var q = 0; q < h.length; q += 2) s2 += String.fromCharCode(parseInt(h.slice(q, q + 2), 16)); i = e + 1; yield { t: 's', v: s2 }; continue; }
      if (ch === '[' || ch === ']') { i++; yield { t: ch, v: ch }; continue; }
      if (ch === '/') { m = /^\/[^\s\/<>\[\]()%]*/.exec(c.slice(i, i + 80)); i += m[0].length; yield { t: 'name', v: m[0].slice(1) }; continue; }
      m = /^[^\s\/<>\[\]()%]+/.exec(c.slice(i, i + 80)); if (!m) { i++; continue; } i += m[0].length;
      yield /^[+-]?(\d+\.?\d*|\.\d+)$/.test(m[0]) ? { t: 'n', v: parseFloat(m[0]) } : { t: 'op', v: m[0] };
    }
  }
  function pdfPage(content, fonts, st) { // 한 쪽 → [{y, text}] 줄 목록
    var lines = [], cur = '', ly = null, y = 0, font = null, stackv = [], inArr = null, tj = [];
    function flush() { var t = cur.replace(/\s+/g, ' ').trim(); if (t) lines.push({ y: ly, text: t }); cur = ''; }
    function moveTo(ny) { if (ly !== null && Math.abs(ny - ly) > 2) flush(); y = ny; ly = ny; }
    function put(raw) { cur += pdfShow(raw, font, st); }
    var it = pdfTokens(content);
    for (var r = it.next(); !r.done; r = it.next()) {
      var tk = r.value;
      if (tk.t === '[') { inArr = []; continue; }
      if (tk.t === ']') { if (inArr) { stackv.push({ t: 'arr', v: inArr }); inArr = null; } continue; }
      if (tk.t !== 'op') { if (inArr) inArr.push(tk); else { stackv.push(tk); if (stackv.length > 12) stackv.shift(); } continue; }
      var op = tk.v, a = stackv;
      if (op === 'BI') { /* 인라인 그림: EI 까지 건너뛴다 */ for (var r2 = it.next(); !r2.done; r2 = it.next()) { if (r2.value.t === 'op' && r2.value.v === 'EI') break; } stackv = []; continue; }
      if (op === 'Tf') { var fnm = a.filter(function (x) { return x.t === 'name'; }).pop(); font = fnm ? fonts[fnm.v] || null : null; }
      else if (op === 'Td' || op === 'TD') { var tx = a[a.length - 2], ty = a[a.length - 1]; if (tx && ty && tx.t === 'n' && ty.t === 'n') { if (Math.abs(ty.v) > 0.01) { moveTo((ly === null ? 0 : y) + ty.v); } else if (cur && tx.v > 0 && !/\s$/.test(cur)) cur += ' '; } }
      else if (op === 'Tm') { var f = a[a.length - 1]; if (f && f.t === 'n') moveTo(f.v); }
      else if (op === 'T*') { flush(); ly = (ly === null ? 0 : ly) - 12; y = ly; }
      else if (op === 'Tj' || op === "'" || op === '"') { var sv = a[a.length - 1]; if (op !== 'Tj') { flush(); ly = (ly === null ? 0 : ly) - 12; y = ly; } if (sv && sv.t === 's') put(sv.v); }
      else if (op === 'TJ') { var ar = a[a.length - 1]; if (ar && ar.t === 'arr') ar.v.forEach(function (x) { if (x.t === 's') put(x.v); else if (x.t === 'n' && x.v < -180 && cur && !/\s$/.test(cur)) cur += ' '; }); }
      else if (op === 'ET') { if (cur && !/\s$/.test(cur)) cur += ' '; }
      stackv = [];
    }
    flush(); return lines;
  }
  function paraFromLines(pages) { // 줄 → 문단. 같은 쪽에서 줄 사이가 평소의 1.45배보다 넓거나 위로 되돌아가면 새 문단
    var out = [];
    pages.forEach(function (lines) {
      var gaps = []; for (var i = 1; i < lines.length; i++) { var g = lines[i - 1].y - lines[i].y; if (g > 0.5) gaps.push(g); }
      gaps.sort(function (a, b) { return a - b; }); var typ = gaps.length ? gaps[Math.floor(gaps.length / 4)] : 0 /* 아래쪽 4분위: 보통 줄 간격 */, cur = '';
      lines.forEach(function (ln, i) {
        var g = i ? lines[i - 1].y - ln.y : 0, brk = i && (g < -0.5 || (typ && g > typ * 1.45));
        if (brk && cur) { out.push(cur); cur = ''; }
        cur = cur ? (/[-‐]$/.test(cur) && /^[a-z]/.test(ln.text) ? cur.slice(0, -1) + ln.text : cur + ' ' + ln.text) : ln.text;
      });
      if (cur) out.push(cur);
    });
    return out.map(function (p) { return p.replace(/\s+/g, ' ').trim(); }).filter(function (p) { return /[A-Za-z가-힣\d]/.test(p); });
  }
  async function loadPdf(buf, name) {
    var s = l1(buf);
    if (s.slice(0, 1024).indexOf('%PDF') < 0) throw fail('badpdf');
    if (/\/Encrypt\s*(<<|\d+\s+\d+\s+R)/.test(s)) throw fail('encrypted');
    var objs = {}, re = /(\d+)\s+(\d+)\s+obj\b/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endobj', st); if (en < 0) en = s.length;
      var body = s.slice(st, en), si = body.indexOf('stream'), o = { dict: body, data: null };
      if (si >= 0 && /^\s*<</.test(body)) { o.dict = body.slice(0, si); var ds = si + 6; if (body[ds] === '\r') ds++; if (body[ds] === '\n') ds++; var de = body.lastIndexOf('endstream'), L = dictVal(o.dict, 'Length'); /* 길이가 직접 적혀 있으면 그만큼만, 아니면 끝의 줄바꿈을 뺀다(풀 때 여분 바이트가 있으면 오류가 난다) */ if (/^\d+$/.test(L) && ds + Number(L) <= (de > 0 ? de : body.length)) de = ds + Number(L); else { de = de > ds ? de : body.length; if (body[de - 1] === '\n') de--; if (body[de - 1] === '\r') de--; } o.data = buf.subarray(st + ds, st + de); }
      objs[m[1]] = o; re.lastIndex = en;
    }
    var keys = Object.keys(objs);
    for (var k = 0; k < keys.length; k++) { // 객체 묶음(ObjStm): 요즘 PDF 는 사전 대부분이 여기 들어 있다
      var ob = objs[keys[k]]; if (!/\/Type\s*\/ObjStm/.test(ob.dict)) continue;
      var txt = await pdfStream(ob), n = Number(dictVal(ob.dict, 'N')), first = Number(dictVal(ob.dict, 'First')), nums = txt.slice(0, first).trim().split(/\s+/).map(Number);
      for (var q = 0; q < n && q * 2 + 1 < nums.length; q++) { var from = first + nums[q * 2 + 1], to = q + 1 < n ? first + nums[q * 2 + 3] : txt.length; if (!objs[nums[q * 2]]) objs[nums[q * 2]] = { dict: txt.slice(from, to), data: null }; }
    }
    keys = Object.keys(objs); // 묶음 안에서 나온 객체까지 포함해 다시 센다
    var res = function (v) { var n = refNum(v); return n && objs[n] ? objs[n].dict : String(v); };
    var cat = keys.filter(function (x) { return /\/Type\s*\/Catalog/.test(objs[x].dict); })[0], pages = [];
    (function walk(num, inh, depth) {
      var o = objs[num]; if (!o || depth > 30) return;
      var d = o.dict, r = dictVal(d, 'Resources') || inh;
      if (/\/Type\s*\/Pages\b/.test(d) || /\/Kids/.test(d)) { var kids = dictVal(d, 'Kids'), rr = /(\d+)\s+\d+\s+R/g, x; while ((x = rr.exec(kids))) walk(Number(x[1]), r, depth + 1); }
      else if (/\/Type\s*\/Page\b/.test(d)) pages.push({ d: d, res: r });
    })(cat ? refNum(dictVal(objs[cat].dict, 'Pages')) : 0, '', 0);
    if (!pages.length) keys.sort(function (a, b) { return a - b; }).forEach(function (x) { if (/\/Type\s*\/Page\b/.test(objs[x].dict)) pages.push({ d: objs[x].dict, res: dictVal(objs[x].dict, 'Resources') }); });
    var fontCache = {}, state = { lost: false }, all = [];
    for (var pi = 0; pi < pages.length; pi++) {
      var pg = pages[pi], rd = res(pg.res), fd = res(dictVal(rd, 'Font')), fonts = {}, fr = /\/([^\s\/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g, fm;
      while ((fm = fr.exec(fd))) {
        var fn = fm[2];
        if (!fontCache[fn]) {
          var fo = objs[fn] ? objs[fn].dict : '', tu = refNum(dictVal(fo, 'ToUnicode')), cm = tu && objs[tu] ? await pdfStream(objs[tu]) : '';
          fontCache[fn] = { cmap: cm ? parseCMap(cm) : null, type0: /\/Subtype\s*\/Type0/.test(fo) };
        }
        fonts[fm[1]] = fontCache[fn];
      }
      var cv = dictVal(pg.d, 'Contents'), refs = cv[0] === '[' ? (cv.match(/(\d+)\s+\d+\s+R/g) || []) : [cv], content = '';
      for (var ci = 0; ci < refs.length; ci++) content += (await pdfStream(objs[refNum(refs[ci])])) + '\n';
      all.push(pdfPage(content, fonts, state));
    }
    var paras = paraFromLines(all);
    if (!paras.length) throw fail('notext');
    return {
      type: 'pdf', name: name, texts: paras, partial: state.lost,
      build: async function (map, to) { return buildDocx(paras.map(function (p) { var t = map.get(p); return t != null && String(t).trim() ? String(t) : p; }), to); }
    };
  }
  /* 새 Word 파일(.docx): 문단만 있는 가장 단순한 모양 */
  async function buildDocx(paras, to) {
    var font = to === 'ko' ? 'Malgun Gothic' : 'Calibri', ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      rpr = '<w:rPr><w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '" w:eastAsia="' + font + '" w:cs="' + font + '"/><w:sz w:val="22"/></w:rPr>',
      body = paras.map(function (p) { return '<w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r>' + rpr + '<w:t xml:space="preserve">' + esc(cleanTr(p, ' ')) + '</w:t></w:r></w:p>'; }).join(''),
      doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    return zipFromMap([['[Content_Types].xml', ct], ['_rels/.rels', rels], ['word/document.xml', doc]]);
  }

  /* ───────── 불러오기 · 방향 · 조각 나누기 ───────── */
  async function load(bytes, name) {
    var k = classify(name).kind;
    if (k === 'pdf') return loadPdf(bytes, name);
    if (k === 'docx' || k === 'pptx' || k === 'xlsx') return loadOffice(bytes, name, k);
    throw fail('unsupported');
  }
  var HANGUL = /[가-힣ㄱ-ㆎ]/g, LATIN = /[A-Za-z]/g;
  /** 문서 글의 언어: 한글이 영문 글자 수 이상이면 'ko', 아니면 'en', 글이 없으면 '' (서버 detectTarget 과 같은 기준) */
  function detectSource(texts) { var t = texts.join(' '), h = (t.match(HANGUL) || []).length, l = (t.match(LATIN) || []).length; return h + l === 0 ? '' : h >= l ? 'ko' : 'en'; }
  /** 이미 목표 언어뿐인 조각(숫자·이름·영어만 있는 칸 등)은 보내지 않는다 */
  function needs(t, to) { return to === 'en' ? /[가-힣ㄱ-ㆎ]/.test(t) : /[A-Za-z]/.test(t); }
  function splitLong(t) { // 너무 긴 조각은 문장 끝에서 나눈다(번역 뒤에 공백으로 이어 붙인다)
    if (t.length <= MAX_PIECE) return [t];
    var sent = t.match(/[^.!?。…\n]+[.!?。…]*["')\]」』]*\s*|\n+/g) || [t], out = [], cur = '';
    sent.forEach(function (s) { while (s.length > MAX_PIECE) { if (cur) { out.push(cur); cur = ''; } out.push(s.slice(0, MAX_PIECE)); s = s.slice(MAX_PIECE); } if (cur.length + s.length > MAX_PIECE) { out.push(cur); cur = ''; } cur += s; });
    if (cur) out.push(cur); return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /** texts(문서 순서, 겹침 있음) → { pieces: 보낼 글 목록(겹침 없음), owners: 원문→조각 번호들, chunks: [[조각 번호…]], chars } */
  function plan(texts, to) {
    var seen = {}, pieces = [], owners = new Map(), chars = 0, chunks = [], cur = [], cc = 0;
    texts.forEach(function (t) {
      if (owners.has(t) || !needs(t, to)) return;
      owners.set(t, splitLong(t).map(function (p) { if (seen[p] == null) { seen[p] = pieces.length; pieces.push(p); chars += p.length; } return seen[p]; }));
    });
    pieces.forEach(function (p, i) { if (cur.length && (cur.length >= MAX_UNITS || cc + p.length > CHUNK_CHARS)) { chunks.push(cur); cur = []; cc = 0; } cur.push(i); cc += p.length; });
    if (cur.length) chunks.push(cur);
    return { pieces: pieces, owners: owners, chunks: chunks, chars: chars };
  }
  /** outs: 조각 번호 → 번역(없으면 undefined). 조각이 모두 번역된 원문만 Map 에 넣는다 */
  function merge(pl, outs) {
    var map = new Map();
    pl.owners.forEach(function (idx, src) { var o = idx.map(function (i) { return outs[i]; }); if (o.every(function (x) { return typeof x === 'string' && x.trim(); })) map.set(src, o.map(function (x) { return x.trim(); }).join(' ')); });
    return map;
  }
  /** 결과 파일 이름: 원본이름_en.docx (PDF 는 .docx 로 나온다) */
  function outName(name, to, type) { return String(name || 'document').replace(/\.[^.\/\\]+$/, '') + '_' + to + '.' + (type === 'pdf' ? 'docx' : type); }

  var api = { MAX_FILE: MAX_FILE, MAX_CHARS: MAX_CHARS, MAX_UNITS: MAX_UNITS, CHUNK_CHARS: CHUNK_CHARS, classify: classify, financeReason: financeReason, FINANCE: { name: FIN_NAME_SRC, words: FIN_WORDS_SRC, amount: AMOUNT_SRC }, load: load, detectSource: detectSource, needs: needs, plan: plan, merge: merge, outName: outName, readZip: readZip, entryBytes: entryBytes, writeZip: writeZip, crc32: crc32, buildDocx: buildDocx };
  root.CTDocTranslate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
