import { campSession, json, needLogin, noDb, badRequest, canWrite, applyOverrides, isFixedAdmin } from '../../lib/campteamAuth.js';
import { uuid, nowIso, audit, todayKST } from '../../lib/campteamDb.js';
import { titleCols } from '../../lib/campteamTranslate.js';
import { phoneGate, phoneToolsOn, phoneOff } from '../../lib/campteamPhone.js';

/**
 * 폰에서 업무 추가 (iPhone 단축어·Android 자동화 등에서 한 번의 요청으로). **지금은 꺼 둠** — CAMPTEAM_PHONE_TOOLS=on 일 때만, 그리고 관리자에게만 열린다(campteamPhone.js).
 *  GET  (로그인) → { url, hasToken }     내 개인 주소 (없으면 만든다). 이 주소로는 「내 업무 만들기」만 된다.
 *  POST (로그인) { regen:true } → 주소를 새로 만든다(예전 주소는 바로 멈춘다)
 *  POST { token, text, due? }  (로그인 없이, 토큰으로) → 내 업무로 하나 만든다. text 에 「내일」「6/20」 같은 날짜 말이 있으면 기한으로 쓴다. 하루 60개까지.
 */
const tokenOf = () => (uuid() + uuid()).replace(/-/g, '');
export function parseDue(text, today, explicit) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit || '')) return { due: explicit, title: String(text).trim() };
  let t = String(text || '').trim(), due = null; const d0 = new Date(today + 'T00:00:00Z'), pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, plus = (n) => { const d = new Date(d0.getTime()); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
  let m;
  if ((m = /(오늘|내일|모레)(까지)?/.exec(t))) { due = plus({ 오늘: 0, 내일: 1, 모레: 2 }[m[1]]); t = t.replace(m[0], ''); }
  else if ((m = /(\d{1,2})\s*[\/월.]\s*(\d{1,2})\s*일?(까지)?/.exec(t))) { const mo = +m[1], da = +m[2]; if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) { let y = d0.getUTCFullYear(); let c = `${y}-${pad(mo)}-${pad(da)}`; if (c < today) c = `${y + 1}-${pad(mo)}-${pad(da)}`; if (!Number.isNaN(Date.parse(c))) { due = c; t = t.replace(m[0], ''); } } }
  return { due, title: t.replace(/\s+/g, ' ').replace(/^[\s,.:\-–]+|[\s,.:\-–]+$/g, '') || String(text).trim() };
}
async function mine(env, email, regen) {
  let row = await env.DB.prepare('SELECT token FROM quick_tokens WHERE email = ?1').bind(email).first();
  if (!row || regen) { const token = tokenOf(); await env.DB.prepare('INSERT INTO quick_tokens (email, token, createdAt) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO UPDATE SET token = ?2, createdAt = ?3, lastUsedAt = NULL').bind(email, token, nowIso()).run(); row = { token }; }
  return row.token;
}
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  const off = phoneGate(env, s); if (off) return off;
  if (!s.campRole || !canWrite(s.perms, 'tasks')) return json({ error: '업무를 만들 수 있는 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
  return json({ url: `${new URL(request.url).origin}/api/campteam/quick-task`, token: await mine(env, s.email, false) });
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!b.token) {
    const s = await campSession(request, env); if (!s) return needLogin();
    const off = phoneGate(env, s); if (off) return off;
    if (!s.campRole || !canWrite(s.perms, 'tasks')) return json({ error: '업무를 만들 수 있는 팀원만 쓸 수 있어요.', code: 'forbidden' }, 403);
    const t = await mine(env, s.email, !!b.regen); if (b.regen) await audit(env, s.email, 'quick_token_reset', 'task', '', '');
    return json({ url: `${new URL(request.url).origin}/api/campteam/quick-task`, token: t });
  }
  if (!phoneToolsOn(env)) return phoneOff();
  const bad = (m, c = 401) => json({ error: m, code: 'token' }, c);
  if (!/^[a-f0-9]{40,80}$/.test(String(b.token))) return bad('주소가 올바르지 않아요.');
  const row = await env.DB.prepare('SELECT email FROM quick_tokens WHERE token = ?1').bind(b.token).first(); if (!row) return bad('주소가 멈췄거나 없어요. 포털에서 새 주소를 받아 주세요.');
  const email = row.email, member = isFixedAdmin(email) ? { role: 'admin' } : await env.DB.prepare('SELECT role FROM camp_members WHERE email = ?1 AND active = 1').bind(email).first();
  if (!member) return bad('캠프팀 명단에 없는 계정이에요.', 403);
  let overrides = null; if (member.role !== 'admin') { const r = await env.DB.prepare('SELECT area, level FROM member_perms WHERE email = ?1').bind(email).all().catch(() => null); if (r) overrides = Object.fromEntries(r.results.map((x) => [x.area, x.level])); }
  if (!canWrite(applyOverrides(member.role, overrides), 'tasks')) return bad('업무를 만들 권한이 없어요.', 403);
  const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!text) return badRequest('업무 내용을 보내 주세요.');
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  if ((await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = ?1 AND action = 'quick_task' AND at >= ?2`).bind(email, since).first().catch(() => null))?.n >= 60) return json({ error: '오늘은 더 만들 수 없어요(하루 60개).', code: 'limit' }, 429);
  const { due, title } = parseDue(text, todayKST(), b.due); const tc = titleCols(title.slice(0, 200)), id = uuid(), now = nowIso();
  const own = await env.DB.prepare('SELECT name FROM camp_members WHERE email = ?1').bind(email).first().catch(() => null);
  await env.DB.prepare(`INSERT INTO tasks (id,campId,title,ownerName,ownerEmail,dueDate,status,priority,notes,sourceKey,createdAt,updatedAt,createdBy,titleKo,titleEn) VALUES (?1,NULL,?2,?3,?4,?5,'Not Started','Medium','폰에서 추가',?6,?7,?7,?4,?8,?9)`).bind(id, title.slice(0, 200), own?.name || '', email, due, 'quick:' + id, now, tc.titleKo, tc.titleEn).run();
  await env.DB.prepare('UPDATE quick_tokens SET lastUsedAt = ?2 WHERE email = ?1').bind(email, now).run();
  await audit(env, email, 'quick_task', 'task', id, title.slice(0, 120));
  return json({ ok: true, id, title: title.slice(0, 200), due, message: due ? `업무를 추가했어요: ${title} (기한 ${due})` : `업무를 추가했어요: ${title}` }, 201);
}
