/**
 * 경비 리포트 공용 설정 — 화면(src/pages/expense)과 서버(functions/api/expense)가 같은 목록을 쓴다.
 * 계정과목/캠퍼스를 바꾸려면 여기만 고치면 된다.
 */

/** 계정과목(카테고리) — 관리 번호 포함. 작성자가 항목마다 고르고, 회계 담당자가 마지막에 확인한다. */
export const ACCOUNTS = [
  'WOLKO (8021)', 'Car Gas (8400)', 'Car Maintenance (8500)',
  'Junior Camp (8040)', 'Ministry Center Expense (8289)', 'Student Ministries (8042)',
  'Furniture & Fixtures (8395)', 'Food (8968)',
  'Missionary Account (8025)', 'Teacher (8052)', 'Other/Unknown',
];
/** 이름이 바뀐 계정과목 — 예전에 저장된 값은 새 이름으로 읽는다 */
export const ACCOUNT_ALIASES = { 'SYME Food (8968)': 'Food (8968)', 'SYME Equipment (8395)': 'Furniture & Fixtures (8395)' };
/** 더 이상 고를 수 없는 계정과목 — 이미 이 값으로 저장된 리포트는 그대로 읽히지만, 회계가 확인할 때 새 값으로 골라야 한다 */
export const RETIRED_ACCOUNTS = ['Car Tax (8320)', 'SYME Program Event (8974)', 'Pyeongtaek EM (8067)'];
/** 예전 이름이면 새 이름으로, 지금 쓰는 값이 아니면 빈 값 */
export const canonAccount = v => { const x = ACCOUNT_ALIASES[v] || v; return ACCOUNTS.includes(x) ? x : ''; };

/**
 * 출금 계좌 — 승인자가 항목마다 "어느 계좌에서 나가는 돈인지" 확정한다. 화면에는 별칭만 보이고,
 * 계좌번호는 서버(functions/lib/expenseAccounts.js)에만 있으며 회계 담당자에게만 내려간다.
 * id 는 저장되는 값이라 바꾸지 않는다(별칭은 마음대로 고쳐도 됨). 맨 위는 선교사 개인 사역계좌.
 */
export const WITHDRAW_ACCOUNTS = [
  { id: 'personal', ko: '개인 사역계좌', en: 'Personal Ministry Account' },
  { id: 'wolko', ko: 'WOLKO', en: 'WOLKO' },
  { id: 'syme', ko: 'SYME', en: 'SYME' },
  { id: 'new-missionary-support', ko: 'New 선교사후원금', en: 'New Missionary Support' },
  { id: 'project', ko: 'Project 프로젝트', en: 'Project' },
  { id: 'sm-ministry', ko: 'S.M ministry', en: 'S.M ministry' },
  { id: 'teachers', ko: 'Teachers', en: 'Teachers' },
  { id: 's-mart', ko: 'S-MART', en: 'S-MART' },
  { id: 'ministry-center', ko: 'Ministry Center', en: 'Ministry Center' },
  { id: 'junior-camp', ko: 'Junior Camp 주니어캠프', en: 'Junior Camp' },
  { id: 'others', ko: 'Others', en: 'Others' },
  // 더는 고를 수 없지만, 이미 이 계좌로 승인된 리포트를 읽을 수 있도록 남겨 둔다
  { id: 'essam', ko: '에쌈프로젝트', en: 'Essam Project', retired: true },
  { id: 'treehouse', ko: '트리하우스', en: 'Tree House', retired: true },
  { id: 'syme-scholarship', ko: 'SYME 학생 장학금', en: 'SYME Student Scholarship', retired: true },
];
/** 작성자가 고른 카테고리 → 추천 출금 계좌 (승인자가 바꿀 수 있다). 여기 없는 카테고리는 추천 없이 승인자가 고른다. */
export const WITHDRAW_FOR_CATEGORY = {
  'Missionary Account (8025)': 'personal',
  'WOLKO (8021)': 'wolko',
  'Car Gas (8400)': 'teachers',
  'Car Maintenance (8500)': 'teachers',
  'Junior Camp (8040)': 'junior-camp',
  'Student Ministries (8042)': 'sm-ministry',
  'Furniture & Fixtures (8395)': 'others',
};
/** 이 출금 계좌를 고르면 승인자의 메모가 꼭 필요하다 */
export const WITHDRAW_NOTE_REQUIRED = ['others'];

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
