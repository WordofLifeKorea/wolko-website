/**
 * POST /api/newsletter/send   { id, test?: true, resend?: true, slug? }   (작성자)
 *   test:true  → 내 이메일로만 시험 발송
 *   그 외      → 이 글을 구독자(수신 중)에게 발송하고 웹 페이지에도 게시한다. 이미 보낸 글은 resend:true 가 있어야 다시 보낸다.
 */
import { portalSession, normalizeEmail } from '../../lib/hubAccounts.js';
import {
  SUB_PREFIX, MAX_SEND, ID_RE, postKey, authorFor, hasContent, emailHtml, fromLine, sendBatch, makeToken, err, ok,
} from '../../lib/newsletter.js';

export async function onRequestPost({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return err('포탈 로그인이 필요합니다.', 401);
  if (!env.RESEND_API_KEY) return err('메일 발송 설정(RESEND_API_KEY)이 없어요.', 503);
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const a = await authorFor(env, s, b?.slug || null);
  if (!a) return err('본인 소개 페이지와 연결되어 있지 않아요.', 403);
  if (!ID_RE.test(b?.id || '')) return err('글을 찾을 수 없어요.', 404);
  const post = await env.CAMP_KV.get(postKey(a.slug, b.id), 'json');
  if (!post) return err('글을 찾을 수 없어요.', 404);
  if (!hasContent(post)) return err('제목과 내용을 채운 뒤 보내 주세요.');

  const origin = new URL(request.url).origin;
  const webUrl = `${origin}/letters/?s=${encodeURIComponent(a.slug)}&p=${encodeURIComponent(post.id)}`;
  const replyTo = a.email && a.email !== 'x' ? a.email : normalizeEmail(s.email);
  const subject = post.title;

  if (b.test) {
    const html = emailHtml({ post, author: a, origin, webUrl, unsubUrl: '', preview: true });
    const r = await sendBatch(env, [{ from: fromLine(a), to: [normalizeEmail(s.email)], subject: `[테스트] ${subject}`, html, reply_to: replyTo }]);
    return r.sent ? ok({ test: true, sent: 1 }) : err('테스트 메일을 보내지 못했어요.', 502);
  }

  if (post.sentAt && !b.resend) return err('이미 구독자에게 보낸 글이에요. 다시 보내려면 확인이 필요해요.', 409);

  const list = await env.CAMP_KV.list({ prefix: `${SUB_PREFIX}${a.slug}:` });
  const active = [];
  for (const k of list.keys) { const sub = await env.CAMP_KV.get(k.name, 'json'); if (sub?.status === 'active') active.push(sub); }
  if (!active.length) return err('수신 중인 구독자가 아직 없어요.');
  if (active.length > MAX_SEND) return err(`한 번에 보낼 수 있는 구독자는 ${MAX_SEND}명까지예요. 현재 ${active.length}명이에요.`);

  const messages = [];
  for (const sub of active) {
    const token = await makeToken(env, 'u', a.slug, sub.email);
    const unsubUrl = `${origin}/api/newsletter/subscribe?unsub=${encodeURIComponent(token)}`;
    messages.push({
      from: fromLine(a), to: [sub.email], subject, reply_to: replyTo,
      html: emailHtml({ post, author: a, origin, webUrl, unsubUrl }),
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
    });
  }
  const result = await sendBatch(env, messages);
  const now = new Date().toISOString();
  await env.CAMP_KV.put(postKey(a.slug, post.id), JSON.stringify({ ...post, publishedAt: post.publishedAt || now, sentAt: now, sentCount: result.sent, sentFailed: result.failed, updatedAt: now }));
  return ok({ sent: result.sent, failed: result.failed });
}
