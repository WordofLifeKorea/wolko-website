/**
 * POST /api/expense/receipt   body: { name, type, data(base64 dataURL) }
 *      → 영수증을 KV에 임시 저장하고 { id } 반환. 리포트 제출 시 rows[].receipts 에 이 id를 담는다.
 *        (리포트 id가 아직 없으므로 업로더 이메일 아래에 임시 키로 저장 → 제출 때 리포트 키로 옮김)
 * GET  /api/expense/receipt?reportId=&fileId=   → 영수증 파일 (제출자 / 승인자 / 회계담당만)
 *
 * 화면에서 이미지를 미리 줄여서 올리므로 대부분 수백 KB 수준이다.
 */
import {
  RECEIPT_PREFIX, REPORT_PREFIX, MAX_RECEIPT_BYTES, ALLOWED_RECEIPT_TYPES,
  err, clip, expenseSession,
} from '../../lib/expenses.js';

const tempKey = (email, id) => `${RECEIPT_PREFIX}tmp:${email}:${id}`;
const finalKey = (reportId, id) => `${RECEIPT_PREFIX}${reportId}:${id}`;
const TEMP_TTL = 60 * 60 * 24 * 3; // 제출되지 못한 임시 파일은 3일 뒤 자동 삭제

function base64ToBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function onRequestPost({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }

  const type = clip(body.type, 60);
  const name = clip(body.name, 160) || 'receipt';
  if (!ALLOWED_RECEIPT_TYPES.includes(type)) return err('이미지(JPG/PNG/WebP/HEIC) 또는 PDF만 첨부할 수 있습니다.');
  if (typeof body.data !== 'string' || !body.data.includes(',')) return err('파일 데이터가 올바르지 않습니다.');

  let bytes;
  try { bytes = base64ToBytes(body.data); } catch { return err('파일을 읽을 수 없습니다.'); }
  if (bytes.length > MAX_RECEIPT_BYTES) return err('영수증 파일은 8MB 이하만 첨부할 수 있습니다.');

  const id = crypto.randomUUID();
  await env.CAMP_KV.put(tempKey(session.email, id), bytes, {
    expirationTtl: TEMP_TTL,
    metadata: { name, type, owner: session.email },
  });
  return Response.json({ ok: true, id, name, type }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

/**
 * 리포트 제출 직후 호출되는 내부용이 아니라, GET 시점에 임시 → 확정 이동을 지연 처리한다:
 * 리포트가 생성된 뒤 처음 열람할 때 임시 키(업로더 소유)에 있으면 확정 키로 복사한다.
 */
async function loadReceipt(env, report, fileId) {
  const final = await env.CAMP_KV.getWithMetadata(finalKey(report.id, fileId), 'arrayBuffer');
  if (final.value) return final;

  const tmp = await env.CAMP_KV.getWithMetadata(tempKey(report.submitterEmail, fileId), 'arrayBuffer');
  if (!tmp.value) return null;
  // 확정 키로 이동(영구 보관)
  await env.CAMP_KV.put(finalKey(report.id, fileId), tmp.value, { metadata: tmp.metadata });
  await env.CAMP_KV.delete(tempKey(report.submitterEmail, fileId));
  return tmp;
}

export async function onRequestGet({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const url = new URL(request.url);
  const reportId = clip(url.searchParams.get('reportId'), 80);
  const fileId = clip(url.searchParams.get('fileId'), 64);
  const report = reportId ? await env.CAMP_KV.get(`${REPORT_PREFIX}${reportId}`, 'json') : null;
  if (!report) return err('리포트를 찾을 수 없습니다.', 404);

  const isOwner = report.submitterEmail === session.email;
  const canSee = isOwner || session.isApprover || (session.isAccountant && ['approved', 'processed'].includes(report.status));
  if (!canSee) return err('열람 권한이 없습니다.', 403);

  const known = report.rows.some(r => r.receipts.some(f => f.id === fileId));
  if (!known) return err('영수증을 찾을 수 없습니다.', 404);

  const file = await loadReceipt(env, report, fileId);
  if (!file) return err('영수증 파일이 없습니다.', 404);

  const meta = file.metadata || {};
  return new Response(file.value, {
    headers: {
      'Content-Type': meta.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(meta.name || 'receipt')}`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
