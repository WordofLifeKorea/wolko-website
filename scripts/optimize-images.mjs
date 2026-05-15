import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const DIR = 'public/images/uploads';
const MAX_SIDE = 1600;
const JPG_QUALITY = 78;

const files = await readdir(DIR);
let beforeTotal = 0;
let afterTotal = 0;
const rows = [];

for (const name of files) {
  const ext = extname(name).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

  const path = join(DIR, name);
  const input = await readFile(path);
  const before = input.length;

  const img = sharp(input, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);
  if (longest > MAX_SIDE) {
    img.resize({
      width: meta.width >= meta.height ? MAX_SIDE : null,
      height: meta.height > meta.width ? MAX_SIDE : null,
      fit: 'inside',
    });
  }

  let out;
  if (ext === '.png') {
    out = await img.png({ compressionLevel: 9, quality: 80, palette: true }).toBuffer();
  } else {
    out = await img.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toBuffer();
  }

  // Only overwrite if we actually saved space.
  if (out.length < before) {
    await writeFile(path, out);
  }
  const after = Math.min(out.length, before);

  beforeTotal += before;
  afterTotal += after;
  rows.push({ name, before, after });
}

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
rows.sort((a, b) => b.before - a.before);
for (const r of rows.slice(0, 10)) {
  console.log(`${r.name}: ${mb(r.before)} -> ${mb(r.after)}`);
}
console.log('---');
console.log(`Files processed: ${rows.length}`);
console.log(`TOTAL: ${mb(beforeTotal)} -> ${mb(afterTotal)}  (${(100 - (afterTotal / beforeTotal) * 100).toFixed(1)}% smaller)`);
