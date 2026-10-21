import { verifyToken } from '../../lib/hubAccounts.js';
import { storageFor } from '../../lib/campteamStorage.js';

/** 서명된 주소로 파일 본문을 내려준다 (서명이 맞고 5분 안일 때만). 브라우저 <img>/<iframe>/<a> 에서 그대로 열 수 있다. */
export async function onRequestGet({ env, request }) {
  const deny = (status, msg) => new Response(msg, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!env.DB || !env.ADMIN_PASSWORD) return deny(500, 'Server not configured');
  const t = new URL(request.url).searchParams.get('t') || '';
  const data = await verifyToken(env.ADMIN_PASSWORD, t);
  const parts = data ? data.split('|') : [];
  if (parts.length !== 5 || parts[0] !== 'campfile') return deny(403, 'Invalid link');
  const [, fileId, versionId, exp, disposition] = parts;
  if (!(Number(exp) > Date.now())) return deny(403, 'Link expired');
  const v = await env.DB.prepare(`SELECT v.fileName, v.mime, v.storageKey, v.backend, v.sizeBytes FROM file_versions v JOIN files f ON f.id = v.fileId
    WHERE v.id = ?1 AND v.fileId = ?2 AND v.deletedAt IS NULL AND f.deletedAt IS NULL`).bind(versionId, fileId).first();
  if (!v) return deny(404, 'Not found');
  const storage = storageFor(env);
  if (!storage || storage.backend !== v.backend) return deny(503, 'Storage unavailable');
  const obj = await storage.get(v.storageKey);
  if (!obj) return deny(404, 'File missing');
  const inline = disposition === 'inline';
  return new Response(obj.body, { headers: {
    'Content-Type': v.mime,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(v.fileName)}`,
    ...(v.sizeBytes ? { 'Content-Length': String(v.sizeBytes) } : {}),
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
  } });
}
