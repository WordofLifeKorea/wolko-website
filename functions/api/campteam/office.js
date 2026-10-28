import { campSession, json, needLogin, needPerm, badRequest, noDb, FIXED_ADMIN_EMAILS } from '../../lib/campteamAuth.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { nowIso, audit } from '../../lib/campteamDb.js';
import { SEAT_WINDOW_MS, sanitizeAvatar, defaultAvatar, parseAvatar, publicId } from '../../lib/campteamOffice.js';

/**
 * 캠프팀 「팀 사무실」.
 *  - POST  (캠프팀 로그인한 누구나)  → 내가 지금 이 화면을 열어 두고 있다고 알림(1분마다). 본문 { hidden: true|false } 를 주면 「내 자리 숨기기」를 바꾼다.
 *  - GET   (캠프팀 로그인한 누구나)  → { members: [{ id, name, avatar, seated, you }], guests: [{ id, name }], me: { hidden } }
 *      members = 캠프팀 명단 전원(앉아 있으면 seated), guests = 명단 밖에서 지금 들어와 있는 사람(자리는 없이 구경). 이메일·연락처는 내려가지 않는다.
 *  - PUT   { email?, avatar }          → 캐릭터 모양 저장. 자기 것은 누구나, 다른 사람 것은 관리자만.
 * 접속 기록은 이 표(캠프팀 DB)에만 쓴다 — 포털의 저장소에는 아무것도 쓰지 않는다.
 */
const who = async (env, request) => { if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); return s ? { s } : { res: needLogin() }; };
const safe = async (fn, d) => { try { return await fn(); } catch { return d; } };   // 0022 가 아직 적용되지 않은 DB 에서도 화면이 깨지지 않게
const first = (name, email = '') => { const n = String(name || '').trim() || String(email).split('@')[0]; return /[가-힣]/.test(n) ? n : n.split(/\s+/)[0] || n; };

export async function onRequestPost({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  let b = {}; try { b = await request.json(); } catch { b = {}; }
  const now = nowIso(), email = s.email.toLowerCase();
  const prev = await safe(() => env.DB.prepare('SELECT hidden FROM office_presence WHERE email = ?1').bind(email).first(), null);
  const hidden = typeof b.hidden === 'boolean' ? (b.hidden ? 1 : 0) : (prev ? prev.hidden : 0);
  await safe(() => env.DB.prepare('INSERT INTO office_presence (email, lastSeen, hidden) VALUES (?1,?2,?3) ON CONFLICT(email) DO UPDATE SET lastSeen = ?2, hidden = ?3').bind(email, now, hidden).run(), null);
  return json({ ok: true, hidden: !!hidden });
}

export async function onRequestGet({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  const me = s.email.toLowerCase(), cutoff = new Date(Date.now() - SEAT_WINDOW_MS).toISOString();
  const [roster, presence, avatars] = await Promise.all([
    safe(async () => (await env.DB.prepare('SELECT email, name FROM camp_members WHERE active = 1 ORDER BY name').all()).results, []),
    safe(async () => (await env.DB.prepare('SELECT email, lastSeen, hidden FROM office_presence WHERE lastSeen >= ?1').bind(cutoff).all()).results, []),
    safe(async () => (await env.DB.prepare('SELECT email, json FROM office_avatars').all()).results, []),
  ]);
  const here = new Map(presence.map((p) => [p.email.toLowerCase(), p])), av = new Map(avatars.map((a) => [a.email.toLowerCase(), a.json]));
  const seen = new Set(roster.map((r) => r.email.toLowerCase()));
  // 코드에 고정된 관리자는 명단(DB)에 없어도, 지금 접속해 있거나 캐릭터를 정해 둔 경우에만 자리를 보인다(항상 빈 책상이 따로 생기지 않게)
  const extra = await Promise.all(FIXED_ADMIN_EMAILS.filter((e) => !seen.has(e) && (here.has(e) || av.has(e))).map(async (e) => ({ email: e, name: (await safe(() => getAccount(env, e), null))?.name || e.split('@')[0] })));
  const list = roster.concat(extra);
  const members = list.filter((r) => { const p = here.get(r.email.toLowerCase()); return !(p && p.hidden) || r.email.toLowerCase() === me; }).map((r) => {
    const e = r.email.toLowerCase(), p = here.get(e);
    return { id: publicId(e), name: first(r.name, r.email), avatar: av.has(e) ? parseAvatar(av.get(e), e) : defaultAvatar(e), seated: !!p && !p.hidden, you: e === me };
  });
  const rosterSet = new Set(list.map((r) => r.email.toLowerCase()));
  const guestRows = presence.filter((p) => !p.hidden && !rosterSet.has(p.email.toLowerCase())).slice(0, 12);
  const guests = await Promise.all(guestRows.map(async (p) => ({ id: publicId(p.email), name: first((await safe(() => getAccount(env, p.email), null))?.name || p.email.split('@')[0]) })));
  return json({ members, guests, me: { hidden: !!(here.get(me) && here.get(me).hidden) } });
}

export async function onRequestPut({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const target = String(b.email || s.email).trim().toLowerCase();
  if (target !== s.email.toLowerCase() && !s.perms.manageMembers) return needPerm('다른 사람의 캐릭터는 관리자만 바꿀 수 있습니다.');
  const a = sanitizeAvatar(b.avatar);
  await env.DB.prepare('INSERT INTO office_avatars (email, json, updatedAt, updatedBy) VALUES (?1,?2,?3,?4) ON CONFLICT(email) DO UPDATE SET json = ?2, updatedAt = ?3, updatedBy = ?4').bind(target, JSON.stringify(a), nowIso(), s.email).run();
  if (target !== s.email.toLowerCase()) await audit(env, s.email, 'save', 'office_avatar', target, '');
  return json({ ok: true, avatar: a });
}
