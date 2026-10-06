/**
 * 소개 페이지의 "최근 뉴스레터" 링크 (연결된 계정이 포탈에서 직접 관리)
 * GET /api/newsletter/profile?slug=            (로그인 없이) → { enabled, url }  공개 소개 페이지가 버튼을 바꾸는 데 쓴다
 * GET /api/newsletter/profile[?slug=]          (로그인) → { slug, url }  내 설정
 * PUT /api/newsletter/profile[?slug=] { url }  (로그인한 연결 계정) 저장 (빈 값이면 포탈 설정을 지우고 기본 링크로 되돌림)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { SLUG_RE, authorFor, isLinked, profileKey, safeUrl, err, ok } from '../../lib/newsletter.js';

async function who(env, request) {
  const s = await portalSession(request, env);
  if (!s) return { res: err('포탈 로그인이 필요합니다.', 401) };
  const a = await authorFor(env, s, new URL(request.url).searchParams.get('slug'));
  if (!a) return { res: err('본인 소개 페이지와 연결되어 있지 않아요.', 403) };
  return { s, a };
}

export async function onRequestGet({ env, request }) {
  if (!(request.headers.get('Authorization') || '')) {
    const slug = new URL(request.url).searchParams.get('slug') || '';
    if (!SLUG_RE.test(slug)) return err('slug 가 필요합니다.');
    const p = await env.CAMP_KV.get(profileKey(slug), 'json');
    return Response.json({ enabled: await isLinked(env, slug), url: p?.newsletterUrl || '' }, { headers: { 'Cache-Control': 'public, max-age=60', 'Content-Type': 'application/json' } });
  }
  const w = await who(env, request); if (w.res) return w.res;
  const p = await env.CAMP_KV.get(profileKey(w.a.slug), 'json');
  return ok({ slug: w.a.slug, url: p?.newsletterUrl || '' });
}

export async function onRequestPut({ env, request }) {
  const w = await who(env, request); if (w.res) return w.res;
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const raw = String(b?.url ?? '').trim();
  if (!raw) { await env.CAMP_KV.delete(profileKey(w.a.slug)); return ok({ url: '' }); }
  const url = /^https?:\/\//i.test(raw) ? safeUrl(raw) : '';
  if (!url || url.length > 500) return err('http:// 또는 https:// 로 시작하는 링크를 입력해 주세요.');
  await env.CAMP_KV.put(profileKey(w.a.slug), JSON.stringify({ newsletterUrl: url, updatedBy: w.s.email, updatedAt: new Date().toISOString() }));
  return ok({ url });
}
