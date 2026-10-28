import { campSession, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { nowIso, audit } from '../../lib/campteamDb.js';

/**
 * 팀 사무실 캐릭터 그림(PNG).
 *  - GET  (목록, ?k 없음)  → { sprites: { 이름: 올린 시각 } } — 어떤 그림이 올라와 있는지(화면이 그림 사용 여부를 정하는 데 쓴다)
 *  - GET  ?k=이름           → PNG 그림 한 장 (캠프팀 로그인한 누구나, 브라우저에 하루~일주일 보관)
 *  - PUT  ?k=이름 (본문=PNG) → 그림 올리기(관리자만). 이름은 소문자·숫자·하이픈(예: sample-seated), PNG 이고 200KB 이하
 *  - DELETE ?k=이름         → 지우기(관리자만)
 * 실제 얼굴을 닮은 그림이라 공개 저장소에 두지 않고 캠프팀 DB 에만 보관한다.
 */
const NAME = /^[a-z0-9][a-z0-9-]{1,40}$/, MAX = 200 * 1024, SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const who = async (env, request) => { if (!env.DB) return { res: noDb() }; const s = await campSession(request, env); return s ? { s } : { res: needLogin() }; };
const safe = async (fn, d) => { try { return await fn(); } catch { return d; } };
function toB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
function fromB64(b64) { const s = atob(b64), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }

export async function onRequestGet({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  const k = new URL(request.url).searchParams.get('k');
  if (!k) {
    const rows = await safe(async () => (await env.DB.prepare('SELECT name, updatedAt FROM office_sprites ORDER BY name').all()).results, []);
    return json({ sprites: Object.fromEntries(rows.map((r) => [r.name, r.updatedAt])), canEdit: !!s.perms.manageMembers });
  }
  if (!NAME.test(k)) return badRequest('그림 이름이 올바르지 않습니다.');
  const row = await safe(() => env.DB.prepare('SELECT data FROM office_sprites WHERE name = ?1').bind(k).first(), null);
  if (!row) return new Response('not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(fromB64(row.data), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=604800' } });
}

export async function onRequestPut({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  if (!s.perms.manageMembers) return needPerm('캐릭터 그림은 관리자만 올릴 수 있습니다.');
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!NAME.test(k)) return badRequest('그림 이름이 올바르지 않습니다. (소문자·숫자·하이픈, 예: sample-seated)');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX) return badRequest('그림 파일은 200KB 이하여야 합니다.');
  if (!SIG.every((b, i) => bytes[i] === b)) return badRequest('PNG 파일이 아닙니다.');
  await env.DB.prepare('INSERT INTO office_sprites (name, data, bytes, updatedAt, updatedBy) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(name) DO UPDATE SET data = ?2, bytes = ?3, updatedAt = ?4, updatedBy = ?5').bind(k, toB64(bytes), bytes.length, nowIso(), s.email).run();
  await audit(env, s.email, 'save', 'office_sprite', k, `${bytes.length} bytes`);
  return json({ ok: true, name: k, bytes: bytes.length });
}

export async function onRequestDelete({ env, request }) {
  const { s, res } = await who(env, request); if (res) return res;
  if (!s.perms.manageMembers) return needPerm('캐릭터 그림은 관리자만 지울 수 있습니다.');
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!NAME.test(k)) return badRequest('그림 이름이 올바르지 않습니다.');
  await env.DB.prepare('DELETE FROM office_sprites WHERE name = ?1').bind(k).run();
  await audit(env, s.email, 'delete', 'office_sprite', k, '');
  return json({ ok: true });
}
