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

async function verifyAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;

  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-admin' || parts.length < 2) return false;
    const expires = parseInt(parts[1], 10);
    if (!expires || Date.now() > expires) return false;

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
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

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: 'Admin authorization is required.' }, { status: 401, headers: CORS });
  }
  if (!env.CAMP_KV) {
    return Response.json({ error: 'CAMP_KV binding is missing.' }, { status: 500, headers: CORS });
  }

  const url = new URL(request.url);
  const campId = url.searchParams.get('campId');
  if (!validCampId(campId)) {
    return Response.json({ error: 'Valid campId is required.' }, { status: 400, headers: CORS });
  }

  const config = normalizeConfig(await env.CAMP_KV.get(keyFor(campId), 'json'));
  return Response.json({ campId, config }, { headers: CORS });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: 'Admin authorization is required.' }, { status: 401, headers: CORS });
  }
  if (!env.CAMP_KV) {
    return Response.json({ error: 'CAMP_KV binding is missing.' }, { status: 500, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400, headers: CORS });
  }

  if (!validCampId(body?.campId)) {
    return Response.json({ error: 'Valid campId is required.' }, { status: 400, headers: CORS });
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
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
