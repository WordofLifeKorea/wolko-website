/**
 * 추천서 작성 — 메일로 받은 개인 링크(/reference/?t=…)가 부르는 공개 API. 포탈 로그인 없음, 토큰이 곧 권한.
 *   GET  /api/apply/reference?t=TOKEN                    상태와 이메일 힌트(pa•••@x.com)만 — 이름·질문은 본인 확인 뒤에
 *   POST /api/apply/reference { t, action:'verify', email } 요청을 받은 이메일 주소를 맞게 적으면 확인표(v, 3시간)와 지원자·추천인 이름·질문
 *   POST /api/apply/reference { t, v, answers }           추천서 제출(한 번만, 확인표 필요) → 암호화 저장 · 신청서의 추천인 상태 '답변 받음' · 담당자 알림
 * 링크가 다른 사람에게 전달돼도 요청을 받은 이메일을 모르면 열어 볼 수도, 대신 써 낼 수도 없다.
 */
import { REFERENCE_SECTIONS, cleanReferenceAnswers, missingReference, refKey, TOKEN_RE, saveReferenceAnswers } from '../../lib/serveReference.js';
import { loadApplication, loadFullApplication, saveApplication, addAudit, ONLINE_APP_VIEWERS } from '../../lib/serveApplication.js';
import { normalizeEmail, sendEmail } from '../../lib/hubAccounts.js';
import { applyRateLimited } from '../../lib/applicantAccount.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const PAGE_URL = 'https://wolko.org/portal/serve-applications/';
const REPLY_DAYS = 14;

async function lookup(env, token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  const key = await refKey(token);
  const record = await env.CAMP_KV.get(key, 'json');
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) return null;
  return { key, record };
}

const VERIFY_HOURS = 3;
const MAX_WRONG = 5;   // 틀린 이메일 5번이면 그 링크는 15분 잠금
const sha = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
const randomV = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** 이메일 힌트: 앞 두 글자와 도메인만 */
const emailHint = email => { const [u, d] = String(email).split('@'); return `${u.slice(0, u.length > 2 ? 2 : 1)}•••@${d}`; };
async function verified(env, key, v) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(v || ''))) return false;
  const rec = await env.CAMP_KV.get(`serve:refv:${await sha(v)}`, 'json');
  return rec?.key === key;
}
async function formData(env, r) {
  const app = await loadApplication(env, r.appId);
  const docNo = app?.refNo ? `REF-${app.refNo}-${r.n}` : '';
  const dueAt = new Date(new Date(r.sentAt).getTime() + REPLY_DAYS * 86400000).toISOString();   // 요청 메일에 적은 회신 기한과 같다
  return { applicant: r.applicant, referee: r.name, refereeKo: r.nameKo, n: r.n, status: r.status, expiresAt: r.expiresAt, sentAt: r.sentAt, dueAt, docNo, sections: REFERENCE_SECTIONS };
}

const tooMany = () => fail('Too many requests. Please try again later. · 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);
const ipOf = request => request.headers.get('CF-Connecting-IP') || '';

export async function onRequestGet({ env, request }) {
  const ip = ipOf(request);
  if (ip && await applyRateLimited(env, `refget:${ip}`, 60)) return tooMany();   // 한 곳에서 링크를 마구 여는 것을 막는다
  const found = await lookup(env, new URL(request.url).searchParams.get('t'));
  if (!found) return fail('This link is invalid or has expired. · 링크가 올바르지 않거나 기한이 지났습니다.', 404);
  const r = found.record;
  // 제출이 끝난 링크는 이름 등 아무 정보도 내주지 않는다(전달·유출된 링크로 알 수 있는 것이 없게)
  if (r.status === 'completed') return Response.json({ status: 'completed' }, { headers: H });
  // 추천인이 링크를 처음 연 때를 남긴다(지원자·검토 담당자가 '열어 봄'으로 본다). 페이지 스크립트가 부를 때만이라 메일 보안 검사기는 대개 남지 않는다
  if (r.status === 'sent' && !r.openedAt) {
    r.openedAt = new Date().toISOString();
    await env.CAMP_KV.put(found.key, JSON.stringify(r), { expirationTtl: Math.max(60, Math.floor((new Date(r.expiresAt).getTime() - Date.now()) / 1000)) });
  }
  return Response.json({ status: r.status, needVerify: true, emailHint: emailHint(r.email) }, { headers: H });
}

export async function onRequestPost({ env, request, waitUntil }) {
  const ip = ipOf(request);
  if (ip && await applyRateLimited(env, `refpost:${ip}`, 20)) return tooMany();
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const found = await lookup(env, body?.t);
  if (!found) return fail('This link is invalid or has expired. · 링크가 올바르지 않거나 기한이 지났습니다.', 404);
  const { key, record } = found;
  if (record.status === 'completed') return fail('This reference has already been submitted. · 이미 제출된 추천서입니다.', 409);

  if (body?.action === 'verify') {
    const failKey = `serve:refvfail:${key}`;
    const wrong = parseInt(await env.CAMP_KV.get(failKey), 10) || 0;
    if (wrong >= MAX_WRONG) return fail('Too many wrong attempts. Please try again in 15 minutes. · 여러 번 틀려 15분 동안 잠겼습니다. 잠시 후 다시 시도해 주세요.', 429);
    if (normalizeEmail(body.email) !== record.email) {
      await env.CAMP_KV.put(failKey, String(wrong + 1), { expirationTtl: 15 * 60 });
      return fail('This email does not match the one we sent the request to. · 요청을 보낸 이메일 주소와 다릅니다.', 403);
    }
    await env.CAMP_KV.delete(failKey);
    const v = randomV();
    await env.CAMP_KV.put(`serve:refv:${await sha(v)}`, JSON.stringify({ key }), { expirationTtl: VERIFY_HOURS * 3600 });
    return Response.json({ ok: true, v, ...(await formData(env, record)) }, { headers: H });
  }

  if (!(await verified(env, key, body?.v))) return fail('Please confirm your email first. · 먼저 이메일로 본인 확인을 해 주세요.', 401, { needVerify: true });
  const answers = cleanReferenceAnswers(body?.answers);
  const missing = missingReference(answers);
  if (missing.length) return fail('Please complete all required fields. · 필수 항목을 모두 작성해 주세요.', 400, { missing });

  const now = new Date().toISOString();
  const app = await loadFullApplication(env, record.appId);   // 지원자가 아직 제출 전이면 없다 — 제출할 때 이어 붙인다
  await saveReferenceAnswers(env, record.appId, record.n, { ...answers, submittedAt: now, email: record.email }, { pending: !app });
  record.status = 'completed'; record.completedAt = now;
  await env.CAMP_KV.put(key, JSON.stringify(record), { expirationTtl: 60 * 86400 });

  if (app) {
    app.references = (app.references || []).map(x => (x.n === record.n ? { ...x, status: 'completed', completedAt: now } : x));
    addAudit(app, `referee:${record.email}`, 'reference', { note: `ref${record.n}` });
    await saveApplication(env, app, { ...app.values, [`ref${record.n}Status`]: 'received' });
    const lang = app.lang;
    const notify = async () => {
      if (!env.RESEND_API_KEY) return;
      const to = ONLINE_APP_VIEWERS;
      await sendEmail(env, { to, subject: lang === 'en' ? '[WOLKO] A reference was submitted' : '[WOLKO] 추천서가 도착했습니다', html: `<div style="word-break:keep-all;font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;"><p>${lang === 'en' ? `Reference ${record.n} has been submitted for application ${app.refNo || ''}.` : `신청서 ${app.refNo || ''}의 추천인 ${record.n} 추천서가 도착했습니다.`}</p><p><a href="${PAGE_URL}">${PAGE_URL}</a></p></div>` }).catch(e => console.error('reference notify failed:', e.message));
    };
    if (waitUntil) waitUntil(notify()); else await notify();
  }
  return Response.json({ ok: true }, { headers: H });
}
