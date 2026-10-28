/**
 * GET /api/partner-churches — 홈페이지에 보이는 "월코와 함께 협력하는 교회" 이름 목록과 지역 (로그인 없이, 이름·지역만)
 * CRS 연결이 없거나 읽지 못하면 빈 목록을 돌려주고, 홈페이지는 그 경우 이 구역을 숨긴다.
 */
import { loadPartnerChurchData } from '../lib/partnerChurches.js';

export async function onRequestGet({ env }) {
  try {
    const data = await loadPartnerChurchData(env);
    const names = data ? data.names : [];
    const body = { churches: names, ...(data && data.areas && Object.keys(data.areas).length ? { areas: data.areas } : {}) };   // areas: 이름 → 지역(시/군/구)
    return Response.json(body, { headers: { 'Cache-Control': names.length ? 'public, max-age=300' : 'no-store' } });
  } catch (error) {
    console.error('partner churches failed:', error.message);
    return Response.json({ churches: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
