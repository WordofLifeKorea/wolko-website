/**
 * 경비 리포트 공용 설정 — 화면(src/pages/expense)과 서버(functions/api/expense)가 같은 목록을 쓴다.
 * 계정과목/캠퍼스를 바꾸려면 여기만 고치면 된다.
 */

/** 계정과목(카테고리) — 관리 번호 포함. 승인자가 항목마다 이 중에서 확정한다. */
export const ACCOUNTS = [
  'WOLKO (8021)', 'Car Gas (8400)', 'Car Maintenance (8500)', 'Car Tax (8320)',
  'Junior Camp (8040)', 'Ministry Center Expense (8289)', 'Student Ministries (8042)',
  'SYME Equipment (8395)', 'SYME Program Event (8974)', 'SYME Food (8968)',
  'Missionary Account (8025)', 'Teacher (8052)', 'Pyeongtaek EM (8067)', 'Other/Unknown',
];

/**
 * 외화: 기준 통화는 KRW. 영수 날짜 기준 환율(1단위 = rate KRW)로 환산한다.
 * min/max = 서버가 받아들이는 환율 범위, digits = 금액 소수 자리, dp = 환율 저장 소수 자리.
 */
export const FOREIGN_CURRENCIES = {
  USD: { symbol: '$', digits: 2, dp: 2, min: 100, max: 10000 },
  CAD: { symbol: 'C$', digits: 2, dp: 2, min: 100, max: 10000 },
  VND: { symbol: '₫', digits: 0, dp: 4, min: 0.005, max: 1 },
};

/** 리포트가 속한 캠퍼스: 월코(평택) | 제주 */
export const CAMPUSES = ['wolko', 'jeju'];
export const DEFAULT_CAMPUS = 'wolko';
