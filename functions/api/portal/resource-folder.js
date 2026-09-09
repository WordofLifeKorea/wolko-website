/**
 * 작업 항목(Resource & Media)의 파일을 레슨/파트별로 묶는 폴더 — 파일 blob과
 * 달리 KV에 항목 레코드 안에 그대로 저장되는 가벼운 메타데이터라 별도 blob
 * 저장소가 필요 없다.
 *
 * POST   /api/portal/resource-folder                        — 폴더 생성. admin/master만.
 * PUT    /api/portal/resource-folder                         — 폴더 이름 변경. admin/master만.
 * DELETE /api/portal/resource-folder?id=&folderId=           — 폴더 삭제(안의 파일은 미분류로 이동, 파일 자체는 지우지 않음). admin/master만.
 */
import { sessionFor, canWrite, text, readData, saveData, error, filesOf, foldersOf } from '../../lib/portalResources.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const MAX_FOLDERS_PER_ITEM = 20;

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }
  const id = text(body.id, 80);
  const name = text(body.name, 60);
  if (!id) return error('잘못된 요청입니다.', 400);
  if (!name) return error('폴더 이름을 입력해 주세요.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const folders = foldersOf(item);
  if (folders.length >= MAX_FOLDERS_PER_ITEM) return error(`폴더는 최대 ${MAX_FOLDERS_PER_ITEM}개까지 만들 수 있습니다.`, 400);

  const folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  item.folders = [...folders, folder];
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestPut({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }
  const id = text(body.id, 80);
  const folderId = text(body.folderId, 80);
  const name = text(body.name, 60);
  if (!id || !folderId) return error('잘못된 요청입니다.', 400);
  if (!name) return error('폴더 이름을 입력해 주세요.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const folders = foldersOf(item);
  const folderIndex = folders.findIndex(f => f.id === folderId);
  if (folderIndex < 0) return error('폴더를 찾을 수 없습니다.', 404);

  item.folders = folders.map((f, i) => i === folderIndex ? { ...f, name } : f);
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestDelete({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);

  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const folderId = text(url.searchParams.get('folderId'), 80);
  if (!id || !folderId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  item.folders = foldersOf(item).filter(f => f.id !== folderId);
  item.files = filesOf(item).map(f => f.folderId === folderId ? { ...f, folderId: null, category: null } : f);
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
