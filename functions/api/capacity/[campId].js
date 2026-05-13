/**
 * GET /api/capacity/:campId
 * Returns current registration count for a camp session.
 * Also returns gender-split counts (countMale, countFemale).
 */
export async function onRequestGet(context) {
  const { params, env } = context;
  const campId = params.campId;

  try {
    const [count, countMale, countFemale] = await Promise.all([
      env.CAMP_KV.get(`camp:${campId}:count`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:count:male`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:count:female`).then(v => parseInt(v || '0')),
    ]);
    return Response.json({ campId, count, countMale, countFemale }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return Response.json({ campId, count: 0, countMale: 0, countFemale: 0 }, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
