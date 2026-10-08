import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateTeachFile, migrationMapKey } from '../functions/lib/teachNasMigration.js';
import { onRequestPost } from '../functions/api/teach/nas-migrate.js';
import { onRequestGet } from '../functions/api/teach/file/[key].js';

const key = 'teach-file-12345678-1234-1234-1234-123456789abc.pdf';
const config = { origin:'https://files.example.com', token:'a'.repeat(64) };
function setup(t, corrupt = false) {
  const mappings = new Map(), files = new Map();
  const original = new TextEncoder().encode('original document').buffer;
  const env = { TEACH_NAS_URL:config.origin, TEACH_NAS_TOKEN:config.token, CAMP_KV:{
    getWithMetadata:async () => ({ value:original, metadata:{ contentType:'application/pdf' } }),
    get:async key => mappings.get(key), put:async (key, value) => mappings.set(key, JSON.parse(value)),
    list:async () => ({ keys:[{ name:key }], list_complete:true }),
    delete:async () => assert.fail('Migration must preserve originals'),
  } };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'PUT') {
      if (files.has(url)) return new Response('', { status:409 });
      files.set(url, options.body); return new Response('', { status:201 });
    }
    return new Response(corrupt ? 'corrupt' : files.get(url), { headers:{ 'Content-Type':'application/pdf' } });
  });
  return { env, mappings };
}
test('migration verifies bytes, preserves originals and old URLs, and retries safely', async t => {
  const { env, mappings } = setup(t);
  const result = await migrateTeachFile(env, config, key);
  assert.equal(result.bytes, 17);
  assert.equal(mappings.get(migrationMapKey(key)).nasKey, result.nasKey);
  assert.equal((await migrateTeachFile(env, config, key)).nasKey, result.nasKey);
  const response = await onRequestGet({ env, params:{ key } });
  assert.equal(await response.text(), 'original document');
});
test('verification failure never switches the original link', async t => {
  const { env, mappings } = setup(t, true);
  await assert.rejects(migrateTeachFile(env, config, key), /mismatch/);
  assert.equal(mappings.size, 0);
});
test('maintenance requires server credential and lists only resource upload keys', async t => {
  const { env } = setup(t);
  const request = (token, input) => new Request('https://wolko.org/api/teach/nas-migrate', {
    method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:JSON.stringify(input),
  });
  assert.equal((await onRequestPost({ env, request:request('member-token', { action:'list' }) })).status, 401);
  const listed = await onRequestPost({ env, request:request(config.token, { action:'list' }) });
  assert.deepEqual((await listed.json()).keys, [key]);
  assert.equal((await onRequestPost({ env, request:request(config.token, { action:'copy', key:'portal:users' }) })).status, 400);
});
