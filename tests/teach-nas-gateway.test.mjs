import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readdir, readFile, stat, rename } from 'node:fs/promises';
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

test('readable NAS folders keep old URLs, use hard links and safely decode legacy Word files', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'readable-nas-test-'));
  const token = 'a'.repeat(64), headers = { Authorization:`Bearer ${token}` };
  const server = createFileServer({ directory, token });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive:true, force:true }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const key = 'nas-12345678-1234-1234-1234-123456789abc.pdf';
  const url = `${origin}/files/${key}`;
  assert.equal((await fetch(url, { method:'PUT', headers, body:'PDF bytes' })).status, 201);
  // Simulate a directory created by the previous gateway release.
  await rename(join(directory, '.storage', key), join(directory, key));
  const organized = await fetch(url, { method:'POST', headers, body:JSON.stringify({ group:'camp', filename:'수업자료.pdf' }) });
  const { readablePath } = await organized.json();
  assert.equal(readablePath, '자료/캠프 자료실/수업자료--12345678.pdf');
  assert.equal((await stat(join(directory, readablePath))).ino, (await stat(join(directory, '.storage', key, 'data'))).ino);
  assert.equal(await (await fetch(url, { headers })).text(), 'PDF bytes');
  assert.equal((await fetch(url, { method:'POST', headers, body:JSON.stringify({ group:'../escape' }) })).status, 400);
  assert.equal((await fetch(url, { method:'POST', headers, body:JSON.stringify({ group:'receipts' }) })).status, 400);
  const privateKey = 'private-87654321-1234-1234-1234-123456789abc.bin';
  const privateUrl = `${origin}/files/${privateKey}`;
  const legacy = JSON.stringify({ fileName:'메시지.docx', fileData:'data:application/docx;base64,' + Buffer.from('Word bytes').toString('base64') });
  await fetch(privateUrl, { method:'PUT', headers, body:legacy });
  const result = await fetch(privateUrl, { method:'POST', headers,
    body:JSON.stringify({ group:'documents', filename:'../../메시지.docx', legacyDocument:true }) });
  const path = (await result.json()).readablePath;
  assert.match(path, /^자료\/포탈 문서\/[^/]+\.docx$/);
  assert.equal(await readFile(join(directory, path), 'utf8'), 'Word bytes');
  assert.equal(await (await fetch(privateUrl, { headers })).text(), legacy);
  assert.equal((await fetch(`${origin}/${encodeURI(path)}`, { headers })).status, 404);
  const auto = 'private-11111111-1234-1234-1234-123456789abc.bin';
  assert.equal((await fetch(`${origin}/files/${auto}`, { method:'PUT', body:'receipt', headers:{ ...headers,
    'X-Wolko-Group':'receipts', 'X-Wolko-Filename':encodeURIComponent('영수증.jpg') } })).status, 201);
  assert.equal(await readFile(join(directory, '자료/영수증/영수증--11111111.jpg'), 'utf8'), 'receipt');
});
