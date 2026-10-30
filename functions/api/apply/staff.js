/**
 * 비공개 스태프(섬김) 지원서 — 링크를 받은 사람만 쓰는 페이지(/apply/…)가 부르는 공개 API. 포탈 로그인 없음.
 *   GET  /api/apply/staff            지원서 항목(내부용 칸 제외)
 *   POST /api/apply/staff { lang, values, consent, consentSensitive, website(함정 칸) }   임시 계정으로 로그인해야 한다(Bearer, account.js)
 *     → 포탈 "섬김 지원 신청서"에 제출된 신청서로 저장(민감 항목은 분리·암호화) → 추천인 1·2 에게 추천서 요청 메일
 *       → 검토 담당자·마스터에게 알림(이름·내용 없이) → 지원자에게 접수 확인 메일
 */
import { APPLICANT_SECTIONS } from '../../lib/serveApplicationSchema.js';
import { cleanApplicationValues, missingRequired, saveApplication, addAudit } from '../../lib/serveApplication.js';
import { reviewersFor, serveRateLimited } from '../../lib/serveInquiry.js';
import { sendOneReference, loadReferenceRecord, cancelReference, keepReferenceAnswers } from '../../lib/serveReference.js';
import { MASTER_EMAILS, normalizeEmail, sendEmail } from '../../lib/hubAccounts.js';
import { applicantFromRequest, linkApplication, deleteDraft, newAppId } from '../../lib/applicantAccount.js';
import { MAIL_LOGO, MAIL_FROM } from '../../lib/applyMail.js';

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
  // 개인정보 보호법 제23조: 민감정보(건강·범죄경력 등)는 일반 개인정보와 따로 동의를 받는다
  if (body?.consent !== true || body?.consentSensitive !== true) return fail(ko ? '개인정보 수집·이용과 민감정보 처리에 각각 동의해 주세요.' : 'Please give both consents (personal information and sensitive information).', 400, { missing: [body?.consent !== true ? 'consent' : 'consentSensitive'] });
  values.consent = true;   // 지원자가 직접 동의했다(내부 '동의 확인' 칸)
  const missing = missingRequired(values);
  if (missing.length) return fail(ko ? '필수 항목을 모두 작성해 주세요.' : 'Please complete all required fields.', 400, { missing });
  const email = normalizeEmail(values.email);
  if (values.ref1Email && normalizeEmail(values.ref1Email) === email) return fail(ko ? '추천인 이메일은 본인 이메일과 달라야 합니다.' : 'A reference email cannot be your own email.', 400, { missing: ['ref1Email'] });
  if (values.ref2Email && normalizeEmail(values.ref2Email) === email) return fail(ko ? '추천인 이메일은 본인 이메일과 달라야 합니다.' : 'A reference email cannot be your own email.', 400, { missing: ['ref2Email'] });

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await serveRateLimited(env, { email, ip })) return fail(ko ? '잠시 후 다시 시도해 주세요.' : 'Please try again a little later.', 429);

  const now = new Date().toISOString();
  const id = acct.pendingAppId || newAppId();   // 추천인 단계에서 요청을 미리 보냈다면 그때 정한 id
  const refNo = `WOLKO-${now.slice(2, 4)}${now.slice(5, 7)}-${id.slice(-5).toUpperCase()}`;
  const app = { id, refNo, source: 'online', lang, status: 'submitted', createdAt: now, updatedAt: now, submittedAt: now, createdBy: `applicant:${email}`, values: {}, audit: [] };
  addAudit(app, `applicant:${email}`, 'submit', { note: ko ? '지원자가 온라인으로 제출(개인정보·민감정보 각각 동의)' : 'Submitted online by the applicant (separate consent to personal and sensitive information)' });
  const origin = new URL(request.url).origin;
  // 추천인 단계에서 이미 보낸 요청은 그대로 잇고(이미 도착한 추천서도), 아직 안 보냈거나 주소가 바뀐 추천인에게만 지금 보낸다
  app.references = [];
  for (const n of [1, 2]) {
    const refEmail = normalizeEmail(values[`ref${n}Email`]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refEmail)) continue;
    const prev = acct.refs?.[n];
    const rec = prev ? await loadReferenceRecord(env, prev.key) : null;
    if (rec && prev.email === refEmail && rec.appId === id) {
      if (rec.status === 'completed') await keepReferenceAnswers(env, id, n);
      app.references.push({ n, email: rec.email, name: rec.name, status: rec.status === 'completed' ? 'completed' : 'sent', sentAt: rec.sentAt, completedAt: rec.completedAt || null, key: prev.key });
      continue;
    }
    if (prev) await cancelReference(env, prev.key, id, n);
    const r = await sendOneReference(env, { appId: id, n, values, origin });
    app.references.push(r.status === 'sent' ? r : { ...r, key: undefined });   // key: 토큰 기록 KV 키(열어 봄 확인용, 밖으로 내보내지 않는다)
  }
  const refStatus = n => { const r = app.references.find(x => x.n === n); return !r ? 'none' : r.status === 'completed' ? 'received' : r.status === 'sent' ? 'contacted' : 'none'; };
  values.ref1Status = refStatus(1);
  values.ref2Status = refStatus(2);
  await saveApplication(env, app, values);
  await linkApplication(env, acct, app);
  await deleteDraft(env, acct.email);

  const notify = async () => {
    if (!env.RESEND_API_KEY) return;
    const to = [...new Set([...reviewersFor(lang), ...MASTER_EMAILS.map(normalizeEmail)])];
    await sendEmail(env, {
      to,
      subject: ko ? '[WOLKO] 새 온라인 스태프 지원서가 접수되었습니다' : '[WOLKO] A new online staff application was submitted',
      html: `<div style="word-break:keep-all;font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.7;color:#0d1b24;"><p>${ko ? '새 스태프 지원서가 온라인으로 접수되었습니다. 추천인에게 추천서 요청 메일이 발송되었습니다.' : 'A new staff application was submitted online. Reference requests have been emailed.'}</p><p>${ko ? '접수 번호' : 'Reference no.'}: <b>${esc(refNo)}</b></p><p><a href="${PAGE_URL}">${PAGE_URL}</a></p></div>`,
    }).catch(e => console.error('apply notify failed:', e.message));
    await sendEmail(env, {
      to: email,
      fromName: MAIL_FROM,
      subject: ko ? '[월코] 스태프 지원서가 접수되었습니다' : 'Application received — Word of Life Korea',
      html: `<div style="word-break:keep-all;font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.75;color:#13242d;max-width:560px;"><div style="padding-bottom:16px;border-bottom:2px solid #3a3a3c;">${MAIL_LOGO}</div><h2 style="margin:22px 0 14px;font-size:20px;">${ko ? '지원서가 접수되었습니다' : 'Your application has been received'}</h2><p>${ko ? `${esc(values.nameKo || values.firstName)}님, 월코에 지원해 주셔서 감사합니다. 작성해 주신 추천인께 추천서 요청 메일을 보내 드렸습니다. 검토 후 담당자가 연락드리겠습니다. 지원서 페이지에 로그인하면 추천서 진행 상황을 확인할 수 있습니다.` : `Dear ${esc(values.firstName)}, thank you for applying to serve with Word of Life Korea. We have emailed reference requests to the references you listed. Our team will contact you after reviewing your application. You can sign in to the application page to see the status of your references.`}</p><p style="border:1px solid #3a3a3c;padding:12px 16px;">${ko ? '접수 번호' : 'Reference no.'}: <b>${esc(refNo)}</b></p></div>`,
    }).catch(e => console.error('apply confirm failed:', e.message));
  };
  if (waitUntil) waitUntil(notify()); else await notify();
  return Response.json({ ok: true, ref: refNo, references: app.references.map(r => ({ n: r.n, status: r.status })) }, { headers: H });
}

