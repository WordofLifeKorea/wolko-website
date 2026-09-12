import { sessionFor, canWrite, text, readData, error, filesOf } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';
import { createFileAccessToken, onlyOfficeOrigin, onlyOfficeSecret, signJwt } from '../../lib/onlyoffice.js';
import { versionsOf } from '../../lib/portalResourceVersions.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function appOrigin(request, env) {
  const configured = String(env.PUBLIC_SITE_URL || '').trim();
  try { return configured ? new URL(configured).origin : new URL(request.url).origin; }
  catch { return new URL(request.url).origin; }
}

function documentKey(file, version) {
  const id = String(file.id || 'document').replace(/[^A-Za-z0-9._=-]/g, '').slice(0, 80);
  if (version) {
    const versionId = String(version.id || '').replace(/[^A-Za-z0-9._=-]/g, '').slice(0, 80);
    return `wolko-${id}-history-${versionId}`;
  }
  return `wolko-${id}-r${Number(file.documentRevision || 0)}`;
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);
  const secret = onlyOfficeSecret(env);
  if (!secret) return error('문서 편집 서버의 서명이 설정되지 않았습니다.', 503);

  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const fileId = text(url.searchParams.get('fileId'), 80);
  const versionId = text(url.searchParams.get('versionId'), 80);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ko';
  const data = await readData(env);
  const item = data.items.find(entry => entry.id === id);
  const file = item && filesOf(item).find(entry => entry.id === fileId);
  if (!item || !file) return error('파일을 찾을 수 없습니다.', 404);
  if (!/\.docx$/i.test(file.fileName || '') && file.fileType !== DOCX_TYPE) {
    return error('DOCX 파일만 편집할 수 있습니다.', 400);
  }
  const version = versionId ? versionsOf(file).find(entry => entry.id === versionId) : null;
  if (versionId && !version) return error('문서 버전을 찾을 수 없습니다.', 404);

  const siteOrigin = appOrigin(request, env);
  const accessToken = await createFileAccessToken({
    id, fileId, versionId, expires: Date.now() + 6 * 60 * 60 * 1000,
  }, secret);
  const actor = encodeURIComponent(session.email);
  const account = await getAccount(env, session.email);
  const editable = !version && canWrite(session);
  const documentUrl = new URL(`${siteOrigin}/api/portal/onlyoffice-file`);
  documentUrl.searchParams.set('id', id);
  documentUrl.searchParams.set('fileId', fileId);
  if (versionId) documentUrl.searchParams.set('versionId', versionId);
  documentUrl.searchParams.set('token', accessToken);
  const config = {
    document: {
      fileType: 'docx',
      key: documentKey(file, version),
      title: version ? `${file.fileName} (${version.isOriginal ? '원본' : version.label})` : file.fileName,
      url: documentUrl.toString(),
      permissions: {
        chat: true,
        comment: true,
        download: true,
        edit: editable,
        print: true,
        review: editable,
      },
    },
    documentType: 'word',
    editorConfig: {
      lang,
      mode: editable ? 'edit' : 'view',
      user: { id: session.email, name: account?.name || session.email },
      coEditing: { mode: 'fast', change: true },
      customization: {
        autosave: true,
        compactHeader: true,
        forcesave: true,
        help: true,
      },
    },
    height: '100%',
    type: /Android|iPhone|iPad|Mobile/i.test(request.headers.get('User-Agent') || '') ? 'mobile' : 'desktop',
    width: '100%',
  };
  if (!version) {
    config.editorConfig.callbackUrl = `${siteOrigin}/api/portal/onlyoffice-callback?id=${encodeURIComponent(id)}&fileId=${encodeURIComponent(fileId)}&actor=${actor}&revision=${Number(file.documentRevision || 0)}`;
  }
  config.token = await signJwt(config, secret);
  return Response.json({
    documentServerUrl: onlyOfficeOrigin(env),
    editable,
    versionLabel: version ? (version.isOriginal ? (lang === 'ko' ? '원본' : 'Original') : version.label) : '',
    config,
  }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
