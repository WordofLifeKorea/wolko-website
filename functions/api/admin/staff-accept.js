/**
 * POST /api/admin/staff-accept — 캠프 스태프 · 크루 지원서 수락
 *   body: { action: 'accept' | 'unaccept' | 'resend-consent', regId, campId }
 *   accept          — 수락. 크루는 보호자 동의가 끝난 지원서만 (그 전에는 409)
 *   unaccept        — 수락 취소
 *   resend-consent  — 크루 보호자에게 동의 링크를 다시 보낸다
 * 처리할 수 있는 사람: 관리자 · 마스터, 신청자 목록 편집 담당(functions/lib/campRegistrationAccess.js) — 신청 삭제와 같은 범위.
 */
import { parseHubSessionToken, portalSession } from '../../lib/hubAccounts.js';
import { isCampRegistrationEditor } from '../../lib/campRegistrationAccess.js';
import { canAccept, consentAppKey, consentKey, sendConsentRequest } from '../../lib/staffCrew.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

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

export async function onRequestPost({ request, env }) {
  const who = await verifyStaffManager(request, env);
  if (!who) {
    const signedIn = await portalSession(request, env);
    return Response.json({ error: signedIn ? '스태프 수락은 관리자 또는 신청자 목록 담당자만 할 수 있습니다.' : '인증이 필요합니다.' }, { status: signedIn ? 403 : 401, headers: CORS });
  }
  try {
    const { action, regId, campId } = await request.json();
    if (!regId || !campId) return Response.json({ error: 'regId와 campId가 필요합니다.' }, { status: 400, headers: CORS });
    const key = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(key, 'json');
    if (!reg || reg.registrationType !== 'staff') return Response.json({ error: '해당 스태프 지원서를 찾을 수 없습니다.' }, { status: 404, headers: CORS });

    if (action === 'accept') {
      if (reg.accepted) return Response.json({ success: true, reg }, { headers: CORS });
      if (!canAccept(reg)) {
        return Response.json({ error: '보호자 동의가 아직 완료되지 않아 수락할 수 없습니다.' }, { status: 409, headers: CORS });
      }
      const next = { ...reg, accepted: true, acceptedAt: new Date().toISOString(), acceptedBy: who.email };
      await env.CAMP_KV.put(key, JSON.stringify(next));
      return Response.json({ success: true, reg: next }, { headers: CORS });
    }

    if (action === 'unaccept') {
      const next = { ...reg, accepted: false, acceptedAt: null };
      delete next.acceptedBy;
      await env.CAMP_KV.put(key, JSON.stringify(next));
      return Response.json({ success: true, reg: next }, { headers: CORS });
    }

    if (action === 'resend-consent') {
      if (reg.role !== 'crew') return Response.json({ error: '크루 지원서만 보호자 동의가 필요합니다.' }, { status: 400, headers: CORS });
      if (reg.parentConsent?.status === 'agreed') return Response.json({ error: '이미 보호자가 동의했습니다.' }, { status: 409, headers: CORS });
      const token = await env.CAMP_KV.get(consentAppKey(reg.applicationId));
      const info = token && await env.CAMP_KV.get(consentKey(token), 'json');
      if (!info) return Response.json({ error: '동의 링크 정보를 찾을 수 없습니다.' }, { status: 404, headers: CORS });
      const sent = await sendConsentRequest(env, {
        token, applicantName: info.applicantName, campNames: info.campNames,
        guardianName: reg.guardianName, guardianPhone: reg.guardianPhone, guardianEmail: reg.guardianEmail,
      });
      if (!sent.length) return Response.json({ error: '문자·이메일을 보내지 못했습니다. 발송 설정을 확인해주세요.' }, { status: 500, headers: CORS });
      const lastSentAt = new Date().toISOString();
      let current = reg;
      for (const ref of info.regs || []) {
        const k = `camp:${ref.campId}:reg:${ref.regId}`;
        const r = await env.CAMP_KV.get(k, 'json');
        if (!r) continue;
        const next = { ...r, parentConsent: { ...(r.parentConsent || {}), sentVia: sent, lastSentAt } };
        await env.CAMP_KV.put(k, JSON.stringify(next));
        if (ref.regId === regId) current = next;
      }
      return Response.json({ success: true, sent, reg: current }, { headers: CORS });
    }

    return Response.json({ error: `알 수 없는 action: ${action}` }, { status: 400, headers: CORS });
  } catch (e) {
    console.error('staff-accept error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
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
