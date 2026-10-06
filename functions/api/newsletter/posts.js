/**
 * 개인 뉴스레터 글
 * GET    /api/newsletter/posts?slug=                  (누구나) 게시된 글 목록
 * GET    /api/newsletter/posts?slug=&id=              (누구나) 게시된 글 한 편 (본문 HTML 포함)
 * GET    /api/newsletter/posts?mine=1[&slug=]         (작성자) 초안 포함 내 글 목록
 * GET    /api/newsletter/posts?mine=1&id=[&slug=]     (작성자) 글 한 편 (편집용 원본 포함)
 * POST   /api/newsletter/posts                        (작성자) { id?, title, mode, body|blocks, coverId?, button? } 저장(초안)
 * POST   /api/newsletter/posts?preview=1              (작성자) 저장 없이 미리보기 HTML
 * PATCH  /api/newsletter/posts                        (작성자) { id, action: 'publish' | 'unpublish' }
 * DELETE /api/newsletter/posts?id=                    (작성자)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import {
  SLUG_RE, ID_RE, postKey, listPosts, authorFor, cleanPost, hasContent, renderBody, excerpt, firstImageId,
  newId, err, ok, LINK_PREFIX,
} from '../../lib/newsletter.js';

const summary = p => ({ id: p.id, title: p.title, publishedAt: p.publishedAt, excerpt: excerpt(p), coverId: firstImageId(p) });

/** 이 소개 페이지에 연결된 작성자가 있으면 표시 이름, 없으면 null */
async function linkedName(env, slug) {
  const list = await env.CAMP_KV.list({ prefix: LINK_PREFIX });
  for (const k of list.keys) { const l = await env.CAMP_KV.get(k.name, 'json'); if (l?.slug === slug) return l.displayName || slug; }
  return null;
}
const displayNameOf = async (env, slug) => (await linkedName(env, slug)) || slug;

export async function onRequestGet({ env, request }) {
  const q = new URL(request.url).searchParams;
  const slug = q.get('slug') || '', id = q.get('id') || '';
  if (q.get('mine')) {
    const s = await portalSession(request, env);
    if (!s) return err('포탈 로그인이 필요합니다.', 401);
    const a = await authorFor(env, s, slug || null);
    if (!a) return err('본인 소개 페이지와 연결되어 있지 않아요.', 403);
    if (id) { const p = await env.CAMP_KV.get(postKey(a.slug, id), 'json'); return p ? ok({ post: p, author: a }) : err('글을 찾을 수 없어요.', 404); }
    const posts = await listPosts(env, a.slug);
    return ok({ author: a, posts: posts.map(p => ({ ...summary(p), status: p.publishedAt ? 'published' : 'draft', updatedAt: p.updatedAt, sentAt: p.sentAt || null, sentCount: p.sentCount || 0 })) });
  }
  if (!SLUG_RE.test(slug)) return err('slug 가 필요합니다.');
  if (id) {
    if (!ID_RE.test(id)) return err('글을 찾을 수 없어요.', 404);
    const p = await env.CAMP_KV.get(postKey(slug, id), 'json');
    if (!p || !p.publishedAt) return err('글을 찾을 수 없어요.', 404);
    return Response.json({ post: { ...summary(p), html: renderBody(p, '') }, author: { slug, displayName: await displayNameOf(env, slug) } }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  }
  const posts = (await listPosts(env, slug)).filter(p => p.publishedAt);
  const name = await linkedName(env, slug);
  return Response.json({ enabled: name !== null, displayName: name || '', posts: posts.map(summary) }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

export async function onRequestPost({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const a = await authorFor(env, s, b?.slug || null);
  if (!a) return err('본인 소개 페이지와 연결되어 있지 않아요.', 403);
  const clean = cleanPost(b);
  if (new URL(request.url).searchParams.get('preview')) return ok({ html: renderBody(clean, ''), title: clean.title });
  if (!clean.title) return err('제목을 입력해 주세요.');
  const now = new Date().toISOString();
  let post;
  if (b.id) {
    if (!ID_RE.test(b.id)) return err('글을 찾을 수 없어요.', 404);
    const prev = await env.CAMP_KV.get(postKey(a.slug, b.id), 'json');
    if (!prev) return err('글을 찾을 수 없어요.', 404);
    post = { ...prev, title: clean.title, mode: clean.mode, blocks: undefined, body: undefined, coverId: undefined, button: undefined, ...clean, updatedAt: now };
  } else {
    post = { id: newId(), slug: a.slug, ...clean, createdAt: now, updatedAt: now, authorEmail: s.email };
  }
  await env.CAMP_KV.put(postKey(a.slug, post.id), JSON.stringify(post));
  return ok({ id: post.id, updatedAt: post.updatedAt });
}

export async function onRequestPatch({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const a = await authorFor(env, s, b?.slug || null);
  if (!a) return err('본인 소개 페이지와 연결되어 있지 않아요.', 403);
  if (!ID_RE.test(b?.id || '')) return err('글을 찾을 수 없어요.', 404);
  const p = await env.CAMP_KV.get(postKey(a.slug, b.id), 'json');
  if (!p) return err('글을 찾을 수 없어요.', 404);
  if (b.action === 'publish') {
    if (!hasContent(p)) return err('제목과 내용을 채운 뒤 게시해 주세요.');
    p.publishedAt = p.publishedAt || new Date().toISOString();
  } else if (b.action === 'unpublish') p.publishedAt = null;
  else return err('알 수 없는 동작입니다.');
  p.updatedAt = new Date().toISOString();
  await env.CAMP_KV.put(postKey(a.slug, p.id), JSON.stringify(p));
  return ok({ publishedAt: p.publishedAt });
}

export async function onRequestDelete({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  const q = new URL(request.url).searchParams;
  const a = await authorFor(env, s, q.get('slug') || null);
  if (!a) return err('본인 소개 페이지와 연결되어 있지 않아요.', 403);
  const id = q.get('id') || '';
  if (!ID_RE.test(id)) return err('글을 찾을 수 없어요.', 404);
  await env.CAMP_KV.delete(postKey(a.slug, id));
  return ok();
}
