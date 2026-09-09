import { sessionFor, canWrite, text, readData, saveData, error, filesOf, foldersOf, stageOf, progressFromStage, STAGE_COUNT } from '../../lib/portalResources.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const MAX_THUMBNAIL_LENGTH = 1_500_000;

function thumbnail(value) {
  const data = String(value || '');
  return /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(data) && data.length <= MAX_THUMBNAIL_LENGTH ? data : '';
}
// 첨부 파일 목록(files)/폴더(folders)/업로드 로그(uploadLog)는 이 항목 편집
// 폼에서 다루지 않는다 — resource-file.js/resource-folder.js가 별도로
// 갱신하므로, 여기서는 기존 값을 그대로 보존해서 제목/단계 등만 고쳐도
// 지워지지 않게 한다.
function normalize(input, existing = {}) {
  const stageInput = Number(input?.stage);
  const stage = Number.isInteger(stageInput) && stageInput >= 0 && stageInput <= STAGE_COUNT ? stageInput : stageOf(existing);
  return {
    id: existing.id || crypto.randomUUID(),
    title: text(input?.title, 120) || existing.title || '',
    detail: text(input?.detail, 260),
    translation: text(input?.translation, 120),
    stage,
    progress: progressFromStage(stage),
    thumbnailData: thumbnail(input?.thumbnailData),
    files: filesOf(existing),
    folders: foldersOf(existing),
    uploadLog: Array.isArray(existing.uploadLog) ? existing.uploadLog : [],
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  const data = await readData(env);
  const items = data.items.map(item => { const stage = stageOf(item); return { ...item, files: filesOf(item), folders: foldersOf(item), stage, progress: progressFromStage(stage) }; });
  return Response.json({ items, canWrite: canWrite(session), updatedAt: data.updatedAt || '' }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  try {
    const item = normalize((await request.json()).item);
    if (!item.title) return error('작업 항목 이름을 입력해주세요.', 400);
    const data = await readData(env);
    data.items.unshift(item);
    const saved = await saveData(env, data.items);
    return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
  } catch { return error('작업 항목을 저장하지 못했습니다.', 500); }
}

export async function onRequestPut({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  try {
    const body = await request.json();
    const data = await readData(env);
    const index = data.items.findIndex(item => item.id === text(body.id, 80));
    if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);
    const item = normalize(body.item, data.items[index]);
    if (!item.title) return error('작업 항목 이름을 입력해주세요.', 400);
    data.items[index] = item;
    const saved = await saveData(env, data.items);
    return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
  } catch { return error('작업 항목을 수정하지 못했습니다.', 500); }
}

export async function onRequestDelete({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  const id = new URL(request.url).searchParams.get('id') || '';
  const data = await readData(env);
  const target = data.items.find(item => item.id === id);
  if (!target) return error('작업 항목을 찾을 수 없습니다.', 404);
  const items = data.items.filter(item => item.id !== id);
  const saved = await saveData(env, items);
  try {
    await Promise.all(filesOf(target).map(f => env.CAMP_KV.delete(`portal:resource-file:${id}:${f.id}`)));
  } catch {}
  return Response.json({ items: saved.items, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
