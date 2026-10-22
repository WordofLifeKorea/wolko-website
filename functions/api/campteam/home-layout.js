import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { sanitizeHomeLayout, loadHomeLayouts, userScope, catalogList, COLS } from '../../lib/campteamHomeLayout.js';

/**
 * 캠프팀 홈 배치.
 *  - 읽기: 로그인한 누구나 (자기에게 적용되는 배치)
 *  - 내 배치 저장·초기화: 로그인한 누구나 (자기 것만 — scope 는 항상 서버가 내 이메일로 정한다)
 *  - 모두의 기본 배치 저장·초기화: 관리자만
 */
async function who(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env);
  return s ? { s } : { res: needLogin() };
}
const view = async (env, s) => ({ ...(await loadHomeLayouts(env, s.email)), canEditDefault: !!s.perms.manageMembers, catalog: catalogList().filter((c) => !c.adminOnly || s.perms.manageMembers), cols: COLS });

export async function onRequestGet({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  return json(await view(env, s));
}

/** 저장: { scope: 'mine' | 'default', layout } */
export async function onRequestPut({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (b.scope !== 'mine' && b.scope !== 'default') return badRequest('저장 대상이 올바르지 않습니다.');
  if (b.scope === 'default' && !s.perms.manageMembers) return needPerm('모두의 기본 홈은 관리자만 바꿀 수 있습니다.');
  const r = sanitizeHomeLayout(b.layout); if (r.error) return badRequest(r.error);
  const scope = b.scope === 'default' ? 'default' : userScope(s.email);
  if (r.layout.items.some((w) => w.type === 'activity') && !s.perms.manageMembers && b.scope === 'mine') r.layout.items = r.layout.items.filter((w) => w.type !== 'activity'); // 관리자 전용 위젯은 관리자가 아니면 저장하지 않는다
  await env.DB.prepare(`INSERT INTO home_layout (scope,json,updatedAt,updatedBy) VALUES (?1,?2,?3,?4) ON CONFLICT(scope) DO UPDATE SET json=?2, updatedAt=?3, updatedBy=?4`)
    .bind(scope, JSON.stringify(r.layout), nowIso(), s.email).run();
  if (b.scope === 'default') await audit(env, s.email, 'save', 'home_layout', 'default', `${r.layout.items.filter((x) => x.show).length} visible widgets`);
  return json(await view(env, s));
}

/** 초기화: ?scope=mine (내 배치를 지우고 기본으로) | ?scope=default (관리자: 기본 배치를 처음 모양으로) */
export async function onRequestDelete({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  const scope = new URL(request.url).searchParams.get('scope');
  if (scope !== 'mine' && scope !== 'default') return badRequest('초기화 대상이 올바르지 않습니다.');
  if (scope === 'default' && !s.perms.manageMembers) return needPerm('모두의 기본 홈은 관리자만 바꿀 수 있습니다.');
  await env.DB.prepare('DELETE FROM home_layout WHERE scope = ?1').bind(scope === 'default' ? 'default' : userScope(s.email)).run();
  if (scope === 'default') await audit(env, s.email, 'reset', 'home_layout', 'default', '');
  return json(await view(env, s));
}
