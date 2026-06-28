const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const CONFIG_KEYS = [
  'customTeams',
  'personRoles',
  'personTeams',
  'campExclude',
  'campRoles',
  'customMembers',
];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-camp-progress') return null;
    const role = parts[1];
    const email = parts[2] === 'admin' ? '' : normalizeEmail(parts[2]);
    const expires = parseInt(parts[3], 10);
    if (!['admin', 'counselor'].includes(role) || !expires || Date.now() > expires) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    if (!ok) return null;
    return { role, email };
  } catch {
    return null;
  }
}

function emptyConfig() {
  return {
    customTeams: [],
    personRoles: {},
    personTeams: {},
    campExclude: [],
    campRoles: {},
    customMembers: [],
  };
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeConfig(config) {
  const source = isPlainObject(config) ? config : {};
  const next = emptyConfig();
  for (const key of CONFIG_KEYS) {
    if (Array.isArray(next[key])) {
      next[key] = Array.isArray(source[key]) ? source[key] : [];
    } else {
      next[key] = isPlainObject(source[key]) ? source[key] : {};
    }
  }
  return next;
}

function validCampId(campId) {
  return typeof campId === 'string' && /^[a-zA-Z0-9_-]+$/.test(campId);
}

function keyFor(campId) {
  return `admin:team-overview:${campId}`;
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const session = await verifyToken(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (session.role !== 'admin') {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  if (!validCampId(body?.campId)) {
    return Response.json({ error: '캠프 ID가 올바르지 않습니다.' }, { status: 400, headers: CORS });
  }

  const config = normalizeConfig(body.config);
  await env.CAMP_KV.put(keyFor(body.campId), JSON.stringify(config));
  return Response.json({ ok: true, campId: body.campId, config }, { headers: CORS });
}

export const onRequestPost = onRequestPut;

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
