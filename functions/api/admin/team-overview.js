import { portalSession } from '../../lib/hubAccounts.js';

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

/** 로그인한(승인된) 포탈 멤버 누구나. */
async function verifyAdmin(request, env) {
  return !!(await portalSession(request, env));
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
