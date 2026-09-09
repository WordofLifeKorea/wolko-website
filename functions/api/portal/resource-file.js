/**
 * 작업 항목(Resource & Media)에 딸린 파일 첨부 — "작업 파일"(work, 현재까지 작업한
 * 진행분)과 "원본 파일"(original, 원본 소스) 두 슬롯을 따로 관리한다.
 *
 * GET    /api/portal/resource-file?id=&kind=work|original   — 파일 데이터(미리보기용) 조회.
 * POST   /api/portal/resource-file                           — 업로드(교체). admin/master만.
 * DELETE /api/portal/resource-file?id=&kind=work|original    — 첨부 삭제. admin/master만.
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
import { sessionFor, canWrite, text, readData, saveData, error } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const MAX_FILE_BYTES = 24 * 1024 * 1024; // KV 값 한도(25MiB)보다 안전 여유를 둔 최대치
const KINDS = new Set(['work', 'original']);
const MAX_LOG_ENTRIES = 20;

function fileKvKey(id, kind) { return `portal:resource-file:${id}:${kind}`; }

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
  const kind = url.searchParams.get('kind');
  if (!id || !KINDS.has(kind)) return error('잘못된 요청입니다.', 400);

  const { value, metadata } = await env.CAMP_KV.getWithMetadata(fileKvKey(id, kind), 'arrayBuffer');
  if (!value) return error('파일을 찾을 수 없습니다.', 404);

  let file;
  if (metadata?.fileName) {
    // 새 형식: 값은 원본 바이트, 파일명/타입은 메타데이터.
    file = { fileName: metadata.fileName, fileType: metadata.fileType, fileData: `data:${metadata.fileType || 'application/octet-stream'};base64,${bytesToBase64(new Uint8Array(value))}` };
  } else {
    // 예전 형식: 값 자체가 {fileName,fileType,fileData} JSON 문자열.
    try { file = JSON.parse(new TextDecoder().decode(value)); } catch { return error('파일을 불러오지 못했습니다.', 500); }
  }
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
  const kind = body.kind;
  const fileName = text(body.fileName, 200);
  const fileType = text(body.fileType, 100);
  const fileData = String(body.fileData || '');
  if (!id || !KINDS.has(kind)) return error('잘못된 요청입니다.', 400);
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

  const account = await getAccount(env, session.email);
  const uploadedByName = account?.name || session.email;
  const now = new Date().toISOString();
  const fileSize = bytes.length;

  await env.CAMP_KV.put(fileKvKey(id, kind), bytes, { metadata: { fileName, fileType } });

  const meta = { fileName, fileType, fileSize, uploadedBy: session.email, uploadedByName, uploadedAt: now };
  const item = { ...data.items[index] };
  if (kind === 'work') item.workFile = meta; else item.originalFile = meta;
  const logEntry = { kind, fileName, uploadedByName, uploadedAt: now };
  item.uploadLog = [logEntry, ...(Array.isArray(item.uploadLog) ? item.uploadLog : [])].slice(0, MAX_LOG_ENTRIES);
  item.updatedAt = now;
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
  const kind = url.searchParams.get('kind');
  if (!id || !KINDS.has(kind)) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  await env.CAMP_KV.delete(fileKvKey(id, kind));
  const item = { ...data.items[index] };
  if (kind === 'work') item.workFile = null; else item.originalFile = null;
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
