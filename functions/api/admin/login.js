/**
 * POST /api/admin/login
 * Verifies ADMIN_PASSWORD env var and returns a signed token (valid 24h)
 *
 * Set ADMIN_PASSWORD in Cloudflare Pages:
 *   Settings → Environment variables → Add variable → ADMIN_PASSWORD
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function generateToken(secret) {
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24시간
  const data = `wolko-admin:${expires}`;
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

  if (!env.ADMIN_PASSWORD) {
    return Response.json(
      { error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' },
      { status: 500, headers: CORS }
    );
  }

  try {
    const { password } = await request.json();
    if (!password || password !== env.ADMIN_PASSWORD) {
      return Response.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: CORS }
      );
    }

    const token = await generateToken(env.ADMIN_PASSWORD);
    return Response.json({ token }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
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
