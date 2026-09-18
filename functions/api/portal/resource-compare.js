import { sessionFor, text, readData, error, filesOf } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { createFileAccessToken, onlyOfficeOrigin, onlyOfficeSecret, signJwt } from '../../lib/onlyoffice.js';
import { readStoredResourceFile, readStoredResourceVersion, versionsOf } from '../../lib/portalResourceVersions.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OUTPUT_NAME = 'WOLKO-Comparison.docx';

function appOrigin(request, env) {
  const configured = String(env.PUBLIC_SITE_URL || '').trim();
  try { return configured ? new URL(configured).origin : new URL(request.url).origin; }
  catch { return new URL(request.url).origin; }
}

function isDocx(file) {
  return /\.docx$/i.test(file?.fileName || '') || file?.fileType === DOCX_TYPE;
}

function safeKey(value) {
  return String(value || crypto.randomUUID()).replace(/[^A-Za-z0-9._=-]/g, '').slice(0, 96);
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  const secret = onlyOfficeSecret(env);
  if (!secret) return error('문서 편집 서버의 서명이 설정되지 않았습니다.', 503);

  const body = await request.json().catch(() => ({}));
  const id = text(body.id, 80);
  const fileId = text(body.fileId, 80);
  const versionId = text(body.versionId, 80);
  const lang = body.lang === 'en' ? 'en' : 'ko';
  if (!id || !fileId || !versionId) return error('비교할 문서 버전이 필요합니다.', 400);

  const data = await readData(env);
  const item = data.items.find(entry => entry.id === id);
  const file = filesOf(item).find(entry => entry.id === fileId);
  const version = file && versionsOf(file).find(entry => entry.id === versionId);
  if (!item || !file || !version) return error('비교할 문서 버전을 찾을 수 없습니다.', 404);
  if (!isDocx(file)) return error('DOCX 파일만 비교할 수 있습니다.', 400);

  const [current, previous] = await Promise.all([
    readStoredResourceFile(env, id, fileId),
    readStoredResourceVersion(env, id, fileId, versionId),
  ]);
  if (!current || !previous) return error('비교할 문서 파일을 불러오지 못했습니다.', 404);

  const siteOrigin = appOrigin(request, env);
  const expires = Date.now() + 10 * 60 * 1000;
  const [currentToken, previousToken] = await Promise.all([
    createFileAccessToken({ id, fileId, expires }, secret),
    createFileAccessToken({ id, fileId, versionId, expires }, secret),
  ]);
  const sourceUrl = selectedVersionId => {
    const url = new URL(`${siteOrigin}/api/portal/onlyoffice-file`);
    url.searchParams.set('id', id);
    url.searchParams.set('fileId', fileId);
    if (selectedVersionId) url.searchParams.set('versionId', selectedVersionId);
    url.searchParams.set('token', selectedVersionId ? previousToken : currentToken);
    return url.toString();
  };

  const builderPayload = {
    async: false,
    url: `${siteOrigin}/onlyoffice/compare-docx.js?v=1`,
    argument: {
      currentUrl: sourceUrl(''),
      previousUrl: sourceUrl(versionId),
    },
  };
  const builderRequest = {
    ...builderPayload,
    token: await signJwt({ payload: builderPayload }, secret),
  };
  const documentServerUrl = onlyOfficeOrigin(env);
  let builderResponse;
  try {
    builderResponse = await fetch(`${documentServerUrl}/docbuilder?shardkey=${encodeURIComponent(safeKey(`${fileId}-${versionId}`))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(builderRequest),
    });
  } catch {
    return error('문서 비교 서버에 연결하지 못했습니다.', 502);
  }
  const built = await builderResponse.json().catch(() => ({}));
  const resultUrl = built?.urls?.[OUTPUT_NAME];
  if (!builderResponse.ok || !built.end || !resultUrl) {
    console.error('ONLYOFFICE document comparison failed', builderResponse.status, built?.error || built);
    return error('문서 비교본을 만들지 못했습니다.', 502);
  }
  try {
    if (new URL(resultUrl).origin !== documentServerUrl) throw new Error('Unexpected comparison result origin');
  } catch {
    return error('문서 비교 결과 주소가 올바르지 않습니다.', 502);
  }

  const account = await getAccount(env, session.email);
  const versionLabel = version.isOriginal ? (lang === 'ko' ? '원본' : 'Original') : version.label;
  const comparisonLabel = lang === 'ko'
    ? `${versionLabel} → 현재 저장본 변경 사항`
    : `${versionLabel} → current saved version changes`;
  const config = {
    document: {
      fileType: 'docx',
      key: `wolko-compare-${safeKey(built.key)}`,
      title: `${file.fileName} (${comparisonLabel})`,
      url: resultUrl,
      permissions: {
        chat: false,
        comment: false,
        download: true,
        edit: false,
        print: true,
        review: false,
      },
    },
    documentType: 'word',
    editorConfig: {
      lang,
      mode: 'view',
      user: { id: session.email, name: account?.name || session.email },
      customization: {
        compactHeader: true,
        // 리본 아이콘 줄을 한 줄로 줄여서 문서가 보이는 영역을 넓힌다
        compactToolbar: true,
        help: true,
        review: {
          hideReviewDisplay: false,
          showReviewChanges: true,
          reviewDisplay: 'markup',
          trackChanges: false,
          hoverMode: false,
        },
      },
    },
    height: '100%',
    type: /Android|iPhone|iPad|Mobile/i.test(request.headers.get('User-Agent') || '') ? 'mobile' : 'desktop',
    width: '100%',
  };
  config.token = await signJwt(config, secret);
  return Response.json({ documentServerUrl, comparisonLabel, config }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
