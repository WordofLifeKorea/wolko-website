/**
 * GET /api/materials/get?t=토큰  공개(일회용 주소) — 교재 파일 내려받기. 처음 받을 때 한 번만 기록한다.
 *  - 같은 주소로 다시 받아도(끊겨서 다시 · 새로고침) 기록은 그대로 한 줄 — 횟수는 신청 한 번이 한 번.
 *  - PDF 는 받는 사람 이름 · 날짜 · 확인번호를 쪽마다 아래에 찍어서 준다. 찍지 못하면 원본을 주고 기록에 이유를 남긴다.
 *  - 파일은 이 서버를 거쳐 주므로 구글 · 브라우저가 파일을 캐시해 횟수를 놓치는 일이 없다(no-store).
 */
import { readData } from '../../lib/portalResources.js';
import { readStoredResourceFile } from '../../lib/portalResourceVersions.js';
import { stampPdf, loadStampFont } from '../../lib/pdfStamp.js';
import { readPublished, findPublished, writeDownloadLog, stampLabelOf, kstDate, TOKEN_PREFIX, STAMP_STATUS_CODE, clean } from '../../lib/materials.js';

const errorPage = (message, status) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOLKO</title><body style="font:16px/1.7 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 20px;color:#10252e"><p>${message}</p><p><a href="/resources/materials" style="color:#004f68">교재 목록으로 · Back to materials</a></p>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

const GONE = '이 내려받기 주소는 만료됐어요(10분 안에 써야 해요). 교재 목록에서 다시 신청해 주세요.<br>This download link has expired (it works for 10 minutes). Please request it again.';

async function handle({ env, request }, headOnly) {
  if (!env.CAMP_KV) return errorPage('서버 설정이 필요합니다.', 500);
  const token = clean(new URL(request.url).searchParams.get('t'), 80);
  const tokenKey = `${TOKEN_PREFIX}${token}`;
  const rec = token ? await env.CAMP_KV.get(tokenKey, 'json') : null;
  if (!rec) return errorPage(GONE, 410);

  const [data, pub] = await Promise.all([readData(env), readPublished(env)]);
  if (!findPublished(data.items, pub, rec.itemId, rec.fileId)) return errorPage('이 교재는 지금 배포하지 않아요.<br>This material is no longer available.', 410);
  const stored = await readStoredResourceFile(env, rec.itemId, rec.fileId);
  if (!stored) return errorPage('파일을 찾을 수 없어요. 월코에 알려 주세요.<br>File not found. Please let WOLKO know.', 404);

  const fileName = stored.metadata?.fileName || rec.fileName || 'material';
  const isPdf = rec.pdf || /\.pdf$/i.test(fileName) || /pdf/i.test(stored.metadata?.fileType || '');
  const baseHeaders = {
    'Content-Type': stored.metadata?.fileType || (isPdf ? 'application/pdf' : 'application/octet-stream'),
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
  };
  if (headOnly) return new Response(null, { headers: baseHeaders });

  let bytes = stored.bytes, status = 'none';
  if (isPdf) {
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
  return new Response(bytes, { headers: { ...baseHeaders, 'Content-Length': String(bytes.byteLength), 'X-Wolko-Stamp': status } });
}

export const onRequestGet = (ctx) => handle(ctx, false);
export const onRequestHead = (ctx) => handle(ctx, true);
