/**
 * GET  /api/admin/team-pw?slug=kim   — check if password is set
 * POST /api/admin/team-pw            — set/update password for a team member
 *
 * Body (POST): { slug, password }
 * Requires:    Authorization: Bearer <admin-token>
 * KV key:      team:{slug}:password
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

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

  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return Response.json({ error: 'slug가 필요합니다.' }, { status: 400, headers: CORS });

  if (!env.CAMP_KV) {
    return Response.json({ error: 'CAMP_KV 바인딩이 없습니다.' }, { status: 500, headers: CORS });
  }

  const existing = await env.CAMP_KV.get(`team:${slug}:password`);
  return Response.json({ slug, hasPassword: !!existing }, { headers: CORS });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  if (!env.CAMP_KV) {
    return Response.json({ error: 'CAMP_KV 바인딩이 없습니다.' }, { status: 500, headers: CORS });
  }

  let slug, password;
  try {
    ({ slug, password } = await request.json());
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400, headers: CORS });
  }

  if (!slug || !password) {
    return Response.json({ error: 'slug와 password가 필요합니다.' }, { status: 400, headers: CORS });
  }
  if (password.length < 4) {
    return Response.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400, headers: CORS });
  }

  await env.CAMP_KV.put(`team:${slug}:password`, password);
  return Response.json({ ok: true, slug }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
