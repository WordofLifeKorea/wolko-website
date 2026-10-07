/**
 * 출금 계좌번호 — 서버 전용. 승인자·작성자 화면에는 절대 내려보내지 않고, 회계 담당자가 보는 리포트에만 붙는다.
 * 목록(id · 별칭)은 src/lib/expense-config.js 의 WITHDRAW_ACCOUNTS 와 같은 id 를 쓴다. 개인 사역계좌는 선교사마다 달라 번호가 없다.
 */
import { WITHDRAW_ACCOUNTS } from '../../src/lib/expense-config.js';

export const WITHDRAW_NUMBERS = {
  wolko: '301-0278-8159-81',
  syme: '301-0278-8162-71',
  essam: '301-0278-8163-11',
  'new-missionary-support': '301-0278-8166-11',
  treehouse: '301-0278-8175-21',
  project: '301-0278-8178-31',
  'sm-ministry': '301-0278-8179-71',
  teachers: '301-0278-8185-71',
  's-mart': '301-0278-8193-41',
  'ministry-center': '301-0278-8220-71',
  'junior-camp': '301-0343-5409-21',
  'syme-scholarship': '301-0278-8149-31',
};

/** 출금 계좌를 고르면 계정과목(코드)의 기본값으로 미리 채워 두는 경우 — 회계 담당자가 마지막에 확인하고 필요하면 바꾼다. 여기 없는 계좌는 회계가 직접 고른다. */
export const DEFAULT_CODE_FOR = {
  personal: 'Missionary Account (8025)',
  wolko: 'WOLKO (8021)',
  teachers: 'Teacher (8052)',
  'ministry-center': 'Ministry Center Expense (8289)',
  'junior-camp': 'Junior Camp (8040)',
};

export const WITHDRAW_IDS = WITHDRAW_ACCOUNTS.map(a => a.id);
export const isWithdrawId = id => WITHDRAW_IDS.includes(id);

/** 회계 담당자에게만 계좌번호를 붙여 돌려준다(저장된 리포트는 건드리지 않는 복사본). 그 밖의 사람은 별칭 id 만 본다. */
export function withAccountNumbers(report, session) {
  if (!report || !Array.isArray(report.rows)) return report;
  const show = !!session?.isAccountant;
  return { ...report, rows: report.rows.map(r => {
    const { withdrawNumber: _drop, ...row } = r;
    return show && row.withdrawAccount && WITHDRAW_NUMBERS[row.withdrawAccount] ? { ...row, withdrawNumber: WITHDRAW_NUMBERS[row.withdrawAccount] } : row;
  }) };
}
