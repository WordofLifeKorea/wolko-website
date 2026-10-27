import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, text, audit } from '../../lib/campteamDb.js';
import { keyOf, ownerOptions, renameOwnerInTasks } from '../../lib/campteamOwnerNames.js';

/**
 * 담당자 이름 관리.
 *  GET    — 팀 명단에 있는 사람: 업무 담당자 칸에서 고를 이름 목록. 관리자는 기본 이름(approved)·확인 대기(pending)도 같이 본다
 *  POST   — 관리자: { name } 기본 이름 추가 (확인 대기·합친 이름이어도 기본 이름으로 바꾼다)
 *  PATCH  — 관리자: ?key= { action:'approve' } 새 담당자로 인정 | { action:'merge', into:'기존 이름' } 기존 이름과 합치기(업무의 담당자도 같이 바뀐다)
 *  DELETE — 관리자: ?key= 목록에서 빼기 (이미 업무에 쓰인 이름은 그대로 남는다)
 */
const rows = async (env) => { try { return (await env.DB.prepare('SELECT key, name, status, mergedInto, createdBy, createdAt FROM owner_names ORDER BY createdAt').all()).results; } catch { return []; } };
async function gate(env, request, admin) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole) return { res: needPerm('캠프팀 명단에 있는 계정만 할 수 있어요.') };
  if (admin && !s.perms.manageMembers) return { res: needPerm('관리자만 할 수 있어요.') };
  return { s };
}
export async function onRequestGet({ env, request }) {
  const { s, res } = await gate(env, request, false); if (res) return res;
  const out = { options: await ownerOptions(env) };
  if (s.perms.manageMembers) { const r = await rows(env); out.defaults = r.filter(x => x.status === 'approved'); out.pending = r.filter(x => x.status === 'pending'); out.merged = r.filter(x => x.status === 'merged'); }
  return json(out);
}
export async function onRequestPost({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const name = text(b.name, 60), k = keyOf(name); if (!k) return badRequest('이름을 입력해주세요.');
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO owner_names (key,name,status,createdBy,createdAt,updatedAt) VALUES (?1,?2,'approved',?3,?4,?4) ON CONFLICT(key) DO UPDATE SET name=?2, status='approved', mergedInto='', updatedAt=?4`).bind(k, name, s.email, now).run();
  await audit(env, s.email, 'create', 'owner_name', k, name);
  return json({ ok: true }, 201);
}
export async function onRequestPatch({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  const key = new URL(request.url).searchParams.get('key') || '';
  const row = await env.DB.prepare('SELECT key, name, status FROM owner_names WHERE key = ?1').bind(key).first();
  if (!row) return json({ error: '찾을 수 없습니다.' }, 404);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const now = nowIso();
  if (b.action === 'approve') {
    await env.DB.prepare(`UPDATE owner_names SET status='approved', mergedInto='', updatedAt=?2 WHERE key=?1`).bind(key, now).run();
    await audit(env, s.email, 'update', 'owner_name', key, 'approve ' + row.name); return json({ ok: true });
  }
  if (b.action === 'merge') {
    const into = text(b.into, 60), ik = keyOf(into);
    if (!ik || ik === key) return badRequest('합칠 기존 이름을 골라주세요.');
    const changed = await renameOwnerInTasks(env, key, into);
    await env.DB.prepare(`UPDATE owner_names SET status='merged', mergedInto=?2, updatedAt=?3 WHERE key=?1`).bind(key, into, now).run();
    await audit(env, s.email, 'update', 'owner_name', key, `merge ${row.name} → ${into} (${changed})`); return json({ ok: true, changed });
  }
  return badRequest('action 이 올바르지 않습니다.');
}
export async function onRequestDelete({ env, request }) {
  const { s, res } = await gate(env, request, true); if (res) return res;
  const key = new URL(request.url).searchParams.get('key') || '';
  const r = await env.DB.prepare(`DELETE FROM owner_names WHERE key = ?1 AND status = 'approved'`).bind(key).run();
  if (!r.meta?.changes) return json({ error: '찾을 수 없습니다.' }, 404);
  await audit(env, s.email, 'delete', 'owner_name', key); return json({ ok: true });
}
