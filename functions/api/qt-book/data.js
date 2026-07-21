const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const DATA_KEY = 'qt-book:data:v1';

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return false;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-qt-book' || parts[1] !== 'admin') return false;
    const expires = parseInt(parts[2], 10);
    if (!expires || Date.now() > expires) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

function getFileStore(env) {
  const bucket = env.QT_BOOK_FILES || env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.R2_BUCKET || env.BUCKET;
  if (bucket) return { type: 'r2', storage: bucket };
  if (env.CAMP_KV) return { type: 'kv', storage: env.CAMP_KV };
  return null;
}

function text(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function cleanItem(item) {
  const url = text(item?.url, 500);
  if (!url) return null;
  return {
    id: text(item?.id, 80) || crypto.randomUUID(),
    title: text(item?.title, 160) || '매일묵상집',
    month: text(item?.month, 40),
    filename: text(item?.filename, 180) || 'qt-book.pdf',
    key: text(item?.key, 180),
    url,
    size: Math.max(0, parseInt(item?.size, 10) || 0),
    uploadedAt: text(item?.uploadedAt, 40) || new Date().toISOString(),
  };
}

function cleanList(data) {
  const items = Array.isArray(data?.items) ? data.items.map(cleanItem).filter(Boolean) : [];
  return {
    items: items
      .slice(0, 200)
      .sort((a, b) => (b.month || '').localeCompare(a.month || '') || (b.uploadedAt || '').localeCompare(a.uploadedAt || '')),
    updatedAt: text(data?.updatedAt, 40),
  };
}

async function readData(env) {
  const raw = await env.CAMP_KV.get(DATA_KEY, 'json');
  return cleanList(raw || { items: [] });
}

async function writeItems(env, items) {
  const data = { items: items.slice(0, 200), updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(DATA_KEY, JSON.stringify(data));
  return cleanList(data);
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const data = await readData(env);
  return Response.json({ items: data.items }, { headers: CORS });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  if (!id) {
    return Response.json({ error: '삭제할 파일이 없습니다.' }, { status: 400, headers: CORS });
  }

  const data = await readData(env);
  const target = data.items.find(item => item.id === id);
  const items = data.items.filter(item => item.id !== id);
  const saved = await writeItems(env, items);

  const store = getFileStore(env);
  if (target?.key && store?.storage?.delete) {
    try {
      await store.storage.delete(target.key);
    } catch (error) {
      console.error('qt book file delete error:', error);
    }
  }

  return Response.json({ items: saved.items }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
