const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const DATA_KEY = 'teach:data:v1';
const MAX_ITEMS = 2000;
const TAB_SET = new Set(['teacher', 'program', 'counselor', 'preacher', 'general']);

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

function extractMetaImage(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const wanted = ['og:image', 'og:image:secure_url', 'twitter:image'];
  for (const name of wanted) {
    for (const tag of tags) {
      const isMatch = new RegExp(`(?:property|name)\\s*=\\s*["']${name}["']`, 'i').test(tag);
      if (!isMatch) continue;
      const contentMatch = tag.match(/content\s*=\s*["']([^"']+)["']/i);
      if (contentMatch) return contentMatch[1];
    }
  }
  return '';
}

async function fetchCanvaThumbnail(url) {
  try {
    const host = new URL(url).hostname;
    if (!/(^|\.)canva\.com$/.test(host)) return '';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.error('fetchCanvaThumbnail: non-ok response', res.status);
      return '';
    }
    const html = await res.text();
    const image = extractMetaImage(html);
    if (!image) console.error('fetchCanvaThumbnail: no og:image found for', url);
    return image;
  } catch (error) {
    console.error('fetchCanvaThumbnail error:', error);
    return '';
  }
}

async function cleanItem(input, existing) {
  const tab = TAB_SET.has(input?.tab) ? input.tab : (existing?.tab || '');
  const team = text(input?.team, 60) || existing?.team || '';
  const person = input?.person !== undefined ? text(input.person, 80) : (existing?.person || '');
  const session = text(input?.session, 80) || existing?.session || '';
  const title = text(input?.title, 160) || existing?.title || '';
  const url = text(input?.url, 500) || existing?.url || '';
  const bgmUrl = input?.bgmUrl !== undefined ? text(input.bgmUrl, 500) : (existing?.bgmUrl || '');
  if (!tab) return { error: '탭 값이 올바르지 않습니다.' };
  if (!session) return { error: '세션을 입력해주세요.' };
  if (!title) return { error: '제목을 입력해주세요.' };
  if (!url) return { error: '링크 또는 파일을 입력해주세요.' };
  if (!isValidUrl(url)) return { error: `링크 형식이 올바르지 않습니다: ${url.slice(0, 80)}` };
  if (tab === 'teacher' && !team) return { error: '팀을 선택해주세요.' };
  if (bgmUrl && !isValidUrl(bgmUrl)) return { error: `BGM 링크 형식이 올바르지 않습니다: ${bgmUrl.slice(0, 80)}` };
  const now = new Date().toISOString();
  let thumbnailUrl = existing?.thumbnailUrl || '';
  if (!thumbnailUrl || url !== existing?.url) {
    thumbnailUrl = await fetchCanvaThumbnail(url);
  }
  return {
    item: {
      id: existing?.id || text(input?.id, 80) || crypto.randomUUID(),
      tab,
      team: tab === 'teacher' ? team : '',
      person: tab === 'teacher' ? person : '',
      session,
      title,
      url,
      bgmUrl,
      thumbnailUrl: text(thumbnailUrl, 500),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
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

function inferLegacyTab(item) {
  // tab 필드가 도입되기 전에 저장된 항목: team이 있으면 수업자료(teacher) 데이터였던 것으로 간주
  if (item.tab && TAB_SET.has(item.tab)) return item.tab;
  return item.team ? 'teacher' : 'general';
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CAMP_KV) {
    return Response.json({ items: [] }, { headers: CORS });
  }
  const data = await readData(env);
  const items = data.items.map(item => (
    item.tab && TAB_SET.has(item.tab) ? item : { ...item, tab: inferLegacyTab(item) }
  ));
  return Response.json({ items }, { headers: CORS });
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
    const result = await cleanItem(body.item, null);
    if (!result.item) {
      return Response.json({ error: result.error || '입력값을 확인해주세요.' }, { status: 400, headers: CORS });
    }
    const data = await readData(env);
    data.items.push(result.item);
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
    const result = await cleanItem(body.item, data.items[idx]);
    if (!result.item) {
      return Response.json({ error: result.error || '입력값을 확인해주세요.' }, { status: 400, headers: CORS });
    }
    data.items[idx] = result.item;
    const saved = await writeData(env, data.items);
    return Response.json({ items: saved.items }, { headers: CORS });
  } catch (error) {
    console.error('teach update error:', error);
    return Response.json({ error: '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestPatch(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  try {
    const body = await request.json();
    const orderedIds = Array.isArray(body.ids) ? body.ids.map(id => text(id, 80)).filter(Boolean) : [];
    if (!orderedIds.length) {
      return Response.json({ error: '순서 정보가 없습니다.' }, { status: 400, headers: CORS });
    }
    const data = await readData(env);
    const byId = new Map(data.items.map(item => [item.id, item]));
    const orderedSet = new Set(orderedIds);
    const result = [];
    let inserted = false;
    data.items.forEach(item => {
      if (orderedSet.has(item.id)) {
        if (!inserted) {
          orderedIds.forEach(id => { if (byId.has(id)) result.push(byId.get(id)); });
          inserted = true;
        }
      } else {
        result.push(item);
      }
    });
    const saved = await writeData(env, result);
    return Response.json({ items: saved.items }, { headers: CORS });
  } catch (error) {
    console.error('teach reorder error:', error);
    return Response.json({ error: '순서를 저장하지 못했습니다.' }, { status: 500, headers: CORS });
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
