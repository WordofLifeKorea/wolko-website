/**
 * GET /api/geocode?query=주소
 * OpenStreetMap Nominatim 지오코딩 프록시 (무료, 인증 불필요)
 * 한국(kr) 한정 검색
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query?.trim()) {
    return Response.json({ addresses: [] }, { headers: CORS });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=kr&limit=5&addressdetails=1`,
      { headers: { 'User-Agent': 'WOLKO-CRS/1.0 (wolkorea1@gmail.com)' } }
    );

    if (!res.ok) {
      return Response.json({ addresses: [] }, { headers: CORS });
    }

    const data = await res.json();

    // Nominatim → Naver 형식으로 변환
    const addresses = data.map(item => ({
      roadAddress: item.display_name,
      jibunAddress: item.display_name,
      y: item.lat,   // latitude
      x: item.lon,   // longitude
    }));

    return Response.json({ addresses }, { headers: CORS });
  } catch (e) {
    return Response.json({ addresses: [] }, { headers: CORS });
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
