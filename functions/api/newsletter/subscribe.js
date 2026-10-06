/**
 * 구독 (공개)
 * POST /api/newsletter/subscribe   { slug, email, name?, lang?, website? }   구독 신청 → 확인 메일 발송(본인 확인 후 시작)
 * GET  /api/newsletter/subscribe?confirm=TOKEN    확인 링크 → 구독 시작 (안내 화면)
 * GET  /api/newsletter/subscribe?unsub=TOKEN      수신거부 링크 → 안내 화면 (확인 버튼)
 * POST /api/newsletter/subscribe?unsub=TOKEN      수신거부 실행
 */
import { sendEmail, normalizeEmail } from '../../lib/hubAccounts.js';
import { LINK_PREFIX, SLUG_RE, subKey, clip, esc, isEmail, makeToken, readToken, err, ok } from '../../lib/newsletter.js';

async function authorOf(env, slug) {
  const list = await env.CAMP_KV.list({ prefix: LINK_PREFIX });
  for (const k of list.keys) { const l = await env.CAMP_KV.get(k.name, 'json'); if (l?.slug === slug) return { slug, displayName: l.displayName || slug }; }
  return null;
}

function page(title, msg, extra = '') {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f1f5f7;font-family:-apple-system,'Noto Sans KR',Arial,sans-serif;"><div style="max-width:460px;margin:12vh auto;padding:32px 28px;background:#fff;border-radius:16px;text-align:center;box-shadow:0 8px 30px rgba(16,41,54,.08);">
<h1 style="margin:0 0 12px;font-size:22px;color:#102936;">${esc(title)}</h1><p style="margin:0 0 22px;color:#456;line-height:1.7;">${msg}</p>${extra}
<p style="margin:22px 0 0;font-size:12px;color:#8a9aa2;">Word of Life Korea · <a href="/" style="color:#8a9aa2;">wolko.org</a></p></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function onRequestGet({ env, request }) {
  const q = new URL(request.url).searchParams;
  if (q.get('confirm')) {
    const t = await readToken(env, 'c', q.get('confirm'));
    if (!t) return page('링크를 확인할 수 없어요', '링크가 올바르지 않습니다. 구독 신청을 다시 해 주세요.');
    const sub = await env.CAMP_KV.get(subKey(t.slug, t.email), 'json');
    if (!sub) return page('신청 내역이 없어요', '구독 신청을 다시 해 주세요.');
    if (sub.status !== 'active') await env.CAMP_KV.put(subKey(t.slug, t.email), JSON.stringify({ ...sub, status: 'active', confirmedAt: new Date().toISOString() }));
    return page('구독이 시작되었어요 ✓', '새 소식이 올라오면 이메일로 보내드릴게요. 감사합니다!');
  }
  if (q.get('unsub')) {
    const t = await readToken(env, 'u', q.get('unsub'));
    if (!t) return page('링크를 확인할 수 없어요', '링크가 올바르지 않습니다.');
    return page('수신거부', `${esc(t.email)} 주소로 보내는 이 분의 소식 메일을 그만 받으시겠어요?`,
      `<form method="POST" action="?unsub=${encodeURIComponent(q.get('unsub'))}"><button style="padding:12px 26px;border:0;border-radius:10px;background:#005c76;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">수신거부 · Unsubscribe</button></form>`);
  }
  return page('WOLKO', '잘못된 접근입니다.');
}

export async function onRequestPost({ env, request }) {
  const url = new URL(request.url);
  if (url.searchParams.get('unsub')) {
    const t = await readToken(env, 'u', url.searchParams.get('unsub'));
    if (!t) return page('링크를 확인할 수 없어요', '링크가 올바르지 않습니다.');
    const sub = await env.CAMP_KV.get(subKey(t.slug, t.email), 'json');
    if (sub) await env.CAMP_KV.put(subKey(t.slug, t.email), JSON.stringify({ ...sub, status: 'unsub', unsubAt: new Date().toISOString() }));
    return page('수신거부되었어요', '더 이상 이 분의 소식 메일을 보내지 않습니다.');
  }

  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  if (b?.website) return ok(); // 자동 가입 봇이 채우는 숨김 칸
  const slug = String(b?.slug || ''), email = normalizeEmail(b?.email), lang = b?.lang === 'en' ? 'en' : 'ko';
  if (!SLUG_RE.test(slug) || !isEmail(email)) return err(lang === 'en' ? 'Please check your email address.' : '이메일 주소를 확인해 주세요.');
  const author = await authorOf(env, slug);
  if (!author) return err(lang === 'en' ? 'This page does not publish updates yet.' : '아직 소식을 받아볼 수 없는 페이지예요.', 404);

  // 같은 곳에서 너무 자주 신청하는 것을 막는다 (1분에 5건)
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  const rlKey = `nl:rl:${ip}`;
  const hits = Number(await env.CAMP_KV.get(rlKey)) || 0;
  if (hits >= 5) return err(lang === 'en' ? 'Too many requests. Please try again in a minute.' : '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', 429);
  await env.CAMP_KV.put(rlKey, String(hits + 1), { expirationTtl: 60 });

  const prev = await env.CAMP_KV.get(subKey(slug, email), 'json');
  if (prev?.status === 'active') return ok({ already: true });
  await env.CAMP_KV.put(subKey(slug, email), JSON.stringify({ ...(prev || {}), email, name: clip(b?.name, 60) || prev?.name || '', status: 'pending', source: prev?.source || 'form', lang, createdAt: prev?.createdAt || new Date().toISOString() }));

  const origin = url.origin;
  const token = await makeToken(env, 'c', slug, email);
  const link = `${origin}/api/newsletter/subscribe?confirm=${encodeURIComponent(token)}`;
  const nm = esc(author.displayName);
  try {
    await sendEmail(env, {
      to: email,
      subject: lang === 'en' ? `Confirm your subscription to ${author.displayName}'s updates` : `${author.displayName}님의 소식 구독을 확인해 주세요`,
      html: lang === 'en'
        ? `<p>Please confirm that you'd like to receive ${nm}'s updates by email.</p><p><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#005c76;color:#fff;text-decoration:none;font-weight:700;">Confirm subscription</a></p><p style="color:#778;font-size:12px;">If you didn't request this, you can ignore this email.</p>`
        : `<p>${nm}님의 소식을 이메일로 받아보시려면 아래 버튼을 눌러 확인해 주세요.</p><p><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#005c76;color:#fff;text-decoration:none;font-weight:700;">구독 확인하기</a></p><p style="color:#778;font-size:12px;">신청하지 않으셨다면 이 메일은 무시하셔도 됩니다.</p>`,
    });
  } catch { return err(lang === 'en' ? 'Could not send the confirmation email.' : '확인 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.', 502); }
  return ok({ pending: true });
}
