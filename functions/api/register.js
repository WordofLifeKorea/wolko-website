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

const WAITLIST_SIZE = 10;
const CAMP_BASE_FEE = 499000;
const SCHOLARSHIP_DISCOUNTS = {
  wolbi_syme: { amount: 50000, label: 'WOLBI/SYME 참여자 소개·추천·자녀' },
  sibling: { amount: 50000, label: '형제·자매 동반 참여' },
  excellent_camper: { amount: 150000, label: '지난 캠프 우수 캠퍼' },
};
const SIBLING_CAMP_LABELS = {
  wolko: '월코 캠프',
  jeju: '제주 캠프',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatWon(amount) {
  return `${Math.max(0, parseInt(amount, 10) || 0).toLocaleString('ko-KR')}원`;
}

function normalizeScholarshipDiscounts(values, maxCount = 1) {
  const limit = Math.max(1, parseInt(maxCount, 10) || 1);
  if (Array.isArray(values)) {
    return values.reduce((acc, value) => {
      const key = String(value || '').trim();
      if (SCHOLARSHIP_DISCOUNTS[key]) acc[key] = 1;
      return acc;
    }, {});
  }
  if (!values || typeof values !== 'object') return {};
  return Object.entries(values).reduce((acc, [key, rawCount]) => {
    if (!SCHOLARSHIP_DISCOUNTS[key]) return acc;
    const count = Math.min(Math.max(parseInt(rawCount, 10) || 0, 0), limit);
    if (count > 0) acc[key] = count;
    return acc;
  }, {});
}

function scholarshipDiscountAmount(values) {
  const normalized = values && typeof values === 'object' && !Array.isArray(values)
    ? values
    : normalizeScholarshipDiscounts(values);
  return Object.entries(normalized).reduce((sum, [key, count]) => {
    return sum + ((SCHOLARSHIP_DISCOUNTS[key]?.amount || 0) * (parseInt(count, 10) || 0));
  }, 0);
}

function scholarshipDiscountText(values) {
  const normalized = values && typeof values === 'object' && !Array.isArray(values)
    ? values
    : normalizeScholarshipDiscounts(values);
  const entries = Object.entries(normalized).filter(([key, count]) => SCHOLARSHIP_DISCOUNTS[key] && (parseInt(count, 10) || 0) > 0);
  if (!entries.length) return '';
  return entries.map(([key, count]) => {
    const num = parseInt(count, 10) || 0;
    const item = SCHOLARSHIP_DISCOUNTS[key];
    return `${item.label} ${num}명 (${formatWon(item.amount * num)})`;
  }).join(', ');
}

function normalizeScholarshipDiscountDetails(details, discounts) {
  const source = details && typeof details === 'object' ? details : {};
  const normalized = {};

  if ((parseInt(discounts?.wolbi_syme, 10) || 0) > 0) {
    const wolbiSource = source.wolbi_syme && typeof source.wolbi_syme === 'object' ? source.wolbi_syme : {};
    const year = String(wolbiSource.year ?? '').trim();
    const participantName = String(wolbiSource.participantName ?? '').trim();
    if (!year || !participantName) {
      return { error: 'WOLBI 또는 SYME 프로그램 참여 연도와 참여자 이름을 입력해주세요.' };
    }
    normalized.wolbi_syme = { year, participantName };
  }

  if ((parseInt(discounts?.sibling, 10) || 0) > 0) {
    const siblingSource = source.sibling && typeof source.sibling === 'object' ? source.sibling : {};
    const camperName = String(siblingSource.camperName ?? '').trim();
    const camp = String(siblingSource.camp ?? '').trim();
    if (!camperName || !SIBLING_CAMP_LABELS[camp]) {
      return { error: '함께 참여하는 형제·자매 캠퍼 이름과 참여 캠프를 입력해주세요.' };
    }
    normalized.sibling = { camperName, camp };
  }

  return { value: normalized };
}

function scholarshipDiscountDetailText(details) {
  const parts = [];
  if (details?.wolbi_syme) {
    parts.push(`WOLBI/SYME 참여자: ${details.wolbi_syme.participantName} (${details.wolbi_syme.year})`);
  }
  if (details?.sibling) {
    parts.push(`형제·자매: ${details.sibling.camperName} / ${SIBLING_CAMP_LABELS[details.sibling.camp] || details.sibling.camp}`);
  }
  return parts.join(', ');
}

function buildRegistrationEmailHtml(reg) {
  const isGroup = reg.registrationType === 'group';
  const hasDeferredParticipants = isGroup && reg.participantDetailsDeferred;

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

  const participantList = isGroup && reg.participants?.length
    ? `<ol style="margin:6px 0 0;padding-left:20px;">${reg.participants.map(participant => `
        <li style="padding:3px 0;">${escapeHtml(participant.name)} <span style="color:#5a6f79;">(${participant.gender === 'male' ? '남' : '여'})</span></li>`).join('')}
      </ol>`
    : (hasDeferredParticipants ? '추후 제출 예정' : '—');
  const groupCountText = hasDeferredParticipants
    ? `${reg.groupCount}명 (참가 학생 명단 추후 제출)`
    : `${reg.groupCount}명 (남 ${reg.maleCount} / 여 ${reg.femaleCount})`;
  const groupCountLabel = hasDeferredParticipants ? '인원' : '인원 (남/여)';
  const unionExtraRows = isGroup && reg.referralSource ? `
    ${reg.referralSource ? `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">알게 된 경로</td>
      <td style="padding:8px 0;font-size:14px;">${escapeHtml(reg.referralSource)}</td>
    </tr>` : ''}` : '';
  const groupRows = isGroup ? `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">${groupCountLabel}</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;">${groupCountText}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;vertical-align:top;">참가 학생</td>
      <td style="padding:8px 0;font-size:14px;">${participantList}</td>
    </tr>
    ${unionExtraRows}` : '';
  const refundRows = `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">환불 계좌</td>
      <td style="padding:8px 0;font-size:14px;">${escapeHtml(reg.refundBank || '—')} · ${escapeHtml(reg.refundAccount || '—')} · 예금주 ${escapeHtml(reg.refundHolder || '—')}</td>
    </tr>`;
  const scholarshipRows = `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">장학금/할인</td>
      <td style="padding:8px 0;font-size:14px;">${reg.scholarshipDiscountText ? escapeHtml(reg.scholarshipDiscountText) : '해당 없음'}</td>
    </tr>
    ${reg.scholarshipDiscountDetailText ? `
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">할인 상세</td>
      <td style="padding:8px 0;font-size:14px;">${escapeHtml(reg.scholarshipDiscountDetailText)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:120px;">총 납입금</td>
      <td style="padding:8px 0;font-size:14px;font-weight:700;">${formatWon(reg.campFeeFinal ?? CAMP_BASE_FEE)} <span style="font-size:12px;color:#5a6f79;font-weight:500;">(기본 ${formatWon(reg.campFeeBase ?? CAMP_BASE_FEE)} · 할인 ${formatWon(reg.scholarshipDiscountAmount || 0)})</span></td>
    </tr>`;

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
        ${refundRows}
        ${scholarshipRows}
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
      ${reg.isWaitlist ? `<div style="margin-bottom:8px;padding:6px 12px;background:rgba(217,119,6,0.10);border-radius:8px;color:#b45309;font-weight:700;">⚠ 예비 신청 — ${reg.waitlistNumber}순위</div>` : ''}
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
  const waitlistTag = reg.isWaitlist ? `[예비${reg.waitlistNumber}순위] ` : '';
  const subject = isGroup
    ? `${waitlistTag}[캠프 신청] 단체 — ${reg.name} (${reg.groupCount}명) · ${reg.campId}`
    : `${waitlistTag}[캠프 신청] 개인 — ${reg.name} (${reg.grade} / ${genderLabel}) · ${reg.campId}`;

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
  const participantSummary = isGroup && reg.participants?.length
    ? reg.participants.map((participant, index) => `${index + 1}. ${participant.name} (${participant.gender === 'male' ? '남' : '여'})`).join('\n')
    : '';
  const notes = [
    reg.participantDetailsDeferred ? '참가 학생 명단: 추후 제출 예정' : '',
    reg.refundAccount ? `환불 계좌: ${reg.refundBank || ''} ${reg.refundAccount} (예금주: ${reg.refundHolder || ''})`.trim() : '',
    reg.scholarshipDiscountText ? `장학금/할인: ${reg.scholarshipDiscountText}` : '',
    reg.scholarshipDiscountDetailText ? `할인 상세: ${reg.scholarshipDiscountDetailText}` : '',
    `총 납입금: ${formatWon(reg.campFeeFinal ?? CAMP_BASE_FEE)} (기본 ${formatWon(reg.campFeeBase ?? CAMP_BASE_FEE)} / 할인 ${formatWon(reg.scholarshipDiscountAmount || 0)})`,
    reg.referralSource ? `알게 된 경로: ${reg.referralSource}` : '',
    participantSummary,
    reg.notes || '',
  ].filter(Boolean).join('\n\n');
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
    notes,                                                                      // P 메모
    reg.isWaitlist ? `예비-${reg.waitlistNumber}순위` : '대기중',              // Q 확정여부
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
      groupCount, participants,
      participantDetailsDeferred,
      refundBank, refundAccount, refundHolder,
      referralSource,
      scholarshipDiscounts,
      scholarshipDiscountDetails,
      notes,
    } = data;

    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    const refundBankNorm = String(refundBank ?? '').trim();
    const refundAccountNorm = String(refundAccount ?? '').trim();
    const refundHolderNorm = String(refundHolder ?? '').trim();
    if (!refundBankNorm || !refundAccountNorm || !refundHolderNorm) {
      return Response.json({ error: '환불을 위한 은행명, 계좌번호, 예금주를 모두 입력해주세요.' }, { status: 400, headers: CORS });
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
    let normalizedParticipants = [];
    let deferParticipantDetails = false;
    if (registrationType === 'group') {
      const canDeferParticipantDetails = campId === '2026-inland-union';
      const requestedGroupCount = parseInt(groupCount, 10) || 0;
      const shouldDeferParticipantDetails =
        canDeferParticipantDetails && (!Array.isArray(participants) || participants.length === 0 || participantDetailsDeferred);

      if (shouldDeferParticipantDetails) {
        deferParticipantDetails = true;
        if (requestedGroupCount < 2) {
          return Response.json({ error: '단체 신청은 2명 이상이어야 합니다.' }, { status: 400, headers: CORS });
        }
        spotsNeeded = requestedGroupCount;
        spotsM = Math.max(parseInt(maleCount, 10) || 0, 0);
        spotsF = Math.max(parseInt(femaleCount, 10) || 0, 0);
      } else {
        if (!Array.isArray(participants)) {
          return Response.json({ error: '참가 학생 명단을 입력해주세요.' }, { status: 400, headers: CORS });
        }
        normalizedParticipants = participants.map(participant => ({
          name: String(participant?.name || '').trim(),
          gender: participant?.gender,
        }));
        if (normalizedParticipants.some(participant => !participant.name || !['male', 'female'].includes(participant.gender))) {
          return Response.json({ error: '모든 참가 학생의 이름과 성별을 입력해주세요.' }, { status: 400, headers: CORS });
        }
        spotsNeeded = normalizedParticipants.length;
        spotsM = normalizedParticipants.filter(participant => participant.gender === 'male').length;
        spotsF = normalizedParticipants.filter(participant => participant.gender === 'female').length;
        if (spotsNeeded < 2) {
          return Response.json({ error: '단체 신청은 2명 이상이어야 합니다.' }, { status: 400, headers: CORS });
        }
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

    // 정원 및 예비 인원 체크
    const campCapacity = Math.max(parseInt(data.capacity) || 40, 1);
    const subKey  = `camp:${campId}:submissions`;
    const subKeyM = `camp:${campId}:submissions:male`;
    const subKeyF = `camp:${campId}:submissions:female`;
    const currentSubs = parseInt(await env.CAMP_KV.get(subKey) || '0');

    if (registrationType === 'group' && currentSubs + spotsNeeded > campCapacity) {
      const remaining = Math.max(0, campCapacity - currentSubs);
      return Response.json({
        error: `현재 잔여 정원은 ${remaining}명입니다. 참여 인원을 줄여주세요.`,
      }, { status: 409, headers: CORS });
    }

    if (currentSubs + spotsNeeded > campCapacity + WAITLIST_SIZE) {
      return Response.json({
        error: '신청이 마감되었습니다. 정원과 예비 인원이 모두 찼습니다.',
      }, { status: 409, headers: CORS });
    }

    const isWaitlist = currentSubs >= campCapacity;
    const waitlistNumber = isWaitlist ? (currentSubs - campCapacity + 1) : null;

    const regId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const normalizedScholarshipDiscounts = normalizeScholarshipDiscounts(
      scholarshipDiscounts,
      registrationType === 'group' ? spotsNeeded : 1
    );
    const normalizedScholarshipDiscountAmount = scholarshipDiscountAmount(normalizedScholarshipDiscounts);
    const scholarshipText = scholarshipDiscountText(normalizedScholarshipDiscounts);
    const normalizedScholarshipDetailsResult = normalizeScholarshipDiscountDetails(
      scholarshipDiscountDetails,
      normalizedScholarshipDiscounts
    );
    if (normalizedScholarshipDetailsResult.error) {
      return Response.json({ error: normalizedScholarshipDetailsResult.error }, { status: 400, headers: CORS });
    }
    const normalizedScholarshipDiscountDetails = normalizedScholarshipDetailsResult.value;
    const scholarshipDetailText = scholarshipDiscountDetailText(normalizedScholarshipDiscountDetails);
    const campFeeBase = CAMP_BASE_FEE * spotsNeeded;
    const campFeeFinal = Math.max(0, campFeeBase - normalizedScholarshipDiscountAmount);

    const reg = registrationType === 'group'
      ? {
          regId, campId,
          registrationType: 'group',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          maleCount: spotsM, femaleCount: spotsF, groupCount: spotsNeeded,
          participants: normalizedParticipants,
          participantDetailsDeferred: deferParticipantDetails,
          refundBank: refundBankNorm,
          refundAccount: refundAccountNorm,
          refundHolder: refundHolderNorm,
          referralSource: referralSource?.trim() || '',
          scholarshipDiscounts: normalizedScholarshipDiscounts,
          scholarshipDiscountDetails: normalizedScholarshipDiscountDetails,
          scholarshipDiscountText: scholarshipText,
          scholarshipDiscountDetailText: scholarshipDetailText,
          scholarshipDiscountAmount: normalizedScholarshipDiscountAmount,
          campFeeBase,
          campFeeFinal,
          church: church?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
          isWaitlist, waitlistNumber,
        }
      : {
          regId, campId,
          registrationType: 'individual',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          grade, gender,
          church: church?.trim() || '',
          school: school?.trim() || '',
          emergency: emergency?.trim() || '',
          refundBank: refundBankNorm,
          refundAccount: refundAccountNorm,
          refundHolder: refundHolderNorm,
          scholarshipDiscounts: normalizedScholarshipDiscounts,
          scholarshipDiscountDetails: normalizedScholarshipDiscountDetails,
          scholarshipDiscountText: scholarshipText,
          scholarshipDiscountDetailText: scholarshipDetailText,
          scholarshipDiscountAmount: normalizedScholarshipDiscountAmount,
          campFeeBase,
          campFeeFinal,
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
          isWaitlist, waitlistNumber,
        };

    // submissions 카운터 증가 (신청 접수 즉시)
    const [curSubsM, curSubsF] = await Promise.all([
      env.CAMP_KV.get(subKeyM).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(subKeyF).then(v => parseInt(v || '0')),
    ]);
    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
      env.CAMP_KV.put(subKey, String(currentSubs + spotsNeeded)),
      spotsM > 0 ? env.CAMP_KV.put(subKeyM, String(curSubsM + spotsM)) : Promise.resolve(),
      spotsF > 0 ? env.CAMP_KV.put(subKeyF, String(curSubsF + spotsF)) : Promise.resolve(),
    ]);

    // KV 저장 완료 후 이메일·시트는 백그라운드에서 실행 (응답 속도에 영향 없음)
    context.waitUntil(
      Promise.allSettled([
        sendRegistrationEmail(env, reg).catch(e => console.error('registration email failed:', e)),
        syncToSheet(env, reg).catch(e => console.error('sheets sync failed:', e)),
      ])
    );

    return Response.json({ success: true, pending: true, isWaitlist, waitlistNumber }, { headers: CORS });

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
