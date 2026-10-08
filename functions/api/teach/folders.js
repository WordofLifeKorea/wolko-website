import { teachSession } from '../../lib/teachAuth.js';
import { FOLDERS_KEY, readTeachFolders, foldersForCamp } from '../../lib/teachFolders.js';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
async function sessionFor(request, env) {
  return env.CAMP_KV ? teachSession(request, env) : null;
}
const error = (message, status) => Response.json({ error: message }, { status, headers });

export async function onRequestGet({ env, request }) {
  if (!await sessionFor(request, env)) return error('로그인이 필요합니다.', 401);
  return Response.json(await readTeachFolders(env), { headers });
}

export async function onRequestPost({ env, request }) {
  const session = await sessionFor(request, env);
  if (!session?.email) return error('포탈에서 다시 로그인해주세요.', 401);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const campId = String(body.campId || '').trim();
  if (!name || name.length > 60 || !campId || campId.length > 80) return error('캠프와 폴더 이름(60자 이하)을 확인해주세요.', 400);
  const state = await readTeachFolders(env);
  const data = await env.CAMP_KV.get('teach:data:v1', 'json');
  if (foldersForCamp(state, campId, data?.items || []).some(f => f.name.toLowerCase() === name.toLowerCase())) return error('같은 이름의 폴더가 있습니다.', 409);
  if (state.folders.length >= 1000) return error('폴더 수 제한에 도달했습니다.', 409);
  state.folders.push({ id: crypto.randomUUID(), name, campId, ownerEmail: session.email, ownerName: session.name || session.email });
  await env.CAMP_KV.put(FOLDERS_KEY, JSON.stringify(state));
  return Response.json(state, { headers });
}

export async function onRequestDelete({ env, request }) {
  const session = await sessionFor(request, env);
  if (!session) return error('로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const campId = url.searchParams.get('campId');
  const id = url.searchParams.get('id');
  const state = await readTeachFolders(env);
  const data = await env.CAMP_KV.get('teach:data:v1', 'json');
  const folder = foldersForCamp(state, campId, data?.items || []).find(f => f.id === id);
  if (!folder) return error('폴더를 찾을 수 없습니다.', 404);
  if (!session.isMaster && (!folder.ownerEmail || folder.ownerEmail !== session.email)) return error('마스터 또는 폴더를 만든 본인만 삭제할 수 있습니다.', 403);
  if ((data?.items || []).some(i => i.team === folder.name && i.campIds?.includes(campId))) return error('자료가 남아 있는 폴더는 삭제할 수 없습니다. 자료를 먼저 이동하거나 삭제해주세요.', 409);
  if (folder.builtin) state.removedDefaults.push({ campId, name: folder.name });
  else state.folders = state.folders.filter(f => f.id !== id);
  await env.CAMP_KV.put(FOLDERS_KEY, JSON.stringify(state));
  return Response.json(state, { headers });
}
