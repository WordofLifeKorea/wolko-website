/**
 * 출금 계좌번호 — 서버 전용. 승인자·작성자 화면에는 절대 내려보내지 않고, 회계 담당자가 보는 리포트에만 붙는다.
 * 목록(id · 별칭)은 src/lib/expense-config.js 의 WITHDRAW_ACCOUNTS 와 같은 id 를 쓴다. 개인 사역계좌는 선교사마다 달라 번호가 없다.
 */
import { WITHDRAW_ACCOUNTS, WITHDRAW_FOR_CATEGORY, canonAccount } from '../../src/lib/expense-config.js';

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

/** 작성자가 카테고리를 비워 둔 예전 방식 리포트: 승인자가 고른 출금 계좌로 코드를 짐작해 채워 두고 회계가 확인한다. 계좌에서 코드가 하나로 정해질 때만. */
export const DEFAULT_CODE_FOR = {
  personal: 'Missionary Account (8025)',
  wolko: 'WOLKO (8021)',
  'junior-camp': 'Junior Camp (8040)',
  'sm-ministry': 'Student Ministries (8042)',
};

/** 새로 고를 수 있는 출금 계좌(더는 쓰지 않는 계좌 제외) */
export const WITHDRAW_IDS = WITHDRAW_ACCOUNTS.filter(a => !a.retired).map(a => a.id);
export const isWithdrawId = id => WITHDRAW_IDS.includes(id);
export { WITHDRAW_FOR_CATEGORY };

/** 회계 담당자에게만 계좌번호를 붙여 돌려준다(저장된 리포트는 건드리지 않는 복사본). 그 밖의 사람은 별칭 id 만 본다. */
export function withAccountNumbers(report, session) {
  if (!report || !Array.isArray(report.rows)) return report;
  const show = !!session?.isAccountant;
  return { ...report, rows: report.rows.map(r => {
    const { withdrawNumber: _drop, ...row } = r;
    if (row.account && canonAccount(row.account)) row.account = canonAccount(row.account);   // 이름이 바뀐 계정과목은 새 이름으로
    return show && row.withdrawAccount && WITHDRAW_NUMBERS[row.withdrawAccount] ? { ...row, withdrawNumber: WITHDRAW_NUMBERS[row.withdrawAccount] } : row;
  }) };
}
