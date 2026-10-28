/**
 * GET /api/partner-churches — 홈페이지에 보이는 "월코와 함께 협력하는 교회" 이름 목록 (로그인 없이, 이름만)
 * CRS 연결이 없거나 읽지 못하면 빈 목록을 돌려주고, 홈페이지는 그 경우 이 구역을 숨긴다.
 */
import { loadPartnerChurches } from '../lib/partnerChurches.js';

export async function onRequestGet({ env }) {
  try {
    const names = await loadPartnerChurches(env);
    return Response.json({ churches: names || [] }, { headers: { 'Cache-Control': names && names.length ? 'public, max-age=300' : 'no-store' } });
  } catch (error) {
    console.error('partner churches failed:', error.message);
    return Response.json({ churches: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
