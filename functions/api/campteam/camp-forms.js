import { campSession, json, needLogin, noDb, badRequest, needPerm, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { titleCols } from '../../lib/campteamTranslate.js';
import { KINDS, CAMP_TYPES, ROLES, SNIPPETS, cleanContent, cleanCard, checkReady, starterContent, copyContent } from '../../lib/campForms.js';

/**
 * 다음 캠프의 신청서 · 스태프/크루 지원서 만들기 (캠프 준비 「신청서」 탭). 포털 안에서만 동작하고 홈페이지와는 연결되어 있지 않다.
 *  흐름: 작성(editor) → 「검토 요청」 → 검토자(reviewer) 전원 승인 → 최종 승인자(approver) 승인 = 「승인 완료」. 되돌리면 작성자에게 수정 업무가 간다.
 *  GET ?meta=1 → 자주 쓰는 칸 묶음 · 내 역할 · 역할 명단 | GET → 목록 | GET ?id= → 상세(내용·승인 기록)
 *  POST { kind, campType, copyFrom?, card? } → 새 신청서(같은 종류·유형의 가장 최근 것을 복사, 없으면 기본 양식)
 *  POST ?id { action: submit | withdraw | approve | return | duplicate | delete, comment? }
 *  PATCH ?id { title?, campType?, content? } → 작성 중(draft)일 때만 고친다
 *  PUT { editor:[이메일], reviewer:[…], approver:[…] } → 역할 정하기(관리자만)
 */
const row = (env, id) => env.DB.prepare('SELECT * FROM camp_forms WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
async function roleMap(env) {
  const out = { editor: [], reviewer: [], approver: [] }, names = new Map();
  try { for (const r of (await env.DB.prepare('SELECT email, name FROM camp_members').all()).results) names.set(String(r.email).toLowerCase(), r.name || ''); } catch { /* 표 없음 */ }
  try { for (const r of (await env.DB.prepare('SELECT email, role FROM camp_form_roles ORDER BY createdAt, email').all()).results) if (out[r.role]) out[r.role].push({ email: r.email, name: names.get(String(r.email).toLowerCase()) || String(r.email).split('@')[0] }); } catch { /* 표 없음 */ }
  return out;
}
const mineOf = (roles, s) => { const e = String(s.email).toLowerCase(), has = (k) => roles[k].some((x) => String(x.email).toLowerCase() === e); return { admin: !!s.perms.manageMembers, editor: has('editor'), reviewer: has('reviewer'), approver: has('approver') }; };
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole || !canView(s.perms, 'camps')) return { res: needPerm('캠프팀 팀원만 볼 수 있어요.') };
  const roles = await roleMap(env); return { s, roles, me: mineOf(roles, s) };
}
const canEdit = (me) => me.admin || me.editor;
const summary = (r) => ({ id: r.id, kind: r.kind, campType: r.campType, title: r.title, status: r.status, version: r.version, updatedAt: r.updatedAt, createdBy: r.createdBy, approvedAt: r.approvedAt, copiedFrom: r.copiedFrom });
async function approvalsOf(env, id, version) {
  try { return (await env.DB.prepare('SELECT stage, email, decision, comment, at, version FROM camp_form_approvals WHERE formId = ?1 ORDER BY at').bind(id).all()).results.map((a) => ({ ...a, current: a.version === version })); } catch { return []; }
}
/** 역할 가진 사람들에게 업무를 하나씩 만든다 (같은 단계·같은 버전은 한 번만) */
async function assignTasks(env, form, role, title, notes, actor) {
  const roles = await roleMap(env), now = nowIso();
  for (const p of roles[role]) {
    const key = `form:${form.id}:${role}:${form.version}:${p.email}`;
    if (await env.DB.prepare('SELECT 1 AS x FROM tasks WHERE sourceKey = ?1 AND deletedAt IS NULL').bind(key).first().catch(() => null)) continue;
    const tc = titleCols(title.slice(0, 200));
    await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerEmail,dueDate,status,priority,notes,sourceKey,createdAt,updatedAt,createdBy,titleKo,titleEn) VALUES (?1,NULL,?2,?3,?4,NULL,'Not Started','High',?5,?6,?7,?7,?8,?9,?10)`)
      .bind(uuid(), title.slice(0, 200), p.name, String(p.email).toLowerCase(), notes.slice(0, 480), key, now, actor, tc.titleKo, tc.titleEn).run().catch(() => null);
  }
}
const link = (id) => `/portal/campteam/prep/?tab=forms&form=${id}`;

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const p = new URL(request.url).searchParams, { s, roles, me } = g;
  if (p.get('meta')) return json({ me, roles, snippets: SNIPPETS, kinds: KINDS, campTypes: CAMP_TYPES });
  if (p.get('id')) {
    const r = await row(env, p.get('id')); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
    return json({ form: { ...summary(r), content: cleanContent(JSON.parse(r.content)) }, approvals: await approvalsOf(env, r.id, r.version), roles, me });
  }
  const rows = (await env.DB.prepare('SELECT * FROM camp_forms WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 200').all().catch(() => ({ results: [] }))).results;
  const items = []; for (const r of rows) items.push({ ...summary(r), card: cleanContent(JSON.parse(r.content)).card, approvals: r.status === 'review' || r.status === 'final' ? await approvalsOf(env, r.id, r.version) : [] });
  return json({ items, roles, me });
}

export async function onRequestPost({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const { s, roles, me } = g, id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const actor = s.email, now = nowIso();
  if (!id) {   // 새 신청서
    if (!canEdit(me)) return needPerm('신청서는 작성 담당자(또는 관리자)만 만들 수 있어요.');
    const kind = KINDS.includes(b.kind) ? b.kind : 'camper', campType = CAMP_TYPES.includes(b.campType) ? b.campType : 'other';
    let src = null;
    if (b.copyFrom) src = await row(env, b.copyFrom);
    if (!src) src = (await env.DB.prepare(`SELECT * FROM camp_forms WHERE deletedAt IS NULL AND kind = ?1 AND campType = ?2 ORDER BY (status = 'approved') DESC, updatedAt DESC LIMIT 1`).bind(kind, campType).first()) || null;
    const content = src ? copyContent(JSON.parse(src.content)) : starterContent(kind);
    if (src) content.card.startDate = '';
    if (b.card && typeof b.card === 'object') content.card = { ...content.card, ...cleanCard({ ...content.card, ...b.card }) };
    const fid = uuid(), title = String(b.title || content.card.titleKo || '새 신청서').slice(0, 120);
    await env.DB.prepare(`INSERT INTO camp_forms (id,kind,campType,title,status,content,version,copiedFrom,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,'draft',?5,1,?6,?7,?8,?8)`).bind(fid, src ? src.kind : kind, campType, title, JSON.stringify(content), src ? src.id : null, actor, now).run();
    await audit(env, actor, 'create', 'camp_form', fid, title.slice(0, 120)); return json({ id: fid, copiedFrom: src ? { id: src.id, title: src.title } : null }, 201);
  }
  const r = await row(env, id); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
  const a = String(b.action || ''), comment = String(b.comment || '').trim().slice(0, 500), title = r.title;
  const done = async (status, extra = '') => { await env.DB.prepare('UPDATE camp_forms SET status = ?2, updatedAt = ?3' + extra + ' WHERE id = ?1').bind(r.id, status, now).run(); await audit(env, actor, a, 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status }); };
  if (a === 'submit') {
    if (!canEdit(me)) return needPerm('작성 담당자만 검토를 요청할 수 있어요.'); if (r.status !== 'draft') return badRequest('작성 중인 신청서만 검토를 요청할 수 있어요.');
    const content = cleanContent(JSON.parse(r.content)), problems = checkReady(content, r.kind); if (problems.length) return json({ error: '검토를 요청하기 전에 고칠 곳이 있어요: ' + problems.join(' / '), problems }, 400);
    if (!roles.reviewer.length || !roles.approver.length) return badRequest('검토자와 최종 승인자를 먼저 정해 주세요(「역할 정하기」, 관리자).');
    const v = r.version + 1; await env.DB.prepare(`UPDATE camp_forms SET status = 'review', version = ?2, updatedAt = ?3 WHERE id = ?1`).bind(r.id, v, now).run();
    await assignTasks(env, { ...r, version: v }, 'reviewer', `신청서 검토: ${title}`, `새 신청서가 검토를 기다려요. 확인 후 「승인」 또는 「되돌리기」를 눌러 주세요. ${link(r.id)}`, actor);
    await audit(env, actor, 'submit', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status: 'review' });
  }
  if (a === 'withdraw') { if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.'); if (!['review', 'final'].includes(r.status)) return badRequest('검토 중일 때만 거둘 수 있어요.'); return done('draft'); }
  if (a === 'approve' || a === 'return') {
    const stage = r.status === 'review' ? 'review' : r.status === 'final' ? 'approve' : '';
    if (!stage) return badRequest('지금은 승인할 단계가 아니에요.');
    const okRole = stage === 'review' ? me.reviewer : me.approver; if (!okRole) return needPerm(stage === 'review' ? '검토자로 정해진 사람만 승인할 수 있어요.' : '최종 승인자로 정해진 사람만 승인할 수 있어요.');
    if (a === 'return' && !comment) return badRequest('되돌리는 이유를 한 줄 적어 주세요.');
    await env.DB.prepare('DELETE FROM camp_form_approvals WHERE formId = ?1 AND version = ?2 AND stage = ?3 AND LOWER(email) = LOWER(?4)').bind(r.id, r.version, stage, actor).run();
    await env.DB.prepare('INSERT INTO camp_form_approvals (id,formId,version,stage,email,decision,comment,at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)').bind(uuid(), r.id, r.version, stage, actor, a, comment, now).run();
    if (a === 'return') { await assignTasks(env, { ...r, version: r.version }, 'editor', `신청서 수정 요청: ${title}`, `${comment} — ${link(r.id)}`, actor); return done('draft'); }
    if (stage === 'review') {
      const ok = new Set((await env.DB.prepare(`SELECT LOWER(email) AS e FROM camp_form_approvals WHERE formId = ?1 AND version = ?2 AND stage = 'review' AND decision = 'approve'`).bind(r.id, r.version).all()).results.map((x) => x.e));
      if (roles.reviewer.every((x) => ok.has(String(x.email).toLowerCase()))) { await assignTasks(env, r, 'approver', `신청서 최종 확인: ${title}`, `검토가 끝났어요. 미리보기로 디자인을 확인하고 「최종 승인」을 누르면 「승인 완료」로 보관돼요(홈페이지에는 올라가지 않아요). ${link(r.id)}`, actor); return done('final'); }
      await audit(env, actor, 'approve', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status: 'review', waiting: true });
    }
    return done('approved', ', approvedAt = ?3');
  }
  if (a === 'duplicate') {
    if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.');
    const c = copyContent(JSON.parse(r.content)); c.card.startDate = ''; const fid = uuid(), t = `${title} (복사)`.slice(0, 120);
    await env.DB.prepare(`INSERT INTO camp_forms (id,kind,campType,title,status,content,version,copiedFrom,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,'draft',?5,1,?6,?7,?8,?8)`).bind(fid, r.kind, r.campType, t, JSON.stringify(c), r.id, actor, now).run();
    await audit(env, actor, 'create', 'camp_form', fid, t.slice(0, 100)); return json({ id: fid }, 201);
  }
  if (a === 'delete') {
    if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.'); if (r.status !== 'draft') return badRequest('작성 중인 신청서만 지울 수 있어요. 게시된 것은 「마감」으로 닫아 주세요.');
    await env.DB.prepare('UPDATE camp_forms SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(r.id, now).run(); await audit(env, actor, 'delete', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true });
  }
  return badRequest('알 수 없는 동작이에요.');
}

export async function onRequestPatch({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const { s, me } = g, id = new URL(request.url).searchParams.get('id'); if (!canEdit(me)) return needPerm('작성 담당자만 고칠 수 있어요.');
  const r = await row(env, id); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
  if (r.status !== 'draft') return badRequest('검토 중이거나 게시된 신청서는 고칠 수 없어요. 먼저 「거두기」로 작성 중으로 돌려 주세요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const content = 'content' in b ? cleanContent(b.content) : cleanContent(JSON.parse(r.content));
  const title = 'title' in b ? String(b.title || '').trim().slice(0, 120) || r.title : r.title, campType = CAMP_TYPES.includes(b.campType) ? b.campType : r.campType;
  await env.DB.prepare('UPDATE camp_forms SET title = ?2, campType = ?3, content = ?4, updatedAt = ?5 WHERE id = ?1').bind(r.id, title, campType, JSON.stringify(content), nowIso()).run();
  await audit(env, s.email, 'update', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true });
}

export async function onRequestPut({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  if (!g.me.admin) return needPerm('역할은 관리자만 정할 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const members = new Set((await env.DB.prepare('SELECT LOWER(email) AS e FROM camp_members WHERE active = 1').all().catch(() => ({ results: [] }))).results.map((x) => x.e)), now = nowIso(), stmts = [];
  for (const role of ROLES) for (const e of [...new Set((Array.isArray(b[role]) ? b[role] : []).map((x) => String(x || '').trim().toLowerCase()))].slice(0, 10)) { if (!members.has(e)) return badRequest('팀 명단에 없는 계정이 있어요: ' + e.replace(/^(.).*(@.*)$/, '$1***$2')); stmts.push([role, e]); }
  await env.DB.prepare('DELETE FROM camp_form_roles').run();
  for (const [role, e] of stmts) await env.DB.prepare('INSERT INTO camp_form_roles (email, role, createdAt) VALUES (?1, ?2, ?3)').bind(e, role, now).run();
  await audit(env, g.s.email, 'update', 'camp_form_roles', '', `${stmts.length}`); return json({ ok: true, roles: await roleMap(env) });
}
