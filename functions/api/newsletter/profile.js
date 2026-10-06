/**
 * 소개 페이지의 "최근 뉴스레터" 링크 (연결된 계정이 포탈에서 직접 관리)
 * GET /api/newsletter/profile[?slug=]            (작성자) → { url }
 * PUT /api/newsletter/profile[?slug=] { url }    (작성자) 저장 (빈 값이면 포탈 설정을 지우고 기본 링크로 되돌림)
 * 공개 소개 페이지는 /api/newsletter/posts?slug= 응답의 newsletterUrl 로 이 값을 받아 버튼을 바꾼다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { authorFor, profileKey, safeUrl, err, ok } from '../../lib/newsletter.js';

async function who(env, request) {
  const s = await portalSession(request, env);
  if (!s) return { res: err('포탈 로그인이 필요합니다.', 401) };
  const a = await authorFor(env, s, new URL(request.url).searchParams.get('slug'));
  if (!a) return { res: err('본인 소개 페이지와 연결되어 있지 않아요.', 403) };
  return { s, a };
}

export async function onRequestGet({ env, request }) {
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
