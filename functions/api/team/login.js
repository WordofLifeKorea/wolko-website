/**
 * POST /api/team/login
 * Body: { slug, password }
 *
 * Checks provided password against TEAM_PASSWORD env var (single shared password).
 * Returns a signed token valid for 8 hours with the slug embedded.
 *
 * Sign secret: ADMIN_PASSWORD env var
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function generateToken(slug, secret) {
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8시간
  const data = `wolko-team:${slug}:${expires}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${data}:${sigHex}`);
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.ADMIN_PASSWORD || !env.TEAM_PASSWORD) {
    return Response.json(
      { error: '서버 설정 오류 — ADMIN_PASSWORD 또는 TEAM_PASSWORD가 없습니다.' },
      { status: 500, headers: CORS }
    );
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

  if (password !== env.TEAM_PASSWORD) {
    return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers: CORS });
  }

  const token = await generateToken(slug, env.ADMIN_PASSWORD);
  return Response.json({ token }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
