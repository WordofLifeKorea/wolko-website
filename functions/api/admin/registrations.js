/**
 * GET  /api/admin/registrations        — list all registrations
 * GET  /api/admin/registrations?campId — filter by camp
 * DELETE /api/admin/registrations?regId=&campId= — delete one registration
 *
 * Requires: Authorization: Bearer <token>  (issued by /api/admin/login)
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function verifyToken(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;

  try {
    const decoded = atob(token);
    // format: wolko-admin:{expires}:{sigHex}
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);

    const parts = data.split(':');
    const expires = parseInt(parts[1]);
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

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const campId = url.searchParams.get('campId');

  try {
    let allRegs = [];

    if (campId) {
      const prefix = `camp:${campId}:reg:`;
      let cursor;
      do {
        const result = await env.CAMP_KV.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
        const regs = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
        allRegs.push(...regs.filter(Boolean));
        cursor = result.list_complete ? null : result.cursor;
      } while (cursor);
    } else {
      let cursor;
      do {
        const result = await env.CAMP_KV.list({ prefix: 'camp:', ...(cursor ? { cursor } : {}), limit: 1000 });
        const regKeys = result.keys.filter(k => /^camp:[^:]+:reg:/.test(k.name));
        const regs = await Promise.all(regKeys.map(k => env.CAMP_KV.get(k.name, 'json')));
        allRegs.push(...regs.filter(Boolean));
        cursor = result.list_complete ? null : result.cursor;
      } while (cursor);
    }

    allRegs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    return Response.json({ registrations: allRegs }, { headers: CORS });
  } catch (e) {
    console.error('admin registrations error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;

  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const regId = url.searchParams.get('regId');
  const campId = url.searchParams.get('campId');

  if (!regId || !campId) {
    return Response.json({ error: 'regId와 campId가 필요합니다.' }, { status: 400, headers: CORS });
  }

  try {
    const regKey = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(regKey, 'json');
    if (!reg) {
      return Response.json({ error: '해당 신청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    const spotsToFree = reg.registrationType === 'group' ? (reg.groupCount || 1) : 1;
    const countKey = `camp:${campId}:count`;
    const dupeKey = `camp:${campId}:email:${reg.email}`;
    const currentCount = parseInt(await env.CAMP_KV.get(countKey) || '0');
    const newCount = Math.max(0, currentCount - spotsToFree);

    await Promise.all([
      env.CAMP_KV.delete(regKey),
      env.CAMP_KV.delete(dupeKey),
      env.CAMP_KV.put(countKey, String(newCount)),
    ]);

    return Response.json({ success: true, newCount }, { headers: CORS });
  } catch (e) {
    console.error('admin delete error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
