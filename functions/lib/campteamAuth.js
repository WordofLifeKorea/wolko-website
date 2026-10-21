/**
 * 캠프팀 포털 — 로그인 확인과 권한.
 *
 * 로그인은 기존 포털 로그인(portalSession)을 그대로 쓴다 — 기존 계정 목록은 읽기만 하고 절대 쓰지 않는다.
 * 캠프팀 권한은 별도 명단(camp_members, 새 DB)으로만 정한다. 명단에 없는 로그인 사용자는 "조회만".
 *
 *  역할      일반 자료(업무·일정·회의록·파일)   예산·금액
 *  admin     조회·작성·수정                       조회·작성·수정  (명단·설정 관리)
 *  finance   조회만                               조회·작성·수정
 *  member    조회·작성·수정                       조회·작성·수정
 *  (명단 없음) 조회만                             조회 불가
 */
import { parseHubSessionToken, portalSession, normalizeEmail } from './hubAccounts.js';

export const CAMP_ROLES = ['admin', 'finance', 'member'];
// 활성 관리자가 한 명도 없을 때만 임시 관리자로 인정하는 계정 (관리자를 지정하면 더 이상 특별 취급하지 않는다)
export const BOOTSTRAP_ADMIN_EMAILS = ['aidenpark@wolko.org'];

export function permsFor(campRole) {
  const r = campRole;
  const money = r === 'admin' || r === 'finance' || r === 'member';
  return {
    read: true,
    write: r === 'admin' || r === 'member',
    moneyRead: money,
    moneyWrite: money,
    manageMembers: r === 'admin',
  };
}

/** 파일을 만들고 고칠 수 있는지: 금액 자료(restricted)는 금액 권한, 그 밖에는 일반 작성 권한 */
export const canWriteFile = (perms, restricted) => restricted ? perms.moneyWrite : perms.write;

// 내 컴퓨터/같은 와이파이(개발용)에서만 켤 수 있는 테스트 로그인.
// 운영 서버에서는 CAMPTEAM_DEV_AUTH 값이 없고, 주소도 localhost 계열이 아니라서 절대 켜지지 않는다.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

function bearer(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

async function hubSession(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  if (env.CAMPTEAM_DEV_AUTH === '1' && LOCAL_HOST.test(new URL(request.url).hostname)) {
    const token = bearer(request);
    return token ? parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  }
  return portalSession(request, env);
}

/** 로그인한 사용자의 { email, hubRole, campRole, perms } — 로그인이 안 되었으면 null */
export async function campSession(request, env) {
  if (!env.DB) return null;
  const hub = await hubSession(request, env);
  if (!hub) return null;
  const email = normalizeEmail(hub.email);
  const row = await env.DB.prepare('SELECT role FROM camp_members WHERE email = ?1 AND active = 1').bind(email).first();
  let campRole = row ? row.role : null;
  // 처음 설정할 때만: 활성 관리자가 한 명도 없으면 지정된 임시 관리자 계정이 관리자 역할을 한다
  if (!campRole && BOOTSTRAP_ADMIN_EMAILS.includes(email)) {
    const anyAdmin = await env.DB.prepare("SELECT 1 AS x FROM camp_members WHERE role = 'admin' AND active = 1 LIMIT 1").first();
    if (!anyAdmin) campRole = 'admin';
  }
  return { email, hubRole: hub.role, campRole, perms: permsFor(campRole) };
}

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
export const needLogin = () => json({ error: '포탈 로그인이 필요합니다.', code: 'login' }, 401);
export const needPerm = (what = '권한이 없습니다.') => json({ error: what, code: 'forbidden' }, 403);
export const badRequest = (msg) => json({ error: msg, code: 'bad_request' }, 400);
export const noDb = () => json({ error: '서버 설정(DB)이 필요합니다.', code: 'no_db' }, 500);
