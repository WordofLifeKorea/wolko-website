/**
 * 신청자 알림톡(+ 알림톡이 실패하면 LMS 대체문자) — 접수 · 예약금 확인 · 최종 확정.
 *
 * 개인/단체 구분 없이 #{이름}(개인=캠퍼, 단체=담당자) 하나로 보내고, 얼리버드 장학금을 선택한 신청자는 "얼리버드형",
 * 그 외는 "일반형" 템플릿을 쓴다. 템플릿 ID 는 환경변수에서 읽고, 설정되지 않은 종류는 보내지 않는다(false 를 돌려줘서
 * 호출한 쪽이 예전 방식으로 이어가게 한다) — 솔라피 승인본과 변수 이름이 정확히 같아야 발송된다.
 *
 *   KAKAO_TEMPLATE_RECEIPT_EARLY / _GENERAL   신청 접수
 *   KAKAO_TEMPLATE_DEPOSIT_EARLY / _GENERAL   예약금 입금 확인
 *   KAKAO_TEMPLATE_CONFIRM_EARLY / _GENERAL   최종 확정
 */
import { APPLICANT_NOTICE_INFO, usesWinterCampPolicy } from './winterCampPolicy.js';
import { sendKakaoWithSmsFallback } from './solapi.js';

const BANK = '농협 301-0343-5409-21';
const HOLDER = '(사)한국생명의말씀협회';
const CONTACT = '문의: 010-7310-9216 · wolkorea1@gmail.com\n카카오채널 검색: wolko';
const NO_REPLY = '※ 본 메시지 발신 번호로는 수신이 불가합니다.';

// 알림톡 본문과 같은 문안 — 변수는 #{...} 로 두고 대체문자(LMS)를 만들 때만 값으로 바꿔 끼운다.
const BODIES = {
  receipt_early: `#{이름}님, #{캠프명} 신청이 접수되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}

아래 계좌로 예약금 #{예약금}을 입금해 주세요.
예약금 입금이 확인되면 등록이 완료됩니다.

얼리버드 장학금은 #{잔금기한}까지
잔금을 입금해 주셔야 지급됩니다.

▶ 입금 계좌: ${BANK}
▶ 예금주: ${HOLDER}
▶ 입금자명: #{이름}

${CONTACT}`,
  receipt_general: `#{이름}님, #{캠프명} 신청이 접수되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}

아래 계좌로 예약금 #{예약금}을 입금해 주세요.
예약금 입금이 확인되면 등록이 완료됩니다.
잔금은 예약금 입금 확인 후 7일 이내에 입금해 주세요.

▶ 입금 계좌: ${BANK}
▶ 예금주: ${HOLDER}
▶ 입금자명: #{이름}

${CONTACT}`,
  deposit_early: `#{이름}님, 예약금 입금이 확인되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}

예약금을 제외한 잔여 캠프 참가비 #{잔금}을
#{잔금기한}까지 아래 계좌로 입금해 주세요.

[얼리버드 장학금 안내]
#{잔금기한}까지 잔금 입금이 완료되어야
얼리버드 장학금이 지급됩니다.

▶ 입금 계좌: ${BANK}
▶ 예금주: ${HOLDER}
▶ 입금자명: #{이름}

기한 내 입금이 어려우시면 카카오톡 채널 채팅,
이메일, 전화로 문의해 주세요.

${CONTACT}`,
  deposit_general: `#{이름}님, 예약금 입금이 확인되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}

예약금을 제외한 잔여 캠프 참가비 #{잔금}을
#{잔금기한}까지 아래 계좌로 입금해 주세요.

▶ 입금 계좌: ${BANK}
▶ 예금주: ${HOLDER}
▶ 입금자명: #{이름}

기한 내 입금이 어려우시면 카카오톡 채널 채팅,
이메일, 전화로 문의해 주세요.

${CONTACT}`,
  confirm_early: `#{이름}님, #{캠프명} 등록이 최종 확정되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}
▶ 장소: #{장소}

예약금과 캠프 참가비 입금이 모두 확인되어
얼리버드 장학금이 적용되었습니다.

캠프 준비 안내는 캠프 시작 전에
다시 안내해 드리겠습니다.
캠프에서 만나요!

${CONTACT}`,
  confirm_general: `#{이름}님, #{캠프명} 등록이 최종 확정되었습니다!

▶ 캠프명: #{캠프명}
▶ 신청: #{신청구분}
▶ 일정: #{일정}
▶ 장소: #{장소}

예약금과 캠프 참가비 입금이 모두 확인되어
등록이 최종 확정되었습니다.

캠프 준비 안내는 캠프 시작 전에
다시 안내해 드리겠습니다.
캠프에서 만나요!

${CONTACT}`,
};

// 템플릿마다 정확히 이 변수만 보낸다(승인본과 다르면 솔라피가 거절한다).
const VARIABLES = {
  receipt_early: ['이름', '캠프명', '신청구분', '일정', '예약금', '잔금기한'],
  receipt_general: ['이름', '캠프명', '신청구분', '일정', '예약금'],
  deposit_early: ['이름', '캠프명', '신청구분', '일정', '잔금', '잔금기한'],
  deposit_general: ['이름', '캠프명', '신청구분', '일정', '잔금', '잔금기한'],
  confirm_early: ['이름', '캠프명', '신청구분', '일정', '장소'],
  confirm_general: ['이름', '캠프명', '신청구분', '일정', '장소'],
};

const won = amount => `${Math.max(0, Math.round(Number(amount) || 0)).toLocaleString('ko-KR')}원`;

/** "11월 17일(화)" — 한국 시간 기준 */
export function formatKoreanDay(ms) {
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(new Date(ms));
  const get = type => parts.find(p => p.type === type)?.value || '';
  return `${get('month')}월 ${get('day')}일(${get('weekday')})`;
}

/** 얼리버드 장학금을 선택한 신청이면 얼리버드형 — 단체는 한 명이라도 선택했으면 얼리버드형 */
export function isEarlyBirdRegistration(reg) {
  return (Number(reg?.scholarshipDiscounts?.early_bird) || 0) > 0;
}

export function noticeVariables(reg, kind, info, now = Date.now()) {
  const early = isEarlyBirdRegistration(reg);
  const deposit = Number(reg.depositAmount) || 0;
  const balance = Math.max(0, (Number(reg.campFeeFinal) || 0) - deposit);
  const dueEarly = formatKoreanDay(Date.parse(`${info.balanceDueEarlyBird}T12:00:00+09:00`));
  const all = {
    '이름': reg.name,
    '캠프명': info.titleKo,
    '신청구분': reg.registrationType === 'group' ? `단체 ${reg.groupCount}명` : '개인',
    '일정': info.dateKo,
    '장소': info.locationKo,
    '예약금': won(deposit),
    '잔금': won(balance),
    '잔금기한': early ? dueEarly : formatKoreanDay(now + 7 * 24 * 3600 * 1000),
  };
  const key = `${kind}_${early ? 'early' : 'general'}`;
  return Object.fromEntries(VARIABLES[key].map(name => [`#{${name}}`, all[name]]));
}

export function fallbackText(kind, early, variables) {
  const body = BODIES[`${kind}_${early ? 'early' : 'general'}`].replace(/#\{[^}]+\}/g, token => variables[token] ?? '');
  // 문자는 발신번호만 보이므로 앞에 [월코] 를, 문의 줄 위에 수신불가 안내를 붙인다.
  const idx = body.lastIndexOf('\n문의:');
  const withNote = idx > 0 ? `${body.slice(0, idx)}\n${NO_REPLY}${body.slice(idx)}` : body;
  return `[월코] ${withNote.replace(/^\n+/, '')}`;
}

/**
 * 신청자에게 안내를 보낸다.
 * @param {'receipt'|'deposit'|'confirm'} kind
 * @returns {Promise<boolean>} 새 템플릿 대상이라 처리했으면 true, 아니면(대상 캠프 아님 · 템플릿 ID 미설정) false
 */
export async function sendApplicantNotice(env, reg, kind, { now = Date.now() } = {}) {
  if (!reg || !usesWinterCampPolicy(reg.campId)) return false;
  const info = APPLICANT_NOTICE_INFO[reg.campId];
  if (!info) return false;
  const early = isEarlyBirdRegistration(reg);
  const templateId = env[`KAKAO_TEMPLATE_${kind.toUpperCase()}_${early ? 'EARLY' : 'GENERAL'}`];
  if (!templateId) return false;
  const variables = noticeVariables(reg, kind, info, now);
  await sendKakaoWithSmsFallback(env, reg.phone, templateId, variables, fallbackText(kind, early, variables));
  return true;
}
