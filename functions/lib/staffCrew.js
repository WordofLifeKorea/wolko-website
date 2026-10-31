/**
 * 캠프 스태프 · 크루 지원
 *   스태프(staff) — 고등학교를 졸업한 성인. 지원 후 관리자가 검토해 수락한다.
 *   크루(crew)   — 미성년자. 지원서에 적은 보호자에게 동의 링크를 문자·이메일로 보내고,
 *                  보호자가 동의해야 관리자가 수락할 수 있다(화면과 서버 둘 다 막는다).
 *
 * KV
 *   staff-consent:<토큰>        → { applicationId, regs:[{campId,regId}], applicantName, campNames, guardianName, createdAt }
 *   staff-consent-app:<지원ID>  → 토큰 (동의 링크 다시 보내기용)
 */
import { sendSms } from './solapi.js';

export const STAFF_ROLES = ['staff', 'crew'];
export const ROLE_LABEL = { staff: '스태프', crew: '크루' };
export const GUARDIAN_RELATIONS = ['부', '모', '조부모', '기타'];

// 보호자 동의 문자는 캠프 업무 휴대폰 번호로 보낸다(캠프 안내에 이미 공개된 번호). 솔라피에 발신번호로 등록돼 있어야 실제로 나간다.
// 운영에서 바꿔야 하면 CAMP_SMS_SENDER_PHONE 환경 변수로 덮어쓴다.
export const CAMP_SMS_SENDER_DEFAULT = '01073109216';
export const SITE_ORIGIN = 'https://wolko.org';

export const consentKey = token => `staff-consent:${token}`;
export const consentAppKey = applicationId => `staff-consent-app:${applicationId}`;

export function newConsentToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function isValidConsentToken(token) {
  return /^[0-9a-f]{48}$/.test(String(token || ''));
}

export function consentUrl(token) {
  return `${SITE_ORIGIN}/camp-register/consent/?t=${token}`;
}

/** 크루는 보호자 동의가 끝나야 수락할 수 있다. 스태프(또는 역할 표시가 없는 예전 지원서)는 바로 수락할 수 있다. */
export function canAccept(reg) {
  if (!reg || reg.registrationType !== 'staff') return false;
  if (reg.role !== 'crew') return true;
  return reg.parentConsent?.status === 'agreed';
}

function escHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function consentSmsText(info) {
  return `[월코 캠프] ${info.applicantName} 님이 캠프 크루(봉사자)로 지원했습니다. 미성년자 참여에 대한 보호자 동의가 필요합니다. 아래 링크에서 내용을 확인하고 동의해 주세요.\n${consentUrl(info.token)}`;
}

export function consentEmailHtml(info) {
  const url = consentUrl(info.token);
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f9fb;font-family:'Apple SD Gothic Neo',Arial,sans-serif;color:#10252e;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #d6dee2;">
    <div style="padding:28px 32px 20px;border-bottom:2px solid #0b2430;">
      <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#5a7380;">Word of Life Korea · 보호자 동의 요청</div>
      <div style="margin-top:10px;font-size:22px;font-weight:700;color:#0b2430;">캠프 크루 참여 동의</div>
    </div>
    <div style="padding:24px 32px 28px;font-size:15px;line-height:1.8;">
      <p style="margin:0 0 14px;">안녕하세요, ${escHtml(info.guardianName)} 님.</p>
      <p style="margin:0 0 14px;"><b>${escHtml(info.applicantName)}</b> 님이 월코 캠프 크루(봉사자)로 지원했습니다. 미성년자가 캠프 봉사에 참여하려면 보호자의 동의가 필요합니다.</p>
      <p style="margin:0 0 22px;color:#4a5d66;">지원한 캠프: ${escHtml(info.campNames || '—')}</p>
      <a href="${url}" style="display:inline-block;padding:14px 22px;background:#004f68;color:#fff;font-weight:700;text-decoration:none;">내용 확인하고 동의하기</a>
      <p style="margin:22px 0 0;font-size:13px;color:#587383;">버튼이 열리지 않으면 이 주소를 브라우저에 붙여 넣어 주세요.<br>${url}</p>
    </div>
    <div style="padding:16px 32px;background:#f3f7f9;border-top:1px solid #e3e9ec;font-size:12px;color:#587383;line-height:1.6;">
      문의: 월코 캠프 010-7310-9216 · wolkorea1@gmail.com
    </div>
  </div>
</body></html>`;
}

/**
 * 보호자에게 동의 링크를 보낸다 — 휴대폰 번호가 있으면 문자, 이메일이 있으면 이메일(둘 다 있으면 둘 다).
 * @returns {Promise<string[]>} 실제로 보낸 경로 ('sms' | 'email')
 */
export async function sendConsentRequest(env, info) {
  const sent = [];
  const jobs = [];
  if (info.guardianPhone) {
    const from = env.CAMP_SMS_SENDER_PHONE || CAMP_SMS_SENDER_DEFAULT;
    jobs.push(sendSms(env, info.guardianPhone, consentSmsText(info), { from })
      .then(r => { if (r) sent.push('sms'); })
      .catch(e => console.error('crew consent sms failed:', e)));
  }
  if (info.guardianEmail && env.RESEND_API_KEY) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WOLKO Camp <contact@wolko.org>',
        to: [info.guardianEmail],
        reply_to: 'wolkorea1@gmail.com',
        subject: `[월코 캠프] ${info.applicantName} 님 캠프 크루 참여 보호자 동의 요청`,
        html: consentEmailHtml(info),
      }),
    }).then(r => { if (r.ok) sent.push('email'); else console.error('crew consent email failed:', r.status); })
      .catch(e => console.error('crew consent email failed:', e)));
  }
  await Promise.all(jobs);
  return sent;
}

/** 지원서(캠프별로 나뉘어 저장된 여러 건)에 같은 변경을 적용한다. */
export async function updateApplicationRegs(env, regs, patch) {
  const updated = [];
  for (const { campId, regId } of regs) {
    const key = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(key, 'json');
    if (!reg) continue;
    const next = typeof patch === 'function' ? patch(reg) : { ...reg, ...patch };
    await env.CAMP_KV.put(key, JSON.stringify(next));
    updated.push(next);
  }
  return updated;
}
