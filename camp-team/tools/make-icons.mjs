// 「홈 화면에 추가」용 아이콘 PNG 만들기 — 포털의 W 로고(public/images/portal-icon.svg)와 같은 그림을 의존 패키지 없이 직접 그린다.
//   node camp-team/tools/make-icons.mjs   →  public/portal/campteam/icons/ 에 192·512·maskable·apple-touch 아이콘을 쓴다 (이미 만들어 둔 파일이 있어 평소에는 돌릴 일 없음)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../../public/portal/campteam/icons/', import.meta.url));
// portal-icon.svg 의 W 선(굵기 42, 둥근 끝) — 직선과 곡선을 점들로 잘게 나눈다
const bez = (p0, p1, p2, p3, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
const PATH = [[121, 153], [161, 356], ...bez([161, 356], [166, 383], [190, 388], [205, 364]), [259, 273], ...bez([259, 273], [266, 261], [276, 263], [280, 276]), [304, 355], ...bez([304, 355], [312, 382], [335, 385], [349, 360]), [394, 277], [423, 153]];
const SEG = PATH.slice(1).map((b, i) => [PATH[i], b]);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const grad = (x, y, x1, y1, x2, y2, c1, c2) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))); return mix(c1, c2, t); };
const BG1 = hex('#08799a'), BG2 = hex('#003d52'), M1 = hex('#83dcf7'), M2 = hex('#35b9dc'), DISC = hex('#002f42');
function distToPath(x, y) { let best = 1e9; for (const [a, b] of SEG) { const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy, t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2)) : 0, dx = x - (a[0] + t * vx), dy = y - (a[1] + t * vy), d = dx * dx + dy * dy; if (d < best) best = d; } return Math.sqrt(best); }
function inRounded(x, y, r) { const cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; }
function sample(x, y, rounded) {                                   // 512×512 그림 위의 한 점 → [r,g,b,a(0~1)]
  if (rounded && !inRounded(x, y, 112)) return [0, 0, 0, 0];
  let c = grad(x, y, 72, 48, 448, 472, BG1, BG2);
  if ((x - 256) ** 2 + (y - 256) ** 2 <= 174 * 174) c = mix(c, DISC, 0.46);
  if (x > 90 && x < 455 && y > 120 && y < 410 && distToPath(x, y) <= 21) c = grad(x, y, 112, 128, 392, 374, M1, M2);
  return [c[0], c[1], c[2], 1];
}
function render(size, rounded, SS = 3) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const s = sample((x + (sx + .5) / SS) * 512 / size, (y + (sy + .5) / SS) * 512 / size, rounded); r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3]; }
    const o = (y * size + x) * 4, n = SS * SS;
    if (a) { px[o] = Math.round(r / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(b / a); px[o + 3] = Math.round(255 * a / n); }
  }
  return px;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync(OUT, { recursive: true });
for (const [name, size, rounded] of [['icon-192.png', 192, true], ['icon-512.png', 512, true], ['icon-maskable-512.png', 512, false], ['apple-touch-icon.png', 180, false]]) {
  writeFileSync(OUT + name, png(size, render(size, rounded))); console.log('wrote', name);
}
