/**
 * 개인 소개 페이지 관리 — 공용 도우미.
 * 포탈 계정을 본인 소개 페이지(team 콘텐츠의 slug)에 연결해 두면, 그 계정이 포탈에서
 *  - 소개 페이지 편집 화면(/team-edit/{slug}/)에 공용 비밀번호 없이 들어가고
 *  - 소개 페이지의 "최근 뉴스레터" 링크를 직접 바꿀 수 있다.
 *
 * KV(CAMP_KV) 키
 *   nl:link:{email}     → { slug, displayName }   포탈 계정 ↔ 본인 소개 페이지 연결
 *   nl:profile:{slug}   → { newsletterUrl, updatedBy, updatedAt }   포탈에서 정한 뉴스레터 링크 (파일 설정보다 우선)
 */
import { normalizeEmail } from './hubAccounts.js';

export const LINK_PREFIX = 'nl:link:';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

export const linkKey = email => `${LINK_PREFIX}${normalizeEmail(email)}`;
export const profileKey = slug => `nl:profile:${slug}`;

export const J = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
export const err = (error, status = 400) => Response.json({ error }, { status, headers: J });
export const ok = (body = { ok: true }) => Response.json(body, { headers: J });
export const clip = (v, n) => String(v ?? '').trim().slice(0, n);

/** 링크는 http(s) · mailto 만 허용 */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s) || /^mailto:[^\s"'<>]+$/i.test(s)) return s;
  return '';
}

/** 이 포탈 계정이 관리할 수 있는 소개 페이지(slug). 마스터/관리자는 어떤 페이지든 대신 관리할 수 있다. */
export async function authorFor(env, session, requestedSlug) {
  const own = await env.CAMP_KV.get(linkKey(session.email), 'json');
  const isAdmin = session.role === 'master' || session.role === 'admin';
  if (requestedSlug && SLUG_RE.test(requestedSlug) && requestedSlug !== own?.slug) {
    if (!isAdmin) return null;
    const list = await env.CAMP_KV.list({ prefix: LINK_PREFIX });
    for (const k of list.keys) {
      const l = await env.CAMP_KV.get(k.name, 'json');
      if (l?.slug === requestedSlug) return { slug: l.slug, displayName: l.displayName || l.slug, email: k.name.slice(LINK_PREFIX.length) };
    }
    return { slug: requestedSlug, displayName: requestedSlug, email: session.email };
  }
  return own ? { slug: own.slug, displayName: own.displayName || own.slug, email: normalizeEmail(session.email) } : null;
}

/** 이 소개 페이지에 연결된 계정이 있는지 */
export async function isLinked(env, slug) {
  const list = await env.CAMP_KV.list({ prefix: LINK_PREFIX });
  for (const k of list.keys) { const l = await env.CAMP_KV.get(k.name, 'json'); if (l?.slug === slug) return true; }
  return false;
}
