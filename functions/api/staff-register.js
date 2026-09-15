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

const STAFF_TEAMS = ['프로그램', '티칭', '상담자', '테크', '찬양팀'];
const YES_NO = ['yes', 'no'];

function escHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function yesNoLabel(value) {
  return value === 'yes' ? '예' : value === 'no' ? '아니오' : '—';
}

function buildStaffEmailHtml(reg) {
  const kstTime = new Date(reg.registeredAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const divider = '<tr><td colspan="2"><div style="border-top:1px solid rgba(0,79,104,0.1);margin:4px 0;"></div></td></tr>';
  const row = (label, value) => `
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:150px;vertical-align:top;">${label}</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${value}</td>
        </tr>`;
  const block = (label, value) => value ? `
        <tr>
          <td colspan="2" style="padding:10px 0 4px;color:#5a6f79;font-size:13px;">${label}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:15px;line-height:1.75;color:#0d1b24;white-space:pre-wrap;">${escHtml(value)}</td>
        </tr>` : '';
  const teams = [reg.team1 && `1지망 ${reg.team1}`, reg.team2 && `2지망 ${reg.team2}`].filter(Boolean).join(' · ');

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
        ${row('지원한 캠프', escHtml(reg.campTitleKo || reg.campId))}
        ${row('2주 헌신 확인', reg.commitment ? '예' : '—')}
        ${divider}
        ${row('이름', escHtml(reg.name))}
        ${row('생년월일', escHtml(reg.birthDate || '—'))}
        ${row('성별', reg.gender === 'male' ? '남' : reg.gender === 'female' ? '여' : '—')}
        ${row('연락처', escHtml(reg.phone))}
        ${row('이메일', `<a href="mailto:${escHtml(reg.email)}" style="color:#0d9488;text-decoration:none;">${escHtml(reg.email)}</a>`)}
        ${divider}
        ${row('출석 교회', escHtml(reg.church || '—'))}
        ${row('교회 홈페이지', escHtml(reg.churchWebsite || '—'))}
        ${row('담임 목사님 성함', escHtml(reg.pastorName || '—'))}
        ${row('담임 목사님·교회 연락처', escHtml(reg.pastorContact || '—'))}
        ${row('하나님의 교회·신천지 참여', yesNoLabel(reg.cultHistory))}
        ${divider}
        ${row('생활 영어', yesNoLabel(reg.englishAbility))}
        ${row('미디어·테크', yesNoLabel(reg.mediaTech))}
        ${row('다룰 수 있는 악기', escHtml(reg.instruments || '—'))}
        ${row('기독교 캠프 봉사 경험', yesNoLabel(reg.previousCamp))}
        ${row('선호하는 팀', escHtml(teams || '—'))}
        ${block('간단한 자기소개', reg.introduction)}
        ${block('언제, 어떻게 예수님을 믿게 되었나요?', reg.faithStory)}
        ${block('캠프 봉사 경험 상세', reg.previousCampDetail)}
        ${block('참고 사항', reg.notes)}
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
  const subject = `[스태프 지원] ${reg.name} · ${reg.campTitleKo || reg.campId}`;
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
    range: '시트1!A:AH',
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
      reg.serviceArea || '',  // P 섬기고 싶은 분야 (1지망, 2지망)
      '대기중',               // Q 확정여부
      '',                     // R 확정일시
      reg.birthDate || '',     // S 생년월일
      reg.previousCamp || '',  // T 기독교 캠프 봉사 경험
      reg.faithStory || '',    // U 예수님을 믿게 된 이야기
      reg.introduction || '',  // V 간단한 자기소개
      reg.churchWebsite || '', // W 출석 교회 홈페이지
      reg.pastorContact || '', // X 담임 목사님 혹은 교회 연락처
      reg.cultHistory || '',   // Y 하나님의 교회·신천지 참여
      reg.englishAbility || '',// Z 생활 영어
      reg.instruments || '',   // AA 다룰 수 있는 악기
      reg.mediaTech || '',     // AB 미디어·테크
      reg.previousCampDetail || '', // AC 캠프 봉사 경험 상세
      reg.team1 || '',         // AD 선호 팀 1지망
      reg.team2 || '',         // AE 선호 팀 2지망
      (reg.availableCampNames || []).join(', '), // AF 섬길 수 있는 캠프
      reg.notes || '',         // AG 참고 사항
      reg.pastorName || '',    // AH 담임 목사님 성함
    ],
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const name = clean(data.name, 60);
    const phone = clean(data.phone, 30);
    const email = clean(data.email, 120).toLowerCase();
    const gender = ['male', 'female'].includes(data.gender) ? data.gender : '';
    const birthDate = clean(data.birthDate, 10);
    const introduction = clean(data.introduction, 2000);
    const faithStory = clean(data.faithStory, 3000);
    const church = clean(data.church, 100);
    const churchWebsite = clean(data.churchWebsite, 200);
    const pastorName = clean(data.pastorName, 60);
    const pastorContact = clean(data.pastorContact, 150);
    const cultHistory = YES_NO.includes(data.cultHistory) ? data.cultHistory : '';
    const englishAbility = YES_NO.includes(data.englishAbility) ? data.englishAbility : '';
    const mediaTech = YES_NO.includes(data.mediaTech) ? data.mediaTech : '';
    const instruments = clean(data.instruments, 200);
    const previousCamp = YES_NO.includes(data.previousCamp) ? data.previousCamp : '';
    const previousCampDetail = previousCamp === 'yes' ? clean(data.previousCampDetail, 2000) : '';
    const team1 = STAFF_TEAMS.includes(data.team1) ? data.team1 : '';
    const team2 = STAFF_TEAMS.includes(data.team2) && data.team2 !== team1 ? data.team2 : '';
    const availableCamps = (Array.isArray(data.availableCamps) ? data.availableCamps : [])
      .map(id => clean(id, 80)).filter(Boolean).slice(0, 20);
    const availableCampNames = (Array.isArray(data.availableCampNames) ? data.availableCampNames : [])
      .map(title => clean(title, 120)).filter(Boolean).slice(0, 20);
    const notes = clean(data.notes, 2000);
    const commitment = data.commitment === true;

    const required = [name, phone, email, gender, birthDate, introduction, faithStory,
      cultHistory, englishAbility, mediaTech, previousCamp, team1];
    if (required.some(value => !value) || !availableCamps.length || (previousCamp === 'yes' && !previousCampDetail) || !commitment) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return Response.json({ error: '생년월일 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: '이메일 주소 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }

    // 선택한 캠프마다 한 건씩 저장해서 캠프별 관리자 목록에 모두 보이게 한다.
    // 이미 같은 이메일로 지원한 캠프는 건너뛰고, 전부 이미 지원한 캠프면 409.
    const dupeChecks = await Promise.all(availableCamps.map(id => env.CAMP_KV.get(`camp:${id}:staff:email:${email}`)));
    const newCampIdx = availableCamps.map((_, i) => i).filter(i => !dupeChecks[i]);
    if (!newCampIdx.length) {
      return Response.json({ error: '선택한 캠프에 이미 지원하신 이메일 주소입니다.' }, { status: 409, headers: CORS });
    }

    const applicationId = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const registeredAt = new Date().toISOString();
    const campTitleKo = availableCampNames.join(', ');

    // 관리자 화면은 serviceArea(쉼표로 구분한 팀 목록)로 팀 뱃지·상담자 배정을,
    // testimony로 간증 요약을 보여주므로 그 두 칸은 새 질문 답으로 채워 호환을 유지한다.
    const base = {
      applicationId,
      registrationType: 'staff',
      name, phone, email, gender, birthDate,
      introduction, faithStory,
      church, churchWebsite, pastorName, pastorContact,
      cultHistory, englishAbility, mediaTech, instruments,
      previousCamp, previousCampDetail,
      team1, team2,
      serviceArea: [team1, team2].filter(Boolean).join(', '),
      availableCamps, availableCampNames,
      commitment,
      notes,
      testimony: faithStory,
      registeredAt,
      confirmed: false,
      confirmedAt: null,
    };

    const regs = newCampIdx.map(i => ({
      ...base,
      regId: `${applicationId}-${i + 1}`,
      campId: availableCamps[i],
      campTitleKo: availableCampNames[i] || availableCamps[i],
    }));
    await Promise.all(regs.flatMap(reg => [
      env.CAMP_KV.put(`camp:${reg.campId}:reg:${reg.regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(`camp:${reg.campId}:staff:email:${email}`, reg.regId),
    ]));

    // 알림은 지원서 한 장당 한 번만
    const summary = { ...base, regId: applicationId, campId: regs.map(r => r.campId).join(', '), campTitleKo: regs.map(r => r.campTitleKo).join(', ') };
    context.waitUntil(
      Promise.allSettled([
        sendStaffEmail(env, summary).catch(e => console.error('staff email failed:', e)),
        syncStaffToSheet(env, summary).catch(e => console.error('staff sheets sync failed:', e)),
        sendAlimtalk(env, summary.phone, env.KAKAO_TEMPLATE_STAFF, {
          '#{이름}':   summary.name,
          '#{캠프명}': summary.campTitleKo || campTitleKo,
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
