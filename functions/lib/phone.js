/**
 * 전화번호 정리 — 한국 휴대폰은 항상 010-0000-0000 형식으로, 해외 번호는 +국가번호숫자로 맞춘다.
 *   '+82 10-1234-5678' · '8210 1234 5678' · '+82 (0)10-1234-5678' · '01012345678' → '010-1234-5678'
 *   '+1 (555) 123-4567' → '+15551234567'
 * 흔한 입력 실수도 고친다: 맨 앞 0을 빠뜨린 '10-1234-5678', 010의 0 하나를 빠뜨린 '01-7334-7848'(→ 010-7334-7848),
 * 전각 숫자 '０１０…'. 다만 '017-334-7848' 처럼 옛 번호 모양으로 쓴 것은 그대로 둔다(진짜 옛 번호일 수 있다).
 * 형식을 알아볼 수 없으면 앞뒤 공백만 정리해 그대로 돌려준다(저장을 막지는 않는다).
 */
const KR_MOBILE = /^01[016789]\d{7,8}$/;

function formatKoreanMobile(digits) {
  if (!KR_MOBILE.test(digits)) return null;
  const head = digits.slice(0, 3);
  const rest = digits.slice(3);
  return rest.length === 8 ? `${head}-${rest.slice(0, 4)}-${rest.slice(4)}` : `${head}-${rest.slice(0, 3)}-${rest.slice(3)}`;
}

/**
 * '01-7334-7848' · '1-7334-7848' · '0 7334 7848' 처럼 010 에서 숫자를 빠뜨리고 뒤 8자리는 4-4로 끊어 쓴 경우 → '010-7334-7848'.
 * 첫 덩어리가 0 · 1 · 01 이고 나머지가 꼭 8자리일 때만 고친다(숫자만 붙여 쓴 '0173347848' 은 옛 017 번호일 수 있어 그대로).
 */
function fixDroppedZero(raw) {
  const groups = raw.split(/\D+/).filter(Boolean);
  if (groups.length < 2 || !/^(0|1|01)$/.test(groups[0])) return null;
  const rest = groups.slice(1).join('');
  return rest.length === 8 ? formatKoreanMobile('010' + rest) : null;
}

export function normalizePhone(input) {
  const raw = String(input ?? '').normalize('NFKC').trim();
  if (!raw) return '';
  const plus = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\(0\)/g, '').replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (plus || /^820?1[016789]/.test(digits) && digits.length >= 11 && !digits.startsWith('01')) {
    if (digits.startsWith('82')) {
      const national = digits.slice(2).replace(/^0+/, '');
      const kr = formatKoreanMobile('0' + national);
      if (kr) return kr;
    }
    return plus && digits ? `+${digits}` : raw;
  }
  // 국가코드를 한국(+82)으로 두고 맨 앞 0 없이 '10 1234 5678' 처럼 입력한 경우도 010-1234-5678 로 맞춘다.
  return fixDroppedZero(raw) || formatKoreanMobile(digits) || formatKoreanMobile('0' + digits) || raw;
}

/** 솔라피에 보낼 숫자만 — 한국 번호는 01012345678, 해외 번호는 국가번호 포함 숫자 */
export function toSolapiNumber(phone) {
  const normalized = normalizePhone(phone);
  return normalized.replace(/[^0-9]/g, '');
}
