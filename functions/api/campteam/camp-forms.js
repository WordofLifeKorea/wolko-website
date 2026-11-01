import { campSession, json, needLogin, noDb, badRequest, needPerm, canView } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit } from '../../lib/campteamDb.js';
import { titleCols } from '../../lib/campteamTranslate.js';
import { anthropicRoute } from '../../lib/anthropicRoute.js';
import { DEFAULT_ASSIST_MODEL, chatClaude } from '../../lib/campteamAssist.js';
import { KINDS, CAMP_TYPES, ROLES, SNIPPETS, FIELDS, GROUPS, cleanContent, cleanCard, cardFromCms, cardToCms, checkReady, unchangedFields, suggestCampId, starterContent, copyContent } from '../../lib/campForms.js';
import { homepageFeed, inboxAdd, inboxDone, inboxRead, announce, syncLive } from '../../lib/campFormFlow.js';

/**
 * 다음 캠프의 카드(홈페이지 CMS 와 같은 항목) · 신청서 질문 · 스태프/크루 지원서를 포털 안에서 만들고, 환규 선교사님께 인계한다. 홈페이지·CMS 에는 아무것도 쓰지 않는다.
 *  흐름: 작성(editor, Ella) → 「검토 요청」 → 검토자(reviewer, Jason) 전원 승인 → 최종 확인(approver, Aiden; 코드 요청을 마무리하고 승인) → 인계(handed; 월코 포털 종 알림이 deployer 에게만 간다)
 *        → 배포 담당(deployer, 환규)이 「확인했어요」 = confirmed (작성·검토·최종 확인한 사람들에게 완료 알림). 홈페이지에 캠프 파일이 보이면 「홈페이지 반영 완료」(liveAt)와 캠프별 공간 자동 생성.
 *  GET ?meta=1 → 항목 목록·자주 쓰는 칸·내 역할 | ?feed=1 → 홈페이지에 있는 지난 캠프들 | (없음) → 목록 | ?id= → 상세(내용·승인 기록·바뀌지 않은 항목)
 *  POST { kind, campType, baseCamp?, copyFrom? } → 새 신청서(지난 캠프 내용을 불러와 시작) | POST ?id { action: submit | withdraw | approve | return | confirm | dreturn | aifill | duplicate | delete, comment?, ack? }
 *  PATCH ?id { title?, campType?, campId?, content?, codeRequests?, notify? }  작성 중은 작성자, 최종 확인 단계는 최종 확인자가 고친다
 *  PUT { editor, reviewer, approver, deployer: [이메일] } → 역할 정하기(관리자만)
 */
const row = (env, id) => env.DB.prepare('SELECT * FROM camp_forms WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
async function roleMap(env) {
  const out = { editor: [], reviewer: [], approver: [], deployer: [] }, names = new Map();
  try { for (const r of (await env.DB.prepare('SELECT email, name FROM camp_members').all()).results) names.set(String(r.email).toLowerCase(), r.name || ''); } catch { /* 표 없음 */ }
  try { for (const r of (await env.DB.prepare('SELECT email, role FROM camp_form_roles ORDER BY createdAt, email').all()).results) if (out[r.role]) out[r.role].push({ email: r.email, name: names.get(String(r.email).toLowerCase()) || String(r.email).split('@')[0] }); } catch { /* 표 없음 */ }
  return out;
}
const emailsOf = (roles, ...keys) => keys.flatMap((k) => roles[k].map((x) => x.email));
const mineOf = (roles, s) => { const e = String(s.email).toLowerCase(), has = (k) => roles[k].some((x) => String(x.email).toLowerCase() === e); return { admin: !!s.perms.manageMembers, editor: has('editor'), reviewer: has('reviewer'), approver: has('approver'), deployer: has('deployer') }; };
async function gate(env, request) {
  if (!env.DB) return { res: noDb() };
  const s = await campSession(request, env); if (!s) return { res: needLogin() };
  if (!s.campRole || !canView(s.perms, 'camps')) return { res: needPerm('캠프팀 팀원만 볼 수 있어요.') };
  const roles = await roleMap(env); return { s, roles, me: mineOf(roles, s) };
}
const canEdit = (me) => me.admin || me.editor;
const parse = (r) => { try { return JSON.parse(r); } catch { return null; } };
const summary = (r) => ({ id: r.id, kind: r.kind, campType: r.campType, title: r.title, status: r.status, version: r.version, campId: r.campId, baseCampId: r.baseCampId, updatedAt: r.updatedAt, createdBy: r.createdBy, handedAt: r.handedAt, confirmedAt: r.confirmedAt, liveAt: r.liveAt, copiedFrom: r.copiedFrom });
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
const PR_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d{1,7}$/;
/** 코드 요청 목록 합치기: 작성 중에는 작성자가 글을 쓰고, 최종 확인 단계에서는 최종 확인자가 상태·PR 링크·설명만 채운다 */
export function mergeRequests(old, incoming, stage, by) {
  const oldList = Array.isArray(old) ? old : [], inc = Array.isArray(incoming) ? incoming : [], byId = new Map(oldList.map((x) => [x.id, x]));
  if (stage === 'draft') return inc.slice(0, 20).map((x) => { const prev = byId.get(x.id); const text = String(x.text || '').trim().slice(0, 1000); if (!text) return null; return prev ? { ...prev, text: prev.state === 'requested' ? text : prev.text } : { id: 'r' + uuid().slice(0, 8), text, by, at: nowIso(), state: 'requested', prUrl: '', note: '' }; }).filter(Boolean);
  return oldList.map((prev) => {
    const x = inc.find((i) => i.id === prev.id); if (!x) return prev;
    const state = ['requested', 'ready', 'dropped'].includes(x.state) ? x.state : prev.state, prUrl = String(x.prUrl || '').trim(), note = String(x.note || '').trim().slice(0, 1500);
    return { ...prev, state, prUrl: PR_RE.test(prUrl) ? prUrl : '', note };
  });
}
const requestProblems = (list) => list.flatMap((r) => r.state === 'requested' ? [`코드 요청 「${r.text.slice(0, 20)}…」이 아직 처리되지 않았어요(코드와 설명을 채우거나 「하지 않기」로 정리).`] : r.state === 'ready' && (!r.prUrl || !r.note) ? [`코드 요청 「${r.text.slice(0, 20)}…」에 변경 요청(PR) 링크와 설명을 모두 적어 주세요.`] : r.state === 'dropped' && !r.note ? [`하지 않기로 한 코드 요청 「${r.text.slice(0, 20)}…」에 이유를 한 줄 적어 주세요.`] : []);

async function takenIds(env, request, exceptId) {
  const feed = await homepageFeed(env, request), forms = (await env.DB.prepare(`SELECT campId FROM camp_forms WHERE deletedAt IS NULL AND campId <> '' AND id <> ?1`).bind(exceptId || '').all().catch(() => ({ results: [] }))).results;
  return { feed, taken: [...feed.map((x) => x.id), ...forms.map((x) => x.campId)] };
}

export async function onRequestGet({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const p = new URL(request.url).searchParams, { s, roles, me } = g;
  if (p.get('meta')) return json({ me, roles, snippets: SNIPPETS, fields: FIELDS, groups: GROUPS, kinds: KINDS, campTypes: CAMP_TYPES, cmsUrl: 'https://wolko.org/admin/#/collections/camp_schedule/new' });
  if (p.get('feed')) return json({ items: (await homepageFeed(env, request)).map((x) => ({ id: x.id, titleKo: x.titleKo, campType: x.campType, startDate: x.startDate, status: x.status })) });
  await syncLive(env, request).catch(() => 0);
  if (p.get('id')) {
    const r = await row(env, p.get('id')); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
    await inboxRead(env, s.email, r.id);
    const content = cleanContent(parse(r.content)), { feed } = await takenIds(env, request, r.id);
    const baseCms = feed.find((x) => x.id === r.baseCampId)?.raw;
    return json({ form: { ...summary(r), content, ack: !!r.ack, codeRequests: parse(r.codeRequests) || [] }, approvals: await approvalsOf(env, r.id, r.version), roles, me, unchanged: unchangedFields(content.card, content.base), cms: r.status === 'handed' || r.status === 'confirmed' ? cardToCms(content.card) : null, baseCmsKnown: !!baseCms });
  }
  const rows = (await env.DB.prepare('SELECT * FROM camp_forms WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 200').all().catch(() => ({ results: [] }))).results;
  const items = []; for (const r of rows) items.push({ ...summary(r), card: cleanContent(parse(r.content)).card, approvals: r.status === 'review' || r.status === 'final' ? await approvalsOf(env, r.id, r.version) : [] });
  return json({ items, roles, me });
}

function fillPrompt(card, base) {
  const pairs = FIELDS.filter((f) => f.pair && f.key.endsWith('Ko')), todo = [];
  for (const f of pairs) { const en = FIELDS.find((x) => x.key === f.pair); if (card[f.key] && !card[en.key]) todo.push({ key: en.key, from: card[f.key], lang: 'English' }); else if (!card[f.key] && card[en.key]) todo.push({ key: f.key, from: card[en.key], lang: 'Korean' }); }
  const examples = base ? pairs.filter((f) => base[f.key] && base[f.pair]).map((f) => ({ ko: base[f.key], en: base[f.pair] })).slice(0, 8) : [];
  return { todo, examples, system: ['You complete the missing language side of bilingual camp-card fields for the WOLKO camp ministry website. Keep the same style, punctuation and line breaks as the examples. Facts (dates, numbers, prices, names) must be copied exactly, never invented. Output ONE JSON object mapping each requested key to its text, nothing else.', 'Examples of earlier camps (Korean / English):\n' + examples.map((e) => `KO: ${e.ko}\nEN: ${e.en}`).join('\n---\n')].join('\n') };
}

export async function onRequestPost(context) {
  const { env, request } = context, g = await gate(env, request); if (g.res) return g.res;
  const { s, roles, me } = g, id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const actor = s.email, now = nowIso();
  if (!id) {   // 새 신청서
    if (!canEdit(me)) return needPerm('신청서는 작성 담당자(또는 관리자)만 만들 수 있어요.');
    const kind = KINDS.includes(b.kind) ? b.kind : 'camper', campType = CAMP_TYPES.includes(b.campType) ? b.campType : 'other';
    const { feed, taken } = await takenIds(env, request, '');
    let src = null; if (b.copyFrom) src = await row(env, b.copyFrom);
    if (!src) src = (await env.DB.prepare(`SELECT * FROM camp_forms WHERE deletedAt IS NULL AND kind = ?1 AND campType = ?2 ORDER BY (status IN ('handed','confirmed')) DESC, updatedAt DESC LIMIT 1`).bind(kind, campType).first()) || null;
    const content = src ? copyContent(parse(src.content)) : starterContent(kind);
    // 지난 캠프(홈페이지 CMS 에 넣었던 내용)를 그대로 불러온다: 고른 캠프, 없으면 같은 유형의 가장 최근 캠프
    const cands = feed.filter((x) => x.raw && (!campType || campType === 'other' || x.campType === campType)).sort((a, c) => String(c.startDate || '').localeCompare(String(a.startDate || '')));
    const baseItem = (b.baseCamp && feed.find((x) => x.id === b.baseCamp && x.raw)) || cands[0] || null;
    if (baseItem) { const base = cardFromCms(baseItem.raw); content.base = base; content.card = { ...base, status: 'upcoming' }; if (campType !== 'other') content.card.campType = CAMP_TYPES.includes(campType) ? campType : base.campType; }
    else content.card = cleanCard({ ...content.card, campType: CAMP_TYPES.includes(campType) ? campType : 'english' });
    const campId = kind === 'camper' ? suggestCampId(content.card, baseItem && baseItem.id, taken) : (baseItem ? baseItem.id : '');
    const fid = uuid(), title = String(b.title || content.card.titleKo || '새 신청서').slice(0, 120);
    await env.DB.prepare(`INSERT INTO camp_forms (id,kind,campType,title,status,content,version,campId,baseCampId,copiedFrom,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,'draft',?5,1,?6,?7,?8,?9,?10,?10)`).bind(fid, src ? src.kind : kind, campType, title, JSON.stringify(content), campId, baseItem ? baseItem.id : '', src ? src.id : null, actor, now).run();
    await audit(env, actor, 'create', 'camp_form', fid, title.slice(0, 120)); return json({ id: fid, copiedFrom: src ? { id: src.id, title: src.title } : null, baseCamp: baseItem ? { id: baseItem.id, title: baseItem.titleKo } : null }, 201);
  }
  const r = await row(env, id); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
  const a = String(b.action || ''), comment = String(b.comment || '').trim().slice(0, 500), title = r.title, reqs = parse(r.codeRequests) || [];
  const done = async (status, extra = '') => { await env.DB.prepare('UPDATE camp_forms SET status = ?2, updatedAt = ?3' + extra + ' WHERE id = ?1').bind(r.id, status, now).run(); await audit(env, actor, a, 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status }); };
  if (a === 'aifill') {
    if (!(canEdit(me) || me.approver)) return needPerm('고칠 수 있는 사람만 쓸 수 있어요.'); if (!['draft', 'final'].includes(r.status)) return badRequest('작성 중이거나 최종 확인 단계에서만 쓸 수 있어요.');
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 도우미가 아직 켜지지 않았어요. 칸을 직접 채워 주세요.', code: 'ai_off' }, 503);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if (((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ?1 AND action = 'ai_form' AND at >= ?2`).bind(actor, since).first().catch(() => null))?.n || 0) >= 30) return json({ error: '오늘 AI 채우기 한도(30번)를 다 썼어요.', code: 'limit' }, 429);
    const content = cleanContent(parse(r.content)), card = cleanCard(b.card || content.card), fp = fillPrompt(card, content.base);
    if (!fp.todo.length) return json({ fills: {}, note: '채울 빈 칸이 없어요.' });
    try {
      const out = await chatClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.CAMPTEAM_ASSIST_MODEL || env.CAMPTEAM_AI_MODEL || DEFAULT_ASSIST_MODEL, system: fp.system, messages: [{ role: 'user', content: JSON.stringify(fp.todo) }], maxTokens: 900, ...anthropicRoute(env, env.CAMPTEAM_AI_URL || undefined) });
      await audit(env, actor, 'ai_form', 'camp_form', r.id, '');
      const i0 = out.indexOf('{'), i1 = out.lastIndexOf('}'); let o = {}; try { o = JSON.parse(out.slice(i0, i1 + 1)); } catch { o = {}; }
      const fills = {}; for (const t of fp.todo) { const f = FIELDS.find((x) => x.key === t.key), v = cleanCard({ [t.key]: o[t.key] })[t.key]; if (v) fills[t.key] = v; }
      return json({ fills });
    } catch { return json({ error: 'AI 서비스에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.', code: 'ai_failed' }, 502); }
  }
  if (a === 'submit') {
    if (!canEdit(me)) return needPerm('작성 담당자만 검토를 요청할 수 있어요.'); if (r.status !== 'draft') return badRequest('작성 중인 신청서만 검토를 요청할 수 있어요.');
    const content = cleanContent(parse(r.content)), { feed, taken } = await takenIds(env, request, r.id);
    const chk = checkReady(content, r.kind, { campId: r.campId, taken: taken, ack: !!b.ack });
    if (chk.problems.length) return json({ error: '검토를 요청하기 전에 고칠 곳이 있어요: ' + chk.problems.join(' / '), problems: chk.problems }, 400);
    if (chk.needAck) return json({ error: '지난 캠프와 같은 값이 남아 있는 항목이 있어요. 확인했다고 체크해야 보낼 수 있어요.', needAck: true, unchanged: chk.unchanged }, 400);
    if (!roles.reviewer.length || !roles.approver.length || !roles.deployer.length) return badRequest('검토자, 최종 확인자, 배포 담당(환규)을 먼저 정해 주세요(「역할 정하기」, 관리자).');
    const v = r.version + 1; await env.DB.prepare(`UPDATE camp_forms SET status = 'review', version = ?2, ack = ?3, updatedAt = ?4 WHERE id = ?1`).bind(r.id, v, b.ack ? 1 : 0, now).run();
    await assignTasks(env, { ...r, version: v }, 'reviewer', `신청서 검토: ${title}`, `새 캠프 신청서가 검토를 기다려요. 확인 후 「승인」 또는 「되돌리기」를 눌러 주세요. ${link(r.id)}`, actor);
    await audit(env, actor, 'submit', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status: 'review' });
  }
  if (a === 'withdraw') { if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.'); if (!['review', 'final'].includes(r.status)) return badRequest('검토 중일 때만 거둘 수 있어요.'); return done('draft'); }
  if (a === 'approve' || a === 'return') {
    const stage = r.status === 'review' ? 'review' : r.status === 'final' ? 'approve' : '';
    if (!stage) return badRequest('지금은 승인할 단계가 아니에요.');
    const okRole = stage === 'review' ? me.reviewer : me.approver; if (!okRole) return needPerm(stage === 'review' ? '검토자로 정해진 사람만 승인할 수 있어요.' : '최종 확인자로 정해진 사람만 승인할 수 있어요.');
    if (a === 'return' && !comment) return badRequest('되돌리는 이유를 한 줄 적어 주세요.');
    if (a === 'approve' && stage === 'approve') {
      const rp = requestProblems(reqs); if (rp.length) return json({ error: rp.join(' / '), problems: rp }, 400);
      const content = cleanContent(parse(r.content)), { taken } = await takenIds(env, request, r.id), chk = checkReady(content, r.kind, { campId: r.campId, taken, ack: true });
      if (chk.problems.length) return json({ error: '인계하기 전에 고칠 곳이 있어요: ' + chk.problems.join(' / '), problems: chk.problems }, 400);
      if (!roles.deployer.length) return badRequest('배포 담당(환규) 계정을 먼저 정해 주세요(「역할 정하기」, 관리자).');
    }
    await env.DB.prepare('DELETE FROM camp_form_approvals WHERE formId = ?1 AND version = ?2 AND stage = ?3 AND LOWER(email) = LOWER(?4)').bind(r.id, r.version, stage, actor).run();
    await env.DB.prepare('INSERT INTO camp_form_approvals (id,formId,version,stage,email,decision,comment,at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)').bind(uuid(), r.id, r.version, stage, actor, a, comment, now).run();
    if (a === 'return') { await assignTasks(env, { ...r, version: r.version }, 'editor', `신청서 수정 요청: ${title}`, `${comment} — ${link(r.id)}`, actor); return done('draft'); }
    if (stage === 'review') {
      const ok = new Set((await env.DB.prepare(`SELECT LOWER(email) AS e FROM camp_form_approvals WHERE formId = ?1 AND version = ?2 AND stage = 'review' AND decision = 'approve'`).bind(r.id, r.version).all()).results.map((x) => x.e));
      if (roles.reviewer.every((x) => ok.has(String(x.email).toLowerCase()))) { await assignTasks(env, r, 'approver', `신청서 최종 확인: ${title}`, `검토가 끝났어요. 디자인을 확인하고, 필요하면 보완한 뒤 「승인하고 환규님께 인계」를 눌러 주세요. ${link(r.id)}`, actor); return done('final'); }
      await audit(env, actor, 'approve', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status: 'review', waiting: true });
    }
    await inboxAdd(env, emailsOf(roles, 'deployer'), 'camp_handoff', `캠프팀에서 온 요청 (새 캠프 카드): ${title}`, link(r.id), r.id);
    return done('handed', ', handedAt = ?3');
  }
  if (a === 'confirm') {
    if (!me.deployer) return needPerm('배포 담당(환규 선교사님)만 확인할 수 있어요.'); if (r.status !== 'handed') return badRequest('인계된 신청서만 확인할 수 있어요.');
    await env.DB.prepare(`UPDATE camp_forms SET status = 'confirmed', confirmedAt = ?2, confirmedBy = ?3, updatedAt = ?2 WHERE id = ?1`).bind(r.id, now, actor).run();
    await inboxDone(env, r.id, 'camp_handoff');
    const team = emailsOf(roles, 'editor', 'reviewer', 'approver'), msg = `캠프팀: 「${title.slice(0, 26)}」 환규 선교사님이 확인했어요`;
    await inboxAdd(env, team, 'camp_done', msg, link(r.id), r.id);
    await announce(env, actor, team, msg.slice(0, 80), '환규 선교사님이 인계된 내용을 확인했어요. 홈페이지 반영은 환규 선교사님이 CMS 에서 입력하고 배포하면 끝나요. 배포가 끝나 홈페이지에 보이면 신청서 목록에 「홈페이지 반영 완료」 표시가 나오고, 캠프별 공간에도 캠프가 자동으로 만들어져요.', link(r.id));
    await audit(env, actor, 'confirm', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true, status: 'confirmed' });
  }
  if (a === 'dreturn') {
    if (!me.deployer) return needPerm('배포 담당(환규 선교사님)만 할 수 있어요.'); if (r.status !== 'handed') return badRequest('인계된 신청서만 되돌릴 수 있어요.'); if (!comment) return badRequest('되돌리는 이유를 한 줄 적어 주세요.');
    await env.DB.prepare('INSERT INTO camp_form_approvals (id,formId,version,stage,email,decision,comment,at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)').bind(uuid(), r.id, r.version, 'approve', actor, 'return', comment, now).run();
    await inboxDone(env, r.id, 'camp_handoff');
    const team = emailsOf(roles, 'editor', 'approver'), msg = `캠프팀: 「${title.slice(0, 26)}」 인계가 되돌아왔어요`;
    await inboxAdd(env, team, 'camp_return', `${msg} — ${comment.slice(0, 60)}`, link(r.id), r.id); await announce(env, actor, team, msg.slice(0, 80), `환규 선교사님 의견: ${comment}`, link(r.id));
    return done('final');
  }
  if (a === 'duplicate') {
    if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.');
    const c = copyContent(parse(r.content)); const { taken } = await takenIds(env, request, ''); const fid = uuid(), t = `${title} (복사)`.slice(0, 120);
    await env.DB.prepare(`INSERT INTO camp_forms (id,kind,campType,title,status,content,version,campId,baseCampId,copiedFrom,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,'draft',?5,1,?6,?7,?8,?9,?10,?10)`).bind(fid, r.kind, r.campType, t, JSON.stringify(c), r.kind === 'camper' ? suggestCampId(c.card, r.campId, taken) : r.campId, r.baseCampId, r.id, actor, now).run();
    await audit(env, actor, 'create', 'camp_form', fid, t.slice(0, 100)); return json({ id: fid }, 201);
  }
  if (a === 'delete') {
    if (!canEdit(me)) return needPerm('작성 담당자만 할 수 있어요.'); if (r.status !== 'draft') return badRequest('작성 중인 신청서만 지울 수 있어요.');
    await env.DB.prepare('UPDATE camp_forms SET deletedAt = ?2, updatedAt = ?2 WHERE id = ?1').bind(r.id, now).run(); await audit(env, actor, 'delete', 'camp_form', r.id, title.slice(0, 100)); return json({ ok: true });
  }
  return badRequest('알 수 없는 동작이에요.');
}

export async function onRequestPatch({ env, request }) {
  const g = await gate(env, request); if (g.res) return g.res;
  const { s, me, roles } = g, id = new URL(request.url).searchParams.get('id');
  const r = await row(env, id); if (!r) return json({ error: '찾을 수 없어요.' }, 404);
  const stage = r.status === 'draft' && canEdit(me) ? 'draft' : r.status === 'final' && me.approver ? 'final' : '';
  if (!stage) return r.status === 'draft' ? needPerm('작성 담당자만 고칠 수 있어요.') : badRequest('작성 중이거나 최종 확인 단계에서 최종 확인자만 고칠 수 있어요. 검토 중이면 「거두기」로 작성 중으로 돌려 주세요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const content = 'content' in b ? cleanContent({ ...b.content, base: parse(r.content)?.base }) : cleanContent(parse(r.content));
  const title = 'title' in b ? String(b.title || '').trim().slice(0, 120) || r.title : r.title, campType = CAMP_TYPES.includes(b.campType) ? b.campType : r.campType;
  const campId = 'campId' in b ? String(b.campId || '').trim().toLowerCase().slice(0, 61) : r.campId;
  const reqs = 'codeRequests' in b ? mergeRequests(parse(r.codeRequests), b.codeRequests, stage, s.email) : parse(r.codeRequests) || [];
  await env.DB.prepare('UPDATE camp_forms SET title = ?2, campType = ?3, campId = ?4, content = ?5, codeRequests = ?6, updatedAt = ?7 WHERE id = ?1').bind(r.id, title, campType, campId, JSON.stringify(content), JSON.stringify(reqs), nowIso()).run();
  if (stage === 'final' && b.notify) { const team = emailsOf(roles, 'editor', 'reviewer'); await announce(env, s.email, team, `캠프팀: 「${title.slice(0, 26)}」 신청서를 고쳤어요`, `${s.email.split('@')[0]}님이 최종 확인 단계에서 내용을 보완했어요. 확인만 해 주세요.`, link(r.id)); }
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
