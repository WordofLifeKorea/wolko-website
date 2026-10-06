/**
 * POST /api/team/portal-login   { slug }   Authorization: Bearer <포탈 세션 토큰>
 *
 * 포탈에 로그인한 계정이 본인 소개 페이지(연결된 slug)를 편집할 수 있게, 기존 편집 시스템이 쓰는 토큰(8시간)을
 * 공용 비밀번호 없이 발급한다. 마스터만 어떤 페이지든 가능(관리자도 본인 페이지만). 발급된 토큰은 기존 /api/team/update · upload 가 그대로 인식한다.
 * (연결은 포탈의 '내 페이지 → 작성자 연결'에서 마스터가 지정한다.)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { SLUG_RE, authorFor } from '../../lib/newsletter.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

async function generateToken(slug, secret) {
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8시간 (login.js 와 같은 형식)
  const data = `wolko-team:${slug}:${expires}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${data}:${sigHex}`);
}

export async function onRequestPost({ env, request }) {
  if (!env.ADMIN_PASSWORD) return Response.json({ error: '서버 설정 오류입니다.' }, { status: 500, headers: CORS });
  const s = await portalSession(request, env);
  if (!s) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  let slug; try { ({ slug } = await request.json()); } catch { return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS }); }
  if (!SLUG_RE.test(String(slug || ''))) return Response.json({ error: 'slug 가 필요합니다.' }, { status: 400, headers: CORS });
  const a = await authorFor(env, s, slug);
  if (!a || a.slug !== slug) return Response.json({ error: '이 소개 페이지를 편집할 권한이 없어요. 포탈의 "내 페이지"에서 연결을 요청해 주세요.' }, { status: 403, headers: CORS });
  return Response.json({ token: await generateToken(slug, env.ADMIN_PASSWORD) }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
