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

/** 리포트가 속한 캠퍼스: 월코(평택) | 제주 */
export const CAMPUSES = ['wolko', 'jeju'];
export const DEFAULT_CAMPUS = 'wolko';
