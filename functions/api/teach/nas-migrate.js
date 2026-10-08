import { nasStorageConfig } from '../../lib/teachNasStorage.js';
import { LEGACY_TEACH_KEY, legacyTeachStore, migrateTeachFile } from '../../lib/teachNasMigration.js';
import { PRIVATE_FILE_PREFIXES, isNasBackedKey, migratePrivateFile } from '../../lib/nasFileKV.js';

export async function onRequestPost({ env, request }) {
  let config;
  try { config = nasStorageConfig(env); } catch { return new Response('Unavailable', { status:503 }); }
  if (!config || !env.CAMP_KV) return new Response('Unavailable', { status:503 });
  // This maintenance endpoint accepts only the server-held NAS credential, never member tokens.
  const supplied = new TextEncoder().encode(request.headers.get('Authorization') || '');
  const expected = new TextEncoder().encode(`Bearer ${config.token}`);
  let difference = supplied.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ (supplied[i] || 0);
  if (difference) return new Response('Unauthorized', { status:401 });
  try {
    const input = await request.json();
    if (input.action === 'private-list') {
      if (!PRIVATE_FILE_PREFIXES.includes(input.prefix)) return new Response('Invalid namespace', { status:400 });
      const page = await env.CAMP_KV.list({ prefix:input.prefix, limit:100,
        ...(input.cursor ? { cursor:String(input.cursor) } : {}) });
      return Response.json({ keys:page.keys.map(x => x.name), cursor:page.cursor || '', complete:page.list_complete });
    }
    if (input.action === 'private-copy') {
      if (!isNasBackedKey(input.key)) return new Response('Invalid namespace', { status:400 });
      return Response.json(await migratePrivateFile(env, config, input.key));
    }
    if (input.action === 'list') {
      const store = legacyTeachStore(env);
      const page = await store.storage.list({ ...(store.type === 'kv' ? { prefix:'teach-file-' } : {}),
        limit:100, ...(input.cursor ? { cursor:String(input.cursor) } : {}) });
      const keys = (store.type === 'kv' ? page.keys.map(x => x.name) : page.objects.map(x => x.key)).filter(key => LEGACY_TEACH_KEY.test(key));
      return Response.json({ keys, cursor:page.cursor || '', complete:store.type === 'kv' ? page.list_complete : !page.truncated });
    }
    if (input.action !== 'copy' || !LEGACY_TEACH_KEY.test(input.key || '')) return new Response('Invalid request', { status:400 });
    return Response.json(await migrateTeachFile(env, config, input.key));
  } catch (error) { return Response.json({ error:error.message }, { status:503 }); }
}
