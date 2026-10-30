/**
 * 스태프 지원자 임시 계정 (/apply/… 페이지). 포탈 계정과는 별개.
 *   POST { action:'issue', email, name, lang, website(함정 칸) }  임시 비밀번호를 메일로 보낸다(계정이 있든 없든 같은 답 — 가입 여부를 알려 주지 않는다)
 *   POST { action:'login', email, password }                      → { token, account, draft, application }
 *   POST { action:'logout' }                                      (Bearer)
 *   GET                                                           (Bearer) → { account, draft, application }
 *   PUT  { values, step }                                         (Bearer) 작성 중인 지원서 저장(암호화)
 * 마지막 로그인 후 30일이 지나면 계정과 작성 중인 내용은 자동으로 지워진다(applicantAccount.js).
 */
import { APPLICANT_SECTIONS } from '../../lib/serveApplicationSchema.js';
import { cleanApplicationValues, loadApplication } from '../../lib/serveApplication.js';
import { isValidEmail, normalizeEmail } from '../../lib/hubAccounts.js';
import {
  issueTempPassword, loginApplicant, applicantFromRequest, logoutApplicant, saveDraft, loadDraft,
  applyRateLimited, accountExpiresAt,
} from '../../lib/applicantAccount.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const APPLICANT_FIELD_IDS = new Set(APPLICANT_SECTIONS.flatMap(s => s.fields.map(f => f.id)));
const MAX_DRAFT_BYTES = 60000;

/** 지원자에게 보여 줄 진행 상황 — 합격·보류 같은 결정은 담당자가 직접 알리므로 '검토 중'으로만 보여 준다 */
async function applicationView(env, acct) {
  if (!acct.appId) return null;
  const app = await loadApplication(env, acct.appId);
  if (!app) return { refNo: acct.refNo, submittedAt: acct.submittedAt, stage: 'closed', references: [] };
  return {
    refNo: app.refNo, submittedAt: app.submittedAt,
    stage: app.status === 'submitted' ? 'received' : 'review',
    references: (app.references || []).map(r => ({ n: r.n, name: r.name, status: r.status, sentAt: r.sentAt, completedAt: r.completedAt || null })),
  };
}
async function draftView(env, acct) {
  if (acct.appId) return null;
  try { return await loadDraft(env, acct.email); } catch (e) { console.error('apply draft open failed:', e.message); return null; }
}
const accountView = acct => ({ email: acct.email, name: acct.name || '', lang: acct.lang, expiresAt: accountExpiresAt(acct), submitted: !!acct.appId });

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 500);
  const acct = await applicantFromRequest(env, request);
  if (!acct) return fail('로그인이 필요합니다. · Please sign in.', 401);
  return Response.json({ account: accountView(acct), draft: await draftView(env, acct), application: await applicationView(env, acct) }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const ko = body?.lang !== 'en';
  const action = body?.action;

  if (action === 'issue') {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return fail(ko ? '올바른 이메일 주소를 입력해 주세요.' : 'Please enter a valid email address.', 400, { field: 'email' });
    if (String(body.website || '').trim()) return Response.json({ ok: true }, { headers: H });   // 함정 칸
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const limited = await applyRateLimited(env, `issue:${email}`, 3) || (ip && await applyRateLimited(env, `issue-ip:${ip}`, 10));
    if (limited) return fail(ko ? '요청이 너무 많아요. 1시간 뒤에 다시 시도해 주세요.' : 'Too many requests. Please try again in an hour.', 429);
    if (!env.RESEND_API_KEY) return fail(ko ? '메일 발송 설정이 필요합니다. 월코에 문의해 주세요.' : 'Email is not configured. Please contact Word of Life Korea.', 500);
    try {
      await issueTempPassword(env, { email, name: body.name, lang: ko ? 'ko' : 'en', origin: new URL(request.url).origin });
    } catch (e) {
      console.error('apply issue failed:', e.message);
      return fail(ko ? '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' : 'Could not send the email. Please try again shortly.', 502);
    }
    return Response.json({ ok: true }, { headers: H });
  }

  if (action === 'login') {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email) || !body.password) return fail(ko ? '이메일과 임시 비밀번호를 입력해 주세요.' : 'Enter your email and temporary password.');
    const r = await loginApplicant(env, { email, password: String(body.password) });
    if (r.error === 'locked') return fail(ko ? '비밀번호를 여러 번 틀려 15분 동안 잠겼습니다. 새 임시 비밀번호를 받거나 잠시 후 다시 시도해 주세요.' : 'Too many wrong attempts. Sign-in is locked for 15 minutes — request a new temporary password or try again later.', 429);
    if (r.error) return fail(ko ? '이메일 또는 임시 비밀번호가 맞지 않습니다.' : 'The email or temporary password is incorrect.', 401);
    return Response.json({ ok: true, token: r.token, account: accountView(r.account), draft: await draftView(env, r.account), application: await applicationView(env, r.account) }, { headers: H });
  }

  if (action === 'logout') {
    const acct = await applicantFromRequest(env, request);
    if (acct) await logoutApplicant(env, acct.token);
    return Response.json({ ok: true }, { headers: H });
  }
  return fail('알 수 없는 요청입니다.');
}

export async function onRequestPut({ env, request }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 500);
  const acct = await applicantFromRequest(env, request);
  if (!acct) return fail('로그인이 필요합니다. · Please sign in.', 401);
  if (acct.appId) return fail('이미 제출한 지원서입니다. · This application has already been submitted.', 409);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const raw = Object.fromEntries(Object.entries(body?.values || {}).filter(([k]) => APPLICANT_FIELD_IDS.has(k)));
  const values = cleanApplicationValues(raw);
  values.email = acct.email;   // 지원서 이메일은 로그인한 이메일로 고정
  const step = Math.max(0, Math.min(APPLICANT_SECTIONS.length, parseInt(body?.step, 10) || 0));
  const draft = { values, step, savedAt: new Date().toISOString() };
  if (JSON.stringify(draft).length > MAX_DRAFT_BYTES) return fail('내용이 너무 깁니다. · Too long.', 413);
  await saveDraft(env, acct.email, draft);
  return Response.json({ ok: true, savedAt: draft.savedAt }, { headers: H });
}
