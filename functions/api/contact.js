/**
 * POST /api/contact
 * Body (JSON): { name, email, phone, type, message }
 *
 * Sends an email to wolkorea@gmail.com via Resend API.
 * Requires env var: RESEND_API_KEY
 * Optional Kakao receipt notice: SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID,
 * KAKAO_TEMPLATE_CONTACT
 */
import { sendAlimtalk } from '../lib/solapi.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const TYPE_LABELS = {
  general:  '일반 문의 / General',
  ministry: '사역 협력 / Partnership',
  wolbi:    '제주월비 입학 / WOLBI Admission',
  camp:     '캠프 신청 / Camp',
  mission:  '선교팀 / Mission',
  give:     '후원 / Giving',
  prayer:   '기도 제목 / Prayer',
  other:    '기타 / Other',
};

function buildHtml({ name, email, phone, type, message }) {
  const typeLabel = TYPE_LABELS[type] || type || '—';
  const phoneLine = phone ? `<tr><td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">연락처</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${phone}</td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f8fb;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,79,104,0.08);">
    <!-- header -->
    <div style="background:linear-gradient(135deg,#004f68 0%,#007ea1 100%);padding:32px 36px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(115,209,245,0.9);margin-bottom:8px;">WOLKO Contact Form</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">새 문의가 도착했습니다</div>
    </div>
    <!-- body -->
    <div style="padding:32px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">문의 유형</td>
          <td style="padding:8px 0;">
            <span style="display:inline-block;padding:3px 10px;background:rgba(0,79,104,0.08);border-radius:999px;font-size:12px;font-weight:700;color:#004f68;">${typeLabel}</span>
          </td>
        </tr>
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이름</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이메일</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:#007ea1;text-decoration:none;">${email}</a></td>
        </tr>
        ${phoneLine}
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:12px 0 8px;"></div></td></tr>
        <tr>
          <td colspan="2" style="padding:4px 0;color:#5a6f79;font-size:13px;">내용</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
        </tr>
      </table>
    </div>
    <!-- footer -->
    <div style="padding:20px 36px;background:#f4f8fb;border-top:1px solid rgba(0,79,104,0.08);font-size:12px;color:#5a6f79;line-height:1.6;">
      이 메일은 <a href="https://wolko.org/contact" style="color:#007ea1;">wolko.org/contact</a> 문의 폼에서 자동 발송되었습니다.
    </div>
  </div>
</body>
</html>`;
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.RESEND_API_KEY) {
    return Response.json(
      { error: 'RESEND_API_KEY 환경 변수가 설정되지 않았습니다.' },
      { status: 500, headers: CORS }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400, headers: CORS });
  }

  const { name, email, phone = '', type = 'general', message } = body;

  if (!name || !email || !message) {
    return Response.json({ error: '이름, 이메일, 내용은 필수입니다.' }, { status: 400, headers: CORS });
  }

  const typeLabel = TYPE_LABELS[type] || type;
  const subject = `[WOLKO 문의] ${typeLabel} — ${name}`;

  // 제주 관련 문의(제주월비 입학)는 홈페이지 제주 사무소 이메일로도 함께 발송
  const JEJU_TYPES = ['wolbi'];
  const toList = ['wolkorea1@gmail.com'];
  // 필요 시 제주 별도 수신자 추가: if (JEJU_TYPES.includes(type)) toList.push('jeju@wolko.org');

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WOLKO Contact <contact@wolko.org>',
      to:   toList,
      reply_to: email,
      subject,
      html: buildHtml({ name, email, phone, type, message }),
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error('Resend error:', err);
    return Response.json({ error: '이메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502, headers: CORS });
  }

  if (phone && env.KAKAO_TEMPLATE_CONTACT) {
    context.waitUntil(
      sendAlimtalk(env, phone, env.KAKAO_TEMPLATE_CONTACT, {
        '#{이름}': name.trim(),
        '#{문의유형}': typeLabel,
      }).catch(e => console.error('contact alimtalk failed:', e))
    );
  }

  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
