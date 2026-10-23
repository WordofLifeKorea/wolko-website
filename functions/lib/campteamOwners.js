/**
 * 업무 담당자 인식: 담당자 "이메일"이 있으면 그걸로, 이름만 적힌 업무는 팀 명단의 이름·별칭과 맞춰 본다.
 * 별칭은 설정 → 팀 명단 → 수정에서 사람마다 등록한다 (예: Mina, 미나). "Joon / Mina", "Mina (communication)" 처럼 여러 명·괄호 설명이 섞인 이름도 풀어서 비교한다.
 */
const clean = (s) => String(s ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
/** 담당자 칸의 글 → 사람 이름 조각들 (소문자). "All Together" 같은 단체 이름도 조각으로는 남는다 */
export function ownerTokens(ownerName) {
  return String(ownerName ?? '').split(/\/|,|;|&|\+|·|\band\b|\s및\s/i).map(clean).filter(Boolean);
}
export const aliasList = (aliases) => String(aliases ?? '').split(/[,\n;/]/).map(clean).filter(Boolean);

/** 한 사람(이메일)을 가리키는 이름들의 집합: 명단 이름 + 별칭 */
export async function loadOwnerKeys(env, email) {
  const me = String(email || '').toLowerCase(), keys = new Set();
  try {
    const m = await env.DB.prepare('SELECT name FROM camp_members WHERE email = ?1').bind(me).first();
    if (m && clean(m.name)) keys.add(clean(m.name));
  } catch { /* 명단 표가 없으면 이메일로만 인식 */ }
  try {
    const a = await env.DB.prepare('SELECT aliases FROM member_aliases WHERE email = ?1').bind(me).first();
    for (const x of aliasList(a && a.aliases)) keys.add(x);
  } catch { /* 별칭 표가 아직 없는 DB */ }
  return keys;
}
export function isMine(task, email, keys) {
  const me = String(email || '').toLowerCase(), oe = String(task.ownerEmail || '').toLowerCase();
  if (oe) return oe === me;                                   // 이메일이 정해진 업무는 그 사람 것
  if (!keys || !keys.size) return false;
  return ownerTokens(task.ownerName).some((t) => keys.has(t));
}
/** 명단 전체에서 이 이름이 정확히 한 사람을 가리키면 그 이메일 (여러 명이거나 없으면 ''). 업무를 저장할 때 ownerEmail 을 자동으로 채우는 데 쓴다 */
export async function resolveOwnerEmail(env, ownerName) {
  const toks = ownerTokens(ownerName); if (toks.length !== 1) return '';
  let rows = [], als = [];
  try { rows = (await env.DB.prepare('SELECT email, name FROM camp_members WHERE active = 1').all()).results; } catch { return ''; }
  try { als = (await env.DB.prepare('SELECT email, aliases FROM member_aliases').all()).results; } catch { als = []; }
  const hit = new Set();
  for (const r of rows) if (clean(r.name) === toks[0]) hit.add(r.email.toLowerCase());
  const activeSet = new Set(rows.map((r) => r.email.toLowerCase()));
  for (const a of als) if (activeSet.has(a.email.toLowerCase()) && aliasList(a.aliases).includes(toks[0])) hit.add(a.email.toLowerCase());
  return hit.size === 1 ? [...hit][0] : '';
}
