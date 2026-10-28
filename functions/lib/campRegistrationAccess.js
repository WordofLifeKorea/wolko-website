/**
 * 캠프 신청자 목록을 고칠 수 있는 포탈 계정(소문자 이메일).
 * 관리자·마스터가 아니어도 취소·환불 인원을 목록에서 삭제(휴지통으로 이동)하고, 휴지통에서 복원할 수 있다.
 * 영구 삭제는 포함하지 않는다(관리자·마스터만). 예약금 확인·최종 확정은 회계 담당(ACCOUNTANT_EMAILS)만 하는 기존 규칙 그대로다.
 *   hlim@wol.org — 임현지(Ella)
 */
export const CAMP_REGISTRATION_EDITORS = ['hlim@wol.org'];

export function isCampRegistrationEditor(email) {
  return CAMP_REGISTRATION_EDITORS.includes(String(email || '').trim().toLowerCase());
}
