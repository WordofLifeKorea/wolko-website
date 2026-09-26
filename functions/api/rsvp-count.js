/**
 * GET /api/rsvp-count?eventId=  — 공개 참석 인원 합계 (이름 등 개인정보는 포함하지 않는다)
 * 초대장 페이지에서 "지금까지 N명이 함께해요" 같은 문구를 보여줄 때 쓴다.
 *
 * KV: rsvp:{eventId}:{rsvpId}
 */
const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const eventId = clean(new URL(request.url).searchParams.get('eventId') || 'thanksgiving-night', 60);

  const list = await env.CAMP_KV.list({ prefix: `rsvp:${eventId}:` });
  let totalGuests = 0;
  let totalRsvps = 0;
  for (const key of list.keys) {
    if (key.name.includes(':email:')) continue;
    const raw = await env.CAMP_KV.get(key.name);
    if (!raw) continue;
    try {
      const rsvp = JSON.parse(raw);
      totalGuests += Number(rsvp.partySize) || 0;
      totalRsvps += 1;
    } catch (e) { /* 손상된 값은 건너뛴다 */ }
  }

  return Response.json({ eventId, totalGuests, totalRsvps }, { headers: CORS });
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
