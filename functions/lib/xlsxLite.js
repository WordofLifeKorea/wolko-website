/**
 * 아주 작은 .xlsx 만들기 — 서식(글꼴·색·테두리·맞춤·숫자 모양), 열 너비, 병합, 머리글 고정, 필터, 여러 시트를 지원한다.
 * 외부 라이브러리 없이 XML 을 직접 쓰고, 압축 없는(stored) zip 으로 묶는다. 글자는 모두 "문자열 셀"이라 수식으로 읽히지 않는다.
 *
 *   buildXlsx({ sheets: [{ name, cols: [너비…], rows: [[셀…]…], merges: ['A1:E1'], freezeRow: 4, filter: 'A4:K20',
 *                          rowHeights: { 1: 32 }, landscape: true }] })  →  Uint8Array
 *   셀 = 값(문자열·숫자) 또는 { v: 값, s: { bold, size, color, fill, h: 'left|center|right', v: 'top|center', wrap, border, num } }
 */
const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 압축 없는 zip */
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  const date = new Date();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  for (const [name, content] of files) {
    const nameBytes = enc.encode(name), data = typeof content === 'string' ? enc.encode(content) : content, crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true); local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, nameBytes.length, true); local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
    cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, nameBytes.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of all) { out.set(c, at); at += c.length; }
  return out;
}

const esc = text => String(text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** A, B, … Z, AA … */
export function columnName(index) {
  let n = index + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - m) / 26); }
  return s;
}

/** 서식 모음 — 같은 서식은 한 번만 만든다 */
function styleBook() {
  const fonts = ['<font><sz val="11"/><name val="Malgun Gothic"/></font>'];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const numFmts = [];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const seen = new Map();
  const index = (list, xml) => { let i = list.indexOf(xml); if (i < 0) { list.push(xml); i = list.length - 1; } return i; };
  const rgb = c => 'FF' + String(c).replace('#', '').toUpperCase();
  function get(style) {
    if (!style) return 0;
    const key = JSON.stringify(style);
    if (seen.has(key)) return seen.get(key);
    const font = `<font>${style.bold ? '<b/>' : ''}${style.italic ? '<i/>' : ''}<sz val="${style.size || 11}"/>${style.color ? `<color rgb="${rgb(style.color)}"/>` : ''}<name val="Malgun Gothic"/></font>`;
    const fill = style.fill ? `<fill><patternFill patternType="solid"><fgColor rgb="${rgb(style.fill)}"/><bgColor indexed="64"/></patternFill></fill>` : null;
    const edge = (tag, color) => `<${tag} style="thin"><color rgb="${rgb(color)}"/></${tag}>`;
    const border = style.border ? `<border>${edge('left', style.border)}${edge('right', style.border)}${edge('top', style.border)}${edge('bottom', style.border)}<diagonal/></border>` : null;
    let numId = 0;
    if (style.num) { let i = numFmts.indexOf(style.num); if (i < 0) { numFmts.push(style.num); i = numFmts.length - 1; } numId = 164 + i; }
    const align = `<alignment${style.h ? ` horizontal="${style.h}"` : ''} vertical="${style.v || 'center'}"${style.wrap ? ' wrapText="1"' : ''}/>`;
    const xf = `<xf numFmtId="${numId}" fontId="${index(fonts, font)}" fillId="${fill ? index(fills, fill) : 0}" borderId="${border ? index(borders, border) : 0}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numId ? ' applyNumberFormat="1"' : ''}>${align}</xf>`;
    xfs.push(xf);
    seen.set(key, xfs.length - 1);
    return xfs.length - 1;
  }
  const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + (numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>` : '')
    + `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`
    + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return { get, xml };
}

export function buildXlsx({ sheets, title = '', creator = 'WOLKO' }) {
  const book = styleBook();
  const sheetXml = sheet => {
    const rowsXml = sheet.rows.map((row, r) => {
      const height = sheet.rowHeights?.[r + 1];
      const cells = row.map((cell, c) => {
        if (cell === null || cell === undefined || cell === '') return '';
        const obj = typeof cell === 'object' ? cell : { v: cell };
        const ref = `${columnName(c)}${r + 1}`, s = book.get(obj.s);
        const sAttr = s ? ` s="${s}"` : '';
        if (obj.v === null || obj.v === undefined || obj.v === '') return `<c r="${ref}"${sAttr}/>`;
        if (typeof obj.v === 'number' && Number.isFinite(obj.v)) return `<c r="${ref}"${sAttr}><v>${obj.v}</v></c>`;
        return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(obj.v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cells}</row>`;
    }).join('');
    const cols = sheet.cols?.length ? `<cols>${sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const pane = sheet.freezeRow ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
      + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="20"/>${cols}<sheetData>${rowsXml}</sheetData>`
      + (sheet.filter ? `<autoFilter ref="${sheet.filter}"/>` : '')
      + (sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '')
      + `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>`
      + `<pageSetup paperSize="9" orientation="${sheet.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  };
  const sheetFiles = sheets.map(sheetXml);   // styles 가 채워진 뒤에 styles.xml 을 만든다
  const names = sheets.map(s => esc(String(s.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>${esc(creator)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', book.xml()],
    ...sheetFiles.map((xml, i) => [`xl/worksheets/sheet${i + 1}.xml`, xml]),
  ];
  return zip(files);
}
