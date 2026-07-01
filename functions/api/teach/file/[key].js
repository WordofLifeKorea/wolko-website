export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.TEACH_FILES) {
    return new Response('Not configured', { status: 500 });
  }
  const key = String(params.key || '');
  const obj = await env.TEACH_FILES.get(key);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(obj.body, { headers });
}
