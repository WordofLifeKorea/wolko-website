/**
 * 업무관리(/portal/tasks) — 포탈 계정마다 따로 두는 노드 보드(프로젝트) 저장소.
 * KV:
 *   tasks:v1:<owner>:index      → [{ id, updatedAt }] (보드 목록 — KV list 대신 쓴다)
 *   tasks:v1:<owner>:b:<id>     → 보드 한 개 { id, title, note, nodes, edges, rev, updatedAt, ... }
 * owner 는 이메일을 서버 비밀값으로 바꾼 표식이라 키에 이메일이 드러나지 않는다. 본인 말고는 아무도(관리자도) 읽지 않는다.
 * 저장은 rev(저장할 때마다 1씩 오르는 번호)로 겹침을 막는다: 들어온 rev 가 저장된 것보다 크지 않으면 409 와 함께 저장된 보드를 돌려준다.
 */
import { anonHex } from './gospelStats.js';

export const MAX_BOARD_BYTES = 256 * 1024;
export const MAX_BOARDS = 200;
export const MAX_NODES = 2000;
export const MAX_EDGES = 4000;
export const SAFE_ID = /^[A-Za-z0-9_-]{1,48}$/;

export const tasksOwner = (env, email) => anonHex(env, 'tasks-owner', String(email || '').trim().toLowerCase(), 16);
const indexKey = owner => `tasks:v1:${owner}:index`;
const boardKey = (owner, id) => `tasks:v1:${owner}:b:${id}`;

async function readIndex(env, owner) {
  const list = await env.CAMP_KV.get(indexKey(owner), 'json');
  return (Array.isArray(list) ? list : []).filter(x => x && SAFE_ID.test(String(x.id || '')));
}

/** 내 보드 전부(최근 고친 것부터) */
export async function listBoards(env, owner) {
  const index = await readIndex(env, owner);
  const boards = await Promise.all(index.map(x => env.CAMP_KV.get(boardKey(owner, x.id), 'json')));
  return boards.filter(b => b && Array.isArray(b.nodes) && Array.isArray(b.edges)).sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

/** 들어온 보드의 모양을 확인한다(내용은 화면이 다시 걸러서 쓴다). 문제가 있으면 { error, status } */
export function checkBoard(board) {
  if (!board || typeof board !== 'object' || Array.isArray(board)) return { error: '보드 형식이 올바르지 않습니다.', status: 400 };
  if (!SAFE_ID.test(String(board.id || ''))) return { error: '보드 id 가 올바르지 않습니다.', status: 400 };
  if (!Array.isArray(board.nodes) || !Array.isArray(board.edges)) return { error: '노드와 연결 목록이 필요합니다.', status: 400 };
  if (board.nodes.length > MAX_NODES || board.edges.length > MAX_EDGES) return { error: '노드가 너무 많습니다.', status: 413 };
  let text;
  try { text = JSON.stringify(board); } catch { return { error: '보드 형식이 올바르지 않습니다.', status: 400 }; }
  if (new TextEncoder().encode(text).length > MAX_BOARD_BYTES) return { error: '보드가 너무 큽니다.', status: 413 };
  return { ok: true };
}

/** 보드 저장 — rev 가 저장된 것보다 커야 한다. 겹치면 { conflict: 저장된 보드 } */
export async function saveBoard(env, owner, board) {
  const checked = checkBoard(board);
  if (checked.error) return checked;
  const id = String(board.id);
  const current = await env.CAMP_KV.get(boardKey(owner, id), 'json');
  const rev = Number(board.rev) || 0;
  if (current && rev <= (Number(current.rev) || 0)) return { error: '다른 기기에서 먼저 저장한 내용이 있습니다.', status: 409, board: current };
  const index = await readIndex(env, owner);
  if (!current && !index.some(x => x.id === id) && index.length >= MAX_BOARDS) return { error: '프로젝트가 너무 많습니다. 안 쓰는 프로젝트를 지워 주세요.', status: 413 };
  const saved = { ...board, id, rev, savedAt: new Date().toISOString() };
  await env.CAMP_KV.put(boardKey(owner, id), JSON.stringify(saved));
  // 목록(index)은 새 보드일 때만 쓴다 — 같은 키를 1초에 여러 번 쓰면 KV 가 거절할 수 있어서(정렬은 보드의 updatedAt 으로 한다)
  if (!index.some(x => x.id === id)) await env.CAMP_KV.put(indexKey(owner), JSON.stringify([...index, { id }]));
  return { ok: true, rev };
}

export async function deleteBoard(env, owner, id) {
  if (!SAFE_ID.test(String(id || ''))) return { error: '보드 id 가 올바르지 않습니다.', status: 400 };
  await env.CAMP_KV.delete(boardKey(owner, id));
  const index = await readIndex(env, owner);
  if (index.some(x => x.id === id)) await env.CAMP_KV.put(indexKey(owner), JSON.stringify(index.filter(x => x.id !== id)));
  return { ok: true };
}
