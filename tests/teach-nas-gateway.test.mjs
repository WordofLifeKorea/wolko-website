import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileServer } from '../nas/camp-files/server.mjs';

test('NAS gateway authenticates, persists, safely serves and rejects duplicate or oversized uploads', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'teach-nas-test-'));
  const token = 'a'.repeat(64);
  const server = createFileServer({ directory, token });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive:true, force:true }); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const path = '/files/nas-12345678-1234-1234-1234-123456789abc.html';
  const headers = { Authorization:`Bearer ${token}`, 'Content-Type':'text/html',
    'Content-Disposition':"inline; filename*=UTF-8''index.html" };
  assert.equal((await fetch(origin + path)).status, 401);
  assert.equal((await fetch(origin + path, { headers })).status, 404);
  assert.equal((await fetch(origin + path, { method:'PUT', headers, body:'<h1>test</h1>' })).status, 201);
  const downloaded = await fetch(origin + path, { headers });
  assert.equal(downloaded.headers.get('Content-Type'), 'application/octet-stream');
  assert.match(downloaded.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(await downloaded.text(), '<h1>test</h1>');
  assert.equal((await fetch(origin + path, { method:'PUT', headers, body:'changed' })).status, 409);
  assert.equal((await fetch(origin + path, { method:'DELETE', headers })).status, 405);
  assert.equal((await fetch(origin + '/files/bad-key', { headers })).status, 404);
  assert.equal((await fetch(origin + path.replace('.html', '.zip'), { method:'PUT', headers,
    body:new Uint8Array(20 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await readdir(directory)).filter(name => name.startsWith('.upload-')).length, 0);
  assert.equal(await (await fetch(origin + path, { headers })).text(), '<h1>test</h1>');
});
