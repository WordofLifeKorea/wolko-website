/**
 * 캠프팀 포털 — 로그인 확인과 권한.
 *
 * 로그인은 기존 포털 로그인(portalSession)을 그대로 쓴다 — 기존 계정 목록은 읽기만 하고 절대 쓰지 않는다.
 * 캠프팀 권한은 별도 명단(camp_members, 새 DB)으로만 정한다. 명단에 없는 로그인 사용자는 "조회만".
 *
 *  역할        일반 자료(업무·일정·회의록·파일)   예산·금액(장부·예산안)
 *  admin       조회·작성·수정                       조회·작성·수정·기간 마감  (명단·설정 관리, 코드에 고정된 2명 포함)
 *  director    조회·작성·수정                       조회·작성·수정·기간 마감  (캠프팀 디렉터)
 *  finance     조회·작성·수정                       조회·작성·수정·기간 마감  (캠프 재정 담당 — 디렉터와 같은 권한. 송금·승인은 이 포털에 없음)
 *  treasurer   조회만                               조회만                    (월코 전체 재정 담당 — 확인용)
 *  member      조회·작성·수정                       조회만                    (일반 캠프팀 팀원)
 *  (명단 없음) 조회만                               조회 불가                 (월코팀의 다른 사람에게는 금액이 아예 안 보인다)
 */
import { parseHubSessionToken, portalSession, normalizeEmail } from './hubAccounts.js';
import { parseCampToken } from './campteamGoogleAuth.js';

export const CAMP_ROLES = ['admin', 'director', 'finance', 'treasurer', 'member'];
// 코드에 고정된 캠프팀 관리자 2명. 설정 화면에서 빼거나 역할을 바꿀 수 없다. 기존 포털 계정/관리자 목록과는 무관하고 캠프팀 안에서만 적용된다.
// 그 밖의 관리자·재정 담당·팀원은 모두 설정 화면(팀 명단)에서 추가한다.
export const FIXED_ADMIN_EMAILS = ['aidenpark@wolko.org', 'hkim3@wol.org'];
export const isFixedAdmin = (email) => FIXED_ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());

export function permsFor(campRole) {
  const r = campRole;
  const money = r === 'admin' || r === 'director' || r === 'finance';       // 디렉터와 캠프 재정 담당은 같은 권한
  return {
    read: true,
    write: r === 'admin' || r === 'director' || r === 'finance' || r === 'member',
    moneyRead: money || r === 'treasurer' || r === 'member',                // 장부·예산안·금액 자료를 볼 수 있다 (명단에 없으면 못 봄)
    moneyWrite: money,                                                      // 장부·예산안·항목 목록을 고칠 수 있다
    moneyAdmin: money,                                                      // 기간 만들기·마감·다시 열기, 경비 연동 규칙
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
  // Google 로그인으로 받은 캠프팀 전용 출입증 (wolko.org 계정 → 조회만, 권한은 팀 명단이 정함). 기존 포털에서는 효력 없음.
  const camp = bearer(request) ? await parseCampToken(env.ADMIN_PASSWORD, bearer(request)) : null;
  if (camp) return { email: camp.email, role: 'google' };
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
  let campRole = null;
  if (isFixedAdmin(email)) campRole = 'admin';
  else {
    const row = await env.DB.prepare('SELECT role FROM camp_members WHERE email = ?1 AND active = 1').bind(email).first();
    campRole = row ? row.role : null;
  }
  return { email, hubRole: hub.role, campRole, perms: permsFor(campRole) };
}

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
export const needLogin = () => json({ error: '포탈 로그인이 필요합니다.', code: 'login' }, 401);
export const needPerm = (what = '권한이 없습니다.') => json({ error: what, code: 'forbidden' }, 403);
export const badRequest = (msg) => json({ error: msg, code: 'bad_request' }, 400);
export const noDb = () => json({ error: '서버 설정(DB)이 필요합니다.', code: 'no_db' }, 500);
