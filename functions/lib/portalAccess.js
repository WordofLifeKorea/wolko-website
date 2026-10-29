/**
 * 포탈 메뉴 접근 — 제주팀(가입할 때 소속을 제주로 고른 계정)의 일반 멤버는 아래 도구만 쓸 수 있다.
 * 마스터·관리자, 그리고 FULL_ACCESS_EMAILS(제주팀 매니저급)는 소속과 상관없이 전체 메뉴. 평택팀은 전체 메뉴.
 *
 * 도구는 주소(href)로 가리킨다 — public/wolko-rail.js 의 TOOLS, src/pages/portal.astro 의 TOOLS 와 같은 값.
 * 이 목록은 /api/hub/me 와 /api/portal/dashboard 가 화면에 알려 주고(tools), 화면은 메뉴를 줄이고 막힌 페이지를 안내한다.
 * 서버는 functions/api/_middleware.js 가 제한된 도구의 API 를 같은 기준으로 막는다.
 */
import { normalizeEmail } from './hubAccounts.js';
import { campusOf, normalizeCampus } from './campus.js';

/** 제주팀 일반 멤버가 쓸 수 있는 도구 */
export const JEJU_MEMBER_TOOLS = ['/portal/crs', '/portal/resource', '/portal/prayers', '/portal/wolkoadmin', '/portal/expense', '/portal/mypage'];

/** 관리자 등급은 아니지만 전체 메뉴를 쓰는 제주팀 매니저급 계정의 이메일 — 여기에 추가한다 */
export const FULL_ACCESS_EMAILS = [];

/** 쓸 수 있는 도구 주소 목록. 제한이 없으면(전체 메뉴) null */
export function allowedTools({ role, campus, email } = {}) {
  if (normalizeCampus(campus) !== 'jeju') return null;
  if (role === 'master' || role === 'admin') return null;
  if (FULL_ACCESS_EMAILS.map(normalizeEmail).includes(normalizeEmail(email))) return null;
  return [...JEJU_MEMBER_TOOLS];
}

/** 로그인한 계정(session: { email, role })의 쓸 수 있는 도구 */
export async function toolsFor(env, session) {
  if (!session) return null;
  return allowedTools({ role: session.role, campus: await campusOf(env, session), email: session.email });
}

export const canUseTool = (tools, href) => !tools || tools.includes(href);

/** API 주소 앞부분 → 그 API 를 쓰는 도구 */
export const API_TOOLS = [
  ['/api/schedule/', '/portal/schedule'],
  ['/api/rsvp-manual', '/portal/wolkoevents'],
  ['/api/portal/gospel-', '/portal/gospel-stats'],
  ['/api/camp-progress/', '/portal/campstaff'],
  ['/api/teach/', '/portal/camp-resources'],
  ['/api/campteam/', '/portal/campteam'],
  ['/api/car/', '/portal/car-drive'],
  ['/api/kitchen/', '/portal/kitchen'],
];

export const toolOfApi = pathname => (API_TOOLS.find(([prefix]) => pathname.startsWith(prefix)) || [])[1] || null;

