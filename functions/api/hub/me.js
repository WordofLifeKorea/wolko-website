/**
 * GET   /api/hub/me — 로그인한 포탈 계정의 이름 · 이메일 · 역할 · 휴대폰 · 소속 (화면 우측 상단 표시와 내 정보 창)
 * PATCH /api/hub/me { name, phone } — 내 이름과 휴대폰 번호 수정 (소속 · 역할 · 이메일은 여기서 바꾸지 않는다)
 * Authorization: Bearer <포탈 세션 토큰>. 저장소 읽기 1~2회만 쓴다.
 */
import { getAccount, isMasterEmail, isValidPhone, normalizeEmail, parseHubSessionToken, putAccount } from '../../lib/hubAccounts.js';
import { ACCOUNTANT_EMAILS, pickName } from '../../lib/expenses.js';
import { CAMPUS_OVERRIDES } from '../../../src/lib/expense-config.js';

const H = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
const fail = (error, status) => Response.json({ error }, { status, headers: H });

async function who(env, request) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return { res: fail('config', 503) };
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session) return { res: fail('unauthorized', 401) };
  const email = normalizeEmail(session.email);
  const account = await getAccount(env, email);
  if (account ? account.status !== 'approved' : !isMasterEmail(email)) return { res: fail('unauthorized', 401) };
  return { session, email, account };
}
const view = (email, account, session) => ({
  name: pickName(email, account?.name),
  email,
  role: session.role,
  phone: account?.phone || '',
  campus: CAMPUS_OVERRIDES[email] || account?.campus || 'wolko',
  mustChangePassword: !!account?.mustChangePassword,
  isAccountant: ACCOUNTANT_EMAILS.includes(email),
});

export async function onRequestGet({ env, request }) {
  const w = await who(env, request);
  if (w.res) return w.res;
  return Response.json(view(w.email, w.account, w.session), { headers: H });
}

export async function onRequestPatch({ env, request }) {
  const w = await who(env, request);
  if (w.res) return w.res;
  if (!w.account) return fail('계정 정보를 찾을 수 없어 수정할 수 없습니다.', 404);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 400); }
  const name = String(body?.name ?? w.account.name ?? '').trim();
  const phone = String(body?.phone ?? w.account.phone ?? '').trim();
  if (!name || name.length > 40) return fail('이름을 40자 이내로 입력해 주세요.', 400);
  if (name.includes('@')) return fail('이름에는 이메일 주소를 쓸 수 없어요.', 400);
  if (phone && !isValidPhone(phone)) return fail('올바른 휴대폰 번호를 입력해 주세요.', 400);
  const updated = { ...w.account, name, phone, profileUpdatedAt: new Date().toISOString() };
  await putAccount(env, updated);
  return Response.json(view(w.email, updated, w.session), { headers: H });
}
