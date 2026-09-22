/**
 * POST   /api/rsvp            — 이벤트 참석 신청 접수
 * GET    /api/rsvp?eventId=   — 관리자용 신청 목록 (admin/master)
 * DELETE /api/rsvp?eventId=&rsvpId= — 관리자용 신청 삭제
 *
 * KV: rsvp:{eventId}:{rsvpId}          신청 한 건
 *     rsvp:{eventId}:email:{email}     같은 이메일 중복 신청 방지
 */
import { parseHubSessionToken } from '../lib/hubAccounts.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const EVENTS = {
  'thanksgiving-night': { ko: '감사의 밤', en: 'Night of Thanksgiving' },
};

const MAX_PARTY_SIZE = 10;

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function escHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  return !!session && (session.role === 'admin' || session.role === 'master');
}

function buildEmailHtml(rsvp) {
  const kstTime = new Date(rsvp.createdAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const row = (label, value) => `
        <tr>
          <td style="padding:8px 0;color:#5a6f79;font-size:13px;width:130px;">${label}</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600;">${value}</td>
        </tr>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f8fb;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,79,104,0.08);">
    <div style="background:linear-gradient(135deg,#004f68 0%,#007ea1 100%);padding:32px 36px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(115,209,245,0.9);margin-bottom:8px;">WOLKO Event RSVP</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">${escHtml(rsvp.eventTitleKo)} 참석 신청이 접수되었습니다</div>
    </div>
    <div style="padding:32px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row('이름', escHtml(rsvp.name))}
        ${row('연락처', escHtml(rsvp.phone))}
        ${row('이메일', `<a href="mailto:${escHtml(rsvp.email)}" style="color:#007ea1;text-decoration:none;">${escHtml(rsvp.email)}</a>`)}
        ${row('참석 인원', `${rsvp.partySize}명 (본인 포함)`)}
        ${rsvp.notes ? `
        <tr>
          <td colspan="2" style="padding:12px 0 4px;color:#5a6f79;font-size:13px;">남기신 말씀</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;background:#f4f8fb;border-radius:10px;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escHtml(rsvp.notes)}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="padding:20px 36px;background:#f4f8fb;border-top:1px solid rgba(0,79,104,0.1);font-size:12px;color:#5a6f79;line-height:1.6;">
      신청 시각: ${kstTime} (KST) &nbsp;·&nbsp; 신청 ID: ${escHtml(rsvp.rsvpId)}
    </div>
  </div>
</body>
</html>`;
}

async function sendRsvpEmail(env, rsvp) {
  if (!env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WOLKO <contact@wolko.org>',
      to: ['wolkorea1@gmail.com'],
      reply_to: rsvp.email,
      subject: `[참석 신청] ${rsvp.name} · ${rsvp.eventTitleKo} (${rsvp.partySize}명)`,
      html: buildEmailHtml(rsvp),
    }),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const eventId = clean(data.eventId, 60);
    const event = EVENTS[eventId];
    const name = clean(data.name, 60);
    const phone = clean(data.phone, 30);
    const email = clean(data.email, 120).toLowerCase();
    const partySize = Number(data.partySize);
    const notes = clean(data.notes, 1000);

    if (!event || !name || !phone || !email) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > MAX_PARTY_SIZE) {
      return Response.json({ error: '참석 인원을 다시 선택해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: '이메일 주소 형식이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }

    const dupeKey = `rsvp:${eventId}:email:${email}`;
    if (await env.CAMP_KV.get(dupeKey)) {
      return Response.json({ error: '이미 신청하신 이메일 주소입니다. 변경이 필요하시면 연락해주세요.' }, { status: 409, headers: CORS });
    }

    const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rsvp = {
      rsvpId,
      eventId,
      eventTitleKo: event.ko,
      eventTitleEn: event.en,
      name,
      phone,
      email,
      partySize,
      notes,
      createdAt: new Date().toISOString(),
    };

    await Promise.all([
      env.CAMP_KV.put(`rsvp:${eventId}:${rsvpId}`, JSON.stringify(rsvp)),
      env.CAMP_KV.put(dupeKey, rsvpId),
    ]);

    context.waitUntil(sendRsvpEmail(env, rsvp).catch(e => console.error('rsvp email failed:', e)));

    return Response.json({ success: true }, { headers: CORS });

  } catch (e) {
    console.error('rsvp error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!await isAdmin(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
  }

  const eventId = clean(new URL(request.url).searchParams.get('eventId') || 'thanksgiving-night', 60);
  const list = await env.CAMP_KV.list({ prefix: `rsvp:${eventId}:` });
  const rsvps = [];
  for (const key of list.keys) {
    if (key.name.includes(':email:')) continue;
    const raw = await env.CAMP_KV.get(key.name);
    if (raw) { try { rsvps.push(JSON.parse(raw)); } catch (e) { /* 손상된 값은 건너뛴다 */ } }
  }
  rsvps.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const totalGuests = rsvps.reduce((sum, r) => sum + (Number(r.partySize) || 0), 0);

  return Response.json({ eventId, rsvps, totalRsvps: rsvps.length, totalGuests }, { headers: CORS });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!await isAdmin(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
  }

  const params = new URL(request.url).searchParams;
  const eventId = clean(params.get('eventId'), 60);
  const rsvpId = clean(params.get('rsvpId'), 80);
  if (!eventId || !rsvpId) {
    return Response.json({ error: 'eventId와 rsvpId가 필요합니다.' }, { status: 400, headers: CORS });
  }

  const raw = await env.CAMP_KV.get(`rsvp:${eventId}:${rsvpId}`);
  if (raw) {
    try {
      const rsvp = JSON.parse(raw);
      if (rsvp.email) await env.CAMP_KV.delete(`rsvp:${eventId}:email:${rsvp.email}`);
    } catch (e) { /* 이메일 중복 키가 없으면 그대로 진행 */ }
  }
  await env.CAMP_KV.delete(`rsvp:${eventId}:${rsvpId}`);

  return Response.json({ success: true }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
