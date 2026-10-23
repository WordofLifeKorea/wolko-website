/**
 * "월코에서 섬기고 싶어요" 문의 — 1단계: 접수 · 저장 · 담당자 배정 · 알림.
 *
 * 흐름: 홈페이지 문의 폼(유형 serve) → 이 문의를 KV 에 저장(이름·연락처·내용만, 민감 정보는 받지 않는다)
 *   → 문의 언어에 맞는 담당자 + 마스터에게 알림(내용 없이 "새 문의가 왔다"만) → 포탈 받은함(/portal/serve-inquiries/)에서
 *   담당자가 "인터뷰 진행 승인 / 보류 / 거절" 처리. 승인하면 정식 지원 절차(신청서)가 시작된다(2단계에서 연결).
 *
 * 저장소(CAMP_KV): serve:inq:{id}  문의 JSON
 */
import { MASTER_EMAILS, normalizeEmail, sendEmail } from './hubAccounts.js';

export const SERVE_INQUIRY_PREFIX = 'serve:inq:';
export const SERVE_STATUSES = ['new', 'interview', 'hold', 'rejected'];
export const SERVE_PAGE_URL = 'https://wolko.org/portal/serve-inquiries/';

/**
 * 섬김 문의를 처리하는 담당자(포탈 로그인 이메일, 소문자). 문의 언어로 나뉜다. 마스터는 모든 문의를 본다.
 *   en — Estelle Sooy (영어로 들어온 문의)
 *   ko — Ella (Hyunji Lim, 임현지) (한글로 들어온 문의)
 */
export const SERVE_REVIEWER_EMAILS = {
  en: ['esooy@wol.org'],
  ko: ['hlim@wol.org'],
};

const HANGUL = /[ㄱ-ㆎ가-힣]/g;
const HAS_HANGUL = /[ㄱ-ㆎ가-힣]/;
const LETTER = /[A-Za-zㄱ-ㆎ가-힣]/g;

/** 문의 언어: 내용(message)의 한글 비율이 가장 중요하고, 내용이 너무 짧으면 폼의 언어 설정(hint), 그다음 이름으로 정한다. */
export function detectInquiryLanguage({ name = '', message = '', hint = '' } = {}) {
  const letters = String(message).match(LETTER) || [];
  if (letters.length >= 6) {
    const ratio = (String(message).match(HANGUL) || []).length / letters.length;
    return ratio >= 0.3 ? 'ko' : 'en';
  }
  if (hint === 'ko' || hint === 'en') return hint;
  return HAS_HANGUL.test(String(name)) ? 'ko' : 'en';
}

export function reviewersFor(lang) {
  return (SERVE_REVIEWER_EMAILS[lang] || []).map(normalizeEmail);
}

/** 볼 수 있는 사람: 마스터, 또는 그 문의 언어의 담당자 */
export function canViewServeInquiry(session, inquiry) {
  if (!session) return false;
  if (session.role === 'master' || MASTER_EMAILS.includes(normalizeEmail(session.email))) return true;
  return reviewersFor(inquiry?.lang).includes(normalizeEmail(session.email));
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

export async function createServeInquiry(env, { name, email, phone = '', message, hint = '' }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const inquiry = {
    id,
    createdAt: now,
    name: clip(name, 100),
    email: clip(email, 200).toLowerCase(),
    phone: clip(phone, 40),
    message: clip(message, 4000),
    lang: detectInquiryLanguage({ name, message, hint }),
    status: 'new',
    history: [{ at: now, by: 'applicant', action: 'received' }],
  };
  await env.CAMP_KV.put(`${SERVE_INQUIRY_PREFIX}${id}`, JSON.stringify(inquiry));
  return inquiry;
}

export async function loadServeInquiries(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: SERVE_INQUIRY_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const items = await Promise.all(keys.map(key => env.CAMP_KV.get(key, 'json')));
  return items.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** 같은 이메일·전화로 이미 들어온 문의가 있는지(중복 안내용 — 문의 내용은 돌려주지 않는다) */
export function findDuplicates(all, inquiry) {
  const phone = String(inquiry.phone || '').replace(/\D/g, '');
  return all.filter(o => o.id !== inquiry.id && (
    (inquiry.email && o.email === inquiry.email) || (phone.length >= 9 && String(o.phone || '').replace(/\D/g, '') === phone)
  )).map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status }));
}

/** 담당자 + 마스터에게 알림 — 문의 내용·이름은 메일에 넣지 않는다(포탈에서 확인) */
export async function notifyServeReviewers(env, inquiry) {
  if (!env.RESEND_API_KEY) return false;
  const to = [...new Set([...reviewersFor(inquiry.lang), ...MASTER_EMAILS.map(normalizeEmail)])];
  if (!to.length) return false;
  const en = inquiry.lang === 'en';
  await sendEmail(env, {
    to,
    subject: en ? '[WOLKO] New "Serve with WOLKO" inquiry' : '[WOLKO] 새 "섬기고 싶어요" 문의',
    html: `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;">
      <p>${en ? 'A new inquiry about serving with WOLKO has arrived.' : '월코에서 섬기고 싶다는 새 문의가 도착했습니다.'}</p>
      <p>${en ? 'Please review it in the portal.' : '포탈에서 확인하고 처리해 주세요.'}</p>
      <p><a href="${SERVE_PAGE_URL}">${SERVE_PAGE_URL}</a></p>
    </div>`,
  });
  return true;
}

/** 문의한 사람에게 접수 확인(문의 언어로) — 내용은 담지 않는다 */
export async function confirmServeInquiry(env, inquiry) {
  if (!env.RESEND_API_KEY || !inquiry.email) return false;
  const en = inquiry.lang === 'en';
  await sendEmail(env, {
    to: inquiry.email,
    subject: en ? 'We received your message — WOLKO' : '문의가 접수되었습니다 — 월코',
    html: `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;">
      <p>${en ? `Hello ${escapeHtml(inquiry.name)},` : `${escapeHtml(inquiry.name)}님, 안녕하세요.`}</p>
      <p>${en
        ? 'Thank you for your interest in serving with Word of Life Korea. We have received your message and will contact you soon.'
        : '월코에서 섬기고 싶다고 연락 주셔서 감사합니다. 문의가 접수되었고, 곧 연락드리겠습니다.'}</p>
      <p style="color:#5a6f79;font-size:13px;">${en ? 'Word of Life Korea (WOLKO)' : '월코 (Word of Life Korea)'}</p>
    </div>`,
  });
  return true;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** 같은 사람이 짧은 시간에 연달아 보내는 것을 막는다(1시간에 이메일당 3건, IP당 6건). true 면 막는다 */
export async function serveRateLimited(env, { email, ip }) {
  const checks = [[`serve:rl:email:${normalizeEmail(email)}`, 3], ...(ip ? [[`serve:rl:ip:${ip}`, 6]] : [])];
  let limited = false;
  for (const [key, max] of checks) {
    const used = parseInt(await env.CAMP_KV.get(key), 10) || 0;
    if (used >= max) limited = true;
    else await env.CAMP_KV.put(key, String(used + 1), { expirationTtl: 3600 });
  }
  return limited;
}
