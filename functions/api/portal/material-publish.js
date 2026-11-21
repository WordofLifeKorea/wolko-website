/**
 * 교재 배포 표시 — 포탈 자료의 어떤 파일을 공개 자료실(/resources/materials)에서 내려받게 할지.
 * GET  /api/portal/material-publish                    로그인한 포탈 멤버 누구나 — { files: { 'itemId:fileId': { on, at, by } } }
 * POST /api/portal/material-publish { itemId, fileId, on }   admin/master 만 — 표시를 켜고 끈다
 * 표시는 자료 기록과 따로(matdl:pub:v1) 저장한다 — 파일을 교체해도 표시가 사라지지 않는다.
 */
import { sessionFor, canWrite, readData, filesOf, error, text } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { readPublished, savePublished, pubKey, isPdfFile } from '../../lib/materials.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  if (!(await sessionFor(request, env))) return error('포탈 로그인이 필요합니다.', 401);
  const pub = await readPublished(env);
  return Response.json({ files: pub.files }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  if (!canWrite(session)) return error('배포 표시는 관리자만 바꿀 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }
  const itemId = text(body?.itemId, 80), fileId = text(body?.fileId, 80);
  if (!itemId || !fileId || typeof body?.on !== 'boolean') return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const item = data.items.find((i) => i.id === itemId);
  const file = item && filesOf(item).find((f) => f.id === fileId);
  if (!file) return error('자료나 파일을 찾을 수 없습니다.', 404);

  const pub = await readPublished(env);
  const key = pubKey(itemId, fileId);
  if (body.on) {
    const account = await getAccount(env, session.email);
    pub.files[key] = { on: true, at: new Date().toISOString(), by: account?.name || session.email };
  } else {
    delete pub.files[key];
  }
  await savePublished(env, pub);
  return Response.json({ key, entry: pub.files[key] || null, pdf: isPdfFile(file) }, { headers: CORS });
}
