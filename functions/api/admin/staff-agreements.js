/**
 * GET /api/admin/staff-agreements — 스태프 · 크루 필수 서약서 작성 현황
 *   → { required: [{ id, title, version, perCamp }], signed: { 'a@b.org': ['faith', 'rules', 'childprotection@캠프id'] } }  (캠프마다 쓰는 문서는 '문서@캠프id')
 * 지원서 목록(신청자 관리)이 '서약서 2/3' 표시에 쓴다(캠프 트레이닝 위크에 작성 — 수락 조건이 아니다). 이메일과 문서 id 만 있고 서명 그림은 없다.
 * 볼 수 있는 사람: 스태프 수락과 같은 범위(관리자 · 마스터, 신청자 목록 편집 담당).
 */
import { parseHubSessionToken, portalSession } from '../../lib/hubAccounts.js';
import { isCampRegistrationEditor } from '../../lib/campRegistrationAccess.js';
import { requiredDocs, signedMap } from '../../lib/staffAgreements.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

async function verifyStaffManager(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (env.ADMIN_PASSWORD && token) {
    const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
    if (session && (session.role === 'admin' || session.role === 'master')) return { email: session.email };
  }
  const session = await portalSession(request, env);
  if (session && isCampRegistrationEditor(session.email)) return { email: session.email };
  return null;
}

export async function onRequestGet({ request, env }) {
  if (!env.CAMP_KV) return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: H });
  if (!(await verifyStaffManager(request, env))) {
    const signedIn = await portalSession(request, env);
    return Response.json({ error: signedIn ? '볼 수 있는 권한이 없습니다.' : '인증이 필요합니다.' }, { status: signedIn ? 403 : 401, headers: H });
  }
  return Response.json({ required: requiredDocs().map((d) => ({ id: d.id, title: d.ko.title, titleEn: d.en.title, version: d.version, perCamp: !!d.perCamp })), signed: await signedMap(env) }, { headers: H });
}
