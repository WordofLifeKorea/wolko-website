const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function naverGeocode(query, clientId, clientSecret) {
  const res = await fetch(
    `https://naveropenapi.apigw.naver.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
    {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    }
  );
  if (!res.ok) throw new Error(`Naver ${res.status}`);
  const data = await res.json();
  return (data.addresses || []).map(addr => ({
    roadAddress: addr.roadAddress,
    jibunAddress: addr.jibunAddress,
    y: addr.y,
    x: addr.x,
  }));
}

async function nominatimGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=kr&limit=5&addressdetails=1`,
    { headers: { 'User-Agent': 'WOLKO-CRS/1.0 (wolkorea1@gmail.com)' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(item => ({
    roadAddress: item.display_name,
    jibunAddress: item.display_name,
    y: item.lat,
    x: item.lon,
  }));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query?.trim()) {
    return Response.json({ addresses: [] }, { headers: CORS });
  }

  try {
    let addresses = [];
    if (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
      try {
        addresses = await naverGeocode(query, env.NAVER_CLIENT_ID, env.NAVER_CLIENT_SECRET);
      } catch (e) {
        addresses = await nominatimGeocode(query);
      }
    } else {
      addresses = await nominatimGeocode(query);
    }
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
