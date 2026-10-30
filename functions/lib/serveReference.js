/**
 * 섬김 지원서 — 추천인(목회자·동역자) 추천서 요청과 답변.
 *
 * 흐름: 지원자가 비공개 지원서(/apply/…)를 제출하면 추천인 1·2의 이메일로 개인별 링크가 든 공식 요청 메일을 보낸다
 *   → 추천인이 /reference/?t=… 에서 추천서를 작성·서명해 제출 → 답변은 암호화해서(SERVE_APP_KEY) 신청서 옆에 저장하고,
 *   포탈 섬김 지원 신청서에서 검토 담당자·마스터만 본다. 지원자는 추천서 내용을 볼 수 없다.
 *
 * 저장소(CAMP_KV)
 *   serve:ref:{sha256(token)}       요청 { appId, n, email, name, applicant, position, status: 'sent'|'completed', sentAt, completedAt, expiresAt }
 *   serve:refans:{appId}:{n}        답변(sealSensitive 로 암호화)
 * 링크의 토큰은 메일에만 있고 서버에는 해시만 둔다. 60일 지나면 링크가 만료된다.
 */
import { sendEmail, normalizeEmail } from './hubAccounts.js';
import { MAIL_LOGO, MAIL_NAVY } from './applyMail.js';
import { sealSensitive, openSensitive } from './serveApplication.js';

export const REF_PREFIX = 'serve:ref:';
export const REF_ANSWER_KEY = (appId, n) => `serve:refans:${appId}:${n}`;
export const REF_TTL_DAYS = 60;
const L = (ko, en) => ({ ko, en });

const RATING = [
  { v: 'excellent', ko: '매우 우수', en: 'Excellent' },
  { v: 'good', ko: '우수', en: 'Good' },
  { v: 'fair', ko: '보통', en: 'Fair' },
  { v: 'poor', ko: '미흡', en: 'Poor' },
  { v: 'unknown', ko: '판단하기 어려움', en: 'Unable to assess' },
];
const YN = [{ v: 'no', ko: '아니요', en: 'No' }, { v: 'yes', ko: '예', en: 'Yes' }];

/** 추천서 질문 — 화면과 서버 검증이 같은 정의를 쓴다 */
export const REFERENCE_SECTIONS = [
  {
    id: 'relationship', title: L('지원자와의 관계', 'Relationship to the applicant'),
    fields: [
      { id: 'capacity', type: 'text', required: true, max: 200, label: L('어떤 관계로 지원자를 알고 계십니까?', 'In what capacity do you know the applicant?'), hint: L('예: 담임목사, 청년부 담당 목사, 사역 동역자', 'e.g. Senior pastor, youth pastor, ministry colleague') },
      { id: 'yearsKnown', type: 'select', required: true, label: L('알고 지낸 기간', 'How long have you known the applicant?'), options: ['1-2', '3-5', '6-10', '10-15', '15+'].map(v => ({ v, ko: `${v}년`, en: `${v} years` })) },
      { id: 'churchMember', type: 'radio', required: true, options: YN, label: L('지원자가 귀하의 교회에 출석(등록)하고 있습니까?', 'Does the applicant attend (or belong to) your church?') },
    ],
  },
  {
    id: 'assessment', title: L('평가', 'Assessment'),
    intro: L('각 항목에 대해 지원자를 가장 잘 나타내는 것을 골라 주세요.', 'Please select the rating that best describes the applicant in each area.'),
    fields: [
      { id: 'rSpiritual', type: 'rating', required: true, options: RATING, label: L('영적 성숙도와 신앙생활', 'Spiritual maturity and walk with the Lord') },
      { id: 'rCharacter', type: 'rating', required: true, options: RATING, label: L('인격과 정직성', 'Character and integrity') },
      { id: 'rYouth', type: 'rating', required: true, options: RATING, label: L('청소년·어린이와의 관계', 'Relating to youth and children') },
      { id: 'rTeam', type: 'rating', required: true, options: RATING, label: L('협력과 팀워크', 'Teamwork and cooperation') },
      { id: 'rReliable', type: 'rating', required: true, options: RATING, label: L('책임감과 신뢰성', 'Dependability and responsibility') },
      { id: 'rTeachable', type: 'rating', required: true, options: RATING, label: L('배우려는 자세와 순종', 'Teachability and submission to leadership') },
    ],
  },
  {
    id: 'comments', title: L('의견', 'Comments'),
    fields: [
      { id: 'strengths', type: 'textarea', required: true, max: 3000, label: L('지원자의 강점과 은사를 적어 주세요.', 'Please describe the applicant’s strengths and spiritual gifts.') },
      { id: 'growth', type: 'textarea', max: 3000, label: L('지원자가 더 성장해야 할 부분이 있다면 적어 주세요.', 'Are there areas in which the applicant needs to grow?') },
      { id: 'concern', type: 'radio', required: true, options: YN, label: L('지원자가 청소년·어린이를 섬기는 데 염려되는 점이 있습니까?', 'Do you have any concerns about the applicant working with youth or children?') },
      { id: 'concernNote', type: 'textarea', required: true, showIf: { field: 'concern', equals: 'yes' }, max: 3000, label: L('염려되는 점을 구체적으로 적어 주세요.', 'Please explain your concerns.') },
      { id: 'recommendation', type: 'radio', required: true, label: L('종합 추천 의견', 'Overall recommendation'), options: [
        { v: 'highly', ko: '적극 추천합니다', en: 'I highly recommend this applicant' },
        { v: 'recommend', ko: '추천합니다', en: 'I recommend this applicant' },
        { v: 'reservations', ko: '조건부로 추천합니다', en: 'I recommend with reservations' },
        { v: 'not', ko: '추천하지 않습니다', en: 'I do not recommend this applicant' },
      ] },
      { id: 'additional', type: 'textarea', max: 3000, label: L('그 밖에 전하고 싶은 말씀', 'Additional comments') },
    ],
  },
  {
    id: 'signature', title: L('추천인 확인 및 서명', 'Referee certification and signature'),
    fields: [
      { id: 'refName', type: 'text', required: true, max: 120, label: L('성함', 'Full name') },
      { id: 'refTitle', type: 'text', required: true, max: 120, label: L('직분·직책', 'Title / Position') },
      { id: 'refOrg', type: 'text', required: true, max: 200, label: L('교회·기관', 'Church / Organization') },
      { id: 'refPhone', type: 'tel', max: 40, label: L('연락처', 'Phone number') },
      { id: 'certify', type: 'checkbox', required: true, label: L('위 내용은 제가 아는 바에 따라 사실대로 작성했으며, 이 추천서가 월코(Word of Life Korea)의 지원자 검토에만 사용되고 지원자에게 공개되지 않는다는 것을 이해합니다.', 'I certify that the information above is true to the best of my knowledge, and I understand this reference is confidential, used only by Word of Life Korea to evaluate the applicant, and will not be shared with the applicant.') },
      { id: 'signature', type: 'text', required: true, max: 120, label: L('서명 (성함을 입력해 주세요)', 'Signature (type your full name)') },
    ],
  },
];
export const REFERENCE_FIELDS = REFERENCE_SECTIONS.flatMap(s => s.fields);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const visible = (f, v) => !f.showIf || v[f.showIf.field] === f.showIf.equals;

/** 추천서 답변 정리 — 정의된 항목만, 선택값은 정해진 것만 */
export function cleanReferenceAnswers(raw) {
  const out = {};
  for (const f of REFERENCE_FIELDS) {
    const v = raw?.[f.id];
    if (v === undefined || v === null) continue;
    if (f.type === 'checkbox') { out[f.id] = v === true || v === 'true'; continue; }
    const text = String(v).trim().slice(0, f.max || 200);
    if (!text) { out[f.id] = ''; continue; }
    if (f.options && !f.options.some(o => o.v === text)) continue;
    out[f.id] = text;
  }
  return out;
}
export function missingReference(values) {
  return REFERENCE_FIELDS.filter(f => f.required && visible(f, values) && (f.type === 'checkbox' ? values[f.id] !== true : !String(values[f.id] ?? '').trim())).map(f => f.id);
}

async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/;
export const refKey = async token => `${REF_PREFIX}${await sha256Hex(token)}`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 공식 추천서 요청 메일 — 레터헤드 · 요청 내용 · 버튼 · 기한 · 비밀 유지 안내 (한·영 함께) */
export function referenceEmailHtml({ refName, applicant, link, due }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f7;padding:32px 12px;word-break:keep-all;font-family:'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif;color:#13242d;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dfe7eb;border-radius:4px;">
<tr><td style="padding:28px 36px 20px;border-bottom:2px solid #3a3a3c;">
  ${MAIL_LOGO}
  <div style="font-size:20px;font-weight:700;margin-top:22px;">Confidential Reference Request</div>
  <div style="font-size:14px;color:#56707b;margin-top:2px;">추천서 요청 (비공개)</div>
</td></tr>
<tr><td style="padding:26px 36px 8px;font-size:15px;line-height:1.75;">
  <p style="margin:0 0 14px;">${esc(refName) ? `Dear ${esc(refName)},` : 'Dear Referee,'}</p>
  <p style="margin:0 0 14px;"><b>${esc(applicant)}</b> has applied to serve with Word of Life Korea (WOLKO) and has listed you as a reference. Because our staff serve young people, we ask references to share an honest assessment of the applicant’s faith, character, and fitness for ministry.</p>
  <p style="margin:0 0 14px;color:#33505c;">${esc(applicant)}님이 월코(Word of Life Korea) 사역에 지원하시면서 귀하를 추천인으로 적어 주셨습니다. 월코의 스태프는 청소년을 섬기기에, 지원자의 신앙과 인격, 사역 적합성에 대한 솔직한 의견을 부탁드립니다.</p>
</td></tr>
<tr><td style="padding:6px 36px 6px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f6f9fa;border:1px solid #e3ebee;border-radius:4px;font-size:14px;">
    <tr><td style="padding:12px 16px;color:#56707b;width:40%;">Applicant · 지원자</td><td style="padding:12px 16px;font-weight:700;">${esc(applicant)}</td></tr>
    <tr><td style="padding:0 16px 12px;color:#56707b;">Estimated time · 소요 시간</td><td style="padding:0 16px 12px;">About 10 minutes · 약 10분</td></tr>
    <tr><td style="padding:0 16px 12px;color:#56707b;">Please respond by · 회신 기한</td><td style="padding:0 16px 12px;">${esc(due)}</td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:24px 36px 8px;">
  <a href="${esc(link)}" style="display:inline-block;background:${MAIL_NAVY};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:2px;">Complete the Reference &nbsp;·&nbsp; 추천서 작성하기</a>
</td></tr>
<tr><td style="padding:16px 36px 26px;font-size:12.5px;line-height:1.7;color:#6a808a;">
  <p style="margin:0 0 8px;">This link is unique to you. Your response is confidential and will not be shared with the applicant. · 이 링크는 귀하만을 위한 것입니다. 작성하신 내용은 비공개로 다뤄지며 지원자에게 공개되지 않습니다.</p>
  <p style="margin:0;">If the button does not work, copy this address into your browser: · 버튼이 열리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.<br><span style="word-break:break-all;color:${MAIL_NAVY};">${esc(link)}</span></p>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid #e6eef1;font-size:12px;color:#8a9ca4;">Word of Life Korea · 월코 &nbsp;|&nbsp; wolko.org</td></tr>
</table></td></tr></table></body></html>`;
}

/** 신청서의 추천인 1·2 에게 요청 메일을 보낸다. 보낸 요청 목록을 돌려준다(메일 실패는 status 'failed') */
export async function sendReferenceRequests(env, app, values, origin) {
  const applicant = [values.firstName, values.lastName].filter(Boolean).join(' ') + (values.nameKo ? ` (${values.nameKo})` : '');
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const out = [];
  for (const n of [1, 2]) {
    const email = normalizeEmail(values[`ref${n}Email`]);
    if (!EMAIL_RE.test(email)) continue;
    const refName = [values[`ref${n}Prefix`], values[`ref${n}FirstName`], values[`ref${n}LastName`]].filter(Boolean).join(' ') || values[`ref${n}NameKo`] || '';
    const token = randomToken();
    const now = new Date();
    const record = { appId: app.id, n, email, name: refName, nameKo: values[`ref${n}NameKo`] || '', applicant, status: 'sent', sentAt: now.toISOString(), expiresAt: new Date(now.getTime() + REF_TTL_DAYS * 86400000).toISOString() };
    await env.CAMP_KV.put(await refKey(token), JSON.stringify(record), { expirationTtl: REF_TTL_DAYS * 86400 });
    let status = 'sent';
    try {
      if (!env.RESEND_API_KEY) throw new Error('no mail key');
      await sendEmail(env, { to: email, subject: `Reference request for ${applicant} — Word of Life Korea · 추천서 요청`, html: referenceEmailHtml({ refName, applicant, link: `${origin}/reference/?t=${token}`, due }) });
    } catch (error) { status = 'failed'; console.error('reference mail failed:', error.message); }
    out.push({ n, email, name: refName, status, sentAt: record.sentAt });
  }
  return out;
}

/** 추천서 답변 저장(암호화) */
export async function saveReferenceAnswers(env, appId, n, answers) {
  await env.CAMP_KV.put(REF_ANSWER_KEY(appId, n), JSON.stringify(await sealSensitive(env, answers)));
}
export async function loadReferenceAnswers(env, appId, n) {
  const sealed = await env.CAMP_KV.get(REF_ANSWER_KEY(appId, n), 'json');
  return sealed ? openSensitive(env, sealed) : null;
}
