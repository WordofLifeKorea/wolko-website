/**
 * 작업 항목(Resource & Media)에 딸린 파일 첨부 — 예전엔 "작업 파일"/"원본 파일"
 * 두 칸이 고정이었지만, 지금은 필요한 만큼 자유롭게 추가하는 파일 목록이다.
 * 각 파일은 자체 id(새 파일은 crypto.randomUUID(), 예전 데이터는 'work'/
 * 'original')를 가진다.
 *
 * GET    /api/portal/resource-file?id=&fileId=   — 파일 데이터(미리보기용) 조회.
 * POST   /api/portal/resource-file                — 업로드. body.fileId가 있으면 그 파일을
 *                                                    교체하고, 없으면 새 파일을 추가한다. admin/master만.
 *                                                    body.folderId/category(원본|수정본)로 폴더에 바로 소속시킬 수 있다.
 * PUT    /api/portal/resource-file                — 이미 올라간 파일을 다른 폴더/원본·수정본으로
 *                                                    옮기거나, body.reviewerSlug(+confirmed)로 평택센터
 *                                                    선교사 검토 체크리스트를 갱신한다(blob은 그대로,
 *                                                    메타데이터만 갱신). admin/master만.
 * DELETE /api/portal/resource-file?id=&fileId=   — 첨부 삭제. admin/master만.
 *
 * 파일 본문은 항목 목록과 분리된 별도 KV 키에 저장해서 목록 조회 응답이
 * 무거워지지 않게 한다. 항목 레코드에는 이름/크기/업로더/시각 같은 가벼운
 * 메타데이터와, "누가 언제 올렸는지" 확인용 업로드 로그만 남긴다.
 *
 * KV 값 하드리밋(25MiB)에 최대한 가깝게 쓰기 위해, base64 문자열을 그대로
 * JSON으로 감싸 저장하던 예전 방식(33% 인코딩 손실 + JSON 오버헤드) 대신
 * 디코딩한 원본 바이트를 값으로, 파일명/타입은 KV 메타데이터로 저장한다.
 * 예전 방식으로 이미 올라간 파일도 계속 읽을 수 있도록 GET에서 두 형식을
 * 다 처리한다.
 */
import { sessionFor, canWrite, text, readData, saveData, error, filesOf, foldersOf, annotationsOf } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const MAX_FILE_BYTES = 24 * 1024 * 1024; // KV 값 한도(25MiB)보다 안전 여유를 둔 최대치
const MAX_LOG_ENTRIES = 20;
const MAX_FILES_PER_ITEM = 100; // 임의로 정한 안전장치일 뿐 — 레슨이 여러 개면 20개는 금방 넘는다

function fileKvKey(id, fileId) { return `portal:resource-file:${id}:${fileId}`; }

function base64ToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const fileId = text(url.searchParams.get('fileId'), 80);
  if (!id || !fileId) return error('잘못된 요청입니다.', 400);

  const { value, metadata } = await env.CAMP_KV.getWithMetadata(fileKvKey(id, fileId), 'arrayBuffer');
  if (!value) return error('파일을 찾을 수 없습니다.', 404);

  let file;
  if (metadata?.fileName) {
    // 새 형식: 값은 원본 바이트, 파일명/타입은 메타데이터.
    file = { fileName: metadata.fileName, fileType: metadata.fileType, fileData: `data:${metadata.fileType || 'application/octet-stream'};base64,${bytesToBase64(new Uint8Array(value))}` };
  } else {
    // 예전 형식: 값 자체가 {fileName,fileType,fileData} JSON 문자열.
    try { file = JSON.parse(new TextDecoder().decode(value)); } catch { return error('파일을 불러오지 못했습니다.', 500); }
  }
  const data = await readData(env);
  const item = data.items.find(entry => entry.id === id);
  const currentFile = item && filesOf(item).find(entry => entry.id === fileId);
  if (currentFile) file.fileName = currentFile.fileName;
  return Response.json({ file }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }

  const id = text(body.id, 80);
  const existingFileId = text(body.fileId, 80);
  const folderId = text(body.folderId, 80) || null;
  const category = ['original', 'revised'].includes(body.category) ? body.category : null;
  const fileName = text(body.fileName, 200);
  const fileType = text(body.fileType, 100);
  const fileData = String(body.fileData || '');
  if (!id) return error('잘못된 요청입니다.', 400);
  if (!fileName || !fileData) return error('파일을 선택해 주세요.', 400);
  if (!/^data:[\w.+-]+\/[\w.+-]+;base64,/i.test(fileData)) return error('파일 형식이 올바르지 않습니다.', 400);

  let bytes;
  try { bytes = base64ToBytes(fileData); } catch { return error('파일을 처리하지 못했습니다.', 400); }
  if (bytes.length > MAX_FILE_BYTES) {
    return error(`파일 용량이 너무 큽니다(최대 ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB).`, 400);
  }

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const files = filesOf(item);
  const fileIndex = existingFileId ? files.findIndex(f => f.id === existingFileId) : -1;
  if (existingFileId && fileIndex < 0) return error('파일을 찾을 수 없습니다.', 404);
  if (!existingFileId && files.length >= MAX_FILES_PER_ITEM) {
    return error(`파일은 최대 ${MAX_FILES_PER_ITEM}개까지 첨부할 수 있습니다.`, 400);
  }

  const account = await getAccount(env, session.email);
  const uploadedByName = account?.name || session.email;
  const now = new Date().toISOString();
  const fileId = existingFileId || crypto.randomUUID();

  await env.CAMP_KV.put(fileKvKey(id, fileId), bytes, { metadata: { fileName, fileType } });

  const meta = { id: fileId, folderId, category, fileName, fileType, fileSize: bytes.length, uploadedBy: session.email, uploadedByName, uploadedAt: now };
  const nextFiles = [...files];
  if (fileIndex >= 0) nextFiles[fileIndex] = meta; else nextFiles.push(meta);

  item.files = nextFiles;
  delete item.workFile;
  delete item.originalFile;
  const logEntry = { fileName, uploadedByName, uploadedAt: now };
  item.uploadLog = [logEntry, ...(Array.isArray(item.uploadLog) ? item.uploadLog : [])].slice(0, MAX_LOG_ENTRIES);
  item.updatedAt = now;
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
  const fileId = text(body.fileId, 80);
  if (!id || !fileId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const files = filesOf(item);
  const fileIndex = files.findIndex(f => f.id === fileId);
  if (fileIndex < 0) return error('파일을 찾을 수 없습니다.', 404);

  if (Object.hasOwn(body, 'reviewerSlug')) {
    // 평택센터 선교사 검토 체크리스트 — team 콘텐츠의 slug를 키로, 확인한
    // 사람만 기록해둔다(안 한 사람은 그냥 키가 없는 것으로 취급).
    const slug = text(body.reviewerSlug, 60);
    if (!slug) return error('잘못된 요청입니다.', 400);
    const reviewConfirmations = { ...(files[fileIndex].reviewConfirmations || {}) };
    if (body.confirmed === false) {
      delete reviewConfirmations[slug];
    } else {
      const account = await getAccount(env, session.email);
      reviewConfirmations[slug] = { confirmedBy: session.email, confirmedByName: account?.name || session.email, confirmedAt: new Date().toISOString() };
    }
    item.files = files.map((f, i) => i === fileIndex ? { ...f, reviewConfirmations } : f);
  } else {
    const folderId = text(body.folderId, 80) || null;
    const category = ['original', 'revised'].includes(body.category) ? body.category : null;
    if (folderId && !foldersOf(item).some(f => f.id === folderId)) return error('폴더를 찾을 수 없습니다.', 404);
    const renaming = Object.hasOwn(body, 'fileName');
    const fileName = text(body.fileName, 200);
    if (renaming && (!fileName || /[\\/\x00-\x1f]/.test(fileName))) return error('파일 이름이 올바르지 않습니다.', 400);
    item.files = files.map((f, i) => i === fileIndex
      ? (renaming ? { ...f, fileName } : { ...f, folderId, category: folderId ? category : null })
      : f);
  }
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
  const fileId = text(url.searchParams.get('fileId'), 80);
  if (!id || !fileId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  await env.CAMP_KV.delete(fileKvKey(id, fileId));
  const item = { ...data.items[index] };
  item.files = filesOf(item).filter(f => f.id !== fileId);
  item.annotations = annotationsOf(item).filter(a => a.fileId !== fileId);
  delete item.workFile;
  delete item.originalFile;
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
