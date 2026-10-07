/**
 * GET /api/kitchen/members — 주방 관리자(와 마스터)가 사람을 직접 배정할 때 고르는 목록.
 * 승인된 평택센터 멤버만, 이름과 이메일(전화번호는 있는지 여부만).
 */
import { kitchenSession } from '../../lib/kitchenDuty.js';
import { listAccounts, isMasterEmail } from '../../lib/hubAccounts.js';
import { CAMPUS_OVERRIDES } from '../../../src/lib/expense-config.js';
import { pickName } from '../../lib/expenses.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestGet({ env, request }) {
  const session = await kitchenSession(request, env);
  if (session.error) return fail(session.error, session.status);
  if (!session.isManager) return fail('주방 관리자만 사용할 수 있습니다.', 403);
  const accounts = await listAccounts(env);
  const members = accounts
    .filter(a => a.status === 'approved' && ((CAMPUS_OVERRIDES[a.email] || a.campus || 'wolko') === 'wolko' || isMasterEmail(a.email)))
    .map(a => ({ email: a.email, name: pickName(a.email, a.name), hasPhone: !!String(a.phone || '').trim() }))
    .sort((x, y) => x.name.localeCompare(y.name, 'ko'));
  return Response.json({ members }, { headers: H });
}
