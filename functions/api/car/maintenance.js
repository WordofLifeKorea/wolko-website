/**
 * GET    /api/car/maintenance         — list all maintenance records
 * POST   /api/car/maintenance         — create a maintenance record
 * PUT    /api/car/maintenance         — edit a maintenance record (body.id required)
 * DELETE /api/car/maintenance?id=     — delete a maintenance record
 *
 * 엔진오일 교체 등 차량 정비 이력. 차량 목록은 reservations.js와 동일하게 검증한다.
 */

import { parseHubSessionToken } from '../../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const VEHICLE_IDS = new Set(['silver-van', 'santa-fe']);
const SERVICE_TYPES = new Set(['oil', 'tire', 'battery', 'inspection', 'other']);
const KV_PREFIX = 'car:maint:';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 차량 캘린더는 별도 토큰 없이 허브 세션 토큰을 그대로 쓴다(role admin/master만 통과). */
async function verifyToken(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  return !!session && (session.role === 'admin' || session.role === 'master');
}

async function listMaintenance(env) {
  const items = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: KV_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    const values = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
    items.push(...values.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return items;
}

function parseMaintenanceInput(body) {
  const vehicleId = String(body.vehicleId || '').trim();
  const date = String(body.date || '').trim();
  const serviceType = String(body.serviceType || '').trim();
  const mileageKmRaw = body.mileageKm;
  const technician = String(body.technician || '').trim().slice(0, 60);
  const notes = String(body.notes || '').trim().slice(0, 1000);

  if (!VEHICLE_IDS.has(vehicleId)) throw new Error('차량을 선택해 주세요.');
  if (!DATE_RE.test(date)) throw new Error('날짜 형식이 올바르지 않습니다.');
  if (!SERVICE_TYPES.has(serviceType)) throw new Error('정비 종류를 선택해 주세요.');
  if (!technician) throw new Error('담당자 이름을 입력해 주세요.');

  const mileageKm = Number(mileageKmRaw);
  if (!Number.isFinite(mileageKm) || mileageKm < 0 || mileageKm > 2000000) {
    throw new Error('키로수 값이 올바르지 않습니다.');
  }

  return { vehicleId, date, serviceType, mileageKm, technician, notes };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  const records = await listMaintenance(env);
  records.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return Response.json({ records }, { headers: CORS });
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

  try {
    const parsed = parseMaintenanceInput(body);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id, ...parsed, createdAt: new Date().toISOString() };
    await env.CAMP_KV.put(`${KV_PREFIX}${id}`, JSON.stringify(record));
    return Response.json({ ok: true, record }, { headers: CORS });
  } catch (error) {
    return Response.json({ error: error.message || '저장하지 못했습니다.' }, { status: 400, headers: CORS });
  }
}

export async function onRequestPut(context) {
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

  const id = String(body.id || '').trim();
  if (!id) {
    return Response.json({ error: '정비 기록 ID가 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const key = `${KV_PREFIX}${id}`;
    const existing = await env.CAMP_KV.get(key, 'json');
    if (!existing) {
      return Response.json({ error: '정비 기록을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }
    const parsed = parseMaintenanceInput(body);
    const record = { ...existing, ...parsed, id, updatedAt: new Date().toISOString() };
    await env.CAMP_KV.put(key, JSON.stringify(record));
    return Response.json({ ok: true, record }, { headers: CORS });
  } catch (error) {
    return Response.json({ error: error.message || '수정하지 못했습니다.' }, { status: 400, headers: CORS });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) {
    return Response.json({ error: '정비 기록 ID가 없습니다.' }, { status: 400, headers: CORS });
  }
  await env.CAMP_KV.delete(`${KV_PREFIX}${id}`);
  return Response.json({ ok: true }, { headers: CORS });
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
