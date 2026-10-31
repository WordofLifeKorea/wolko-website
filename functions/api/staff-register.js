/**
 * POST /api/staff-register
 * Staff / volunteer application handler.
 * Stored in KV with registrationType: 'staff', no capacity limit.
 * role: 'staff'(고등학교 졸업 성인) | 'crew'(미성년자 — 보호자 동의 링크를 보내고, 동의가 끝나야 관리자가 수락할 수 있다)
 */
import { attachFormTranslation } from '../lib/formTranslate.js';
import { appendRow } from '../lib/googleSheets.js';
import { sendAlimtalk } from '../lib/solapi.js';
import { normalizePhone } from '../lib/phone.js';
import { STAFF_ROLES, ROLE_LABEL, GUARDIAN_RELATIONS, newConsentToken, consentKey, consentAppKey, sendConsentRequest, updateApplicationRegs, isCrewClosedCamp } from '../lib/staffCrew.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const STAFF_TEAMS = ['프로그램', '티칭', '상담자', '테크', '찬양팀'];
// 크루(청소년)는 티칭·상담을 맡지 않는다 — 크루 지원서(구글 폼)와 같은 팀 목록. 찬양팀=바이블 클럽 팀, 테크=미디어·테크 팀
const CREW_TEAMS = ['프로그램', '찬양팀', '테크', '키친', '기타'];
// 크루가 월코 캠프를 알게 된 경로
const REFERRALS = ['지인', '교회', '학교', 'SNS', '네이버 카페', '월코 캠퍼', '기타'];
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
  // 메일 앱(특히 모바일)이 좁은 라벨 칸을 무시하고 글자를 세로로 쪼개는 일이 있어, 라벨 위·값 아래로 쌓는 한 칸 구성으로 보낸다
  const row = (label, value) => `
        <tr>
          <td colspan="2" style="padding:10px 0 0;color:#5a6f79;font-size:12px;line-height:1.4;white-space:normal;word-break:keep-all;">${label}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:2px 0 8px;font-size:15px;font-weight:600;line-height:1.5;word-break:break-word;">${value}</td>
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
      <div style="font-size:22px;font-weight:700;color:#fff;">새 ${reg.role === 'crew' ? '크루' : '스태프'} 지원이 접수되었습니다</div>
    </div>
    <div style="padding:32px 36px;">
      <table role="presentation" width="100%" style="width:100%;border-collapse:collapse;table-layout:auto;">
        ${row('지원 구분', reg.role === 'crew' ? '캠프 크루 (미성년자 · 보호자 동의 필요)' : '캠프 스태프 (성인)')}
        ${row('지원한 캠프', escHtml(reg.campTitleKo || reg.campId))}
        ${row('2주 참여 동의', reg.commitment ? '예' : '—')}
        ${reg.trainingException ? row('캠프 트레이닝', '<span style="color:#c2410c;">개인 사정으로 불참 (참고 사항 확인)</span>') : ''}
        ${divider}
        ${row('이름', escHtml(reg.name))}
        ${row('생년월일', escHtml(reg.birthDate || '—'))}
        ${row('성별', reg.gender === 'male' ? '남' : reg.gender === 'female' ? '여' : '—')}
        ${row('연락처', escHtml(reg.phone))}
        ${row('이메일', `<a href="mailto:${escHtml(reg.email)}" style="color:#0d9488;text-decoration:none;">${escHtml(reg.email)}</a>`)}
        ${reg.role === 'crew' ? `${divider}
        ${row('보호자', `${escHtml(reg.guardianName)} (${escHtml(reg.guardianRelation)})`)}
        ${row('보호자 연락처', escHtml([reg.guardianPhone, reg.guardianEmail].filter(Boolean).join(' · ')))}
        ${row('보호자 동의', '동의 링크를 보냈습니다 — 동의가 끝나야 수락할 수 있습니다')}
        ${row('참가자 동의', reg.crewPledge ? '자발적 참여 · 캠프 규칙과 안전 지침 준수에 동의' : '—')}
        ${row('월코 캠프를 알게 된 경로', escHtml(reg.referral || '—'))}` : ''}
        ${divider}
        ${row('출석 교회', escHtml(reg.church || '—'))}
        ${row('교회 홈페이지', escHtml(reg.churchWebsite || '—'))}
        ${row('담임 목사님 성함', escHtml(reg.pastorName || '—'))}
        ${row('담임 목사님·교회 연락처', escHtml(reg.pastorContact || '—'))}
        ${row('하나님의 교회·신천지 참여', yesNoLabel(reg.cultHistory))}
        ${divider}
        ${row('일상 생활 영어', reg.englishAbility === '' || reg.englishAbility == null ? '—' : `${escHtml(reg.englishAbility)} / 5`)}
        ${row('미디어·테크', reg.mediaTech === '' || reg.mediaTech == null ? '—' : `${escHtml(reg.mediaTech)} / 5`)}
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
      <a href="https://wolko.org/portal/wolkoadmin" style="color:#0d9488;">관리자 패널</a>에서 확인해주세요.
    </div>
  </div>
</body>
</html>`;
}

async function sendStaffEmail(env, reg) {
  if (!env.RESEND_API_KEY) return;
  const subject = `[${reg.role === 'crew' ? '크루' : '스태프'} 지원] ${reg.name} · ${reg.campTitleKo || reg.campId}`;
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
    range: '시트1!A:AK',
    row: [
      reg.registeredAt,       // A 신청일시
      reg.regId,              // B 신청ID
      reg.campId,             // C 캠프ID
      ROLE_LABEL[reg.role] || '스태프', // D 유형 (스태프 / 크루)
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
      reg.trainingException ? '트레이닝 불참' : (reg.commitment ? '2주 참여 동의' : ''), // AI 캠프 트레이닝 참여
      reg.role === 'crew' ? `${reg.guardianName} (${reg.guardianRelation}) ${[reg.guardianPhone, reg.guardianEmail].filter(Boolean).join(' · ')}` : '', // AJ 보호자
      reg.role === 'crew' ? '동의 대기' : '',  // AK 보호자 동의
    ],
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const role = STAFF_ROLES.includes(data.role) ? data.role : 'staff';
    const name = clean(data.name, 60);
    const phone = normalizePhone(clean(data.phone, 30));
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
    // 일상 생활 영어는 0(못함)~5(유창) 단계
    const englishAbility = ['0','1','2','3','4','5'].includes(String(data.englishAbility)) ? String(data.englishAbility) : '';
    // 미디어·테크도 0(못함)~5(능숙) 단계
    const mediaTech = ['0','1','2','3','4','5'].includes(String(data.mediaTech)) ? String(data.mediaTech) : '';
    const instruments = clean(data.instruments, 200);
    const previousCamp = YES_NO.includes(data.previousCamp) ? data.previousCamp : '';
    const previousCampDetail = previousCamp === 'yes' ? clean(data.previousCampDetail, 2000) : '';
    const teams = role === 'crew' ? CREW_TEAMS : STAFF_TEAMS;
    const team1 = teams.includes(data.team1) ? data.team1 : '';
    const team2 = teams.includes(data.team2) && data.team2 !== team1 ? data.team2 : '';
    const availableCamps = (Array.isArray(data.availableCamps) ? data.availableCamps : [])
      .map(id => clean(id, 80)).filter(Boolean).slice(0, 20);
    const availableCampNames = (Array.isArray(data.availableCampNames) ? data.availableCampNames : [])
      .map(title => clean(title, 120)).filter(Boolean).slice(0, 20);
    const notes = clean(data.notes, 2000);
    const commitment = data.commitment === true;
    const trainingException = data.trainingException === true;
    // 크루(미성년자)는 보호자 이름 · 관계와 연락처(휴대폰 또는 이메일 중 하나 이상)가 있어야 한다
    const guardianName = role === 'crew' ? clean(data.guardianName, 60) : '';
    const guardianRelation = role === 'crew' && GUARDIAN_RELATIONS.includes(data.guardianRelation) ? data.guardianRelation : '';
    const guardianPhone = role === 'crew' ? normalizePhone(clean(data.guardianPhone, 30)) : '';
    const guardianEmail = role === 'crew' ? clean(data.guardianEmail, 120).toLowerCase() : '';
    // 크루: 알게 된 경로("기타"면 직접 적은 말)와 참가자 동의(자발적 참여 · 캠프 규칙과 안전 지침 준수)
    const referralPick = role === 'crew' && REFERRALS.includes(data.referral) ? data.referral : '';
    const referralOther = referralPick === '기타' ? clean(data.referralOther, 100) : '';
    const referral = referralPick === '월코 캠퍼' ? '월코 캠퍼로 참여한 적 있음'
      : referralPick === '기타' ? (referralOther ? `기타: ${referralOther}` : '기타') : referralPick;
    const crewPledge = role === 'crew' && data.crewPledge === true;

    const required = [name, phone, email, gender, birthDate, introduction, faithStory, church,
      cultHistory, englishAbility, mediaTech, previousCamp, team1];
    if (required.some(value => !value) || !availableCamps.length || (previousCamp === 'yes' && !previousCampDetail)) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return Response.json({ error: '생년월일 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: '이메일 주소 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }
    if (role === 'crew' && availableCamps.some(isCrewClosedCamp)) {
      return Response.json({ error: '연합캠프는 크루 지원을 받지 않습니다. 연합캠프를 빼고 다시 지원해 주세요.' }, { status: 400, headers: CORS });
    }
    if (role === 'crew') {
      if (!guardianName || !guardianRelation || (!guardianPhone && !guardianEmail)) {
        return Response.json({ error: '보호자 이름·관계와 보호자 휴대폰 번호 또는 이메일을 입력해주세요.' }, { status: 400, headers: CORS });
      }
      if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
        return Response.json({ error: '보호자 이메일 주소 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
      }
      if (guardianPhone && guardianPhone === phone) {
        return Response.json({ error: '보호자 휴대폰 번호는 지원자 번호와 달라야 합니다.' }, { status: 400, headers: CORS });
      }
      if (guardianEmail && guardianEmail === email) {
        return Response.json({ error: '보호자 이메일은 지원자 이메일과 달라야 합니다.' }, { status: 400, headers: CORS });
      }
      if (!crewPledge) {
        return Response.json({ error: '캠프 크루 참가자 동의에 체크해 주세요.' }, { status: 400, headers: CORS });
      }
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
      role,
      name, phone, email, gender, birthDate,
      introduction, faithStory,
      church, churchWebsite, pastorName, pastorContact,
      cultHistory, englishAbility, mediaTech, instruments,
      previousCamp, previousCampDetail,
      team1, team2,
      serviceArea: [team1, team2].filter(Boolean).join(', '),
      availableCamps, availableCampNames,
      commitment,
      trainingException,
      notes,
      testimony: faithStory,
      registeredAt,
      confirmed: false,
      confirmedAt: null,
      accepted: false,
      acceptedAt: null,
      ...(role === 'crew' ? {
        referral, crewPledge,
        guardianName, guardianRelation, guardianPhone, guardianEmail,
        parentConsent: { status: 'pending', requestedAt: registeredAt, sentVia: [] },
      } : {}),
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

    // 크루: 보호자 동의 링크(토큰)를 만들어 두고 문자·이메일로 보낸다. 보낸 경로는 각 지원 건에 적어 관리자 화면에 보여 준다.
    let consentSent = [];
    if (role === 'crew') {
      const token = newConsentToken();
      const regRefs = regs.map(r => ({ campId: r.campId, regId: r.regId }));
      const campNames = regs.map(r => r.campTitleKo).join(', ');
      await Promise.all([
        env.CAMP_KV.put(consentKey(token), JSON.stringify({ applicationId, regs: regRefs, applicantName: name, campNames, guardianName, createdAt: registeredAt })),
        env.CAMP_KV.put(consentAppKey(applicationId), token),
      ]);
      consentSent = await sendConsentRequest(env, { token, applicantName: name, campNames, guardianName, guardianPhone, guardianEmail });
      if (consentSent.length) {
        await updateApplicationRegs(env, regRefs, reg => ({ ...reg, parentConsent: { ...reg.parentConsent, sentVia: consentSent, lastSentAt: new Date().toISOString() } }));
      }
    }

    // 알림은 지원서 한 장당 한 번만
    const summary = { ...base, regId: applicationId, campId: regs.map(r => r.campId).join(', '), campTitleKo: regs.map(r => r.campTitleKo).join(', ') };
    context.waitUntil(
      Promise.allSettled([
        // 자기소개 · 신앙 이야기 · 교회 · 악기 · 지난 캠프 · 참고 사항 · 알게 된 경로(기타)를 한↔영 자동 번역해 각 지원 건에 붙인다
        attachFormTranslation(env, 'staff', regs.map(r => `camp:${r.campId}:reg:${r.regId}`), base),
        sendStaffEmail(env, summary).catch(e => console.error('staff email failed:', e)),
        syncStaffToSheet(env, summary).catch(e => console.error('staff sheets sync failed:', e)),
        sendAlimtalk(env, summary.phone, env.KAKAO_TEMPLATE_STAFF, {
          '#{이름}':   summary.name,
          '#{캠프명}': summary.campTitleKo || campTitleKo,
        }).catch(e => console.error('staff alimtalk failed:', e)),
      ])
    );

    return Response.json({ success: true, role, consentSent }, { headers: CORS });

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
