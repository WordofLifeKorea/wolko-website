/**
 * POST /api/staff-register
 * Staff / volunteer application handler.
 * Stored in KV with registrationType: 'staff', no capacity limit.
 */
import { appendRow } from '../lib/googleSheets.js';
import { sendAlimtalk } from '../lib/solapi.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function escHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStaffEmailHtml(reg) {
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
    <div style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:32px 36px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(167,243,208,0.9);margin-bottom:8px;">WOLKO Camp Staff Application</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">새 스태프 지원이 접수되었습니다</div>
    </div>
    <div style="padding:32px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">캠프 ID</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.campId}</td>
        </tr>
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이름</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${reg.name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이메일</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${reg.email}" style="color:#0d9488;text-decoration:none;">${reg.email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">연락처</td>
          <td style="padding:8px 0;font-size:14px;">${reg.phone}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">생년월일</td>
          <td style="padding:8px 0;font-size:14px;">${reg.birthDate || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">교회</td>
          <td style="padding:8px 0;font-size:14px;">${reg.church || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">이전 캠프 참여</td>
          <td style="padding:8px 0;font-size:14px;">${reg.previousCamp === 'yes' ? '예' : reg.previousCamp === 'no' ? '아니오' : '—'}</td>
        </tr>
        <tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>
        ${reg.serviceArea ? `
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;">섬기고 싶은 분야</td>
          <td style="padding:0;"></td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f0fdfa;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${escHtml(reg.serviceArea)}</td>
        </tr>` : ''}
        ${reg.testimony ? `
        <tr>
          <td colspan="2" style="padding:8px 0 4px;color:#5a6f79;font-size:13px;">자기소개 및 간증</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${escHtml(reg.testimony)}</td>
        </tr>` : ''}
        ${reg.notes ? `
        <tr>
          <td colspan="2" style="padding:8px 0 4px;color:#5a6f79;font-size:13px;">메모</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${escHtml(reg.notes)}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="padding:20px 36px;background:#f0fdfa;border-top:1px solid rgba(13,148,136,0.12);font-size:12px;color:#5a6f79;line-height:1.6;">
      지원 시각: ${kstTime} (KST) &nbsp;·&nbsp; 지원 ID: ${reg.regId}<br>
      <a href="https://wolko.org/wolkoadmin" style="color:#0d9488;">관리자 패널</a>에서 확인해주세요.
    </div>
  </div>
</body>
</html>`;
}

async function sendStaffEmail(env, reg) {
  if (!env.RESEND_API_KEY) return;
  const subject = `[스태프 지원] ${reg.name} · ${reg.campId}`;
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
      html: buildStaffEmailHtml(reg),
    }),
  });
}

async function syncStaffToSheet(env, reg) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GOOGLE_SHEET_ID) return;
  await appendRow({
    serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    sheetId: env.GOOGLE_SHEET_ID,
    range: '시트1!A:U',
    row: [
      reg.registeredAt,       // A 신청일시
      reg.regId,              // B 신청ID
      reg.campId,             // C 캠프ID
      '스태프',               // D 유형
      reg.name,               // E 이름
      reg.email,              // F 이메일
      reg.phone,              // G 연락처
      reg.church || '',       // H 교회
      '',                     // I 학교
      '',                     // J 학년
      reg.gender || '',       // K 성별
      0,                      // L 남성수
      0,                      // M 여성수
      1,                      // N 총인원
      '',                     // O 비상연락처
      reg.serviceArea || '',  // P 섬기고 싶은 분야 (메모 컬럼 활용)
      '대기중',               // Q 확정여부
      '',                     // R 확정일시
      reg.birthDate || '',     // S 생년월일
      reg.previousCamp || '',  // T 이전 캠프 참여 경험
      reg.testimony || '',     // U 자기소개 및 간증
    ],
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const { campId, name, phone, email, gender, birthDate, church, previousCamp, serviceArea, notes, testimony, campTitleKo } = data;

    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim() || !birthDate || !previousCamp || !testimony?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate))) {
      return Response.json({ error: '생년월일 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }
    if (!['yes', 'no'].includes(previousCamp)) {
      return Response.json({ error: '이전 캠프 참여 경험을 선택해주세요.' }, { status: 400, headers: CORS });
    }

    const emailNorm = email.trim().toLowerCase();

    // 동일 캠프 중복 이메일 차단
    const dupeKey = `camp:${campId}:staff:email:${emailNorm}`;
    if (await env.CAMP_KV.get(dupeKey)) {
      return Response.json({ error: '이미 지원하신 이메일 주소입니다.' }, { status: 409, headers: CORS });
    }

    const regId = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const reg = {
      regId, campId,
      registrationType: 'staff',
      name: name.trim(),
      phone: phone.trim(),
      email: emailNorm,
      gender: gender || '',
      birthDate,
      church: church?.trim() || '',
      previousCamp,
      serviceArea: serviceArea?.trim() || '',
      notes: notes?.trim() || '',
      testimony: testimony.trim(),
      registeredAt: new Date().toISOString(),
      confirmed: false,
      confirmedAt: null,
    };

    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
    ]);

    context.waitUntil(
      Promise.allSettled([
        sendStaffEmail(env, reg).catch(e => console.error('staff email failed:', e)),
        syncStaffToSheet(env, reg).catch(e => console.error('staff sheets sync failed:', e)),
        sendAlimtalk(env, reg.phone, env.KAKAO_TEMPLATE_STAFF, {
          '#{이름}':   reg.name,
          '#{캠프명}': campTitleKo || reg.campId,
        }).catch(e => console.error('staff alimtalk failed:', e)),
      ])
    );

    return Response.json({ success: true }, { headers: CORS });

  } catch (e) {
    console.error('staff-register error:', e);
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
