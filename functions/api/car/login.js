/**
 * POST /api/car/login
 * 차량 스케줄 페이지(/car) 전용 로그인.
 * 관리자 페이지와 같은 ADMIN_PASSWORD를 쓰되, 토큰 namespace를 분리해서
 * 이 토큰으로는 /api/car/* 만 접근 가능하도록 한다 (admin API에는 사용 불가).
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
const PASSWORD_RE = /^[\x21-\x7E]+$/;

async function generateToken(secret) {
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24시간
  const data = `wolko-car:${expires}`;
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
    if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
      return Response.json(
        { error: '비밀번호는 영문, 숫자, 특수문자만 사용할 수 있습니다.' },
        { status: 400, headers: CORS }
      );
    }
    if (password !== env.ADMIN_PASSWORD) {
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
