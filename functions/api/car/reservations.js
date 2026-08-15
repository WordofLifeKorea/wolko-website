/**
 * GET    /api/car/reservations         — list all reservations
 * POST   /api/car/reservations         — create a reservation
 * PUT    /api/car/reservations         — edit a reservation (body.id required)
 * DELETE /api/car/reservations?id=     — delete a reservation
 *
 * 차량 목록은 이 파일에서 검증하고, 화면 표시용 라벨/색상은
 * src/pages/car/index.astro 쪽에 동일한 id로 별도 정의되어 있다.
 * (차량을 추가/변경할 땐 두 곳을 함께 수정)
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const VEHICLE_IDS = new Set(['silver-van', 'santa-fe']);
const KV_PREFIX = 'car:res:';

async function verifyToken(request, env) {
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
    if (parts[0] !== 'wolko-car') return false;
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

async function listReservations(env) {
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function parseOptionalNonNegNumber(value, max, label) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > max) throw new Error(`${label} 값이 올바르지 않습니다.`);
  return num;
}

function parseReservationInput(body) {
  const vehicleId = String(body.vehicleId || '').trim();
  const startDate = String(body.startDate || '').trim();
  const startTime = String(body.startTime || '09:00').trim();
  const endDate = String(body.endDate || '').trim();
  const endTime = String(body.endTime || '18:00').trim();
  const reserverName = String(body.reserverName || '').trim().slice(0, 60);
  const phone = String(body.phone || '').trim().slice(0, 30);
  const purpose = String(body.purpose || '').trim().slice(0, 200);
  const notes = String(body.notes || '').trim().slice(0, 1000);
  const actualHours = parseOptionalNonNegNumber(body.actualHours, 1000, '실제 운행 시간');
  const actualKm = parseOptionalNonNegNumber(body.actualKm, 100000, '실제 운행 거리');

  if (!VEHICLE_IDS.has(vehicleId)) throw new Error('차량을 선택해 주세요.');
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) throw new Error('날짜 형식이 올바르지 않습니다.');
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) throw new Error('시간 형식이 올바르지 않습니다.');
  if (!reserverName) throw new Error('예약자 이름을 입력해 주세요.');
  if (!purpose) throw new Error('목적/행선지를 입력해 주세요.');

  const startAt = `${startDate}T${startTime}:00`;
  const endAt = `${endDate}T${endTime}:00`;
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error('날짜/시간이 올바르지 않습니다.');
  if (endMs <= startMs) throw new Error('종료 일시는 시작 일시보다 나중이어야 합니다.');

  return { vehicleId, startDate, startTime, endDate, endTime, startAt, endAt, reserverName, phone, purpose, notes, actualHours, actualKm };
}

function findConflict(reservations, candidate, excludeId) {
  const startMs = Date.parse(candidate.startAt);
  const endMs = Date.parse(candidate.endAt);
  return reservations.find(r => {
    if (r.vehicleId !== candidate.vehicleId) return false;
    if (excludeId && r.id === excludeId) return false;
    const rStart = Date.parse(r.startAt);
    const rEnd = Date.parse(r.endAt);
    return startMs < rEnd && endMs > rStart;
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  const reservations = await listReservations(env);
  reservations.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return Response.json({ reservations }, { headers: CORS });
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
    const parsed = parseReservationInput(body);
    const reservations = await listReservations(env);
    const conflict = findConflict(reservations, parsed, null);
    if (conflict) {
      return Response.json({ error: '해당 시간에 이미 예약이 있습니다.', conflict }, { status: 409, headers: CORS });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reservation = { id, ...parsed, createdAt: new Date().toISOString() };
    await env.CAMP_KV.put(`${KV_PREFIX}${id}`, JSON.stringify(reservation));
    return Response.json({ ok: true, reservation }, { headers: CORS });
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
    return Response.json({ error: '예약 ID가 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const key = `${KV_PREFIX}${id}`;
    const existing = await env.CAMP_KV.get(key, 'json');
    if (!existing) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    const parsed = parseReservationInput(body);
    const reservations = await listReservations(env);
    const conflict = findConflict(reservations, parsed, id);
    if (conflict) {
      return Response.json({ error: '해당 시간에 이미 예약이 있습니다.', conflict }, { status: 409, headers: CORS });
    }

    const reservation = { ...existing, ...parsed, id, updatedAt: new Date().toISOString() };
    await env.CAMP_KV.put(key, JSON.stringify(reservation));
    return Response.json({ ok: true, reservation }, { headers: CORS });
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
    return Response.json({ error: '예약 ID가 없습니다.' }, { status: 400, headers: CORS });
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
