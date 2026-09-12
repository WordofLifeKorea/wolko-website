import { sessionFor, canWrite, text, readData, saveData, error, filesOf } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { archiveCurrentFile, readStoredResourceFile, resourceFileKey, resourceVersionKey, versionsOf } from '../../lib/portalResourceVersions.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function bytesToBase64(bytes) {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(binary);
}

async function findFile(env, id, fileId) {
  const data = await readData(env);
  const itemIndex = data.items.findIndex(item => item.id === id);
  const item = itemIndex >= 0 ? { ...data.items[itemIndex] } : null;
  const files = filesOf(item);
  const fileIndex = files.findIndex(file => file.id === fileId);
  return { data, itemIndex, item, files, fileIndex, file: fileIndex >= 0 ? files[fileIndex] : null };
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  if (!await sessionFor(request, env)) return error('포탈 로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const fileId = text(url.searchParams.get('fileId'), 80);
  const versionId = text(url.searchParams.get('versionId'), 80);
  const found = await findFile(env, id, fileId);
  if (!found.file) return error('파일을 찾을 수 없습니다.', 404);
  if (!versionId) {
    return Response.json({
      versions: versionsOf(found.file),
      current: {
        editedAt: found.file.editedAt || found.file.uploadedAt || '',
        editedByName: found.file.editedByName || found.file.uploadedByName || '',
        editVersion: Number(found.file.editVersion || 0),
      },
    }, { headers: CORS });
  }
  const version = versionsOf(found.file).find(entry => entry.id === versionId);
  if (!version) return error('버전을 찾을 수 없습니다.', 404);
  const stored = await env.CAMP_KV.getWithMetadata(resourceVersionKey(id, fileId, versionId), 'arrayBuffer');
  if (!stored.value) return error('버전 파일을 찾을 수 없습니다.', 404);
  const type = stored.metadata?.fileType || version.fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return Response.json({
    file: {
      fileName: version.fileName || found.file.fileName,
      fileType: type,
      fileData: `data:${type};base64,${bytesToBase64(new Uint8Array(stored.value))}`,
    },
  }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('관리자 권한이 필요합니다.', 403);
  const body = await request.json().catch(() => ({}));
  const id = text(body.id, 80);
  const fileId = text(body.fileId, 80);
  const versionId = text(body.versionId, 80);
  const found = await findFile(env, id, fileId);
  const version = found.file && versionsOf(found.file).find(entry => entry.id === versionId);
  if (!found.file || !version) return error('버전을 찾을 수 없습니다.', 404);
  const [current, selected] = await Promise.all([
    readStoredResourceFile(env, id, fileId),
    env.CAMP_KV.getWithMetadata(resourceVersionKey(id, fileId, versionId), 'arrayBuffer'),
  ]);
  if (!current || !selected.value) return error('버전 파일을 불러오지 못했습니다.', 404);
  const account = await getAccount(env, session.email);
  const versions = await archiveCurrentFile(env, {
    id, file: found.file, bytes: current.bytes,
    actorEmail: session.email, actorName: account?.name || session.email,
    label: '복원 전 버전',
  });
  const restoredBytes = new Uint8Array(selected.value);
  const nextFile = {
    ...found.file,
    fileSize: restoredBytes.byteLength,
    editedAt: new Date().toISOString(),
    editedBy: session.email,
    editedByName: account?.name || session.email,
    editVersion: Number(found.file.editVersion || 0) + 1,
    documentRevision: Number(found.file.documentRevision || 0) + 1,
    lastOnlyOfficeSaveId: '',
    restoredFromVersionId: versionId,
    versions,
  };
  await env.CAMP_KV.put(resourceFileKey(id, fileId), restoredBytes, {
    metadata: { fileName: found.file.fileName, fileType: found.file.fileType },
  });
  found.item.files = found.files.map((file, index) => index === found.fileIndex ? nextFile : file);
  found.item.updatedAt = new Date().toISOString();
  found.data.items[found.itemIndex] = found.item;
  const saved = await saveData(env, found.data.items);
  return Response.json({ item: found.item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
