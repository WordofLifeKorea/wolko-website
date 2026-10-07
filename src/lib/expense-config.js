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
 * 출금 계좌 — 승인자가 항목마다 "어느 계좌에서 나가는 돈인지" 확정한다. 화면에는 별칭만 보이고,
 * 계좌번호는 서버(functions/lib/expenseAccounts.js)에만 있으며 회계 담당자에게만 내려간다.
 * id 는 저장되는 값이라 바꾸지 않는다(별칭은 마음대로 고쳐도 됨). 맨 위는 선교사 개인 사역계좌.
 */
export const WITHDRAW_ACCOUNTS = [
  { id: 'personal', ko: '개인 사역계좌', en: 'Personal Ministry Account' },
  { id: 'wolko', ko: 'WOLKO', en: 'WOLKO' },
  { id: 'syme', ko: 'SYME', en: 'SYME' },
  { id: 'essam', ko: '에쌈프로젝트', en: 'Essam Project' },
  { id: 'new-missionary-support', ko: 'New 선교사후원금', en: 'New Missionary Support' },
  { id: 'treehouse', ko: '트리하우스', en: 'Tree House' },
  { id: 'project', ko: 'Project 프로젝트', en: 'Project' },
  { id: 'sm-ministry', ko: 'S.M ministry', en: 'S.M ministry' },
  { id: 'teachers', ko: 'Teachers', en: 'Teachers' },
  { id: 's-mart', ko: 'S-MART', en: 'S-MART' },
  { id: 'ministry-center', ko: 'Ministry Center', en: 'Ministry Center' },
  { id: 'junior-camp', ko: 'Junior Camp 주니어캠프', en: 'Junior Camp' },
  { id: 'syme-scholarship', ko: 'SYME 학생 장학금', en: 'SYME Student Scholarship' },
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

/** 가입 때 고른 소속과 상관없이 이 이메일은 항상 이 캠퍼스로 분류한다 (코드로 관리) */
export const CAMPUS_OVERRIDES = { 'jeremyrodgers@wol.org': 'jeju' };
