const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const CAMPS_KEY = 'teach:camps:v1';
const DATA_KEY = 'teach:data:v1';
const SEASON_SET = new Set(['summer', 'winter']);

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

function emptyCamps() {
  return { camps: [], updatedAt: '' };
}

async function readCamps(env) {
  const raw = await env.CAMP_KV.get(CAMPS_KEY, 'json');
  return raw && Array.isArray(raw.camps) ? raw : emptyCamps();
}

async function writeCamps(env, camps) {
  const data = { camps, updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(CAMPS_KEY, JSON.stringify(data));
  return data;
}

function seasonOf(session) {
  if (/겨울|winter/i.test(session)) return 'winter';
  return 'summer';
}

function yearOf(session) {
  const m = String(session).match(/\b(20\d{2})\b/);
  return m ? m[1] : '기타';
}

// 캠프 taxonomy가 비어있고 기존(session 문자열 기반) 자료가 있으면,
// 1회성으로 고유 session마다 캠프를 자동 생성하고 각 아이템에 campIds를 채워준다.
// 데이터 유실 방지: 이미 등록된 자료가 어떤 캠프에도 안 걸려서 화면에서 사라지는 일이 없도록 함.
async function migrateLegacySessions(env, camps) {
  if (camps.camps.length > 0) return camps;
  const rawData = await env.CAMP_KV.get(DATA_KEY, 'json');
  const items = rawData && Array.isArray(rawData.items) ? rawData.items : [];
  const uniqueSessions = [...new Set(items.map(i => text(i.session, 80)).filter(Boolean))];
  if (!uniqueSessions.length) return camps;

  const now = new Date().toISOString();
  const newCamps = uniqueSessions.map(session => ({
    id: crypto.randomUUID(),
    year: yearOf(session),
    season: seasonOf(session),
    name: session,
    createdAt: now,
  }));
  const saved = await writeCamps(env, newCamps);

  const sessionToId = new Map(newCamps.map(c => [c.name, c.id]));
  let changed = false;
  items.forEach(item => {
    if ((!Array.isArray(item.campIds) || !item.campIds.length) && item.session) {
      const id = sessionToId.get(text(item.session, 80));
      if (id) { item.campIds = [id]; changed = true; }
    }
  });
  if (changed) {
    await env.CAMP_KV.put(DATA_KEY, JSON.stringify({ items, updatedAt: now }));
  }
  return saved;
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CAMP_KV) {
    return Response.json({ camps: [] }, { headers: CORS });
  }
  let camps = await readCamps(env);
  camps = await migrateLegacySessions(env, camps);
  return Response.json({ camps: camps.camps }, { headers: CORS });
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
    const year = text(body.year, 10);
    const season = SEASON_SET.has(body.season) ? body.season : '';
    const name = text(body.name, 80);
    if (!year || !season || !name) {
      return Response.json({ error: '연도, 계절, 이름을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    const data = await readCamps(env);
    data.camps.push({ id: crypto.randomUUID(), year, season, name, createdAt: new Date().toISOString() });
    const saved = await writeCamps(env, data.camps);
    return Response.json({ camps: saved.camps }, { headers: CORS });
  } catch (error) {
    console.error('teach camps create error:', error);
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
    return Response.json({ error: '삭제할 캠프가 없습니다.' }, { status: 400, headers: CORS });
  }
  const data = await readCamps(env);
  const filtered = data.camps.filter(c => c.id !== id);
  const saved = await writeCamps(env, filtered);
  return Response.json({ camps: saved.camps }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
