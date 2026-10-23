/**
 * xlsx-lite: 외부 라이브러리 없이 .xlsx 를 읽고 쓰는 작은 도구 (브라우저의 DecompressionStream 사용).
 *  읽기: await XlsxLite.read(arrayBuffer) → { sheets: [{ name, rows: [[셀, ...], ...] }] }
 *        rows[r][c] 는 숫자 | 문자열 | null. rows 의 인덱스 + 1 이 엑셀의 줄 번호와 같다.
 *  쓰기: XlsxLite.write({ sheets: [{ name, rows, cols?: [너비...], hiddenCols?: [열 번호(0부터)...] }] }) → Uint8Array
 *        셀 값: 문자열 | 숫자 | null | { f: '수식' } | { d: 'YYYY-MM-DD' } | { n: 숫자 } (천 단위 쉼표) | { b: '굵은 글씨' }
 * 수식의 계산 결과는 파일에 넣지 않는다 — 엑셀이 열 때 다시 계산한다.
 */
(function (root) {
  'use strict';
  var te = new TextEncoder(), td = new TextDecoder('utf-8');

  // ── 압축 풀기 / 묶기 ──
  async function inflateRaw(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function readZip(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('엑셀(.xlsx) 파일이 아니에요.');
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), files = {};
    for (var k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('파일 구조를 읽을 수 없어요.');
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      var name = td.decode(u8.subarray(p + 46, p + 46 + nl)); files[name] = { method: method, csize: csize, off: off };
      p += 46 + nl + el + cl;
    }
    return {
      has: function (name) { return !!files[name]; }, names: function () { return Object.keys(files); },
      text: async function (name) {
        var f = files[name]; if (!f) return null;
        var lnl = dv.getUint16(f.off + 26, true), lel = dv.getUint16(f.off + 28, true), start = f.off + 30 + lnl + lel, data = u8.subarray(start, start + f.csize);
        if (f.method === 0) return td.decode(data);
        if (f.method === 8) return td.decode(await inflateRaw(data));
        throw new Error('지원하지 않는 압축 방식이에요.');
      }
    };
  }
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function writeZip(entries) { // entries: [{ name, data(Uint8Array) }] — 압축 없이 담는다(파일이 작아서 충분)
    var parts = [], central = [], offset = 0;
    entries.forEach(function (e) {
      var name = te.encode(e.name), crc = crc32(e.data), lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint32(14, crc, true); lh.setUint32(18, e.data.length, true); lh.setUint32(22, e.data.length, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, e.data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true); ch.setUint32(20, e.data.length, true); ch.setUint32(24, e.data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + e.data.length;
    });
    var csize = central.reduce(function (n, p) { return n + p.length; }, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]), total = all.reduce(function (n, p) { return n + p.length; }, 0), out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; }); return out;
  }

  // ── XML 도우미 ──
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function unesc(s) { return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, function (m, e) { if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)); return ENT[e]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function colIndex(ref) { var m = /^([A-Z]+)/.exec(ref), n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }
  function colName(i) { var s = ''; i++; while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
  function textOf(xml) { var out = '', re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, m; while ((m = re.exec(xml))) out += unesc(m[1]); return out; }

  // ── 읽기 ──
  async function read(buf) {
    var zip = readZip(buf), wb = await zip.text('xl/workbook.xml'); if (!wb) throw new Error('엑셀(.xlsx) 파일이 아니에요.');
    var rels = (await zip.text('xl/_rels/workbook.xml.rels')) || '', relMap = {}, m, re = /<Relationship\b[^>]*>/g;
    while ((m = re.exec(rels))) { var id = /\bId="([^"]*)"/.exec(m[0]), tg = /\bTarget="([^"]*)"/.exec(m[0]); if (id && tg) relMap[id[1]] = tg[1].replace(/^\/?(xl\/)?/, 'xl/'); }
    var shared = [], ss = await zip.text('xl/sharedStrings.xml');
    if (ss) { var sre = /<si\b[^>]*>([\s\S]*?)<\/si>/g; while ((m = sre.exec(ss))) shared.push(textOf(m[1])); }
    var sheets = [], sh = /<sheet\b[^>]*>/g;
    while ((m = sh.exec(wb))) {
      var nm = /\bname="([^"]*)"/.exec(m[0]), rid = /\br:id="([^"]*)"/.exec(m[0]), state = /\bstate="([^"]*)"/.exec(m[0]);
      if (!nm || !rid || !relMap[rid[1]]) continue;
      var xml = await zip.text(relMap[rid[1]]); if (!xml) continue;
      sheets.push({ name: unesc(nm[1]), hidden: !!state && state[1] !== 'visible', rows: parseSheet(xml, shared) });
    }
    return { sheets: sheets };
  }
  function parseSheet(xml, shared) {
    var rows = [], rre = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, m;
    while ((m = rre.exec(xml))) {
      var rn = /\br="(\d+)"/.exec(m[1]), r = rn ? +rn[1] - 1 : rows.length, cells = [];
      if (m[2]) {
        var cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c;
        while ((c = cre.exec(m[2]))) {
          var ref = /\br="([A-Z]+\d+)"/.exec(c[1]); if (!ref) continue;
          var t = /\bt="([^"]*)"/.exec(c[1]), v = c[2] ? /<v>([\s\S]*?)<\/v>/.exec(c[2]) : null, val = null;
          if (t && t[1] === 'inlineStr') val = textOf(c[2] || '');
          else if (v) { var raw = unesc(v[1]); if (t && t[1] === 's') val = shared[+raw] != null ? shared[+raw] : ''; else if (t && (t[1] === 'str')) val = raw; else if (t && t[1] === 'b') val = raw === '1' ? 1 : 0; else if (t && t[1] === 'e') val = null; else { var n = Number(raw); val = raw === '' || Number.isNaN(n) ? raw : n; } }
          cells[colIndex(ref[1])] = val;
        }
      }
      rows[r] = cells;
    }
    for (var i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return rows;
  }

  // ── 쓰기 ──
  var STYLE = { date: 1, num: 2, bold: 3 };
  function serial(ymd) { var a = ymd.split('-').map(Number); return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(1899, 11, 30)) / 86400000); }
  function sheetXml(sh) {
    var rows = sh.rows || [], out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    if (sh.cols || sh.hiddenCols) { out += '<cols>'; var hid = {}; (sh.hiddenCols || []).forEach(function (i) { hid[i] = 1; }); var max = Math.max((sh.cols || []).length, ((sh.hiddenCols || []).length ? Math.max.apply(null, sh.hiddenCols) + 1 : 0));
      for (var i = 0; i < max; i++) out += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + ((sh.cols && sh.cols[i]) || 12) + '" customWidth="1"' + (hid[i] ? ' hidden="1"' : '') + '/>'; out += '</cols>'; }
    out += '<sheetData>';
    rows.forEach(function (row, r) {
      if (!row || !row.length) return; out += '<row r="' + (r + 1) + '">';
      row.forEach(function (v, c) {
        if (v == null || v === '') return; var ref = colName(c) + (r + 1);
        if (typeof v === 'number') out += '<c r="' + ref + '"><v>' + v + '</v></c>';
        else if (typeof v === 'string') out += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
        else if (v.f != null) out += '<c r="' + ref + '"' + (v.s ? ' s="' + STYLE[v.s] + '"' : '') + '><f>' + esc(v.f) + '</f></c>';
        else if (v.d) out += '<c r="' + ref + '" s="' + STYLE.date + '"><v>' + serial(v.d) + '</v></c>';
        else if (v.n != null) out += '<c r="' + ref + '" s="' + STYLE.num + '"><v>' + v.n + '</v></c>';
        else if (v.b != null) out += '<c r="' + ref + '" s="' + STYLE.bold + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v.b) + '</t></is></c>';
      });
      out += '</row>';
    });
    return out + '</sheetData></worksheet>';
  }
  function write(book) {
    var sheets = book.sheets, ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><calcPr fullCalcOnLoad="1"/></workbook>';
    var wr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>';
    var entries = [['[Content_Types].xml', ct], ['_rels/.rels', rootRels], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wr], ['xl/styles.xml', styles]].map(function (e) { return { name: e[0], data: te.encode(e[1]) }; });
    sheets.forEach(function (s, i) { entries.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: te.encode(sheetXml(s)) }); });
    return writeZip(entries);
  }

  var api = { read: read, write: write, serial: serial, colName: colName };
  root.XlsxLite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
