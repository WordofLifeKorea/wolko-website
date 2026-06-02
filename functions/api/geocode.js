/**
 * GET /api/geocode?query=주소
 * Naver Geocoding API 서버사이드 프록시
 * Client Secret을 서버에서만 사용하여 보안 유지
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query?.trim()) {
    return Response.json({ error: '검색어를 입력해주세요.' }, { status: 400, headers: CORS });
  }

  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
    return Response.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500, headers: CORS });
  }

  try {
    const res = await fetch(
      `https://naveropenapi.apigw.naver.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': env.NAVER_CLIENT_ID,
          'X-NCP-APIGW-API-KEY':    env.NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Naver API 오류: ${res.status}`, detail: err }, { status: res.status, headers: CORS });
    }

    const data = await res.json();
    return Response.json(data, { headers: CORS });
  } catch (e) {
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
