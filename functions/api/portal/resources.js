import { parseHubSessionToken } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const KV_KEY = 'portal:resources:v1';
const MAX_ITEMS = 120;
const MAX_THUMBNAIL_LENGTH = 1_500_000;

async function sessionFor(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token && env.ADMIN_PASSWORD ? parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
}

function canWrite(session) { return session && (session.role === 'admin' || session.role === 'master'); }
function text(value, max) { return String(value || '').trim().slice(0, max); }
function progress(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; }
function thumbnail(value) {
  const data = String(value || '');
  return /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(data) && data.length <= MAX_THUMBNAIL_LENGTH ? data : '';
}
function normalize(input, existing = {}) {
  const status = ['planning', 'translating', 'review', 'complete'].includes(input?.status) ? input.status : (existing.status || 'planning');
  return {
    id: existing.id || crypto.randomUUID(),
    title: text(input?.title, 120) || existing.title || '',
    detail: text(input?.detail, 260),
    translation: text(input?.translation, 120),
    status,
    progress: progress(input?.progress),
    thumbnailData: thumbnail(input?.thumbnailData),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
async function readData(env) { const data = await env.CAMP_KV.get(KV_KEY, 'json'); return data && Array.isArray(data.items) ? data : { items: [] }; }
async function saveData(env, items) { const data = { items: items.slice(0, MAX_ITEMS), updatedAt: new Date().toISOString() }; await env.CAMP_KV.put(KV_KEY, JSON.stringify(data)); return data; }
function error(message, status) { return Response.json({ error: message }, { status, headers: CORS }); }

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('허브 로그인이 필요합니다.', 401);
  const data = await readData(env);
  return Response.json({ items: data.items, canWrite: canWrite(session), updatedAt: data.updatedAt || '' }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('허브 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  try {
    const item = normalize((await request.json()).item);
    if (!item.title) return error('작업 항목 이름을 입력해주세요.', 400);
    const data = await readData(env);
    data.items.unshift(item);
    const saved = await saveData(env, data.items);
    return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
  } catch { return error('작업 항목을 저장하지 못했습니다.', 500); }
}

export async function onRequestPut({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('허브 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  try {
    const body = await request.json();
    const data = await readData(env);
    const index = data.items.findIndex(item => item.id === text(body.id, 80));
    if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);
    const item = normalize(body.item, data.items[index]);
    if (!item.title) return error('작업 항목 이름을 입력해주세요.', 400);
    data.items[index] = item;
    const saved = await saveData(env, data.items);
    return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
  } catch { return error('작업 항목을 수정하지 못했습니다.', 500); }
}

export async function onRequestDelete({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('허브 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  const id = new URL(request.url).searchParams.get('id') || '';
  const data = await readData(env);
  const items = data.items.filter(item => item.id !== id);
  if (items.length === data.items.length) return error('작업 항목을 찾을 수 없습니다.', 404);
  const saved = await saveData(env, items);
  return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
