/** 자료실 폴더 트리 — 단계 수·순환·하위 폴더 계산 같은 순수 도우미 (DB 를 읽는 loadFolders 만 예외) */
export const MAX_DEPTH = 5;                       // 최상위 폴더가 1단계, 그 안이 2단계 … 5단계까지
export const MSG_DEPTH = `폴더는 ${MAX_DEPTH}단계까지만 만들 수 있어요. 한 단계 위 폴더에 만들어 주세요.`;
export const MSG_DEPTH_MOVE = `옮기면 폴더가 ${MAX_DEPTH}단계보다 깊어져요. 더 위쪽 폴더로 옮겨 주세요.`;
export const MSG_CYCLE = '폴더를 자기 자신이나 자기 안에 있는 폴더로는 옮길 수 없어요.';
export const MSG_NO_TREE = '폴더 안에 폴더를 만들려면 관리자가 데이터베이스 업데이트(0036)를 먼저 적용해야 해요.';

/** 지워지지 않은 모든 폴더 → [{ id, parentId, campId, typeId, name }] (0036 이 없으면 parentId 열이 없어 오류) */
export async function loadFolders(env) {
  return (await env.DB.prepare('SELECT id, parentId, campId, typeId, name FROM file_folders WHERE deletedAt IS NULL').all()).results;
}

export function buildIndex(rows) {
  const byId = new Map(), kids = new Map();
  for (const r of rows) byId.set(r.id, r);
  for (const r of rows) {
    const p = r.parentId && byId.has(r.parentId) ? r.parentId : '';   // 위 폴더가 없어졌으면 최상위로 본다
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(r.id);
  }
  return { byId, kids };
}

/** 폴더의 단계(최상위=1). 순환이 있어도 끝난다 */
export function depthOf(idx, id) {
  let d = 0, cur = idx.byId.get(id);
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id); d++;
    cur = cur.parentId ? idx.byId.get(cur.parentId) : null;
  }
  return d;
}

/** 이 폴더와 그 아래를 합친 높이(자기만 있으면 1) */
export function heightOf(idx, id, seen = new Set()) {
  if (seen.has(id)) return 0;
  seen.add(id);
  let h = 0;
  for (const k of idx.kids.get(id) || []) h = Math.max(h, heightOf(idx, k, seen));
  return h + 1;
}

/** 자기를 뺀 모든 하위 폴더 id */
export function descendantIds(idx, id) {
  const out = [], stack = [...(idx.kids.get(id) || [])], seen = new Set([id]);
  while (stack.length) {
    const x = stack.pop();
    if (seen.has(x)) continue;
    seen.add(x); out.push(x);
    for (const k of idx.kids.get(x) || []) stack.push(k);
  }
  return out;
}

/**
 * folderId 를 parentId('' = 최상위) 밑으로 옮겨도 되는지. 막아야 하면 안내 문구를, 괜찮으면 ''.
 * parentId 가 없는 폴더거나 단계가 5를 넘거나 자기·자기 하위로 옮기려 하면 막는다.
 */
export function checkMove(idx, folderId, parentId) {
  if (!parentId) return '';
  if (!idx.byId.has(parentId)) return '옮길 폴더를 찾을 수 없어요.';
  if (parentId === folderId || descendantIds(idx, folderId).includes(parentId)) return MSG_CYCLE;
  if (depthOf(idx, parentId) + heightOf(idx, folderId) > MAX_DEPTH) return MSG_DEPTH_MOVE;
  return '';
}

/** 같은 위치 안에서 보여 줄 순서: 순서를 안 정한 것(NULL)이 먼저(새것이 위), 그다음 정해 둔 순서 */
export const SORT_SQL = (a) => `COALESCE(${a}.sortOrder, 0) ASC, ${a}.createdAt DESC, ${a}.id`;

/** 0036 이 아직 없는 DB 에서 나는 오류인지 */
export const noTreeColumns = (e) => /parentId|sortOrder|deletedWith/.test(String((e && e.message) || e));

/** 하위 폴더 id 를 찾는 재귀 SQL(번호는 ?1) — 폴더 한 개와 그 아래 전부(지워진 폴더는 따라가지 않는다) */
export const SUBTREE_CTE = `WITH RECURSIVE sub(id) AS (SELECT id FROM file_folders WHERE id = ?1 UNION SELECT d.id FROM file_folders d JOIN sub ON d.parentId = sub.id WHERE d.deletedAt IS NULL)`;
