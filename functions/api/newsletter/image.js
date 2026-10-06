/**
 * POST /api/newsletter/image   { data: dataURL }  (작성자만) → { id }
 * GET  /api/newsletter/image?id=                  (누구나: 메일·웹에서 보이는 이미지)
 * 화면에서 1600px 이하로 줄여서 올린다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { ID_RE, ALLOWED_IMAGE, MAX_IMAGE_BYTES, imgKey, authorFor, newId, err, ok } from '../../lib/newsletter.js';

export async function onRequestPost({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  if (!await authorFor(env, s, null)) return err('먼저 본인 소개 페이지와 연결되어 있어야 해요.', 403);
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const m = String(b?.data || '').match(/^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !ALLOWED_IMAGE.test(m[1])) return err('JPG · PNG · WEBP · GIF 이미지만 올릴 수 있어요.');
  if (m[2].length * 0.75 > MAX_IMAGE_BYTES) return err('이미지가 너무 커요 (2MB 이하).');
  const id = newId();
  await env.CAMP_KV.put(imgKey(id), m[2], { metadata: { type: m[1], by: s.email } });
  return ok({ id });
}

export async function onRequestGet({ env, request }) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.CAMP_KV.getWithMetadata(imgKey(id));
  if (!value) return new Response('Not found', { status: 404 });
  const bin = atob(value), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'Content-Type': metadata?.type || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
