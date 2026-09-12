import { text, error } from '../../lib/portalResources.js';
import { onlyOfficeSecret, verifyJwt } from '../../lib/onlyoffice.js';
import { readStoredResourceFile, readStoredResourceVersion } from '../../lib/portalResourceVersions.js';

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const secret = onlyOfficeSecret(env);
  if (!secret) return error('문서 편집 서버의 서명이 설정되지 않았습니다.', 503);
  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const fileId = text(url.searchParams.get('fileId'), 80);
  const versionId = text(url.searchParams.get('versionId'), 80);
  const payload = await verifyJwt(url.searchParams.get('token'), secret);
  if (!payload || payload.id !== id || payload.fileId !== fileId || String(payload.versionId || '') !== versionId) {
    return error('파일 링크가 만료되었거나 올바르지 않습니다.', 403);
  }

  const stored = versionId
    ? await readStoredResourceVersion(env, id, fileId, versionId)
    : await readStoredResourceFile(env, id, fileId);
  if (!stored) return error('파일을 찾을 수 없습니다.', 404);
  const fileName = stored.metadata?.fileName || 'document.docx';
  const fileType = stored.metadata?.fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return new Response(stored.bytes, {
    headers: {
      'Content-Type': fileType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
