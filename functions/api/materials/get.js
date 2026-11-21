/**
 * GET /api/materials/get?t=토큰  공개(일회용 주소) — 교재 파일 내려받기. 처음 받을 때 한 번만 기록한다.
 *  - 같은 주소로 다시 받아도(끊겨서 다시 · 새로고침) 기록은 그대로 한 줄 — 횟수는 신청 한 번이 한 번.
 *  - PDF 는 받는 사람 이름 · 날짜 · 확인번호를 쪽마다 아래에 찍어서 준다. 찍지 못하면 원본을 주고 기록에 이유를 남긴다.
 *  - 파일은 이 서버를 거쳐 주므로 구글 · 브라우저가 파일을 캐시해 횟수를 놓치는 일이 없다(no-store).
 */
import { readData } from '../../lib/portalResources.js';
import { readStoredResourceFile, resourceFileKey } from '../../lib/portalResourceVersions.js';
import { fileKV } from '../../lib/nasFileKV.js';
import { stampPdf, loadStampFont, MAX_STAMP_BYTES } from '../../lib/pdfStamp.js';
import { readPublished, findPublished, writeDownloadLog, stampLabelOf, kstDate, TOKEN_PREFIX, STAMP_STATUS_CODE, clean } from '../../lib/materials.js';

const errorPage = (message, status) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOLKO</title><body style="font:16px/1.7 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 20px;color:#10252e"><p>${message}</p><p><a href="/resources/materials" style="color:#004f68">교재 목록으로 · Back to materials</a></p>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

/**
 * 교재 파일은 NAS(없으면 KV)에 있다 — fileKV 가 둘을 같게 읽어 준다.
 * 워터마크를 찍을 PDF(12MB 이하, 크기를 아는 것)만 통째로 읽고, 그보다 크거나 크기를 모르는 파일은 메모리에 올리지 않고 받는 대로 그대로 흘려보낸다.
 * (예전 JSON 형식으로 저장된 파일은 메타데이터가 없어 한 번에 읽는다 — 작은 파일뿐이다)
 */
async function openStored(env, rec, found, wantStamp) {
  if (wantStamp) {
    const stored = await readStoredResourceFile(env, rec.itemId, rec.fileId);
    return stored ? { bytes: stored.bytes, metadata: stored.metadata } : null;
  }
  const s = await fileKV(env).getWithMetadata(resourceFileKey(rec.itemId, rec.fileId), 'stream');
  if (s?.value == null) return null;
  if (s.metadata?.fileName) return { stream: s.value, metadata: s.metadata };
  await s.value?.cancel?.();
  const stored = await readStoredResourceFile(env, rec.itemId, rec.fileId);   // 예전 형식
  return stored ? { bytes: stored.bytes, metadata: stored.metadata } : null;
}

const GONE = '이 내려받기 주소는 만료됐어요(10분 안에 써야 해요). 교재 목록에서 다시 신청해 주세요.<br>This download link has expired (it works for 10 minutes). Please request it again.';

async function handle({ env, request }, headOnly) {
  if (!env.CAMP_KV) return errorPage('서버 설정이 필요합니다.', 500);
  const token = clean(new URL(request.url).searchParams.get('t'), 80);
  const tokenKey = `${TOKEN_PREFIX}${token}`;
  const rec = token ? await env.CAMP_KV.get(tokenKey, 'json') : null;
  if (!rec) return errorPage(GONE, 410);

  const [data, pub] = await Promise.all([readData(env), readPublished(env)]);
  const found = findPublished(data.items, pub, rec.itemId, rec.fileId);
  if (!found) return errorPage('이 교재는 지금 배포하지 않아요.<br>This material is no longer available.', 410);
  const declaredSize = Number(found.file.fileSize) || 0;
  const pdfByName = rec.pdf || /\.pdf$/i.test(found.file.fileName || '') || /pdf/i.test(found.file.fileType || '');
  const wantStamp = pdfByName && declaredSize > 0 && declaredSize <= MAX_STAMP_BYTES;
  const stored = await openStored(env, rec, found, wantStamp);
  if (!stored) return errorPage('파일을 찾을 수 없어요. 월코에 알려 주세요.<br>File not found. Please let WOLKO know.', 404);

  const fileName = stored.metadata?.fileName || rec.fileName || 'material';
  const isPdf = pdfByName || /\.pdf$/i.test(fileName) || /pdf/i.test(stored.metadata?.fileType || '');
  const baseHeaders = {
    'Content-Type': stored.metadata?.fileType || (isPdf ? 'application/pdf' : 'application/octet-stream'),
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
  };
  if (headOnly) { await stored.stream?.cancel?.(); return new Response(null, { headers: baseHeaders }); }

  let bytes = stored.bytes, status = 'none';
  if (stored.stream) {
    // 큰 파일 · 크기를 모르는 파일: 워터마크 없이 그대로(PDF 였다면 기록에 '크기 초과'로 남는다)
    if (isPdf) status = 'skipped-size';
  } else if (isPdf) {
    const font = await loadStampFont();
    const r = await stampPdf(bytes, { label: stampLabelOf(rec), code: rec.code, date: kstDate(Date.now()), font });
    bytes = r.bytes; status = r.status;
  }

  // 처음 받을 때만 기록(주소를 다시 열어도 한 줄). 기록이 실패해도 받는 사람에게는 파일을 준다
  if (!rec.logged) {
    try {
      await env.CAMP_KV.put(tokenKey, JSON.stringify({ ...rec, logged: true }), { expirationTtl: 600 });
      await writeDownloadLog(env, { ...rec, stamp: STAMP_STATUS_CODE[status] || status });
    } catch { /* 기록 실패는 내려받기를 막지 않는다 */ }
  }
  if (stored.stream) return new Response(stored.stream, { headers: { ...baseHeaders, ...(declaredSize ? { 'Content-Length': String(declaredSize) } : {}), 'X-Wolko-Stamp': status } });
  return new Response(bytes, { headers: { ...baseHeaders, 'Content-Length': String(bytes.byteLength), 'X-Wolko-Stamp': status } });
}

export const onRequestGet = (ctx) => handle(ctx, false);
export const onRequestHead = (ctx) => handle(ctx, true);
