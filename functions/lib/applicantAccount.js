/**
 * 스태프 지원자 임시 계정 — 이메일로 받은 임시 비밀번호로 로그인해 지원서를 서버에 저장하며 이어 쓰고, 제출 후 진행 상황을 본다.
 *   apply:acct:{email}         계정(비밀번호는 PBKDF2 해시만). 마지막 로그인 후 30일이 지나면 KV 가 저절로 지운다.
 *   apply:draft:{email}        작성 중인 지원서(민감 항목이 섞여 있어 통째로 암호화). 계정과 같은 때 지워진다.
 *   apply:sess:{sha256(token)} 로그인 세션 12시간
 * 제출한 신청서(serve:app:…)는 포탈 보관 규칙을 따르므로 계정이 지워져도 남는다.
 */
import { hashPassword, verifyPassword, normalizeEmail, sendEmail } from './hubAccounts.js';
import { sealSensitive, openSensitive } from './serveApplication.js';

export const ACCOUNT_IDLE_DAYS = 30;
export const SESSION_HOURS = 12;
const ACCT = email => `apply:acct:${normalizeEmail(email)}`;
const DRAFT = email => `apply:draft:${normalizeEmail(email)}`;
const SESS = hash => `apply:sess:${hash}`;
const FAIL = email => `apply:fail:${normalizeEmail(email)}`;
const MAX_FAILS = 5;            // 연속으로 틀리면 15분 잠금
const LOCK_SECONDS = 15 * 60;
const IDLE_SECONDS = ACCOUNT_IDLE_DAYS * 86400;

const sha256Hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 8자리 임시 비밀번호. 보기 쉽게 XXXX-XXXX 로 보여 주고, 입력할 때는 대시·대소문자를 무시한다. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export const normalizeTempPassword = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function getApplicant(env, email) {
  return env.CAMP_KV.get(ACCT(email), 'json');
}
async function putApplicant(env, acct) {
  await env.CAMP_KV.put(ACCT(acct.email), JSON.stringify(acct), { expirationTtl: IDLE_SECONDS });
}

/** 같은 키로 1시간에 max 번까지. 넘으면 true */
export async function applyRateLimited(env, key, max) {
  const k = `apply:rl:${key}`;
  const used = parseInt(await env.CAMP_KV.get(k), 10) || 0;
  if (used >= max) return true;
  await env.CAMP_KV.put(k, String(used + 1), { expirationTtl: 3600 });
  return false;
}

/** 임시 비밀번호를 새로 만들어(있던 계정이면 바꿔) 메일로 보낸다. 이전 비밀번호는 더 이상 쓸 수 없다. */
export async function issueTempPassword(env, { email, name, lang, origin }) {
  email = normalizeEmail(email);
  const ko = lang !== 'en';
  const password = makeTempPassword();
  const { hash, salt } = await hashPassword(normalizeTempPassword(password));
  const prev = await getApplicant(env, email);
  const now = new Date().toISOString();
  const acct = { ...(prev || { email, createdAt: now }), name: String(name || prev?.name || '').trim().slice(0, 80), lang: ko ? 'ko' : 'en', hash, salt, issuedAt: now, lastLoginAt: prev?.lastLoginAt || now };
  await putApplicant(env, acct);
  await env.CAMP_KV.delete(FAIL(email));
  await sendEmail(env, {
    to: email,
    subject: ko ? '[월코] 스태프 지원서 임시 비밀번호' : '[Word of Life Korea] Your temporary password for the staff application',
    html: tempPasswordEmailHtml({ name: acct.name, password, ko, link: `${origin}/apply/wolko-staff-k7m2q9/` }),
  });
  return acct;
}

export function tempPasswordEmailHtml({ name, password, ko, link }) {
  return `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.75;color:#13242d;max-width:560px;">
<div style="font-size:12px;letter-spacing:.18em;color:#0b4a62;font-weight:700;">WORD OF LIFE KOREA</div>
<h2 style="margin:6px 0 14px;font-size:20px;">${ko ? '스태프 지원서 임시 비밀번호' : 'Your temporary password'}</h2>
<p>${ko ? `${esc(name) || '지원자'}님, 아래 임시 비밀번호로 로그인하면 지원서를 저장하며 이어서 작성할 수 있습니다.` : `Dear ${esc(name) || 'applicant'}, sign in with the temporary password below to save your application and continue it at any time.`}</p>
<p style="margin:18px 0;padding:14px 18px;border:1px solid #dbe6ea;border-radius:4px;background:#f6f9fa;font-size:22px;font-weight:700;letter-spacing:.12em;font-family:Menlo,Consolas,monospace;">${esc(password)}</p>
<p><a href="${esc(link)}" style="color:#0b4a62;font-weight:700;">${ko ? '지원서로 가기' : 'Open the application'}</a></p>
<p style="color:#5b6b73;font-size:13px;">${ko ? `30일 동안 로그인하지 않으면 임시 계정과 작성 중인 내용이 자동으로 삭제됩니다. 비밀번호를 잃어버리면 같은 이메일로 새 임시 비밀번호를 받으세요. 직접 요청하지 않았다면 이 메일은 무시하셔도 됩니다.` : `If you do not sign in for 30 days, this temporary account and any unsubmitted draft are deleted automatically. If you lose this password, request a new one with the same email. If you did not request this, you can ignore this email.`}</p>
</div>`;
}

/** 이메일·임시 비밀번호 확인 → 성공하면 30일 기한을 다시 시작하고 세션 토큰을 준다. 실패는 { error, locked } */
export async function loginApplicant(env, { email, password }) {
  email = normalizeEmail(email);
  const fails = parseInt(await env.CAMP_KV.get(FAIL(email)), 10) || 0;
  if (fails >= MAX_FAILS) return { error: 'locked' };
  const acct = await getApplicant(env, email);
  const ok = acct && await verifyPassword(normalizeTempPassword(password), acct.hash, acct.salt);
  if (!ok) {
    await env.CAMP_KV.put(FAIL(email), String(fails + 1), { expirationTtl: LOCK_SECONDS });
    return { error: fails + 1 >= MAX_FAILS ? 'locked' : 'invalid' };
  }
  await env.CAMP_KV.delete(FAIL(email));
  acct.lastLoginAt = new Date().toISOString();
  await putApplicant(env, acct);
  const draft = await env.CAMP_KV.get(DRAFT(email));
  if (draft) await env.CAMP_KV.put(DRAFT(email), draft, { expirationTtl: IDLE_SECONDS });   // 작성 중인 내용도 같이 연장
  const token = randomToken();
  await env.CAMP_KV.put(SESS(await sha256Hex(token)), JSON.stringify({ email, at: acct.lastLoginAt }), { expirationTtl: SESSION_HOURS * 3600 });
  return { token, account: acct };
}

/** Authorization: Bearer … 로 로그인한 지원자 계정. 세션이나 계정이 없으면 null */
export async function applicantFromRequest(env, request) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,80})$/.exec(request.headers.get('Authorization') || '');
  if (!m) return null;
  const sess = await env.CAMP_KV.get(SESS(await sha256Hex(m[1])), 'json');
  if (!sess?.email) return null;
  const acct = await getApplicant(env, sess.email);
  return acct ? { ...acct, token: m[1] } : null;
}
export async function logoutApplicant(env, token) {
  if (token) await env.CAMP_KV.delete(SESS(await sha256Hex(token)));
}

export async function saveDraft(env, email, draft) {
  const sealed = await sealSensitive(env, draft);
  await env.CAMP_KV.put(DRAFT(email), JSON.stringify(sealed), { expirationTtl: IDLE_SECONDS });
}
export async function loadDraft(env, email) {
  const raw = await env.CAMP_KV.get(DRAFT(email), 'json');
  return raw ? openSensitive(env, raw) : null;
}
export const deleteDraft = (env, email) => env.CAMP_KV.delete(DRAFT(email));

/** 제출하면 계정에 신청서를 이어 둔다(진행 상황 보기·두 번 제출 막기) */
export async function linkApplication(env, acct, app) {
  const { token, ...clean } = acct;
  await putApplicant(env, { ...clean, appId: app.id, refNo: app.refNo, submittedAt: app.submittedAt });
}

/** 계정 기한: 마지막 로그인 + 30일 */
export const accountExpiresAt = acct => new Date(new Date(acct.lastLoginAt || acct.createdAt).getTime() + IDLE_SECONDS * 1000).toISOString();
