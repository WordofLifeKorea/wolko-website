const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const PLAN_KEY = 'schedule-planner:data:v1';
const TYPE_SET = new Set(['program', 'meeting', 'meal', 'transport', 'prep', 'free']);

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
    if (parts[0] !== 'wolko-schedule-planner' || parts[1] !== 'admin') return false;
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

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ''));
}

function cleanVan(van, index) {
  const name = text(van?.name, 80) || `Van ${index + 1}`;
  return {
    id: text(van?.id, 80) || crypto.randomUUID(),
    name,
    seats: Math.max(0, Math.min(parseInt(van?.seats, 10) || 0, 99)),
    driver: text(van?.driver, 80),
    memo: text(van?.memo, 160),
  };
}

function cleanEvent(event) {
  const date = text(event?.date, 10);
  const start = text(event?.start, 5);
  const end = text(event?.end, 5);
  if (!isDate(date) || !isTime(start) || !isTime(end)) return null;
  return {
    id: text(event?.id, 80) || crypto.randomUUID(),
    title: text(event?.title, 120) || '제목 없음',
    type: TYPE_SET.has(event?.type) ? event.type : 'program',
    date,
    start,
    end,
    staff: text(event?.staff, 120),
    vanId: text(event?.vanId, 80),
    from: text(event?.from, 120),
    to: text(event?.to, 120),
    passengers: text(event?.passengers, 160),
    notes: text(event?.notes, 700),
  };
}

function emptyPlan() {
  return {
    title: 'WOLKO Staff Schedule',
    vans: [
      { id: 'van-1', name: 'Van 1', seats: 0, driver: '', memo: '' },
      { id: 'van-2', name: 'Van 2', seats: 0, driver: '', memo: '' },
    ],
    events: [],
    updatedAt: '',
  };
}

function cleanPlan(input, touch = true) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const vans = Array.isArray(source.vans) ? source.vans.slice(0, 30).map(cleanVan) : emptyPlan().vans;
  const events = Array.isArray(source.events)
    ? source.events.slice(0, 1500).map(cleanEvent).filter(Boolean)
    : [];
  return {
    title: text(source.title, 120) || 'WOLKO Staff Schedule',
    vans,
    events,
    updatedAt: touch ? new Date().toISOString() : text(source.updatedAt, 40),
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  const plan = await env.CAMP_KV.get(PLAN_KEY, 'json');
  return Response.json({ plan: cleanPlan(plan || emptyPlan(), false) }, { headers: CORS });
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
    const plan = cleanPlan(body.plan);
    await env.CAMP_KV.put(PLAN_KEY, JSON.stringify(plan));
    return Response.json({ plan }, { headers: CORS });
  } catch (error) {
    console.error('schedule planner save error:', error);
    return Response.json({ error: '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
