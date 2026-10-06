/**
 * 개인 뉴스레터 — 공용 도우미.
 * 선교사·스태프가 각자 자기 소식을 쓰고, 본인 소개 페이지에 올리고, 본인 구독자에게 메일로 보낸다.
 *
 * KV(CAMP_KV) 키
 *   nl:link:{email}          → { slug, displayName }            포탈 계정 ↔ 본인 소개 페이지 연결
 *   nl:post:{slug}:{id}      → 글 (초안/게시/발송 기록)
 *   nl:sub:{slug}:{email}    → 구독자 { email, name, status: pending|active|unsub, source: form|import }
 *   nl:img:{id}              → 이미지 base64 (metadata.type 에 MIME)
 *   nl:rl:{key}              → 구독 신청 속도 제한
 */
import { normalizeEmail, signToken, verifyToken } from './hubAccounts.js';

export const LINK_PREFIX = 'nl:link:';
export const POST_PREFIX = 'nl:post:';
export const SUB_PREFIX = 'nl:sub:';
export const IMG_PREFIX = 'nl:img:';

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
export const ID_RE = /^[a-z0-9]{6,40}$/;
export const MAX_TITLE = 120;
export const MAX_TEXT = 20000;
export const MAX_BLOCKS = 60;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE = /^image\/(jpeg|png|webp|gif)$/;
export const MAX_SEND = 500; // 한 번에 보내는 최대 구독자 수 (Resend 배치 100통 × 5회)

export const linkKey = email => `${LINK_PREFIX}${normalizeEmail(email)}`;
export const postKey = (slug, id) => `${POST_PREFIX}${slug}:${id}`;
export const subKey = (slug, email) => `${SUB_PREFIX}${slug}:${normalizeEmail(email)}`;
export const imgKey = id => `${IMG_PREFIX}${id}`;

export const J = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
export const err = (error, status = 400) => Response.json({ error }, { status, headers: J });
export const ok = (body = { ok: true }) => Response.json(body, { headers: J });

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const clip = (v, n) => String(v ?? '').trim().slice(0, n);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

/** 링크는 http(s) · mailto 만 허용 */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s) || /^mailto:[^\s"'<>]+$/i.test(s)) return s;
  return '';
}

/* ─────────── 본문 서식 (간단 마크다운) ─────────── */
const A = 'color:#005c76;text-decoration:underline;';
function inline(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g, (m, label, url) => {
    const u = safeUrl(url.replace(/&amp;/g, '&'));
    return u ? `<a href="${esc(u)}" style="${A}" target="_blank" rel="noopener">${label}</a>` : label;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s.replace(/\n/g, '<br>');
}

export const imgSrc = (origin, id) => `${origin}/api/newsletter/image?id=${id}`;
const imageHtml = (origin, id, caption) => ID_RE.test(id)
  ? `<figure style="margin:0 0 18px;"><img src="${imgSrc(origin, id)}" alt="${esc(caption || '')}" style="display:block;width:100%;max-width:100%;height:auto;border-radius:10px;">${caption ? `<figcaption style="margin-top:6px;font-size:13px;color:#6b7b84;text-align:center;">${esc(caption)}</figcaption>` : ''}</figure>`
  : '';
export const buttonHtml = (label, url) => {
  const u = safeUrl(url);
  return label && u ? `<p style="margin:8px 0 22px;text-align:center;"><a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 26px;border-radius:10px;background:#005c76;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">${esc(label)}</a></p>` : '';
};

/** 블록 꾸미기 값 → 글자 색 / 크기 배율 */
const SIZE = { s: 0.88, m: 1, l: 1.22 };
const ctxOf = st => ({ color: /^#[0-9a-f]{6}$/i.test(st?.color || '') ? st.color : '', scale: SIZE[st?.size] || 1 });
const COLOR = (ctx, dflt) => ctx.color || dflt;

/** 글 한 덩어리(본문 텍스트) → HTML. 빈 줄로 문단을 나누고, # 제목 · - 목록 · > 인용 · [[image:ID|설명]] 을 지원한다. */
export function renderText(text, origin = '', ctx = { color: '', scale: 1 }) {
  const fs = Math.round(16 * ctx.scale), ink = COLOR(ctx, '#24323a');
  const P = `margin:0 0 16px;font-size:${fs}px;line-height:1.75;color:${ink};`;
  const out = [];
  for (const chunk of String(text ?? '').replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
    if (!lines.length) continue;
    const first = lines[0];
    let m;
    if ((m = first.match(/^\[\[image:([a-z0-9]+)(?:\|([^\]]*))?\]\]$/))) { out.push(imageHtml(origin, m[1], m[2])); continue; }
    if (/^#{1,2}\s+/.test(first)) {
      const lvl = first.startsWith('##') ? 3 : 2;
      out.push(`<h${lvl} style="margin:26px 0 10px;font-size:${Math.round((lvl === 2 ? 22 : 18) * ctx.scale)}px;line-height:1.35;color:${COLOR(ctx, '#0b3f52')};">${inline(first.replace(/^#{1,2}\s+/, ''))}</h${lvl}>`);
      if (lines.length > 1) out.push(`<p style="${P}">${inline(lines.slice(1).join('\n'))}</p>`);
      continue;
    }
    if (lines.every(l => /^[-*]\s+/.test(l))) {
      out.push(`<ul style="margin:0 0 16px;padding-left:22px;font-size:${fs}px;line-height:1.75;color:${ink};text-align:left;">${lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    if (lines.every(l => /^>\s?/.test(l))) {
      out.push(`<blockquote style="margin:0 0 18px;padding:4px 0 4px 14px;border-left:4px solid #5fb7c4;color:${COLOR(ctx, '#456')};font-size:${fs}px;line-height:1.7;text-align:left;">${inline(lines.map(l => l.replace(/^>\s?/, '')).join('\n'))}</blockquote>`);
      continue;
    }
    out.push(`<p style="${P}">${inline(lines.join('\n'))}</p>`);
  }
  return out.join('\n');
}

/* ─────────── 블록 편집기 ─────────── */
export const BLOCK_TYPES = ['heading', 'text', 'image', 'button', 'divider', 'quote', 'verse'];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const ALIGNS = ['left', 'center', 'right'], SIZES = ['s', 'm', 'l'], PADS = ['none', 'normal', 'large'];
/** 블록 꾸미기: 배경색 · 글자색 · 정렬 · 글자 크기 · 안쪽 여백 · 둥근 모서리 */
export function cleanStyle(st) {
  const o = {};
  if (HEX.test(st?.bg || '')) o.bg = st.bg.toLowerCase();
  if (HEX.test(st?.color || '')) o.color = st.color.toLowerCase();
  if (ALIGNS.includes(st?.align) && st.align !== 'left') o.align = st.align;
  if (SIZES.includes(st?.size) && st.size !== 'm') o.size = st.size;
  if (PADS.includes(st?.pad)) o.pad = st.pad;
  if (st?.round === true) o.round = true;
  return o;
}

export function cleanBlocks(input) {
  const list = Array.isArray(input) ? input.slice(0, MAX_BLOCKS) : [];
  const out = [];
  for (const b of list) {
    const type = BLOCK_TYPES.includes(b?.type) ? b.type : null;
    if (!type) continue;
    if (type === 'heading') out.push({ type, text: clip(b.text, 200) });
    else if (type === 'text') out.push({ type, text: clip(b.text, MAX_TEXT) });
    else if (type === 'image') out.push({ type, id: ID_RE.test(b.id) ? b.id : '', caption: clip(b.caption, 200) });
    else if (type === 'button') out.push({ type, label: clip(b.label, 60), url: safeUrl(b.url) });
    else if (type === 'quote') out.push({ type, text: clip(b.text, 1000), cite: clip(b.cite, 120) });
    else if (type === 'verse') out.push({ type, ref: clip(b.ref, 80), text: clip(b.text, 1000) });
    else out.push({ type });
    const st = cleanStyle(b.style);
    if (Object.keys(st).length) out[out.length - 1].style = st;
  }
  return out;
}

const PAD_PX = { none: [0, 0], normal: [16, 20], large: [30, 28] };
function wrapStyle(html, st) {
  if (!html || !st || !Object.keys(st).length) return html;
  const [py, px] = PAD_PX[st.pad || (st.bg ? 'normal' : 'none')];
  const css = [st.bg ? `background:${st.bg};` : '', `padding:${py}px ${px}px;`, st.round ? 'border-radius:14px;' : '', `text-align:${st.align || 'left'};`].join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;width:100%;"><tr><td style="${css}">${html}</td></tr></table>`;
}

export function renderBlocks(blocks, origin = '') {
  return (blocks || []).map(b => {
    const st = b.style || {}, ctx = ctxOf(st), fs = Math.round(16 * ctx.scale);
    let html = '';
    switch (b.type) {
      case 'heading': html = b.text ? `<h2 style="margin:${st.bg ? '0' : '26px'} 0 10px;font-size:${Math.round(22 * ctx.scale)}px;line-height:1.35;color:${COLOR(ctx, '#0b3f52')};">${esc(b.text)}</h2>` : ''; break;
      case 'text': html = renderText(b.text, origin, ctx); break;
      case 'image': html = b.id ? imageHtml(origin, b.id, b.caption) : ''; break;
      case 'button': {
        const u = safeUrl(b.url);
        // 버튼 블록은 '배경색'이 버튼 색, '글자색'이 버튼 글자색이다 (바깥 상자를 두르지 않는다)
        return b.label && u ? `<p style="margin:8px 0 22px;text-align:${st.align || 'center'};"><a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;padding:${st.size === 's' ? 10 : st.size === 'l' ? 16 : 13}px ${st.size === 'l' ? 34 : 26}px;border-radius:${st.round ? 999 : 10}px;background:${st.bg || '#005c76'};color:${st.color || '#ffffff'};font-weight:700;font-size:${Math.round(15 * ctx.scale)}px;text-decoration:none;">${esc(b.label)}</a></p>` : '';
      }
      case 'divider': html = `<hr style="border:0;border-top:1px solid ${st.color || '#dfe8ec'};margin:${st.bg ? '0' : '26px 0'};">`; break;
      case 'quote': html = b.text ? `<blockquote style="margin:0 0 18px;padding:6px 0 6px 16px;border-left:4px solid #5fb7c4;font-size:${Math.round(17 * ctx.scale)}px;line-height:1.7;color:${COLOR(ctx, '#345')};text-align:left;">${inline(b.text)}${b.cite ? `<div style="margin-top:6px;font-size:13px;color:#6b7b84;">— ${esc(b.cite)}</div>` : ''}</blockquote>` : ''; break;
      case 'verse': html = b.text ? `<div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:${st.bg ? 'transparent' : '#eef6f8'};text-align:center;"><div style="font-size:${Math.round(17 * ctx.scale)}px;line-height:1.7;color:${COLOR(ctx, '#0b3f52')};">${inline(b.text)}</div>${b.ref ? `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${ctx.color || '#5b7f8c'};">${esc(b.ref)}</div>` : ''}</div>` : ''; break;
      default: return '';
    }
    return wrapStyle(html, st);
  }).filter(Boolean).join('\n');
}

/** 저장된 글 → 본문 HTML (웹/메일 공용). origin 이 있으면 이미지 주소가 절대 경로가 된다. */
export function renderBody(post, origin = '') {
  if (post.mode === 'blocks') return renderBlocks(post.blocks, origin);
  const parts = [];
  if (post.coverId && ID_RE.test(post.coverId)) parts.push(imageHtml(origin, post.coverId, ''));
  parts.push(renderText(post.body, origin));
  if (post.button?.label && post.button?.url) parts.push(buttonHtml(post.button.label, post.button.url));
  return parts.join('\n');
}

/** 요청 본문 → 저장할 글 필드 (검증 · 정리) */
export function cleanPost(body) {
  const mode = body?.mode === 'blocks' ? 'blocks' : 'simple';
  const title = clip(body?.title, MAX_TITLE);
  const post = { title, mode, header: cleanHeader(body?.header) };
  if (mode === 'blocks') post.blocks = cleanBlocks(body?.blocks);
  else {
    post.body = clip(body?.body, MAX_TEXT);
    post.coverId = ID_RE.test(body?.coverId) ? body.coverId : '';
    const label = clip(body?.button?.label, 60), url = safeUrl(body?.button?.url);
    post.button = label && url ? { label, url } : null;
  }
  return post;
}

export const hasContent = post => !!post.title && (post.mode === 'blocks' ? post.blocks.some(b => (b.text || b.id || b.url || b.type === 'divider')) : !!(post.body || post.coverId));

export function excerpt(post, n = 140) {
  const raw = post.mode === 'blocks'
    ? (post.blocks || []).filter(b => b.type === 'text' || b.type === 'quote' || b.type === 'verse').map(b => b.text).join(' ')
    : post.body;
  return String(raw || '').replace(/\[\[image:[^\]]*\]\]/g, '').replace(/\]\((https?:|mailto:)[^)\s]*\)/g, ']').replace(/[#>*\[\]()_-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
}

export const firstImageId = post => post.mode === 'blocks' ? ((post.blocks || []).find(b => b.type === 'image' && b.id) || {}).id || '' : (post.coverId || (String(post.body || '').match(/\[\[image:([a-z0-9]+)/) || [])[1] || '');

/* ─────────── 머리글 템플릿 ─────────── */
export const HEADER_TEMPLATES = ['classic', 'banner', 'minimal', 'warm', 'night'];

export function cleanHeader(h) {
  return {
    template: HEADER_TEMPLATES.includes(h?.template) ? h.template : 'classic',
    imageId: ID_RE.test(h?.imageId) ? h?.imageId : '',
    subtitle: clip(h?.subtitle, 80),
  };
}

/** 글 맨 위(머리글 + 제목) — 메일 · 웹 · 미리보기가 모두 같은 모양을 쓴다. 메일 호환을 위해 표 + 인라인 스타일만 사용. */
export function renderHeader(post, author, origin = '') {
  const h = cleanHeader(post.header), name = esc(author?.displayName || ''), title = esc(post.title || '');
  const sub = h.subtitle ? esc(h.subtitle) : '';
  const wrap = (bg, inner, extra = '') => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;${bg}${extra}"><tr><td style="padding:0;">${inner}</td></tr></table>`;
  const sans = "font-family:-apple-system,'Segoe UI','Noto Sans KR',Arial,sans-serif;";
  const serif = "font-family:Georgia,'Noto Serif KR','Times New Roman',serif;";
  if (h.template === 'banner') {
    const img = h.imageId ? `background-image:url('${imgSrc(origin, h.imageId)}');background-size:cover;background-position:center;` : '';
    return wrap(`background-color:#004f68;${img}`, `<div style="padding:64px 28px 34px;background:linear-gradient(180deg,rgba(0,35,48,.15),rgba(0,35,48,.72));${sans}"><div style="font-size:12px;letter-spacing:.14em;font-weight:700;color:#d7f1f7;">WOLKO · ${name}</div><h1 style="margin:10px 0 0;font-size:32px;line-height:1.25;color:#ffffff;text-shadow:0 1px 6px rgba(0,0,0,.45);">${title}</h1>${sub ? `<div style="margin-top:8px;font-size:14px;color:#e6f6fa;">${sub}</div>` : ''}</div>`);
  }
  if (h.template === 'minimal') {
    return wrap('background:#ffffff;', `<div style="padding:34px 28px 10px;text-align:center;${sans}"><div style="font-size:11px;letter-spacing:.3em;font-weight:700;color:#7a9aaa;">WOLKO · ${name}</div><div style="width:34px;height:2px;background:#005c76;margin:14px auto 18px;"></div><h1 style="margin:0;font-size:30px;line-height:1.3;color:#102936;${serif}">${title}</h1>${sub ? `<div style="margin-top:10px;font-size:14px;color:#6b7b84;">${sub}</div>` : ''}</div>`);
  }
  if (h.template === 'warm') {
    return wrap('background-color:#b9552b;background-image:linear-gradient(135deg,#9a3b22,#d9772f);', `<div style="padding:40px 28px 34px;${sans}"><div style="font-size:11px;letter-spacing:.22em;font-weight:800;color:#ffe3c9;">WOLKO · ${name}</div><h1 style="margin:12px 0 0;font-size:31px;line-height:1.3;color:#ffffff;${serif}">${title}</h1>${sub ? `<div style="margin-top:10px;font-size:14px;color:#ffe9d6;">${sub}</div>` : ''}</div>`);
  }
  if (h.template === 'night') {
    return wrap('background:#0b2230;', `<div style="padding:40px 28px 32px;${sans}"><div style="font-size:11px;letter-spacing:.24em;font-weight:800;color:#73d1f5;">WOLKO · ${name}</div><div style="width:44px;height:3px;background:#73d1f5;margin:14px 0 16px;"></div><h1 style="margin:0;font-size:31px;line-height:1.3;color:#ffffff;">${title}</h1>${sub ? `<div style="margin-top:10px;font-size:14px;color:#a9c7d4;">${sub}</div>` : ''}</div>`);
  }
  // classic: 파란 띠 + 흰 바탕 제목
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;"><tr><td style="background:#004f68;padding:18px 28px;color:#ffffff;font-size:13px;letter-spacing:.08em;font-weight:700;${sans}">WOLKO · ${name}</td></tr><tr><td style="background:#ffffff;padding:28px 28px 0;${sans}"><h1 style="margin:0;font-size:28px;line-height:1.3;color:#102936;">${title}</h1>${sub ? `<div style="margin-top:8px;font-size:14px;color:#6b7b84;">${sub}</div>` : ''}</td></tr></table>`;
}

/* ─────────── 메일 ─────────── */
export function emailHtml({ post, author, origin, webUrl, unsubUrl, preview = false }) {
  const name = esc(author.displayName || '');
  return `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#f1f5f7;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(excerpt(post, 90))}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f7;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,'Segoe UI','Noto Sans KR',Arial,sans-serif;">
<tr><td style="padding:0;">${renderHeader(post, author, origin)}</td></tr>
<tr><td style="padding:22px 28px 8px;">
${renderBody(post, origin)}
</td></tr>
<tr><td style="padding:6px 28px 28px;">
${webUrl ? `<p style="margin:18px 0 0;font-size:13px;"><a href="${esc(webUrl)}" style="color:#005c76;">웹에서 보기 · View in browser</a></p>` : ''}
</td></tr>
<tr><td style="background:#f6f9fa;padding:18px 28px;font-size:12px;line-height:1.7;color:#74848c;">
이 메일은 ${name}님의 소식을 받아보시겠다고 신청하신 분께 보내드립니다. · You are receiving this because you subscribed to ${name}'s updates.<br>
Word of Life Korea (WOLKO) · <a href="${esc(origin)}" style="color:#74848c;">${esc(origin.replace(/^https?:\/\//, ''))}</a><br>
${preview ? '<strong>[테스트 발송 · Test send]</strong>' : `<a href="${esc(unsubUrl)}" style="color:#74848c;">수신거부 · Unsubscribe</a>`}
</td></tr></table></td></tr></table></body></html>`;
}

/** Resend 배치 전송 (한 호출에 최대 100통). 실패한 통수를 돌려준다. */
export async function sendBatch(env, messages) {
  let sent = 0, failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length; else failed += chunk.length;
    } catch { failed += chunk.length; }
  }
  return { sent, failed };
}

export const fromLine = author => `${(author.displayName || 'WOLKO').replace(/[<>"]/g, '')} (WOLKO) <hub@wolko.org>`;

/* ─────────── 수신거부 · 확인 토큰 (서명) ─────────── */
export const makeToken = (env, purpose, slug, email) => signToken(env.ADMIN_PASSWORD, `nl:${purpose}:${slug}:${normalizeEmail(email)}`);
export async function readToken(env, purpose, token) {
  const data = await verifyToken(env.ADMIN_PASSWORD, token);
  if (!data) return null;
  const parts = String(data).split(':');
  if (parts[0] !== 'nl' || parts[1] !== purpose) return null;
  return { slug: parts[2], email: parts.slice(3).join(':') };
}

/** 이 포탈 계정이 쓸 수 있는 소개 페이지(slug). 마스터/관리자는 연결된 어떤 페이지든 대신 쓸 수 있다. */
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

export async function listPosts(env, slug) {
  const list = await env.CAMP_KV.list({ prefix: `${POST_PREFIX}${slug}:` });
  const posts = [];
  for (const k of list.keys) { const p = await env.CAMP_KV.get(k.name, 'json'); if (p) posts.push(p); }
  return posts.sort((a, b) => String(b.publishedAt || b.updatedAt).localeCompare(String(a.publishedAt || a.updatedAt)));
}
