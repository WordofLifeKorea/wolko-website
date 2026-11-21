/**
 * 교재 PDF 워터마크 — 내려받은 사람(교회) 이름 · 날짜 · 확인번호를 쪽마다 아래쪽에 작게 찍는다.
 *
 * 글자는 G마켓산스(사이트 글꼴, 한글 11,172자 모두 있음)의 **윤곽선을 그림으로** 그린다. 글꼴 파일을 PDF 안에 넣지 않으므로
 *  - 이 글꼴이 CFF 형식이라 PDF 글꼴로 넣으면 일부 뷰어에서 깨지는 문제가 없고,
 *  - 어떤 PDF 뷰어에서도 똑같이 보이며,
 *  - 글꼴 파일을 다시 나눠 주지 않는다(브라우저처럼 공개 CDN 에서 읽어 와 메모리에서만 쓴다).
 * 글꼴을 못 읽으면 영문(Helvetica)으로 이름을 빼고 확인번호만 찍는다 — 번호로 기록에서 누가 받았는지 찾을 수 있다.
 *
 * 쪽마다 같은 그림이라 한 번만 만들어 모든 쪽에서 다시 쓴다(쪽마다 그리면 용량과 시간이 쪽 수만큼 늘어난다).
 * 너무 큰 PDF · 암호가 걸린 PDF · 처리 중 오류가 나면 원본을 그대로 주고 그 사실(status)을 기록에 남긴다.
 */
import opentype from 'opentype.js';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export const STAMP_FONT_URL = 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff';
export const MAX_STAMP_BYTES = 12 * 1024 * 1024;   // 이보다 큰 PDF 는 원본 그대로(Workers 처리 시간 보호)
export const MAX_STAMP_PAGES = 400;
const STAMP_SIZE = 7.5;                              // pt
const STAMP_BOTTOM = 14;                             // 쪽 아래 끝에서 글줄까지 pt
const FONT_RETRY_MS = 60_000;                        // 글꼴 읽기에 실패하면 이 시간 동안은 다시 시도하지 않는다

let fontState = null;                                // { font } | { failedAt }
let fontLoading = null;

/** 같은 isolate 안에서는 한 번만 읽는다. 실패하면 null(영문으로 대신 찍는다). */
export async function loadStampFont({ fetchImpl = fetch, url = STAMP_FONT_URL, force = false } = {}) {
  if (!force && fontState?.font) return fontState.font;
  if (!force && fontState?.failedAt && Date.now() - fontState.failedAt < FONT_RETRY_MS) return null;
  if (fontLoading) return fontLoading;
  fontLoading = (async () => {
    try {
      const res = await fetchImpl(url, { cf: { cacheTtl: 60 * 60 * 24 * 30, cacheEverything: true }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('font ' + res.status);
      const buf = await res.arrayBuffer();
      const font = opentype.parse(buf);
      fontState = { font };
      return font;
    } catch {
      fontState = { failedAt: Date.now() };
      return null;
    } finally { fontLoading = null; }
  })();
  return fontLoading;
}
export function resetStampFontCache() { fontState = null; fontLoading = null; }

/**
 * 글꼴에 없는 글자는 건너뛴다. 공백은 이 글꼴에 글자가 없어 직접 간격을 준다.
 * 실제로 그려지는 글자의 위(ascent) · 아래(descent) 높이도 재서 돌려준다 — 그림 상자를 이 높이에 맞춰야 글자 윗부분이 잘리지 않는다.
 * (윤곽선 좌표는 SVG 처럼 y 가 아래쪽으로 커진다: 글줄 기준선이 0, 위쪽 글자는 음수)
 */
export function layoutLine(font, text, size) {
  const space = size * 0.3;
  let x = 0, top = 0, bottom = 0;
  const parts = [];
  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) { x += space; continue; }
    const g = font.charToGlyph(ch);
    if (!g || g.index === 0) continue;
    const path = g.getPath(x, 0, size);
    const bb = path.getBoundingBox?.();
    if (bb && Number.isFinite(bb.y1) && Number.isFinite(bb.y2)) { top = Math.max(top, -bb.y1); bottom = Math.max(bottom, bb.y2); }
    parts.push(path.toPathData(2));
    x += (g.advanceWidth * size) / font.unitsPerEm;
  }
  // 윤곽을 못 쟀거나 글자가 하나도 없으면 글자 크기에 맞춘 넉넉한 값으로
  if (!top && !bottom) { top = size * 1.0; bottom = size * 0.3; }
  return { d: parts.join(''), width: x, top, bottom };
}

/** 쪽을 눈으로 볼 때의 가로 폭(쪽이 90 · 270도 돌아가 있으면 가로 · 세로가 바뀐다) */
function visibleWidth(page) {
  const box = page.getCropBox ? page.getCropBox() : page.getMediaBox();
  const rot = (((page.getRotation().angle % 360) + 360) % 360);
  return rot === 90 || rot === 270 ? box.height : box.width;
}

const asciiOnly = (s) => String(s || '').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim();

/** 찍을 글줄. 이름이 길면 글자 크기를 줄여 쪽 폭 안에 넣는다. */
export function stampLineOf({ label, code, date }) {
  return ['WOLKO', String(label || '').trim(), date, code].filter(Boolean).join(' · ');
}

/**
 * bytes(PDF) → { bytes, status, pages }
 *  status: 'applied' | 'applied-ascii'(글꼴 없이 번호만) | 'skipped-size' | 'skipped-encrypted' | 'failed'
 */
export async function stampPdf(bytes, { label, code, date, font = null, maxBytes = MAX_STAMP_BYTES, maxPages = MAX_STAMP_PAGES } = {}) {
  if (!bytes || bytes.byteLength > maxBytes) return { bytes, status: 'skipped-size', pages: 0 };
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    return { bytes, status: /encrypt/i.test(String(e?.message)) ? 'skipped-encrypted' : 'failed', pages: 0 };
  }
  try {
    const pages = doc.getPages();
    if (!pages.length || pages.length > maxPages) return { bytes, status: 'skipped-size', pages: pages.length };

    // 쪽 하나짜리 작은 PDF 에 글줄을 그려 두고, 모든 쪽에 그 그림을 올린다
    const stampDoc = await PDFDocument.create();
    let line = stampLineOf({ label, code, date });
    let status = 'applied';
    let sw, sh, draw;
    if (font) {
      let size = STAMP_SIZE;
      let laid = layoutLine(font, line, size);
      const widest = Math.min(...pages.map(visibleWidth)) * 0.9;
      if (laid.width > widest) { size = Math.max(4.5, (size * widest) / laid.width); laid = layoutLine(font, line, size); }
      const pad = size * 0.25;
      sw = laid.width + 4; sh = laid.top + laid.bottom + pad * 2;
      const sp = stampDoc.addPage([sw, sh]);
      // 기준선을 (아래 여백 + 글자가 기준선 아래로 내려가는 높이) 위에 둔다 → 글자 위 · 아래가 상자 안에 모두 들어간다
      sp.drawSvgPath(laid.d, { x: 2, y: pad + laid.bottom, color: rgb(0.34, 0.34, 0.34), opacity: 0.9, borderWidth: 0 });
      draw = sp;
    } else {
      status = 'applied-ascii';
      line = stampLineOf({ label: asciiOnly(label), code, date });
      const helv = await stampDoc.embedFont(StandardFonts.Helvetica);
      let size = STAMP_SIZE;
      let w = helv.widthOfTextAtSize(line, size);
      const widest = Math.min(...pages.map(visibleWidth)) * 0.9;
      if (w > widest) { size = Math.max(4.5, (size * widest) / w); w = helv.widthOfTextAtSize(line, size); }
      sw = w + 4; sh = size * 1.7;
      const sp = stampDoc.addPage([sw, sh]);
      sp.drawText(line, { x: 2, y: size * 0.45, size, font: helv, color: rgb(0.34, 0.34, 0.34), opacity: 0.9 });
      draw = sp;
    }
    const [embedded] = await doc.embedPages([draw]);

    for (const page of pages) {
      const box = page.getCropBox ? page.getCropBox() : page.getMediaBox();
      const rot = (((page.getRotation().angle % 360) + 360) % 360);
      let x, y;
      // 보이는 쪽 아래 가운데에 똑바로 보이도록, 쪽이 돌아가 있으면(/Rotate) 반대로 돌려 찍는다
      if (rot === 90) { x = box.x + box.width - STAMP_BOTTOM + 0; y = box.y + (box.height - sw) / 2; }
      else if (rot === 180) { x = box.x + (box.width + sw) / 2; y = box.y + box.height - STAMP_BOTTOM; }
      else if (rot === 270) { x = box.x + STAMP_BOTTOM; y = box.y + (box.height + sw) / 2; }
      else { x = box.x + (box.width - sw) / 2; y = box.y + STAMP_BOTTOM; }
      page.drawPage(embedded, { x, y, width: sw, height: sh, rotate: degrees(rot) });
    }
    // 눈에 안 보이는 표식: 글줄을 지워도 문서 정보에 확인번호가 남는다
    try {
      const prev = doc.getKeywords() || '';
      doc.setKeywords([...String(prev).split(/\s+/).filter(Boolean), `wolko-dl:${code}`]);
    } catch { /* 정보 칸이 없어도 워터마크는 유효하다 */ }

    const out = await doc.save();
    return { bytes: out, status, pages: pages.length };
  } catch {
    return { bytes, status: 'failed', pages: 0 };
  }
}
