import { churchMinimum, readChurches } from '../../lib/campChurches.js';
/**
 * GET /api/capacity/:campId
 * Returns final-confirmed participant counts for a camp session.
 * Also returns all submitted participant counts for capacity/waitlist checks.
 */
export async function onRequestGet(context) {
  const { params, env } = context;
  const campId = params.campId;

  try {
    const [count, countMale, countFemale, submissions, subsMale, subsFemale] = await Promise.all([
      env.CAMP_KV.get(`camp:${campId}:count`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:count:male`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:count:female`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:submissions`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:submissions:male`).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(`camp:${campId}:submissions:female`).then(v => parseInt(v || '0')),
    ]);
    // 연합캠프: 참여 신청한 교회 수(최소 교회 수가 있는 캠프만)
    let churches;
    if (churchMinimum(campId)) { try { churches = (await readChurches(env, campId))?.count ?? 0; } catch (e) { churches = undefined; } }
    return Response.json({ campId, count, countMale, countFemale, submissions, subsMale, subsFemale, ...(churches !== undefined ? { churches } : {}) }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return Response.json({ campId, count: 0, countMale: 0, countFemale: 0, submissions: 0, subsMale: 0, subsFemale: 0 }, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
