import { ownerPieces, aliasList, resolveOwnerEmail } from './campteamOwners.js';
import { nowIso } from './campteamDb.js';

/**
 * 담당자 이름 관리: 관리자가 정한 기본 이름(approved) · 팀원이 새로 적어서 확인을 기다리는 이름(pending) · 기존 이름과 합친 이름(merged).
 * 업무 담당자 칸은 "A / B" 처럼 여러 명을 " / " 로 이어서 저장한다(공동 담당).
 */
export const keyOf = (name) => String(name ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

/** 담당자 칸의 글 → " / " 로 나눈 조각들(괄호 설명은 그대로 둔다) */
export const splitOwner = (v) => String(v ?? '').split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);

async function table(env, sql, ...args) { try { return (await env.DB.prepare(sql).bind(...args).all()).results; } catch { return []; } }

/** 이미 있는 이름의 key 집합: 명단 이름·별칭 + 등록된 이름(승인·합침·확인 대기) + 기존 업무에 쓰인 이름 */
export async function knownKeys(env) {
  const known = new Set();
  for (const r of await table(env, 'SELECT name FROM camp_members')) if (keyOf(r.name)) known.add(keyOf(r.name));
  for (const r of await table(env, 'SELECT aliases FROM member_aliases')) for (const a of aliasList(r.aliases)) known.add(a);
  for (const r of await table(env, 'SELECT key FROM owner_names')) known.add(r.key);
  for (const r of await table(env, `SELECT DISTINCT ownerName FROM tasks WHERE deletedAt IS NULL AND TRIM(ownerName) <> ''`)) for (const p of ownerPieces(r.ownerName)) known.add(keyOf(p));
  return known;
}

/**
 * 담당자 칸을 저장하기 전에 정리한다.
 *  - 합치기로 정해 둔 이름은 대상 이름으로 바꾼다.
 *  - 아직 없는 이름이면 관리자는 바로 기본 이름(approved)으로, 일반 팀원은 확인 대기(pending)로 등록한다. 업무 저장은 막지 않는다.
 * 반환: 저장할 담당자 글
 */
export async function normalizeOwners(env, ownerName, { email = '', admin = false } = {}) {
  const pieces = splitOwner(ownerName); if (!pieces.length) return '';
  const reg = new Map((await table(env, 'SELECT key, name, status, mergedInto FROM owner_names')).map((r) => [r.key, r]));
  const out = [], newOnes = [];
  for (const piece of pieces) {
    const k = keyOf(piece), r = reg.get(k);
    if (r && r.status === 'merged' && r.mergedInto) { out.push(r.mergedInto); continue; }
    out.push(piece); if (k && !r && !newOnes.some((x) => x.k === k)) newOnes.push({ k, name: piece.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim() });
  }
  if (newOnes.length) {
    const known = await knownKeys(env), now = nowIso();
    for (const n of newOnes) {
      if (known.has(n.k)) continue;
      try { await env.DB.prepare(`INSERT OR IGNORE INTO owner_names (key,name,status,createdBy,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?5)`).bind(n.k, n.name, admin ? 'approved' : 'pending', String(email).toLowerCase(), now).run(); } catch { /* 표가 아직 없으면 건너뜀 */ }
    }
  }
  return [...new Set(out)].join(' / ');
}

/** 목록에서 고를 이름들: 팀 명단 이름 + 관리자가 정한 기본 이름 + 업무에 이미 쓰인 이름. 확인 대기·합친 이름은 뺀다 */
export async function ownerOptions(env) {
  const reg = await table(env, 'SELECT key, name, status FROM owner_names'), hidden = new Set(reg.filter((r) => r.status !== 'approved').map((r) => r.key));
  const map = new Map(), add = (name, kind) => { const k = keyOf(name); if (k && !hidden.has(k) && !map.has(k)) map.set(k, { name: String(name).trim(), kind }); };
  for (const r of await table(env, 'SELECT name FROM camp_members WHERE active = 1')) add(r.name, 'member');
  for (const r of reg) if (r.status === 'approved') add(r.name, 'default');
  for (const r of await table(env, `SELECT DISTINCT ownerName FROM tasks WHERE deletedAt IS NULL AND TRIM(ownerName) <> ''`)) for (const p of ownerPieces(r.ownerName)) add(p, 'used');
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** 업무들의 담당자 칸에서 어떤 이름을 다른 이름으로 바꾼다 (합치기). 바뀐 업무 수를 돌려준다 */
export async function renameOwnerInTasks(env, fromKey, toName) {
  const rows = await table(env, `SELECT id, ownerName FROM tasks WHERE deletedAt IS NULL AND ownerName LIKE '%' || ?1 || '%' COLLATE NOCASE`, fromKey.split(' ')[0]);
  let n = 0;
  for (const r of rows) {
    const parts = splitOwner(r.ownerName);
    if (!parts.some((p) => keyOf(p) === fromKey)) continue;
    const next = [...new Set(parts.map((p) => (keyOf(p) === fromKey ? toName : p)))].join(' / ');
    await env.DB.prepare('UPDATE tasks SET ownerName = ?2, ownerEmail = ?3, updatedAt = ?4 WHERE id = ?1').bind(r.id, next, await resolveOwnerEmail(env, next), nowIso()).run(); n++;
  }
  return n;
}
