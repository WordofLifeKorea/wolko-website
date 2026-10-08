import assert from 'node:assert/strict';
import test from 'node:test';
import { nasStorageConfig, nasFileRequest } from '../functions/lib/teachNasStorage.js';
import { onRequestPost } from '../functions/api/teach/upload.js';
import { onRequestGet } from '../functions/api/teach/file/[key].js';
import { generateTeachToken } from '../functions/lib/teachAuth.js';

const configEnv = { TEACH_NAS_URL:'https://files.example.com', TEACH_NAS_TOKEN:'a'.repeat(64) };
const key = 'nas-12345678-1234-1234-1234-123456789abc.zip';

test('NAS configuration is optional but partial, non-HTTPS and credential URLs fail closed', () => {
  assert.equal(nasStorageConfig({}), null);
  assert.equal(nasStorageConfig(configEnv).origin, 'https://files.example.com');
  for (const env of [{ TEACH_NAS_TOKEN:'a'.repeat(64) }, { TEACH_NAS_URL:'https://files.example.com' },
    { ...configEnv, TEACH_NAS_URL:'http://files.example.com' },
    { ...configEnv, TEACH_NAS_URL:'https://secret@example.com' },
    { ...configEnv, TEACH_NAS_URL:'https://files.example.com/path' }]) {
    assert.throws(() => nasStorageConfig(env));
  }
});

test('gateway request uses server-side credentials and never follows redirects', async () => {
  let called;
  await nasFileRequest(nasStorageConfig(configEnv), key, {}, async (url, options) => {
    called = { url, options }; return new Response('test');
  });
  assert.equal(called.url, 'https://files.example.com/files/' + key);
  assert.equal(called.options.headers.get('Authorization'), 'Bearer ' + configEnv.TEACH_NAS_TOKEN);
  assert.equal(called.options.redirect, 'manual');
  await assert.rejects(nasFileRequest(nasStorageConfig(configEnv), '../escape'));
});

test('NAS upload and download round trip keeps existing portal URLs and legacy KV files', async t => {
  const stored = new Map();
  const env = { ADMIN_PASSWORD:'secret', ...configEnv, CAMP_KV:{
    put:async () => assert.fail('NAS uploads must not fall back to KV'),
    getWithMetadata:async () => ({ value:'legacy', metadata:{ contentType:'application/pdf' } }),
  } };
  const token = await generateTeachToken(env.ADMIN_PASSWORD, 'member', { name:'Member', email:'member@example.com' });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer ' + configEnv.TEACH_NAS_TOKEN);
    if (options.method === 'PUT') {
      stored.set(url, { body:await new Response(options.body).text(), headers:options.headers });
      return new Response('', { status:201 });
    }
    const item = stored.get(url);
    return new Response(item.body, { headers:item.headers });
  });
  const form = new FormData(); form.append('file', new File(['archive'], 'lesson.zip'));
  const response = await onRequestPost({ env, request:new Request('https://wolko.org/api/teach/upload', {
    method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form,
  }) });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.url, /^https:\/\/wolko.org\/api\/teach\/file\/nas-/);
  const download = await onRequestGet({ env, params:{ key:new URL(data.url).pathname.split('/').at(-1) } });
  assert.equal(await download.text(), 'archive');
  assert.equal(download.headers.get('Authorization'), null);
  assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
  const legacy = await onRequestGet({ env, params:{ key:'teach-file-12345678-1234-1234-1234-123456789abc.pdf' } });
  assert.equal(await legacy.text(), 'legacy');
});

test('NAS outage and redirects return visible failures, never silent KV uploads', async t => {
  const token = await generateTeachToken('secret', 'member', { email:'member@example.com' });
  const env = { ADMIN_PASSWORD:'secret', ...configEnv, CAMP_KV:{ put:async () => assert.fail('no fallback') } };
  for (const failure of [() => new Response('', { status:302, headers:{ Location:'https://other.example.com' } }),
    () => { throw new Error('offline'); }]) {
    t.mock.method(globalThis, 'fetch', failure);
    const form = new FormData(); form.append('file', new File(['data'], 'test.pdf'));
    assert.equal((await onRequestPost({ env, request:new Request('https://wolko.org/upload', {
      method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form,
    }) })).status, 503);
    assert.equal((await onRequestGet({ env, params:{ key } })).status, 503);
    t.mock.restoreAll();
  }
});
