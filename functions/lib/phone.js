/**
 * 전화번호 정리 — 한국 휴대폰은 항상 010-0000-0000 형식으로, 해외 번호는 +국가번호숫자로 맞춘다.
 *   '+82 10-1234-5678' · '8210 1234 5678' · '+82 (0)10-1234-5678' · '01012345678' → '010-1234-5678'
 *   '+1 (555) 123-4567' → '+15551234567'
 * 형식을 알아볼 수 없으면 앞뒤 공백만 정리해 그대로 돌려준다(저장을 막지는 않는다).
 */
const KR_MOBILE = /^01[016789]\d{7,8}$/;

function formatKoreanMobile(digits) {
  if (!KR_MOBILE.test(digits)) return null;
  const head = digits.slice(0, 3);
  const rest = digits.slice(3);
  return rest.length === 8 ? `${head}-${rest.slice(0, 4)}-${rest.slice(4)}` : `${head}-${rest.slice(0, 3)}-${rest.slice(3)}`;
}

export function normalizePhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const plus = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\(0\)/g, '').replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (plus || /^82(10|1[016789])/.test(digits) && digits.length >= 11 && !digits.startsWith('01')) {
    if (digits.startsWith('82')) {
      const national = digits.slice(2).replace(/^0+/, '');
      const kr = formatKoreanMobile('0' + national);
      if (kr) return kr;
    }
    return plus && digits ? `+${digits}` : raw;
  }
  return formatKoreanMobile(digits) || raw;
}

/** 솔라피에 보낼 숫자만 — 한국 번호는 01012345678, 해외 번호는 국가번호 포함 숫자 */
export function toSolapiNumber(phone) {
  const normalized = normalizePhone(phone);
  return normalized.replace(/[^0-9]/g, '');
}
