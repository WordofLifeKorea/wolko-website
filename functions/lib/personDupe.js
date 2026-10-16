import { normalizePhone } from './phone.js';

/**
 * 개인 신청의 중복 판별 키 — 같은 캠프에 이름과 전화번호가 모두 같은 신청이 이미 있을 때만 막는다.
 * 이메일이 같아도(한 학부모가 여러 자녀를 신청) 이름이 다르면 통과한다. 단체 신청은 대상이 아니다.
 */
export function personDupeKey(campId, reg) {
  if (!reg || reg.registrationType === 'group' || reg.registrationType === 'staff') return null;
  const name = String(reg.name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const phone = normalizePhone(reg.phone).replace(/\D/g, '');
  if (!name || !phone) return null;
  return `camp:${campId}:person:${name}|${phone}`;
}
