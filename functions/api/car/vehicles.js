/**
 * GET    /api/car/vehicles      — list missionary vehicles (Silver Van/Santa Fe are built into the frontend, not stored here)
 * POST   /api/car/vehicles      — add a missionary vehicle { name }
 * DELETE /api/car/vehicles?id=  — remove a missionary vehicle
 *
 * 메인랜드 선교사 차량 목록. WOLKO 소유 차량(Silver Van/Santa Fe)과 달리 선교사는
 * 계속 늘거나 바뀌므로 하드코딩하지 않고 KV에 배열로 저장해 관리자가 직접 추가/삭제한다.
 * KV key: car:vehicles:missionary → [{ id, name, addedAt }]
 */
import { parseHubSessionToken } from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const KV_KEY = 'car:vehicles:missionary';
const NAME_MAX_LEN = 40;

/** 차량 캘린더는 별도 토큰 없이 허브 세션 토큰을 그대로 쓴다(role admin/master만 통과). */
async function verifyToken(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  return !!session && (session.role === 'admin' || session.role === 'master');
}

async function listVehicles(env) {
  return (await env.CAMP_KV.get(KV_KEY, 'json')) || [];
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  const vehicles = await listVehicles(env);
  return Response.json({ vehicles }, { headers: CORS });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const name = String(body.name || '').trim();
  if (!name) {
    return Response.json({ error: '선교사님 이름을 입력해 주세요.' }, { status: 400, headers: CORS });
  }
  if (name.length > NAME_MAX_LEN) {
    return Response.json({ error: `이름은 ${NAME_MAX_LEN}자 이내로 입력해 주세요.` }, { status: 400, headers: CORS });
  }

  const vehicles = await listVehicles(env);
  const id = `missionary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const vehicle = { id, name, addedAt: new Date().toISOString() };
  vehicles.push(vehicle);
  await env.CAMP_KV.put(KV_KEY, JSON.stringify(vehicles));

  return Response.json({ success: true, vehicle }, { headers: CORS });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'id가 필요합니다.' }, { status: 400, headers: CORS });
  }

  const vehicles = await listVehicles(env);
  const nextVehicles = vehicles.filter(v => v.id !== id);
  if (nextVehicles.length === vehicles.length) {
    return Response.json({ error: '해당 차량을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
  }
  await env.CAMP_KV.put(KV_KEY, JSON.stringify(nextVehicles));

  return Response.json({ success: true }, { headers: CORS });
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
