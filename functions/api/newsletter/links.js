/**
 * 포탈 계정 ↔ 본인 소개 페이지 연결
 * GET    /api/newsletter/links           → { me: {slug, displayName}|null, links?: [...] }   (links 는 마스터만)
 * PUT    /api/newsletter/links           { email, slug, displayName }   마스터만
 * DELETE /api/newsletter/links?email=    마스터만
 */
import { portalSession, normalizeEmail, isValidEmail, listAccounts } from '../../lib/hubAccounts.js';
import { LINK_PREFIX, SLUG_RE, linkKey, clip, err, ok } from '../../lib/newsletter.js';

const isAdmin = s => s.role === 'master'; // 연결 지정 · 계정 목록은 마스터만

export async function onRequestGet({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  const me = await env.CAMP_KV.get(linkKey(s.email), 'json');
  const body = { me: me ? { slug: me.slug, displayName: me.displayName || me.slug } : null, canManage: isAdmin(s) };
  if (isAdmin(s)) {
    const list = await env.CAMP_KV.list({ prefix: LINK_PREFIX });
    const accounts = await listAccounts(env);
    body.accounts = accounts.filter(a => a.status === 'approved' && a.email).map(a => ({ email: a.email, name: a.name && !String(a.name).includes('@') ? a.name : '' })).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'ko'));
    body.links = [];
    for (const k of list.keys) { const l = await env.CAMP_KV.get(k.name, 'json'); if (l) body.links.push({ email: k.name.slice(LINK_PREFIX.length), slug: l.slug, displayName: l.displayName || '' }); }
  }
  return ok(body);
}

export async function onRequestPut({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  if (!isAdmin(s)) return err('권한이 없습니다.', 403);
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const email = normalizeEmail(b?.email);
  if (!isValidEmail(email)) return err('이메일 형식을 확인해 주세요.');
  if (!SLUG_RE.test(String(b?.slug || ''))) return err('연결할 소개 페이지를 골라 주세요.');
  await env.CAMP_KV.put(linkKey(email), JSON.stringify({ slug: b.slug, displayName: clip(b.displayName, 60) || b.slug, linkedBy: s.email, linkedAt: new Date().toISOString() }));
  return ok();
}

export async function onRequestDelete({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  if (!isAdmin(s)) return err('권한이 없습니다.', 403);
  const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
  if (!email) return err('이메일이 필요합니다.');
  await env.CAMP_KV.delete(linkKey(email));
  return ok();
}
