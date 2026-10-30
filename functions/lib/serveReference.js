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
import { MAIL_LOGO, MAIL_NAVY, MAIL_FROM, preheader } from './applyMail.js';
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

/** 추천서 요청 메일 — 스팸으로 오해받지 않게: 한국어 이름이 있으면 한국어 먼저, 미리보기 줄·텍스트판 포함 */
export function referenceEmailSubject({ applicantKo, applicantEn }) {
  return applicantKo ? `[월코] ${applicantKo} 님의 추천서 작성을 부탁드립니다` : `Reference request for ${applicantEn} — Word of Life Korea`;
}
const fmtDue = (iso, ko) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return !m ? iso : ko ? `${m[1]}년 ${+m[2]}월 ${+m[3]}일` : `${m[1]}-${m[2]}-${m[3]}`; };
function refCopy({ refName, refNameKo, applicantKo, applicantEn }) {
  const ko = !!applicantKo, who = applicantKo || applicantEn;
  return {
    ko, who,
    pre: ko ? `${who} 님이 월코 스태프 지원서에 귀하를 추천인으로 적어 주셨습니다. 10분 정도면 작성하실 수 있습니다.` : `${who} has named you as a reference for a Word of Life Korea staff application. It takes about 10 minutes.`,
    kicker: ko ? '추천서 작성 요청' : 'Reference request',
    title: ko ? `${who} 님의 추천서 작성을 부탁드립니다` : `Would you write a reference for ${who}?`,
    hello: ko ? `${refNameKo || refName || '추천인'} 님께` : `Dear ${refName || 'Referee'},`,
    body: ko ? `${who} 님이 월코(Word of Life Korea) 스태프로 지원하시면서 귀하를 추천인으로 적어 주셨습니다. 월코 스태프는 청소년을 가까이에서 섬기게 되므로, 지원자의 신앙과 인격에 대해 아시는 대로 솔직한 의견을 부탁드립니다.`
      : `${who} has applied to serve on staff with Word of Life Korea (WOLKO) and has named you as a reference. Our staff work closely with young people, so we would be grateful for your honest view of the applicant’s faith and character.`,
    rows: ko ? [['지원자', who], ['지원 분야', '스태프'], ['작성 시간', '약 10분'], ['회신 기한', null]] : [['Applicant', who], ['Position', 'Staff'], ['Time needed', 'About 10 minutes'], ['Please reply by', null]],
    howTitle: ko ? '작성 방법' : 'How it works',
    how: ko ? ['아래 버튼을 눌러 추천서 양식을 엽니다.', '이 메일을 받으신 주소를 한 번 입력해 본인 확인을 합니다.', '질문에 답하고 성함으로 서명한 뒤 제출합니다. 적는 중에는 자동으로 임시 저장됩니다.']
      : ['Open the reference form with the button below.', 'Enter the email address this message was sent to, to confirm it is you.', 'Answer the questions, sign with your name and submit. Your answers are saved as you go.'],
    btn: ko ? '추천서 작성하기' : 'Write the reference',
    note: ko ? '이 링크는 귀하만을 위한 것입니다. 작성하신 내용은 검토 담당자만 보며 지원자에게는 공개되지 않습니다.' : 'This link is for you only. Your reference is read by our reviewers and is not shown to the applicant.',
    other: ko ? `${applicantEn ? applicantEn + ' has' : 'The applicant has'} applied to serve with Word of Life Korea and named you as a reference.` : '추천서 양식은 한국어로도 작성하실 수 있습니다.',
    otherLink: ko ? 'Open the form in English' : '한국어로 작성하기',
    otherLang: ko ? 'en' : 'ko',
    alt: ko ? '버튼이 열리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.' : 'If the button does not work, paste this address into your browser:',
  };
}
export function referenceEmailHtml({ refName, refNameKo, applicantKo, applicantEn, link, due }) {
  const c = refCopy({ refName, refNameKo, applicantKo, applicantEn });
  due = fmtDue(due, c.ko);
  const F = "font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif;";
  const rows = c.rows.map(([k, v], i) => `<tr><td style="${F}padding:11px 0;width:30%;font-size:14px;color:#6a6d72;${i ? 'border-top:1px solid #e3e6e8;' : ''}">${k}</td><td style="${F}padding:11px 0;font-size:14px;font-weight:600;color:#2b2d2f;${i ? 'border-top:1px solid #e3e6e8;' : ''}">${esc(v ?? due)}</td></tr>`).join('');
  const how = c.how.map((h, i) => `<tr><td valign="top" style="${F}width:28px;padding:6px 0;font-size:14px;font-weight:700;color:${MAIL_NAVY};">${i + 1}</td><td style="${F}padding:6px 0;font-size:14px;line-height:1.65;color:#3d4044;">${esc(h)}</td></tr>`).join('');
  return `<!doctype html><html lang="${c.ko ? 'ko' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.kicker)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f6;">
${preheader(esc(c.pre))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f6;">
<tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d5d9dc;word-break:keep-all;">
  <tr><td style="padding:24px 36px 20px;border-bottom:1px solid #e3e6e8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle">${MAIL_LOGO}</td>
      <td valign="middle" align="right" style="${F}font-size:12px;color:#6a6d72;white-space:nowrap;padding-left:12px;">${esc(c.kicker)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:34px 36px 0;">
    <h1 style="${F}margin:0;font-size:24px;line-height:1.35;font-weight:700;color:#2b2d2f;letter-spacing:-0.3px;">${esc(c.title)}</h1>
  </td></tr>
  <tr><td style="padding:22px 36px 0;">
    <p style="${F}margin:0 0 10px;font-size:15px;font-weight:600;color:#2b2d2f;">${esc(c.hello)}</p>
    <p style="${F}margin:0;font-size:15px;line-height:1.8;color:#3d4044;">${esc(c.body)}</p>
  </td></tr>
  <tr><td style="padding:24px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #3a3a3c;border-bottom:1px solid #3a3a3c;">${rows}</table>
  </td></tr>
  <tr><td style="padding:26px 36px 0;">
    <p style="${F}margin:0 0 6px;font-size:14px;font-weight:700;color:#2b2d2f;">${esc(c.howTitle)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${how}</table>
  </td></tr>
  <tr><td style="padding:26px 36px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td align="center" bgcolor="${MAIL_NAVY}" style="background:${MAIL_NAVY};">
        <a href="${esc(link)}" target="_blank" style="${F}display:block;padding:16px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(c.btn)}</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:22px 36px 30px;">
    <p style="${F}margin:0 0 8px;font-size:13px;line-height:1.7;color:#4e5155;">${esc(c.note)}</p>
    <p style="${F}margin:0 0 8px;font-size:13px;line-height:1.7;color:#6a6d72;">${esc(c.other)} <a href="${esc(link)}&amp;lang=${c.otherLang}" style="color:${MAIL_NAVY};font-weight:600;">${esc(c.otherLink)}</a></p>
    <p style="${F}margin:0;font-size:12.5px;line-height:1.7;color:#6a6d72;">${esc(c.alt)}<br><a href="${esc(link)}" style="color:${MAIL_NAVY};word-break:break-all;">${esc(link)}</a></p>
  </td></tr>
  <tr><td style="${F}padding:16px 36px;background:#fafbfb;border-top:1px solid #e3e6e8;font-size:12px;line-height:1.6;color:#6a6d72;">월코 (Word of Life Korea) · <a href="https://wolko.org" style="color:#6a6d72;">wolko.org</a></td></tr>
</table>
</td></tr></table></body></html>`;
}
export function referenceEmailText({ refName, refNameKo, applicantKo, applicantEn, link, due }) {
  const c = refCopy({ refName, refNameKo, applicantKo, applicantEn });
  due = fmtDue(due, c.ko);
  return [c.title, '', c.hello, '', c.body, '', ...c.rows.map(([k, v]) => `${k}: ${v ?? due}`), '', c.howTitle, ...c.how.map((h, i) => `${i + 1}. ${h}`), '', `${c.btn}: ${link}`, '', c.note, `${c.other} ${c.otherLink}: ${link}&lang=${c.otherLang}`, '', '월코 (Word of Life Korea) · wolko.org'].filter(x => x !== undefined && x !== null).join('\n');
}

/** 추천인 한 명에게 요청 메일을 보낸다 — 지원서를 내기 전(추천인 단계에서 '다음')에도 보낸다. appId 는 그때 미리 정해 둔 신청서 id.
 *  돌려주는 key 는 토큰 기록의 KV 키(토큰 자체는 메일 링크에만 있다) */
export async function sendOneReference(env, { appId, n, values, origin }) {
  const applicant = [values.firstName, values.lastName].filter(Boolean).join(' ') + (values.nameKo ? ` (${values.nameKo})` : '');
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const email = normalizeEmail(values[`ref${n}Email`]);
  const refName = [values[`ref${n}Prefix`], values[`ref${n}FirstName`], values[`ref${n}LastName`]].filter(Boolean).join(' ') || values[`ref${n}NameKo`] || '';
  const token = randomToken(), key = await refKey(token);
  const now = new Date();
  const record = { appId, n, email, name: refName, nameKo: values[`ref${n}NameKo`] || '', applicant, status: 'sent', sentAt: now.toISOString(), expiresAt: new Date(now.getTime() + REF_TTL_DAYS * 86400000).toISOString() };
  await env.CAMP_KV.put(key, JSON.stringify(record), { expirationTtl: REF_TTL_DAYS * 86400 });
  let status = 'sent';
  try {
    if (!env.RESEND_API_KEY) throw new Error('no mail key');
    const mail = { refName, refNameKo: values[`ref${n}NameKo`] || '', applicantKo: values.nameKo || '', applicantEn: [values.firstName, values.lastName].filter(Boolean).join(' '), link: `${origin}/reference/?t=${token}`, due };
    await sendEmail(env, { to: email, fromName: MAIL_FROM, subject: referenceEmailSubject(mail), html: referenceEmailHtml(mail), text: referenceEmailText(mail) });
  } catch (error) { status = 'failed'; console.error('reference mail failed:', error.message); await env.CAMP_KV.delete(key); }
  return { n, email, name: refName, status, sentAt: record.sentAt, key };
}
export const loadReferenceRecord = (env, key) => (key ? env.CAMP_KV.get(key, 'json') : null);
/** 신청서에 저장된 추천인 목록에 '링크를 열어 본 때'를 붙인다(토큰 기록의 KV 키는 밖으로 내보내지 않는다) */
export async function withOpened(env, refs) {
  return Promise.all((refs || []).map(async ({ key, ...r }) => {
    const rec = key ? await loadReferenceRecord(env, key) : null;
    return { ...r, openedAt: rec?.openedAt || r.openedAt || null };
  }));
}
/** 추천인을 바꾸면 예전 링크는 더 이상 열리지 않게 하고, 그 사람이 이미 써 둔 답변도 지운다 */
export async function cancelReference(env, key, appId, n) {
  if (key) await env.CAMP_KV.delete(key);
  if (appId) await env.CAMP_KV.delete(REF_ANSWER_KEY(appId, n));
}

/** (예전 방식) 신청서의 추천인 1·2 에게 한꺼번에 요청 메일을 보낸다 */
export async function sendReferenceRequests(env, app, values, origin) {
  const out = [];
  for (const n of [1, 2]) {
    if (!EMAIL_RE.test(normalizeEmail(values[`ref${n}Email`]))) continue;
    const { key, ...r } = await sendOneReference(env, { appId: app.id, n, values, origin });
    out.push(r);
  }
  return out;
}

/** 추천서 답변 저장(암호화) */
export async function saveReferenceAnswers(env, appId, n, answers, { pending = false } = {}) {
  // 지원자가 아직 제출하지 않았으면 기한을 둔다(제출하면 keepReferenceAnswers 로 기한을 없앤다)
  await env.CAMP_KV.put(REF_ANSWER_KEY(appId, n), JSON.stringify(await sealSensitive(env, answers)), pending ? { expirationTtl: (REF_TTL_DAYS + 30) * 86400 } : undefined);
}
export async function keepReferenceAnswers(env, appId, n) {
  const raw = await env.CAMP_KV.get(REF_ANSWER_KEY(appId, n));
  if (raw) await env.CAMP_KV.put(REF_ANSWER_KEY(appId, n), raw);
}
export async function loadReferenceAnswers(env, appId, n) {
  const sealed = await env.CAMP_KV.get(REF_ANSWER_KEY(appId, n), 'json');
  return sealed ? openSensitive(env, sealed) : null;
}
