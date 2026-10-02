import { ENTRY_PREFIX, PHOTO_PREFIX, fail, usageSession } from '../../lib/carUsage.js';

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('사진 ID가 올바르지 않습니다.');
  const entry = await env.CAMP_KV.get(`${ENTRY_PREFIX}${id}`, 'json');
  if (!entry) return fail('기록을 찾을 수 없습니다.', 404);
  const photo = await env.CAMP_KV.get(`${PHOTO_PREFIX}${id}`, 'arrayBuffer');
  if (!photo) return fail('사진을 찾을 수 없습니다.', 404);
  return new Response(photo, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
