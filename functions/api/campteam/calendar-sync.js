import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { cfgOf, plan, syncNow, toGoogleEvent } from '../../lib/campteamCalendarSync.js';

/**
 * 포털 일정 → Google Calendar 반영 (관리자 전용). 기본은 "미리보기"만이고, 실제 쓰기는 서버 설정 CAMPTEAM_CALENDAR_WRITE=1 + CAMPTEAM_CALENDAR_ID + 관리자 확인이 모두 있을 때만.
 *  - 새 일정은 만들고, 이미 반영된 일정은 바뀐 것만 고친다. 포털에서 지운 일정은 캠프팀이 구글에 만들어 둔 것에 한해 구글 달력에서도 지운다.
 *  - 구글에 있던 기존 일정은 읽거나 바꾸지 않는다 — 포털이 만든 일정(portalId 표시)만 다룬다.
 *  - 실제 반영 로직은 lib/campteamCalendarSync.js (일정을 저장할 때 자동으로 반영하는 기능과 같이 쓴다).
 */
export { toGoogleEvent };
async function gate(env, request) {
  if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있습니다.') }; return { s };
}
export async function onRequestGet({ env, request }) {
  const { res } = await gate(env, request); if (res) return res;
  const p = await plan(env), c = cfgOf(env), sm = (r) => ({ id: r.id, title: r.title, date: r.startDate + (r.startTime ? ' ' + r.startTime : '') });
  return json({ ...c, calendarId: undefined, plan: { creates: p.creates.map(sm), updates: p.updates.map(sm), removed: p.removed.map(sm), unchanged: p.unchanged } });
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request); if (res) return res;
  const c = cfgOf(env);
  if (!c.configured) return badRequest('달력 연결 설정(CAMPTEAM_CALENDAR_ID, 서비스 계정)이 없습니다.');
  if (!c.writeEnabled) return json({ error: '달력 쓰기가 꺼져 있어요(CAMPTEAM_CALENDAR_WRITE). 미리보기만 가능해요.', code: 'write_disabled' }, 403);
  let b = {}; try { b = await request.json(); } catch { /* 본문 없음 */ }
  if (b.confirm !== true) return badRequest('쓰기를 확인(confirm)해주세요.');
  try { return json(await syncNow(env, s.email)); } catch (e) { return json({ error: '달력에 쓰지 못했어요. 달력 공유(일정 수정 권한)와 설정을 확인해주세요.', code: 'calendar_write' }, 502); }
}
