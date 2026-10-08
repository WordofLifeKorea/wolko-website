import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 20 * 1024 * 1024;
const KEY = /^nas-[a-f0-9-]{36}\.[a-z0-9]{1,16}$/;
const INLINE_TYPES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'audio/mpeg', 'audio/wav', 'audio/mp4']);

export function createFileServer({ directory, token }) {
  if (!directory || !token || token.length < 32) throw new Error('DATA_DIR and a token of at least 32 characters are required');
  const credential = Buffer.from(`Bearer ${token}`);
  let uploads = 0;
  const server = http.createServer(async (req, res) => {
    const supplied = Buffer.from(req.headers.authorization || '');
    if (supplied.length !== credential.length || !timingSafeEqual(supplied, credential)) {
      res.writeHead(401).end('Unauthorized'); return;
    }
    const match = /^\/files\/([^/]+)$/.exec(req.url || '');
    if (!match || !KEY.test(match[1])) { res.writeHead(404).end('Not found'); return; }
    const key = match[1];
    const target = join(directory, key);
    if (req.method === 'GET') {
      try {
        const metadata = JSON.parse(await readFile(join(target, 'metadata.json'), 'utf8'));
        const info = await stat(join(target, 'data'));
        res.writeHead(200, { 'Content-Type':metadata.contentType, 'Content-Disposition':metadata.contentDisposition,
          'Content-Length':info.size, 'X-Content-Type-Options':'nosniff' });
        await pipeline(createReadStream(join(target, 'data')), res);
      } catch (error) {
        if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('File unavailable');
        else res.destroy();
      }
      return;
    }
    if (req.method !== 'PUT') { res.writeHead(405, { Allow:'GET, PUT' }).end(); return; }
    if (uploads >= 4) { res.writeHead(503).end('Busy'); return; }
    if (Number(req.headers['content-length']) > MAX_BYTES) { res.writeHead(413).end('File too large'); return; }
    uploads++;
    let temporary;
    try {
      await mkdir(directory, { recursive:true });
      temporary = await mkdtemp(join(directory, '.upload-'));
      let size = 0;
      const limit = new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length;
        if (size > MAX_BYTES) { const error = new Error('File too large'); error.status = 413; callback(error); }
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
