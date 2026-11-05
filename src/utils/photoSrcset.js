// 사진 작은 사본(srcset) 도우미 — 빌드할 때만 돈다.
//
// scripts/make-photo-sizes.mjs 가 public/images/uploads/sizes/ 에 만든 WebP 사본(긴 변 480 · 960)을
// <img srcset> 문자열로 바꿔 준다.
// - 사본 목록(manifest.json)이 없거나, 그 사진의 사본 파일이 실제로 없거나, 원본 내용이 사본을 만든 뒤
//   바뀌었으면 빈 값(undefined)을 돌려준다 → <img> 는 원본(src)만 쓴다.
// - /images/uploads/ 로 시작하지 않는 주소(외부 주소 등)는 건드리지 않는다.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const PREFIX = '/images/uploads/';
const PUBLIC_DIR = join(process.cwd(), 'public');
const SIZES_DIR = join(PUBLIC_DIR, 'images/uploads/sizes');

let manifest;
function loadManifest() {
  if (manifest !== undefined) return manifest;
  try {
    manifest = JSON.parse(readFileSync(join(SIZES_DIR, 'manifest.json'), 'utf8')).files || {};
  } catch {
    manifest = {};
  }
  return manifest;
}

const cache = new Map();

/** 주소 → { w, h, copies: [{ url, w }] } (쓸 수 있는 사본이 없으면 null) */
function infoOf(url) {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) return null;
  if (cache.has(url)) return cache.get(url);
  let result = null;
  try {
    const rest = decodeURIComponent(url.slice(PREFIX.length).split(/[?#]/)[0]);
    if (rest && !rest.includes('/')) {
      const entry = loadManifest()[rest.normalize('NFC')];
      const original = join(PUBLIC_DIR, 'images/uploads', rest);
      if (entry && existsSync(original)) {
        const same = createHash('sha1').update(readFileSync(original)).digest('hex') === entry.sha1;
        // 사본 가운데 하나라도 없으면 그 사진은 원본만 쓴다(작은 사본만 남아 흐려지지 않게)
        const complete = same && entry.copies.every((c) => existsSync(join(SIZES_DIR, c.file)));
        const copies = complete
          ? entry.copies.map((c) => ({ url: `${PREFIX}sizes/${encodeURIComponent(c.file)}`, w: c.w }))
          : [];
        result = { w: entry.w, h: entry.h, copies };
      }
    }
  } catch {
    result = null;
  }
  cache.set(url, result);
  return result;
}

/**
 * <img srcset> 값. 사본이 없으면 undefined(속성이 붙지 않음 → 원본만).
 * withOriginal: 큰 사진 자리에서 사본으로 모자랄 때 원본을 고를 수 있게 원본도 후보로 넣는다.
 */
export function photoSrcset(url, { withOriginal = false } = {}) {
  const info = infoOf(url);
  if (!info || !info.copies.length) return undefined;
  const list = info.copies.map((c) => `${c.url} ${c.w}w`);
  const biggest = Math.max(...info.copies.map((c) => c.w));
  if (withOriginal && info.w > biggest) list.push(`${encodeURI(url).replace(/,/g, '%2C')} ${info.w}w`);
  return list.join(', ');
}

/**
 * <img sizes> 값. slots 는 칸(사진 틀)의 폭 목록: ['(max-width: 640px) calc(100vw - 40px)', '292px'].
 * 사진이 칸보다 크게 그려지는 만큼(얼굴 맞춤 photoFrame 의 width %, 또는 object-fit: cover 로 옆이 잘리는 만큼)
 * 곱해서, 브라우저가 실제로 그려지는 폭에 맞는 사본을 고르게 한다.
 * - style: photoFrame · photoFocus 가 만든 style 문자열
 * - aspect: 칸의 가로 ÷ 세로 (object-fit: cover 일 때 계산용)
 */
export function photoSizes(url, slots, { style, aspect } = {}) {
  const info = infoOf(url);
  if (!info || !info.copies.length) return undefined;
  let zoom = 1;
  const m = typeof style === 'string' && style.match(/(?:^|;)\s*width:\s*([\d.]+)%/);
  if (m) zoom = parseFloat(m[1]) / 100;
  else if (aspect && info.w && info.h) zoom = Math.max(1, info.w / info.h / aspect);
  zoom = Math.ceil(zoom * 100) / 100;
  return slots
    .map((slot) => {
      if (zoom <= 1) return slot;
      // '(max-width: 640px) 길이' → 앞의 조건은 두고 길이만 곱한다
      const mq = slot.match(/^(\([^()]*\)(?:\s+and\s+\([^()]*\))*)\s+(.+)$/);
      const [media, len] = mq ? [`${mq[1]} `, mq[2]] : ['', slot];
      return `${media}calc(${len} * ${zoom})`;
    })
    .join(', ');
}
