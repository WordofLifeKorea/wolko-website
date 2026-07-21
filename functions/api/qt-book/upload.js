const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const DATA_KEY = 'qt-book:data:v1';
const MAX_SIZE = 35 * 1024 * 1024;

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
  return {
    id: text(item?.id, 80) || crypto.randomUUID(),
    title: text(item?.title, 160) || '매일묵상집',
    month: text(item?.month, 40),
    filename: text(item?.filename, 180) || 'qt-book.pdf',
    key: text(item?.key, 180),
    url: text(item?.url, 500),
    size: Math.max(0, parseInt(item?.size, 10) || 0),
    uploadedAt: text(item?.uploadedAt, 40) || new Date().toISOString(),
  };
}

async function readItems(env) {
  const raw = await env.CAMP_KV.get(DATA_KEY, 'json');
  return Array.isArray(raw?.items) ? raw.items.map(cleanItem).filter(item => item.url) : [];
}

async function writeItems(env, items) {
  const data = { items: items.slice(0, 200), updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(DATA_KEY, JSON.stringify(data));
  return data.items
    .sort((a, b) => (b.month || '').localeCompare(a.month || '') || (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const store = getFileStore(env);
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV || !store) {
    return Response.json({ error: '서버 설정이 필요합니다. (파일 저장소 미연결)' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const title = text(form.get('title'), 160);
    const month = text(form.get('month'), 40);
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'PDF 파일을 선택해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      return Response.json({ error: 'PDF 파일만 업로드할 수 있습니다.' }, { status: 400, headers: CORS });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: '파일이 너무 큽니다. (최대 35MB)' }, { status: 400, headers: CORS });
    }

    const key = `${store.type === 'kv' ? 'qt-book-file-' : 'qt-book/'}${crypto.randomUUID()}.pdf`;
    const contentDisposition = `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`;
    if (store.type === 'r2') {
      await store.storage.put(key, file.stream(), {
        httpMetadata: { contentType: 'application/pdf', contentDisposition },
      });
    } else {
      await store.storage.put(key, file.stream(), {
        metadata: { contentType: 'application/pdf', contentDisposition, filename: file.name },
      });
    }

    const item = {
      id: crypto.randomUUID(),
      title: title || file.name.replace(/\.pdf$/i, ''),
      month,
      filename: file.name,
      key,
      url: new URL(`/api/qt-book/file/${encodeURIComponent(key)}`, request.url).pathname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    const items = await readItems(env);
    items.unshift(item);
    const saved = await writeItems(env, items);
    return Response.json({ item, items: saved }, { headers: CORS });
  } catch (error) {
    console.error('qt book upload error:', error);
    return Response.json({ error: '업로드하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
