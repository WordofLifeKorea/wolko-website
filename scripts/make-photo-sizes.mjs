// 섬기는이 · 선교사 사진의 작은 사본(WebP)을 만든다 — 원본은 절대 바꾸거나 지우지 않는다.
//
//   node scripts/make-photo-sizes.mjs
//
// - public/images/uploads/ 바로 아래의 jpg · jpeg · png 만 읽는다(하위 폴더 · 다른 폴더 · 로고는 보지 않는다).
// - 긴 변 480 · 960px 두 크기를 public/images/uploads/sizes/ 에 만든다.
//   원본보다 크게 키우지 않는다(원본 긴 변이 그 크기 이하면 그 크기는 만들지 않는다).
// - 사진 방향(EXIF)을 바로 세우고, 색은 sRGB 로 맞춘다.
// - 원본 내용(sha1)이 그대로면 이미 만든 사본은 건너뛴다. 원본이 사라진 사본만 sizes/ 에서 지운다.
// - 만든 결과는 sizes/manifest.json 에 적는다. 빌드는 src/utils/photoSrcset.js 가 이 목록과
//   실제 파일이 있는지를 보고 srcset 을 단다(사본이 없으면 원본만 쓴다).
//
// sharp 는 맥(로컬)에 들어 있는 것을 쓴다. Cloudflare 빌드에서는 이 스크립트를 돌리지 않는다.
// 포탈 프로필 편집으로 새 사진이 올라오면 가끔 이 스크립트를 다시 돌려 사본을 만든다.
import { readdir, readFile, writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const SRC_DIR = 'public/images/uploads';
const OUT_DIR = join(SRC_DIR, 'sizes');
const MANIFEST = join(OUT_DIR, 'manifest.json');
const SIZES = [480, 960]; // 긴 변(px)
const QUALITY = 78;

const sha1 = (buf) => createHash('sha1').update(buf).digest('hex');
// 사본 파일 이름: 영문 · 숫자 이름은 그대로, 한글 등이 섞인 이름은 짧은 해시로(서버마다 다른 유니코드 정규화를 피한다)
const stemOf = (name) => (/^[A-Za-z0-9._-]+$/.test(name) ? name : `x-${sha1(name.normalize('NFC')).slice(0, 12)}${extname(name).toLowerCase()}`);

await mkdir(OUT_DIR, { recursive: true });
let old = { files: {} };
try { old = JSON.parse(await readFile(MANIFEST, 'utf8')); } catch { /* 처음 */ }

const entries = await readdir(SRC_DIR, { withFileTypes: true });
const files = {};
let made = 0, kept = 0, srcBytes = 0, outBytes = 0;

for (const ent of entries) {
  if (!ent.isFile()) continue;
  const name = ent.name;
  if (!['.jpg', '.jpeg', '.png'].includes(extname(name).toLowerCase())) continue;
  const key = name.normalize('NFC');
  const buf = await readFile(join(SRC_DIR, name));
  const hash = sha1(buf);
  srcBytes += buf.length;

  const prev = old.files?.[key];
  if (prev && prev.sha1 === hash && prev.copies.every((c) => existsSync(join(OUT_DIR, c.file)))) {
    files[key] = prev;
    kept += prev.copies.length;
    outBytes += prev.copies.reduce((s, c) => s + c.bytes, 0);
    continue;
  }

  const meta = await sharp(buf, { failOn: 'none' }).metadata();
  const turned = (meta.orientation || 1) >= 5; // 90° 돌아간 사진은 가로 · 세로가 바뀐다
  const w = turned ? meta.height : meta.width;
  const h = turned ? meta.width : meta.height;
  const long = Math.max(w, h);
  const copies = [];
  for (const size of SIZES) {
    if (size >= long) continue; // 키우지 않는다
    const file = `${stemOf(name)}.${size}.webp`;
    const { data, info } = await sharp(buf, { failOn: 'none' })
      .rotate()
      .resize({ width: w >= h ? size : null, height: h > w ? size : null, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(join(OUT_DIR, file), data);
    copies.push({ size, file, w: info.width, h: info.height, bytes: data.length });
    outBytes += data.length;
    made++;
  }
  files[key] = { sha1: hash, bytes: buf.length, w, h, copies };
}

// 원본이 없어진 사본 정리(sizes/ 안의 우리가 만든 파일만)
const keep = new Set(Object.values(files).flatMap((f) => f.copies.map((c) => c.file)));
let removed = 0;
for (const f of await readdir(OUT_DIR)) {
  if (f.endsWith('.webp') && !keep.has(f)) { await unlink(join(OUT_DIR, f)); removed++; }
}

const sorted = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
await writeFile(MANIFEST, JSON.stringify({ note: 'scripts/make-photo-sizes.mjs 가 만든 목록. 손으로 고치지 않는다.', sizes: SIZES, files: sorted }, null, 1) + '\n');

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
const dirBytes = (await Promise.all((await readdir(OUT_DIR)).map((f) => stat(join(OUT_DIR, f))))).reduce((s, st) => s + st.size, 0);
console.log(`원본 ${Object.keys(files).length}장 (${mb(srcBytes)}) → 사본 새로 ${made}개, 그대로 ${kept}개, 지움 ${removed}개`);
console.log(`사본 합계 ${mb(outBytes)} · sizes 폴더 전체 ${mb(dirBytes)}`);
