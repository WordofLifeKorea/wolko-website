import test from 'node:test';
import assert from 'node:assert/strict';
import { fileKV, migratePrivateFile, privateMigrationKey } from '../functions/lib/nasFileKV.js';
import { onRequestGet as publicTeach } from '../functions/api/teach/file/[key].js';
import { onRequestGet as publicQt } from '../functions/api/qt-book/file/[key].js';
import { readStoredResourceFile, readStoredResourceVersion, replaceWithEditedFile, resourceFileKey } from '../functions/lib/portalResourceVersions.js';

const config = { origin:'https://files.example.com', token:'a'.repeat(64) };
const key = 'expense:receipt:report:file';
function setup(t) {
  const values = new Map(), files = new Map();
  const kv = {
    getWithMetadata:async (key, options) => {
      const stored = values.get(key);
      if (!stored) return { value:null, metadata:null };
      const response = new Response(stored.value);
      const type = typeof options === 'string' ? options : options?.type;
      return { value:type === 'stream' ? response.body : type === 'json' ? await response.json() : type === 'arrayBuffer' ? await response.arrayBuffer() : await response.text(), metadata:stored.options?.metadata || null };
    },
    get:async (key, options) => (await kv.getWithMetadata(key, options)).value,
    put:async (key, value, options) => values.set(key, { value, options }),
    delete:async key => values.delete(key), list:async () => ({ keys:[], list_complete:true }),
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.get('Authorization'), `Bearer ${config.token}`);
    if (options.method === 'PUT') {
      if (files.has(url)) return new Response('', { status:409 });
      files.set(url, await new Response(options.body).arrayBuffer()); return new Response('', { status:201 });
    }
    return files.has(url) ? new Response(files.get(url)) : new Response('', { status:404 });
  });
  return { env:{ CAMP_KV:kv, TEACH_NAS_URL:config.origin, TEACH_NAS_TOKEN:config.token }, values, files };
}
test('private uploads keep only a pointer, preserve metadata/TTL and ordinary account JSON', async t => {
  const { env, values } = setup(t);
  await fileKV(env).put(key, 'receipt bytes', { expirationTtl:259200, metadata:{ owner:'owner', type:'image/jpeg' } });
  assert.match(JSON.parse(values.get(key).value).nasKey, /^private-/);
  assert.equal(values.get(key).options.expirationTtl, 259200);
  assert.equal(await fileKV(env).get(key), 'receipt bytes');
  assert.deepEqual((await fileKV(env).getWithMetadata(key, 'arrayBuffer')).metadata, { owner:'owner', type:'image/jpeg' });
  await fileKV(env).put('portal:account:user', JSON.stringify({ role:'member' }));
  assert.deepEqual(await fileKV(env).get('portal:account:user', 'json'), { role:'member' });
  assert.equal(fileKV({ CAMP_KV:env.CAMP_KV }), env.CAMP_KV);
});
test('migration verifies bytes, retains originals, retries and cannot resurrect deleted files', async t => {
  const { env, values } = setup(t);
  await env.CAMP_KV.put(key, 'old receipt', { metadata:{ owner:'owner' } });
  const first = await migratePrivateFile(env, config, key);
  assert.equal(first.bytes, 11);
  assert.equal(values.get(key).value, 'old receipt');
  assert.equal((await migratePrivateFile(env, config, key)).nasKey, first.nasKey);
  assert.equal(await fileKV(env).get(key), 'old receipt');
  await env.CAMP_KV.delete(key);
  assert.ok(values.has(privateMigrationKey(key)));
  assert.equal(await fileKV(env).get(key), null);
});
test('primary live edits win over older migration mappings and read failures fail closed', async t => {
  const { env, values, files } = setup(t);
  await env.CAMP_KV.put(key, 'old');
  await migratePrivateFile(env, config, key);
  await fileKV(env).put(key, 'new');
  assert.equal(await fileKV(env).get(key), 'new');
  assert.ok(values.has(privateMigrationKey(key)));
  files.clear();
  await assert.rejects(fileKV(env).get(key), /unavailable/);
});
test('corrupt copies never publish a migration mapping', async t => {
  const { env, values } = setup(t);
  await env.CAMP_KV.put(key, 'old');
  t.mock.method(globalThis, 'fetch', async (url, options) => new Response(options.method === 'PUT' ? '' : 'corrupt', { status:options.method === 'PUT' ? 201 : 200 }));
  await assert.rejects(migratePrivateFile(env, config, key), /mismatch/);
  assert.equal(values.has(privateMigrationKey(key)), false);
});
test('Word saves on NAS preserve independently readable original and editing history', async t => {
  const { env } = setup(t);
  const original = new TextEncoder().encode('original Word');
  const edited = new TextEncoder().encode('edited Word');
  const file = { id:'file', fileName:'lesson.docx', fileType:'application/docx' };
  await fileKV(env).put(resourceFileKey('doc', file.id), original, { metadata:{ fileName:file.fileName, fileType:file.fileType } });
  const result = await replaceWithEditedFile(env, { id:'doc', file, currentBytes:original,
    editedBytes:edited, actorEmail:'editor', actorName:'Editor', saveId:'save', finalSave:true });
  assert.equal(result.changed, true);
  assert.equal(new TextDecoder().decode((await readStoredResourceFile(env, 'doc', file.id)).bytes), 'edited Word');
  const originalVersion = result.file.versions.find(version => version.isOriginal);
  assert.equal(new TextDecoder().decode((await readStoredResourceVersion(env, 'doc', file.id, originalVersion.id)).bytes), 'original Word');
});
test('public download endpoints reject all private namespaces and NAS private keys', async t => {
  const { env } = setup(t);
  t.mock.method(env.CAMP_KV, 'getWithMetadata', async () => assert.fail('Private data must not be read'));
  for (const privateKey of [key, 'portal:resource-file:doc:file', 'car:usage:photo:id', 'private-12345678-1234-1234-1234-123456789abc.bin']) {
    assert.equal((await publicTeach({ env, params:{ key:privateKey } })).status, 404);
    assert.equal((await publicQt({ env, params:{ key:privateKey } })).status, 404);
  }
});
