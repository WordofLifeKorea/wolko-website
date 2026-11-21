/**
 * GET /api/materials              공개 — 포탈 교재 중 '배포 표시'된 파일 목록 (자료별로 묶음)
 * GET /api/materials?thumb=자료id  공개 — 그 자료의 대표 그림(배포 표시된 파일이 있는 자료만)
 * 파일 자체는 여기서 주지 않는다 — 신청(/api/materials/request) 뒤 일회용 주소로만 받는다.
 */
import { readData } from '../../lib/portalResources.js';
import { readPublished, publishedGroups } from '../../lib/materials.js';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: JSON_HEADERS });
  const url = new URL(request.url);
  const [data, pub] = await Promise.all([readData(env), readPublished(env)]);
  const groups = publishedGroups(data.items, pub);

  const thumbId = (url.searchParams.get('thumb') || '').slice(0, 80);
  if (thumbId) {
    const item = groups.some((g) => g.id === thumbId) && data.items.find((i) => i.id === thumbId);
    const m = item && /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/is.exec(item.thumbnailData || '');
    if (!m) return new Response('Not found', { status: 404 });
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  }

  return Response.json({ items: groups }, { headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=30' } });
}
