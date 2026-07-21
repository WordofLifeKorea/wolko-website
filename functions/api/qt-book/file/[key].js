function getFileStore(env) {
  const bucket = env.QT_BOOK_FILES || env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.R2_BUCKET || env.BUCKET;
  if (bucket) return { type: 'r2', storage: bucket };
  if (env.CAMP_KV) return { type: 'kv', storage: env.CAMP_KV };
  return null;
}

function safeKey(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const store = getFileStore(env);
  const key = safeKey(params.key);
  if (!store || !key) return new Response('Not found', { status: 404 });

  if (store.type === 'r2') {
    const object = await store.storage.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('content-type', headers.get('content-type') || 'application/pdf');
    headers.set('content-disposition', headers.get('content-disposition') || 'inline');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(object.body, { headers });
  }

  const object = await store.storage.getWithMetadata(key, { type: 'stream' });
  if (!object?.value) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'content-type': object.metadata?.contentType || 'application/pdf',
    'content-disposition': object.metadata?.contentDisposition || 'inline',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });
  return new Response(object.value, { headers });
}
