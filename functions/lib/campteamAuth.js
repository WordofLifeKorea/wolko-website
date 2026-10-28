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

// ── 항목별 권한 ──
// 항목(area): tasks 업무 / calendar 달력·일정 / meetings 회의록·결정 / files 자료실 / camps 캠프별 공간(·TV 공지) / money 예산 / ledger 장부 / personal 신청자 개인정보 / notices 팀 공지
// (calendar·ledger 는 예전에 tasks·money 에 묶여 있던 것을 따로 뗀 항목 — 따로 정해 두지 않은 사람은 예전 항목의 값을 그대로 이어받는다)
// 수준(level): none 안 보임 / view 보기만 / edit 수정 가능 (personal 은 none/view, 개인정보에는 "수정"이 없음)
// 역할은 기본값 묶음이고, 관리자가 사람마다 달리 정한 칸(member_perms)이 그 위에 덮어쓴다. 관리자 역할은 덮어쓸 수 없다(잠겨 버리는 사고 방지).
export const AREAS = ['tasks', 'calendar', 'meetings', 'files', 'camps', 'money', 'ledger', 'personal', 'notices'];
/** 새로 뗀 항목이 따로 정해지지 않았을 때 이어받는 예전 항목 */
export const AREA_PARENT = { calendar: 'tasks', ledger: 'money' };
export const AREA_LEVELS = { tasks: ['none', 'view', 'edit'], calendar: ['none', 'view', 'edit'], meetings: ['none', 'view', 'edit'], files: ['none', 'view', 'edit'], camps: ['none', 'view', 'edit'], money: ['none', 'view', 'edit'], ledger: ['none', 'view', 'edit'], personal: ['none', 'view'], notices: ['none', 'view', 'edit'] };
const GENERAL = ['tasks', 'calendar', 'meetings', 'files', 'camps'];

/** 역할 기본값 */
export function roleAreas(campRole) {
  const r = campRole, money = r === 'admin' || r === 'director' || r === 'finance', editor = money || r === 'member', g = editor ? 'edit' : 'view';
  // 캠프팀 명단 밖의 월코 팀원: 캠프 목록과 "월코 팀 전체 공개" 파일만 (업무·회의는 캠프팀 내부용)
  const m = money ? 'edit' : (r === 'treasurer' || r === 'member') ? 'view' : 'none';
  return { tasks: r ? g : 'none', calendar: r ? g : 'none', meetings: r ? g : 'none', files: g, camps: g, money: m, ledger: m, personal: money ? 'view' : 'none', notices: r ? 'edit' : 'none' };
}
/** 항목별 수준 → 코드 곳곳에서 쓰는 권한 묶음 */
export function permsFromAreas(areas, campRole) {
  return {
    read: true,
    write: GENERAL.some((a) => areas[a] === 'edit'),            // 일반 자료를 하나라도 고칠 수 있음 (항목별 확인은 canWrite/canView)
    moneyRead: areas.money !== 'none',                           // 장부·예산안·금액 자료를 볼 수 있다
    moneyWrite: areas.money === 'edit',                          // 장부·예산안·항목 목록을 고칠 수 있다
    moneyAdmin: areas.money === 'edit',                          // (예산 쪽) 관리 권한
    ledgerRead: areas.ledger !== 'none',                         // 장부(수입·지출·기간·대조)를 볼 수 있다
    ledgerWrite: areas.ledger === 'edit',                        // 장부를 고칠 수 있다
    ledgerAdmin: areas.ledger === 'edit',                        // 기간 만들기·마감·다시 열기, 경비 연동 규칙
    manageMembers: campRole === 'admin',
    personal: areas.personal === 'view',                         // 신청자 연락처·환불 계좌 등 개인정보
    areas,
  };
}
export function permsFor(campRole) { return permsFromAreas(roleAreas(campRole), campRole); }
/** 기본값 위에 사람별 설정(overrides: { area: level })을 얹는다. 모르는 값·허용되지 않는 값은 무시. 관리자 역할은 그대로. */
export function applyOverrides(campRole, overrides) {
  const areas = roleAreas(campRole);
  if (campRole && campRole !== 'admin') {
    const ov = overrides || {};
    // 따로 뗀 항목(달력·장부)을 따로 정한 적이 없으면, 예전 항목(업무·예산)에 정해 둔 값을 이어받는다 — 이미 정해 둔 권한이 바뀌지 않게
    for (const [child, parent] of Object.entries(AREA_PARENT)) if (!(child in ov) && AREA_LEVELS[parent].includes(ov[parent])) areas[child] = ov[parent];
    for (const [a, l] of Object.entries(ov)) if (AREA_LEVELS[a] && AREA_LEVELS[a].includes(l)) areas[a] = l;
  }
  return permsFromAreas(areas, campRole);
}
const RANK = { none: 0, view: 1, edit: 2 };
const levelOf = (perms, area) => (perms && perms.areas && perms.areas[area]) || 'none';
export const canView = (perms, area) => RANK[levelOf(perms, area)] >= 1;
export const canWrite = (perms, area) => levelOf(perms, area) === 'edit';
/** 이 항목을 못 보면 돌려줄 403 응답(볼 수 있으면 null) */
export const denyView = (perms, area, what = '이 내용') => (canView(perms, area) ? null : json({ error: `${what}을(를) 볼 권한이 없어요. 관리자에게 요청해 주세요.`, code: 'forbidden' }, 403));

/** 파일을 만들고 고칠 수 있는지: 금액 자료(restricted)는 금액 권한, 그 밖에는 일반 작성 권한 */
export const canWriteFile = (perms, restricted) => restricted ? perms.moneyWrite : canWrite(perms, 'files');

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
  let campRole = null, overrides = null; // 고정 관리자는 DB 를 읽지 않아도 항상 관리자
  if (isFixedAdmin(email)) campRole = 'admin';
  if (!isFixedAdmin(email)) {
    // 역할과 사람별 권한을 한 번에(동시에) 읽는다 — DB 를 두 번 차례로 다녀오지 않는다
    const [row, perms] = await Promise.all([
      env.DB.prepare('SELECT role FROM camp_members WHERE email = ?1 AND active = 1').bind(email).first(),
      (async () => env.DB.prepare('SELECT area, level FROM member_perms WHERE email = ?1').bind(email).all())().catch(() => null), // 이 표가 아직 없는 DB 에서도 기존 역할 권한으로 동작
    ]);
    campRole = row ? row.role : null;
    if (campRole && campRole !== 'admin' && perms) overrides = Object.fromEntries(perms.results.map((r) => [r.area, r.level]));
  }
  return { email, hubRole: hub.role, campRole, perms: applyOverrides(campRole, overrides), custom: !!(overrides && Object.keys(overrides).length) };
}

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
export const needLogin = () => json({ error: '포탈 로그인이 필요합니다.', code: 'login' }, 401);
export const needPerm = (what = '권한이 없습니다.') => json({ error: what, code: 'forbidden' }, 403);
export const badRequest = (msg) => json({ error: msg, code: 'bad_request' }, 400);
export const noDb = () => json({ error: '서버 설정(DB)이 필요합니다.', code: 'no_db' }, 500);
