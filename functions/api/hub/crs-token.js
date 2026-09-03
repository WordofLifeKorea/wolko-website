/**
 * POST /api/hub/crs-token
 * Authorization: Bearer <허브 세션 토큰> — admin/master 권한만 허용.
 *
 * CRS(Firebase Auth 프로젝트: wolko-crs)에 SSO로 로그인하기 위한 Firebase
 * 커스텀 토큰을 발급한다. uid는 허브 이메일을 그대로 사용하므로, CRS
 * Firebase 프로젝트에 해당 uid의 사용자가 없으면 최초 로그인 시 자동 생성된다.
 *
 * 필요 환경변수: FIREBASE_CRS_SERVICE_ACCOUNT
 *   (Firebase 콘솔 → wolko-crs 프로젝트 → 프로젝트 설정 → 서비스 계정 →
 *    "새 비공개 키 생성"으로 받은 JSON 파일 내용을 그대로 문자열로 저장)
 */
import { parseHubSessionToken } from '../../lib/hubAccounts.js';
import { createFirebaseCustomToken } from '../../lib/firebaseAdmin.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.FIREBASE_CRS_SERVICE_ACCOUNT) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
  if (!session) {
    return Response.json({ error: '허브 로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }
  if (session.role !== 'admin' && session.role !== 'master') {
    return Response.json({ error: 'CRS 접근 권한이 없습니다.' }, { status: 403, headers: CORS });
  }

  try {
    const customToken = await createFirebaseCustomToken(
      env.FIREBASE_CRS_SERVICE_ACCOUNT,
      session.email,
      { hubRole: session.role }
    );
    return Response.json({ customToken, email: session.email }, { headers: CORS });
  } catch (e) {
    console.error('crs-token error:', e);
    return Response.json({ error: 'CRS 토큰 발급에 실패했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
