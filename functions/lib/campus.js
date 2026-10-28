/**
 * 포탈 소속(캠퍼스) — 평택(월코, 'wolko') 또는 제주('jeju').
 * 가입할 때 고른 소속(account.campus)을 쓰고, 코드로 정해 둔 예외(CAMPUS_OVERRIDES)가 먼저다. 정보가 없으면 평택.
 * 포탈 첫 화면의 공지·일정·주방·차량·교회가 소속에 따라 다르게 보이는 데 쓴다 (배너·기도제목은 공용).
 */
import { CAMPUS_OVERRIDES } from '../../src/lib/expense-config.js';
import { getAccount } from './hubAccounts.js';

export const CAMPUSES = ['wolko', 'jeju'];
export const NOTICE_AUDIENCES = ['all', 'wolko', 'jeju'];
export const normalizeCampus = v => (v === 'jeju' ? 'jeju' : 'wolko');

export async function campusOf(env, session) {
  const email = String(session?.email || '').trim().toLowerCase();
  if (!email) return 'wolko';
  if (CAMPUS_OVERRIDES[email]) return normalizeCampus(CAMPUS_OVERRIDES[email]);
  const account = await getAccount(env, email).catch(() => null);
  return normalizeCampus(account?.campus);
}
