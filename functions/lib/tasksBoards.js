/**
 * 업무관리(/portal/tasks) — 노드 보드(프로젝트) 저장소. 보드는 '내 프로젝트'(나만) 또는 '팀 프로젝트'(그 팀 멤버 모두가 보고 고침)다.
 * KV (ns = 내 것이면 계정 표식, 팀 것이면 'team:<팀 id>'):
 *   tasks:v1:<ns>:index      → [{ id }] (보드 목록 — KV list 대신 쓴다)
 *   tasks:v1:<ns>:b:<id>     → 보드 한 개 { id, title, note, nodes, edges, rev, updatedAt, team?, createdBy?, ... }
 * 계정 표식(owner)은 이메일을 서버 비밀값으로 바꾼 것이라 키에 이메일이 드러나지 않는다. 내 프로젝트는 본인 말고 아무도(관리자도) 읽지 않는다.
 * 팀 프로젝트는 그 팀 멤버만 읽고 고친다. 지우기와 '나만 보기'로 되돌리기는 만든 사람(createdBy)과 마스터 · 관리자만.
 * 저장은 rev(저장할 때마다 1씩 오르는 번호)로 겹침을 막는다: 들어온 rev 가 저장된 것보다 크지 않으면 409 와 함께 저장된 보드를 돌려준다.
 */
import { anonHex } from './gospelStats.js';

export const MAX_BOARD_BYTES = 256 * 1024;
export const MAX_BOARDS = 200;
export const MAX_NODES = 2000;
export const MAX_EDGES = 4000;
export const SAFE_ID = /^[A-Za-z0-9_-]{1,48}$/;
export const TEAM_ID = /^t[a-z0-9]{6,20}$/;

export const tasksOwner = (env, email) => anonHex(env, 'tasks-owner', String(email || '').trim().toLowerCase(), 16);
const indexKey = ns => `tasks:v1:${ns}:index`;
const boardKey = (ns, id) => `tasks:v1:${ns}:b:${id}`;
const teamNs = team => `team:${team}`;

/** 요청한 사람의 상황: { owner, teams: [팀 id], canManage } */
export const nsOf = (ctx, team) => (team ? teamNs(team) : ctx.owner);
const inTeam = (ctx, team) => !!team && (ctx.teams || []).includes(team);
const canRemoveTeamBoard = (ctx, board) => !!board && (ctx.canManage || board.createdBy === ctx.owner);

async function readIndex(env, ns) {
  const list = await env.CAMP_KV.get(indexKey(ns), 'json');
  return (Array.isArray(list) ? list : []).filter(x => x && SAFE_ID.test(String(x.id || '')));
}
async function readNs(env, ns) {
  const index = await readIndex(env, ns);
  const boards = await Promise.all(index.map(x => env.CAMP_KV.get(boardKey(ns, x.id), 'json')));
  return boards.filter(b => b && !b.gone && Array.isArray(b.nodes) && Array.isArray(b.edges));
}

/** 내 보드와 내가 속한 팀의 보드 전부(최근 고친 것부터). 팀 보드에는 team · canDelete 를 붙인다(만든 사람 표식은 내보내지 않음) */
export async function listBoards(env, ctx) {
  const mine = (await readNs(env, ctx.owner)).map(b => { const { createdBy, ...rest } = b; return { ...rest, team: undefined, canDelete: true }; });
  const teams = await Promise.all((ctx.teams || []).filter(t => TEAM_ID.test(t)).map(async t => (await readNs(env, teamNs(t))).map(b => {
    const { createdBy, ...rest } = b; return { ...rest, team: t, canDelete: canRemoveTeamBoard(ctx, b) };
  })));
  return [...mine, ...teams.flat()].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

/** 들어온 보드의 모양을 확인한다(내용은 화면이 다시 걸러서 쓴다). 문제가 있으면 { error, status } */
export function checkBoard(board) {
  if (!board || typeof board !== 'object' || Array.isArray(board)) return { error: '보드 형식이 올바르지 않습니다.', status: 400 };
  if (!SAFE_ID.test(String(board.id || ''))) return { error: '보드 id 가 올바르지 않습니다.', status: 400 };
  if (!Array.isArray(board.nodes) || !Array.isArray(board.edges)) return { error: '노드와 연결 목록이 필요합니다.', status: 400 };
  if (board.nodes.length > MAX_NODES || board.edges.length > MAX_EDGES) return { error: '노드가 너무 많습니다.', status: 413 };
  if (board.team != null && board.team !== '' && !TEAM_ID.test(String(board.team))) return { error: '팀이 올바르지 않습니다.', status: 400 };
  let text;
  try { text = JSON.stringify(board); } catch { return { error: '보드 형식이 올바르지 않습니다.', status: 400 }; }
  if (new TextEncoder().encode(text).length > MAX_BOARD_BYTES) return { error: '보드가 너무 큽니다.', status: 413 };
  return { ok: true };
}

async function addToIndex(env, ns, id) {
  const index = await readIndex(env, ns);
  if (index.some(x => x.id === id)) return;
  // 목록은 새 보드일 때만 쓴다. 같은 키를 1초에 여러 번 쓰면 KV 가 거절할 수 있는데, 그래도 저장은 된 것이라 다음 저장에서 다시 채운다
  try { await env.CAMP_KV.put(indexKey(ns), JSON.stringify([...index, { id }])); } catch (e) { /* 다음 저장에서 다시 */ }
}
// 지우거나 다른 곳으로 옮긴 자리에는 표지(gone)를 30일 남긴다 — 늦게 도착한 저장이 보드를 되살리거나 다른 사람을 만든 사람으로 바꾸지 않게
const GONE_TTL = 60 * 60 * 24 * 30;
async function removeFromNs(env, ns, id, rev) {
  await env.CAMP_KV.put(boardKey(ns, id), JSON.stringify({ id, gone: true, rev: Number(rev) || 0, at: new Date().toISOString() }), { expirationTtl: GONE_TTL });
  const index = await readIndex(env, ns);
  if (index.some(x => x.id === id)) await env.CAMP_KV.put(indexKey(ns), JSON.stringify(index.filter(x => x.id !== id)));
}

/**
 * 보드 저장 — rev 가 저장된 것보다 커야 한다. 겹치면 409 { board: 저장된 보드 }.
 * board.team 이 있으면 그 팀의 보드로, 없으면 내 보드로 저장한다. board.prevTeam 이 있으면(''=내 것) 공유 범위를 옮긴 것이라 예전 자리에서 지운다.
 */
export async function saveBoard(env, ctx, board) {
  const checked = checkBoard(board);
  if (checked.error) return checked;
  const id = String(board.id);
  const team = board.team ? String(board.team) : '';
  let moving = board.prevTeam !== undefined && String(board.prevTeam || '') !== team;
  const prevTeam = moving ? String(board.prevTeam || '') : null;
  if (team && !inTeam(ctx, team)) return { error: '그 팀의 멤버가 아니라서 팀 프로젝트로 저장할 수 없습니다.', status: 403 };
  if (moving && prevTeam && !TEAM_ID.test(prevTeam)) return { error: '팀이 올바르지 않습니다.', status: 400 };
  const ns = nsOf(ctx, team);
  const rev = Number(board.rev) || 0;
  let current = await env.CAMP_KV.get(boardKey(ns, id), 'json');
  const shown = (b, t) => { const { createdBy, ...rest } = b; return { ...rest, team: t || undefined, canDelete: t ? canRemoveTeamBoard(ctx, b) : true }; };
  const conflict = (b, t) => ({ error: '다른 기기나 팀원이 먼저 저장한 내용이 있습니다.', status: 409, board: shown(b, t) });
  let prevBoard = null;
  if (moving) {
    if (prevTeam && !inTeam(ctx, prevTeam)) return { error: '그 팀의 멤버가 아닙니다.', status: 403 };
    prevBoard = await env.CAMP_KV.get(boardKey(nsOf(ctx, prevTeam), id), 'json');
    if (prevBoard && prevBoard.gone) {
      // 예전 자리는 이미 비었다. 새 자리에 보드가 있으면 앞서 옮긴 저장의 답만 놓친 것(다시 보낸 것) — 옮기기 없이 보통 저장으로 다룬다
      if (!current || current.gone) return { error: '이 프로젝트는 지워졌거나 다른 곳으로 옮겨졌습니다.', status: 410, gone: true };
      prevBoard = null;
      moving = false;
    } else if (prevBoard) {
      // 예전 자리에 더 새로 저장된 내용(다른 팀원 · 다른 기기)이 있으면 옮기지 않고 그 내용을 돌려준다 — 옮기면서 남의 저장을 지우지 않게
      if (rev <= (Number(prevBoard.rev) || 0)) return conflict(prevBoard, prevTeam);
      if (prevTeam && !canRemoveTeamBoard(ctx, prevBoard)) return { error: '팀 프로젝트를 옮기거나 지우는 것은 만든 사람과 관리자만 할 수 있습니다.', status: 403 };
    }
  }
  if (current && current.gone) {
    // 이 자리의 보드는 지워졌거나 다른 곳으로 옮겨졌다. 옮겨 오는 저장(moving)만 새로 받는다
    if (!moving) return { error: '이 프로젝트는 지워졌거나 다른 곳으로 옮겨졌습니다.', status: 410, gone: true };
    current = null;
  }
  if (current && rev <= (Number(current.rev) || 0)) return conflict(current, team);
  if (!current) {
    const index = await readIndex(env, ns);
    if (!index.some(x => x.id === id) && index.length >= MAX_BOARDS) return { error: '프로젝트가 너무 많습니다. 안 쓰는 프로젝트를 지워 주세요.', status: 413 };
  }
  const { prevTeam: _p, canDelete: _c, createdBy: _b, ...clean } = board;
  const saved = { ...clean, id, rev, team: team || undefined, savedAt: new Date().toISOString() };
  if (team) saved.createdBy = current?.createdBy || prevBoard?.createdBy || ctx.owner;   // 팀 보드: 처음 팀으로 올린 사람(옮겨 온 보드는 원래 만든 사람)
  await env.CAMP_KV.put(boardKey(ns, id), JSON.stringify(saved));
  await addToIndex(env, ns, id);
  if (moving) await removeFromNs(env, nsOf(ctx, prevTeam), id, rev);
  return { ok: true, rev, canDelete: team ? canRemoveTeamBoard(ctx, saved) : true };
}

/** 보드 지우기 — 내 보드는 본인, 팀 보드는 만든 사람과 마스터 · 관리자 */
export async function deleteBoard(env, ctx, id, team) {
  if (!SAFE_ID.test(String(id || ''))) return { error: '보드 id 가 올바르지 않습니다.', status: 400 };
  if (team) {
    if (!TEAM_ID.test(String(team)) || !inTeam(ctx, team)) return { error: '그 팀의 멤버가 아닙니다.', status: 403 };
    const current = await env.CAMP_KV.get(boardKey(teamNs(team), id), 'json');
    if (current && !current.gone && !canRemoveTeamBoard(ctx, current)) return { error: '팀 프로젝트는 만든 사람과 관리자만 지울 수 있습니다.', status: 403 };
  }
  const cur = await env.CAMP_KV.get(boardKey(nsOf(ctx, team), id), 'json');
  if (cur && cur.gone) return { ok: true };
  await removeFromNs(env, nsOf(ctx, team), id, cur?.rev);
  return { ok: true };
}
