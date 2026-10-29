/* 파일 → AI 에 보낼 수 있는 모양으로 준비한다 (브라우저 안에서만 읽는다 — 파일 전체를 서버에 한 번 더 올리지 않는다).
   글 파일(txt·md·csv) · Word(docx) · PowerPoint(pptx) · Excel(xlsx): 글만 꺼내서 앞부분만 보낸다.
   PDF: 8MB 이하면 그대로(AI 가 직접 읽음), 사진: 크기를 줄여서. 그 밖의 파일(영상·압축 등)은 이름만 쓴다.
   결과: { kind:'text'|'pdf'|'image'|'none', text?, data?(base64), mime? } */
(function (root) {
  var TEXT_CHARS = 6000, MAX_PDF = 8 * 1024 * 1024, MAX_OFFICE = 60 * 1024 * 1024, MAX_ENTRY = 8 * 1024 * 1024;
  var ext = function (name) { var m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };
  var decode = function (bytes) { return new TextDecoder('utf-8').decode(bytes); };

  /* 아주 작은 zip 읽기 (docx·pptx·xlsx 는 zip 파일이다): 마지막의 목록(central directory)에서 이름·위치를 찾고, 필요한 칸만 풀어서 읽는다 */
  async function openZip(blob) {
    var buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), i = buf.length - 22;
    while (i >= 0 && !(buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 5 && buf[i + 3] === 6)) i--;
    if (i < 0) throw new Error('not a zip');
    var count = dv.getUint16(i + 10, true), p = dv.getUint32(i + 16, true), entries = [];
    for (var k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      entries.push({ name: decode(buf.subarray(p + 46, p + 46 + nlen)), method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true), usize: dv.getUint32(p + 24, true), lho: dv.getUint32(p + 42, true) });
      p += 46 + nlen + elen + clen;
    }
    return { buf: buf, dv: dv, entries: entries };
  }
  async function zipText(z, e) {
    if (!e || e.usize > MAX_ENTRY) return '';
    var lp = e.lho, start = lp + 30 + z.dv.getUint16(lp + 26, true) + z.dv.getUint16(lp + 28, true), raw = z.buf.subarray(start, start + e.csize);
    if (e.method === 0) return decode(raw);
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') return '';
    var out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return decode(new Uint8Array(out));
  }
  function unent(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); }).replace(/&amp;/g, '&'); }
  function tagsText(xml, re, sep) { var out = [], m; while ((m = re.exec(xml))) out.push(unent(m[1])); return out.join(sep); }
  var clean = function (s) { return String(s).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, TEXT_CHARS); };

  async function officeText(file) {
    var z = await openZip(file), by = function (n) { return z.entries.filter(function (e) { return e.name === n; })[0]; }, e = ext(file.name), text = '';
    if (e === 'docx') { var x = await zipText(z, by('word/document.xml')); text = unent(x.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')); }
    else if (e === 'pptx') {
      var slides = z.entries.filter(function (s) { return /^ppt\/slides\/slide\d+\.xml$/.test(s.name); }).sort(function (a, b) { return Number(a.name.match(/(\d+)\.xml/)[1]) - Number(b.name.match(/(\d+)\.xml/)[1]); });
      for (var i = 0; i < slides.length && text.length < TEXT_CHARS; i++) text += tagsText(await zipText(z, slides[i]), /<a:t[^>]*>([^<]*)<\/a:t>/g, ' ') + '\n';
    } else if (e === 'xlsx') {
      var names = tagsText(await zipText(z, by('xl/workbook.xml')), /<sheet [^>]*name="([^"]*)"/g, ', ');
      text = (names ? 'Sheets: ' + names + '\n' : '') + tagsText(await zipText(z, by('xl/sharedStrings.xml')), /<t[^>]*>([^<]*)<\/t>/g, ' | ');
    }
    return clean(text);
  }
  function toBase64(bytes) { var s = '', n = 0x8000; for (var i = 0; i < bytes.length; i += n) s += String.fromCharCode.apply(null, bytes.subarray(i, i + n)); return btoa(s); }
  async function imageData(file) { // 긴 변 1568px · JPEG 로 줄여서 보낸다(AI 가 읽기에 충분하고 전송량이 작다)
    var bmp = await createImageBitmap(file), r = Math.min(1, 1568 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * r)); c.height = Math.max(1, Math.round(bmp.height * r)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    var blob = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.8); }); return toBase64(new Uint8Array(await blob.arrayBuffer()));
  }

  async function prepare(file) {
    var e = ext(file.name), none = { kind: 'none' };
    try {
      if (['txt', 'md', 'csv', 'tsv', 'json', 'log'].indexOf(e) >= 0) return { kind: 'text', text: clean(await file.slice(0, 40000).text()) };
      if (['docx', 'pptx', 'xlsx'].indexOf(e) >= 0 && file.size <= MAX_OFFICE) { var t = await officeText(file); return t ? { kind: 'text', text: t } : none; }
      if (e === 'pdf' && file.size <= MAX_PDF) return { kind: 'pdf', mime: 'application/pdf', data: toBase64(new Uint8Array(await file.arrayBuffer())) };
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].indexOf(e) >= 0 && file.size <= 40 * 1024 * 1024) return { kind: 'image', mime: 'image/jpeg', data: await imageData(file) };
    } catch (err) { /* 읽지 못하면 이름만 쓴다 */ }
    return none;
  }
  root.CTDocText = { prepare: prepare, openZip: openZip, zipText: zipText, officeText: officeText, ext: ext };
})(typeof window !== 'undefined' ? window : globalThis);
