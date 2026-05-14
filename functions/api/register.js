/**
 * POST /api/register
 * Camp registration handler — stores in Cloudflare KV (as PENDING),
 * then fires email notification (Resend) + Google Sheets sync in background.
 *
 * Registration is saved with confirmed: false.
 * Admin must confirm after verifying payment → then KV count increments.
 */
import { appendRow } from '../lib/googleSheets.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ── 이메일 HTML 빌더 ──────────────────────────────────────────────────────────

function buildRegistrationEmailHtml(reg) {
  const isGroup = reg.registrationType === 'group';

  const typeLabel = isGroup ? '단체 신청' : '개인 신청';
  const typeBadgeColor = isGroup ? '#007ea1' : '#004f68';

  const genderLabel = reg.gender === 'male' ? '남' : reg.gender === 'female' ? '여' : '';

  const individualRows = !isGroup ? `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">학년</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.grade ?? '—'}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;">성별</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;">${genderLabel || '—'}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;">학교</td>
      <td style="padding:8px 0;font-size:14px;">${reg.school || '—'}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;">비상연락처</td>
      <td style="padding:8px 0;font-size:14px;">${reg.emergency || '—'}</td>
    </tr>` : '';

  const groupRows = isGroup ? `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">인원 (남/여)</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.groupCount}명 (남 ${reg.maleCount} / 여 ${reg.femaleCount})</td>
    </tr>` : '';

  const kstTime = new Date(reg.registeredAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f8fb;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,79,104,0.08);">
    <div style="background:linear-gradient(135deg,#004f68 0%,#007ea1 100%);padding:32px 36px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(115,209,245,0.9);margin-bottom:8px;">WOLKO Camp Registration</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">새 캠프 신청이 접수되었습니다</div>
    </div>
    <div style="padding:32px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">신청 유형</td>
          <td style="padding:8px 0;">
            <span style="display:inline-block;padding:3px 10px;background:${typeBadgeColor};border-radius:999px;font-size:12px;font-weight:700;color:#fff;">${typeLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">캠프 ID</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.campId}</td>
        </tr>
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이름</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이메일</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${reg.email}" style="color:#007ea1;text-decoration:none;">${reg.email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">연락처</td>
          <td style="padding:8px 0;font-size:14px;">${reg.phone}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">교회</td>
          <td style="padding:8px 0;font-size:14px;">${reg.church || '—'}</td>
        </tr>
        ${individualRows}
        ${groupRows}
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>
        ${reg.notes ? `
        <tr>
          <td colspan="2" style="padding:4px 0;color:#5a6f79;font-size:13px;">메모</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${reg.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="padding:20px 36px;background:#f4f8fb;border-top:1px solid rgba(0,79,104,0.08);font-size:12px;color:#5a6f79;line-height:1.6;">
      신청 시각: ${kstTime} (KST) &nbsp;·&nbsp; 신청 ID: ${reg.regId}<br>
      입금 확인 후 <a href="https://wolko.org/wolkoadmin" style="color:#007ea1;">관리자 패널</a>에서 확정해주세요.
    </div>
  </div>
</body>
</html>`;
}

// ── 이메일 발송 ───────────────────────────────────────────────────────────────

async function sendRegistrationEmail(env, reg) {
  if (!env.RESEND_API_KEY) return;

  const isGroup = reg.registrationType === 'group';
  const genderLabel = reg.gender === 'male' ? '남' : '여';
  const subject = isGroup
    ? `[캠프 신청] 단체 — ${reg.name} (${reg.groupCount}명) · ${reg.campId}`
    : `[캠프 신청] 개인 — ${reg.name} (${reg.grade} / ${genderLabel}) · ${reg.campId}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WOLKO Camp <contact@wolko.org>',
      to: ['wolkorea1@gmail.com'],
      reply_to: reg.email,
      subject,
      html: buildRegistrationEmailHtml(reg),
    }),
  });
}

// ── Google Sheets 동기화 ──────────────────────────────────────────────────────

function regToSheetRow(reg) {
  const isGroup = reg.registrationType === 'group';
  return [
    reg.registeredAt,                                                           // A 신청일시
    reg.regId,                                                                  // B 신청ID
    reg.campId,                                                                 // C 캠프ID
    isGroup ? '단체' : '개인',                                                  // D 유형
    reg.name,                                                                   // E 이름
    reg.email,                                                                  // F 이메일
    reg.phone,                                                                  // G 연락처
    reg.church || '',                                                           // H 교회
    reg.school || '',                                                           // I 학교 (개인)
    reg.grade  || '',                                                           // J 학년 (개인)
    reg.gender === 'male' ? '남' : reg.gender === 'female' ? '여' : '',        // K 성별 (개인)
    isGroup ? reg.maleCount   : (reg.gender === 'male'   ? 1 : 0),            // L 남성수
    isGroup ? reg.femaleCount : (reg.gender === 'female' ? 1 : 0),            // M 여성수
    isGroup ? reg.groupCount  : 1,                                             // N 총인원
    reg.emergency || '',                                                        // O 비상연락처 (개인)
    reg.notes || '',                                                            // P 메모
    '대기중',                                                                   // Q 확정여부
    '',                                                                         // R 확정일시
  ];
}

async function syncToSheet(env, reg) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GOOGLE_SHEET_ID) return;
  await appendRow({
    serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    sheetId: env.GOOGLE_SHEET_ID,
    range: '시트1!A:R',
    row: regToSheetRow(reg),
  });
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const {
      registrationType = 'individual',
      campId,
      name, phone, email,
      grade, church, school, emergency,
      gender,
      maleCount, femaleCount,
      groupCount,
      notes,
    } = data;

    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }

    const emailNorm = email.trim().toLowerCase();

    if (registrationType === 'individual') {
      if (!grade) {
        return Response.json({ error: '학년을 선택해주세요.' }, { status: 400, headers: CORS });
      }
      if (!gender || !['male', 'female'].includes(gender)) {
        return Response.json({ error: '성별을 선택해주세요.' }, { status: 400, headers: CORS });
      }
    }

    let spotsNeeded, spotsM, spotsF;
    if (registrationType === 'group') {
      spotsM = Math.max(0, parseInt(maleCount) || 0);
      spotsF = Math.max(0, parseInt(femaleCount) || 0);
      spotsNeeded = spotsM + spotsF;
      if (spotsNeeded < 2) {
        return Response.json({ error: '단체 신청은 2명 이상이어야 합니다.' }, { status: 400, headers: CORS });
      }
    } else {
      spotsNeeded = 1;
      spotsM = gender === 'male' ? 1 : 0;
      spotsF = gender === 'female' ? 1 : 0;
    }

    const dupeKey = `camp:${campId}:email:${emailNorm}`;
    if (await env.CAMP_KV.get(dupeKey)) {
      return Response.json({ error: '이미 신청된 이메일 주소입니다.' }, { status: 409, headers: CORS });
    }

    const regId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const reg = registrationType === 'group'
      ? {
          regId, campId,
          registrationType: 'group',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          maleCount: spotsM, femaleCount: spotsF, groupCount: spotsNeeded,
          church: church?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
        }
      : {
          regId, campId,
          registrationType: 'individual',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          grade, gender,
          church: church?.trim() || '',
          school: school?.trim() || '',
          emergency: emergency?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
        };

    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
    ]);

    // KV 저장 완료 후 이메일·시트는 백그라운드에서 실행 (응답 속도에 영향 없음)
    context.waitUntil(
      Promise.allSettled([
        sendRegistrationEmail(env, reg).catch(e => console.error('registration email failed:', e)),
        syncToSheet(env, reg).catch(e => console.error('sheets sync failed:', e)),
      ])
    );

    return Response.json({ success: true, pending: true }, { headers: CORS });

  } catch (e) {
    console.error('register error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500, headers: CORS });
  }
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
