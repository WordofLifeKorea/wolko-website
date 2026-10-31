/**
 * 캠프 크루(미성년자) 보호자 동의
 *   GET  /api/staff-consent?t=<토큰>  — 동의 화면에 보여 줄 내용 (지원자 이름 · 캠프 · 보호자 이름 · 현재 상태)
 *   POST /api/staff-consent           — body: { t, signerName, agree: true } → 지원서(캠프별 여러 건)에 동의를 기록
 * 토큰은 지원할 때 만들어 보호자에게만 문자·이메일로 보낸다(functions/lib/staffCrew.js).
 */
import { consentKey, isValidConsentToken, updateApplicationRegs } from '../lib/staffCrew.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function escHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadConsent(env, token) {
  if (!isValidConsentToken(token)) return null;
  const info = await env.CAMP_KV.get(consentKey(token), 'json');
  if (!info) return null;
  // 지원서가 지워졌으면(취소 등) 링크도 더는 쓰지 않는다
  const regs = [];
  for (const ref of info.regs || []) {
    const reg = await env.CAMP_KV.get(`camp:${ref.campId}:reg:${ref.regId}`, 'json');
    if (reg) regs.push(reg);
  }
  if (!regs.length) return null;
  return { info, regs };
}

function publicView({ info, regs }) {
  const consent = regs[0].parentConsent || {};
  return {
    applicantName: info.applicantName,
    campNames: info.campNames,
    guardianName: info.guardianName,
    status: consent.status === 'agreed' ? 'agreed' : 'pending',
    agreedAt: consent.agreedAt || null,
  };
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('t');
  const found = await loadConsent(env, token);
  if (!found) return Response.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 404, headers: CORS });
  return Response.json(publicView(found), { headers: CORS });
}

async function notifyAdmin(env, info, signerName) {
  if (!env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'WOLKO Camp <contact@wolko.org>',
      to: ['wolkorea1@gmail.com'],
      subject: `[크루 보호자 동의] ${info.applicantName} · ${info.campNames || ''}`,
      html: `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.8;color:#10252e;">
        <p><b>${escHtml(info.applicantName)}</b> 님의 캠프 크루 지원에 보호자(${escHtml(signerName)})가 동의했습니다.</p>
        <p>지원한 캠프: ${escHtml(info.campNames || '—')}</p>
        <p>이제 <a href="https://wolko.org/portal/wolkoadmin" style="color:#004f68;">캠프 관리자</a>의 스태프 목록에서 수락할 수 있습니다.</p>
      </div>`,
    }),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const found = await loadConsent(env, body.t);
    if (!found) return Response.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 404, headers: CORS });
    const signerName = String(body.signerName || '').trim().slice(0, 60);
    if (body.agree !== true || !signerName) {
      return Response.json({ error: '보호자 성함을 입력하고 동의에 체크해 주세요.' }, { status: 400, headers: CORS });
    }
    if (publicView(found).status === 'agreed') return Response.json(publicView(found), { headers: CORS });

    const agreedAt = new Date().toISOString();
    const updated = await updateApplicationRegs(env, found.info.regs, reg => ({
      ...reg,
      parentConsent: { ...(reg.parentConsent || {}), status: 'agreed', agreedAt, signerName },
    }));
    context.waitUntil(notifyAdmin(env, found.info, signerName).catch(e => console.error('crew consent admin mail failed:', e)));
    return Response.json(publicView({ info: found.info, regs: updated }), { headers: CORS });
  } catch (e) {
    console.error('staff-consent error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
