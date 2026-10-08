import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rename, rm, stat, link, open } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 20 * 1024 * 1024;
const KEY = /^(?:nas|private)-[a-f0-9-]{36}\.[a-z0-9]{1,16}$/;
const GROUPS = { camp:'캠프 자료실', documents:'포탈 문서', versions:'문서 수정 이력',
  receipts:'영수증', 'receipt-trash':'영수증/휴지통', 'receipt-temp':'영수증/임시',
  photos:'차량 사진', 'photo-trash':'차량 사진/휴지통', qt:'QT' };
function readableName(value, key) {
  let name = String(value || '자료').normalize('NFC').replace(/[\\/<>:"|?*\x00-\x1f]/g, '_').replace(/^\.+/, '').trim() || '자료';
  const extension = extname(name).slice(0, 17);
  let stem = name.slice(0, name.length - extension.length) || '자료';
  while (Buffer.byteLength(stem) > 160) stem = stem.slice(0, -1);
  return `${stem}--${key.replace(/^(nas|private)-/, '').slice(0, 8)}${extension}`;
}
const INLINE_TYPES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'audio/mpeg', 'audio/wav', 'audio/mp4']);

export function createFileServer({ directory, token }) {
  if (!directory || !token || token.length < 32) throw new Error('DATA_DIR and a token of at least 32 characters are required');
  const credential = Buffer.from(`Bearer ${token}`);
  const storage = join(directory, '.storage');
  async function locate(key) {
    const current = join(storage, key);
    try { await stat(current); return current; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return join(directory, key); }
  }
  async function organize(key, input) {
    if (!Object.hasOwn(GROUPS, input.group) || (key.startsWith('nas-') && input.group !== 'camp')) throw Object.assign(new Error('Invalid group'), { status:400 });
    let target = await locate(key);
    const metadata = JSON.parse(await readFile(join(target, 'metadata.json'), 'utf8'));
    if (metadata.readablePath) return metadata.readablePath;
    const folder = join(directory, '자료', GROUPS[input.group]);
    await mkdir(folder, { recursive:true });
    const filename = readableName(input.filename, key);
    const destination = join(folder, filename);
    if (input.legacyDocument) {
      const legacy = JSON.parse(await readFile(join(target, 'data'), 'utf8'));
      if (!legacy.fileData || !legacy.fileName) throw new Error('Invalid legacy document');
      const bytes = Buffer.from(String(legacy.fileData).split(',').at(-1), 'base64');
      try { await writeFile(destination, bytes, { flag:'wx' }); }
      catch (error) { if (error.code !== 'EEXIST' || !(await readFile(destination)).equals(bytes)) throw error; }
    } else {
      try { await link(join(target, 'data'), destination); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const [source, existing] = await Promise.all([stat(join(target, 'data')), stat(destination)]);
        if (source.ino !== existing.ino || source.dev !== existing.dev) throw new Error('Filename collision');
      }
    }
    const readablePath = `자료/${GROUPS[input.group]}/${filename}`;
    await mkdir(storage, { recursive:true });
    if (target !== join(storage, key)) { await rename(target, join(storage, key)); target = join(storage, key); }
    const temporary = join(target, `metadata-${crypto.randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify({ ...metadata, readablePath }));
    await rename(temporary, join(target, 'metadata.json'));
    return readablePath;
  }
  let uploads = 0;
  const server = http.createServer(async (req, res) => {
    const supplied = Buffer.from(req.headers.authorization || '');
    if (supplied.length !== credential.length || !timingSafeEqual(supplied, credential)) {
      res.writeHead(401).end('Unauthorized'); return;
    }
    const match = /^\/files\/([^/]+)$/.exec(req.url || '');
    if (!match || !KEY.test(match[1])) { res.writeHead(404).end('Not found'); return; }
    const key = match[1];
    const maxBytes = key.startsWith('private-') ? 40 * 1024 * 1024 : MAX_BYTES;
    const target = join(storage, key);
    if (req.method === 'GET') {
      try {
        let metadata, file;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const location = await locate(key);
            metadata = JSON.parse(await readFile(join(location, 'metadata.json'), 'utf8'));
            file = await open(join(location, 'data'), 'r'); break;
          } catch (error) { if (error.code !== 'ENOENT' || attempt) throw error; }
        }
        const info = await file.stat();
        res.writeHead(200, { 'Content-Type':metadata.contentType, 'Content-Disposition':metadata.contentDisposition,
          'Content-Length':info.size, 'X-Content-Type-Options':'nosniff' });
        await pipeline(file.createReadStream(), res);
      } catch (error) {
        if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('File unavailable');
        else res.destroy();
      }
      return;
    }
    if (req.method === 'POST') {
      try {
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 8192) throw Object.assign(new Error('Too large'), { status:413 }); }
        const readablePath = await organize(key, JSON.parse(body));
        res.writeHead(200, { 'Content-Type':'application/json' }).end(JSON.stringify({ readablePath }));
      } catch (error) { res.writeHead(error.status || (error.code === 'ENOENT' ? 404 : 500)).end('Organization failed'); }
      return;
    }
    if (req.method !== 'PUT') { res.writeHead(405, { Allow:'GET, PUT, POST' }).end(); return; }
    if (uploads >= 4) { res.writeHead(503).end('Busy'); return; }
    if (Number(req.headers['content-length']) > maxBytes) { res.writeHead(413).end('File too large'); return; }
    uploads++;
    let temporary;
    try {
      await mkdir(storage, { recursive:true });
      try { await stat(await locate(key)); res.writeHead(409).end('Already stored'); return; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      temporary = await mkdtemp(join(directory, '.upload-'));
      let size = 0;
      const limit = new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length;
        if (size > maxBytes) { const error = new Error('File too large'); error.status = 413; callback(error); }
        else callback(null, chunk);
      } });
      await pipeline(req, limit, createWriteStream(join(temporary, 'data'), { flags:'wx' }));
      const type = req.headers['content-type'];
      const inline = INLINE_TYPES.has(type);
      const filename = /filename\*=UTF-8''([^;\r\n]*)/i.exec(req.headers['content-disposition'] || '')?.[1] || key;
      const metadata = { contentType:inline ? type : 'application/octet-stream',
        contentDisposition:`${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}` };
      await writeFile(join(temporary, 'metadata.json'), JSON.stringify(metadata), { flag:'wx' });
      // Publish bytes and metadata together; interrupted uploads never become readable.
      await rename(temporary, target);
      temporary = null;
      if (req.headers['x-wolko-group']) await organize(key, { group:req.headers['x-wolko-group'],
        filename:decodeURIComponent(req.headers['x-wolko-filename'] || filename) });
      res.writeHead(201).end('Stored');
    } catch (error) {
      if (temporary) {
        await rm(temporary, { recursive:true, force:true }).catch(() => {});
        temporary = null;
      }
      if (!res.headersSent && !res.destroyed) res.writeHead(error.status || (['EEXIST', 'ENOTEMPTY'].includes(error.code) ? 409 : error.code === 'ENOSPC' ? 507 : 500)).end('Upload failed');
    } finally {
      if (temporary) await rm(temporary, { recursive:true, force:true }).catch(() => {});
      uploads--;
    }
  });
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createFileServer({ directory:process.env.DATA_DIR || '/data', token:process.env.TEACH_NAS_TOKEN })
    .listen(Number(process.env.PORT || 8080), '0.0.0.0');
}
