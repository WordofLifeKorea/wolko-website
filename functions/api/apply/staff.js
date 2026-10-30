/**
 * 비공개 스태프(섬김) 지원서 — 링크를 받은 사람만 쓰는 페이지(/apply/…)가 부르는 공개 API. 포탈 로그인 없음.
 *   GET  /api/apply/staff            지원서 항목(내부용 칸 제외)
 *   POST /api/apply/staff { lang, values, consent, website(함정 칸) }   임시 계정으로 로그인해야 한다(Bearer, account.js)
 *     → 포탈 "섬김 지원 신청서"에 제출된 신청서로 저장(민감 항목은 분리·암호화) → 추천인 1·2 에게 추천서 요청 메일
 *       → 검토 담당자·마스터에게 알림(이름·내용 없이) → 지원자에게 접수 확인 메일
 */
import { APPLICANT_SECTIONS } from '../../lib/serveApplicationSchema.js';
import { cleanApplicationValues, missingRequired, saveApplication, addAudit } from '../../lib/serveApplication.js';
import { reviewersFor, serveRateLimited } from '../../lib/serveInquiry.js';
import { sendReferenceRequests } from '../../lib/serveReference.js';
import { MASTER_EMAILS, normalizeEmail, sendEmail } from '../../lib/hubAccounts.js';
import { applicantFromRequest, linkApplication, deleteDraft } from '../../lib/applicantAccount.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const APPLICANT_FIELD_IDS = new Set(APPLICANT_SECTIONS.flatMap(s => s.fields.map(f => f.id)));
const PAGE_URL = 'https://wolko.org/portal/serve-applications/';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet() {
  return Response.json({ sections: APPLICANT_SECTIONS }, { headers: { ...H, 'Cache-Control': 'public, max-age=300' } });
}

export async function onRequestPost({ env, request, waitUntil }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const lang = body?.lang === 'en' ? 'en' : 'ko';
  const ko = lang === 'ko';
  if (String(body?.website || '').trim()) return Response.json({ ok: true, ref: '—' }, { headers: H });   // 함정 칸을 채운 자동 제출은 조용히 버린다
  const acct = await applicantFromRequest(env, request);
  if (!acct) return fail(ko ? '로그인이 필요합니다. 다시 로그인해 주세요.' : 'Please sign in again.', 401);
  if (acct.appId) return fail(ko ? '이미 제출한 지원서입니다.' : 'You have already submitted an application.', 409, { ref: acct.refNo });

  const raw = Object.fromEntries(Object.entries(body?.values || {}).filter(([k]) => APPLICANT_FIELD_IDS.has(k)));
  const values = cleanApplicationValues({ ...raw, email: acct.email });   // 지원서 이메일 = 로그인한 이메일
  if (body?.consent !== true) return fail(ko ? '개인정보 및 민감정보 수집·이용에 동의해 주세요.' : 'Please agree to the collection and use of your personal information.', 400, { missing: ['consent'] });
  values.consent = true;   // 지원자가 직접 동의했다(내부 '동의 확인' 칸)
  const missing = missingRequired(values);
  if (missing.length) return fail(ko ? '필수 항목을 모두 작성해 주세요.' : 'Please complete all required fields.', 400, { missing });
  const email = normalizeEmail(values.email);
  if (values.ref1Email && normalizeEmail(values.ref1Email) === email) return fail(ko ? '추천인 이메일은 본인 이메일과 달라야 합니다.' : 'A reference email cannot be your own email.', 400, { missing: ['ref1Email'] });
  if (values.ref2Email && normalizeEmail(values.ref2Email) === email) return fail(ko ? '추천인 이메일은 본인 이메일과 달라야 합니다.' : 'A reference email cannot be your own email.', 400, { missing: ['ref2Email'] });

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await serveRateLimited(env, { email, ip })) return fail(ko ? '잠시 후 다시 시도해 주세요.' : 'Please try again a little later.', 429);

  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const refNo = `WOLKO-${now.slice(2, 4)}${now.slice(5, 7)}-${id.slice(-5).toUpperCase()}`;
  const app = { id, refNo, source: 'online', lang, status: 'submitted', createdAt: now, updatedAt: now, submittedAt: now, createdBy: `applicant:${email}`, values: {}, audit: [] };
  addAudit(app, `applicant:${email}`, 'submit', { note: ko ? '지원자가 온라인으로 제출(동의 포함)' : 'Submitted online by the applicant (with consent)' });
  const origin = new URL(request.url).origin;
  app.references = await sendReferenceRequests(env, app, values, origin);
  values.ref1Status = app.references.some(r => r.n === 1 && r.status === 'sent') ? 'contacted' : 'none';
  values.ref2Status = app.references.some(r => r.n === 2 && r.status === 'sent') ? 'contacted' : 'none';
  await saveApplication(env, app, values);
  await linkApplication(env, acct, app);
  await deleteDraft(env, acct.email);

  const notify = async () => {
    if (!env.RESEND_API_KEY) return;
    const to = [...new Set([...reviewersFor(lang), ...MASTER_EMAILS.map(normalizeEmail)])];
    await sendEmail(env, {
      to,
      subject: ko ? '[WOLKO] 새 온라인 스태프 지원서가 접수되었습니다' : '[WOLKO] A new online staff application was submitted',
      html: `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;"><p>${ko ? '새 스태프 지원서가 온라인으로 접수되었습니다. 추천인에게 추천서 요청 메일이 발송되었습니다.' : 'A new staff application was submitted online. Reference requests have been emailed.'}</p><p>${ko ? '접수 번호' : 'Reference no.'}: <b>${esc(refNo)}</b></p><p><a href="${PAGE_URL}">${PAGE_URL}</a></p></div>`,
    }).catch(e => console.error('apply notify failed:', e.message));
    await sendEmail(env, {
      to: email,
      subject: ko ? '지원서가 접수되었습니다 — 월코 (Word of Life Korea)' : 'Application received — Word of Life Korea',
      html: `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.75;color:#13242d;max-width:560px;"><div style="font-size:12px;letter-spacing:.18em;color:#0b4a62;font-weight:700;">WORD OF LIFE KOREA</div><h2 style="margin:6px 0 14px;font-size:20px;">${ko ? '지원서가 접수되었습니다' : 'Your application has been received'}</h2><p>${ko ? `${esc(values.nameKo || values.firstName)}님, 월코에 지원해 주셔서 감사합니다. 작성해 주신 추천인께 추천서 요청 메일을 보내 드렸습니다. 검토 후 담당자가 연락드리겠습니다. 지원서 페이지에 로그인하면 추천서 진행 상황을 확인할 수 있습니다.` : `Dear ${esc(values.firstName)}, thank you for applying to serve with Word of Life Korea. We have emailed reference requests to the references you listed. Our team will contact you after reviewing your application. You can sign in to the application page to see the status of your references.`}</p><p style="background:#f6f9fa;border:1px solid #e3ebee;padding:12px 16px;border-radius:4px;">${ko ? '접수 번호' : 'Reference no.'}: <b>${esc(refNo)}</b></p></div>`,
    }).catch(e => console.error('apply confirm failed:', e.message));
  };
  if (waitUntil) waitUntil(notify()); else await notify();
  return Response.json({ ok: true, ref: refNo, references: app.references.map(r => ({ n: r.n, status: r.status })) }, { headers: H });
}

