/**
 * GET /api/capacity/:campId
 * Returns current registration count for a camp session.
 */
export async function onRequestGet(context) {
  const { params, env } = context;
  const campId = params.campId;

  try {
    const count = parseInt(await env.CAMP_KV.get(`camp:${campId}:count`) || '0');
    return Response.json({ campId, count }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return Response.json({ campId, count: 0 }, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
