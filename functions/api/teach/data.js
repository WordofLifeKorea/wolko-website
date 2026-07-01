const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const DATA_KEY = 'teach:data:v1';
const CAMP_SET = new Set(['wolko', 'church']);
const SUBJECT_SET = new Set(['english', 'bible']);
const MAX_ITEMS = 2000;

function toHex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

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
    if (parts[0] !== 'wolko-teach' || parts[1] !== 'admin') return false;
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

function text(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanItem(input, existing) {
  const camp = CAMP_SET.has(input?.camp) ? input.camp : existing?.camp;
  const subject = SUBJECT_SET.has(input?.subject) ? input.subject : existing?.subject;
  const session = text(input?.session, 80) || existing?.session || '';
  const title = text(input?.title, 160) || existing?.title || '';
  const url = text(input?.url, 500) || existing?.url || '';
  if (!camp || !subject || !session || !title || !isValidUrl(url)) return null;
  const now = new Date().toISOString();
  return {
    id: existing?.id || text(input?.id, 80) || crypto.randomUUID(),
    camp,
    subject,
    session,
    title,
    url,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function emptyData() {
  return { items: [], updatedAt: '' };
}

async function readData(env) {
  const raw = await env.CAMP_KV.get(DATA_KEY, 'json');
  return raw && Array.isArray(raw.items) ? raw : emptyData();
}

async function writeData(env, items) {
  const data = { items: items.slice(0, MAX_ITEMS), updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(DATA_KEY, JSON.stringify(data));
  return data;
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CAMP_KV) {
    return Response.json({ items: [] }, { headers: CORS });
  }
  const data = await readData(env);
  return Response.json({ items: data.items }, { headers: CORS });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  try {
    const body = await request.json();
    const cleaned = cleanItem(body.item, null);
    if (!cleaned) {
      return Response.json({ error: '입력값을 확인해주세요.' }, { status: 400, headers: CORS });
    }
    const data = await readData(env);
    data.items.push(cleaned);
    const saved = await writeData(env, data.items);
    return Response.json({ items: saved.items }, { headers: CORS });
  } catch (error) {
    console.error('teach create error:', error);
    return Response.json({ error: '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  try {
    const body = await request.json();
    const id = text(body.item?.id, 80);
    const data = await readData(env);
    const idx = data.items.findIndex(item => item.id === id);
    if (idx === -1) {
      return Response.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }
    const cleaned = cleanItem(body.item, data.items[idx]);
    if (!cleaned) {
      return Response.json({ error: '입력값을 확인해주세요.' }, { status: 400, headers: CORS });
    }
    data.items[idx] = cleaned;
    const saved = await writeData(env, data.items);
    return Response.json({ items: saved.items }, { headers: CORS });
  } catch (error) {
    console.error('teach update error:', error);
    return Response.json({ error: '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
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
    return Response.json({ error: '삭제할 항목이 없습니다.' }, { status: 400, headers: CORS });
  }
  const data = await readData(env);
  const filtered = data.items.filter(item => item.id !== id);
  const saved = await writeData(env, filtered);
  return Response.json({ items: saved.items }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
