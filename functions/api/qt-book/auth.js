const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const PASSWORD_RE = /^[\x21-\x7E]+$/;

function toHex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateToken(secret) {
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const data = `wolko-qt-book:admin:${expires}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(`${data}:${toHex(new Uint8Array(sig))}`);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }

  try {
    const body = await request.json();
    const password = String(body.password || '');
    if (!PASSWORD_RE.test(password)) {
      return Response.json({ error: '비밀번호는 영문, 숫자, 특수문자만 사용할 수 있습니다.' }, { status: 400, headers: CORS });
    }
    if (password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401, headers: CORS });
    }
    return Response.json({ token: await generateToken(env.ADMIN_PASSWORD) }, { headers: CORS });
  } catch (error) {
    console.error('qt book auth error:', error);
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
