function getTeachFileStore(env) {
  const bucket = env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.CAMP_FILES || env.R2_BUCKET || env.BUCKET;
  if (bucket) return { type: 'r2', storage: bucket };
  if (env.CAMP_KV) return { type: 'kv', storage: env.CAMP_KV };
  return null;
}

function decodeKey(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const store = getTeachFileStore(env);
  if (!store) {
    return new Response('Not configured', { status: 500 });
  }
  const rawKey = String(params.key || '');
  const key = decodeKey(rawKey);
  const headers = new Headers();
  if (store.type === 'r2') {
    const obj = await store.storage.get(key) || (key === rawKey ? null : await store.storage.get(rawKey));
    if (!obj) {
      return new Response('Not found', { status: 404 });
    }
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(obj.body, { headers });
  }

  let { value, metadata } = await store.storage.getWithMetadata(key, { type: 'stream' });
  if (!value && key !== rawKey) {
    ({ value, metadata } = await store.storage.getWithMetadata(rawKey, { type: 'stream' }));
  }
  if (!value) {
    return new Response('Not found', { status: 404 });
  }
  headers.set('Content-Type', metadata?.contentType || 'application/octet-stream');
  if (metadata?.contentDisposition) {
    headers.set('Content-Disposition', metadata.contentDisposition);
  }
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(value, { headers });
}
