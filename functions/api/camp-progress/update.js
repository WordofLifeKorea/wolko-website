const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const TEAM_COLORS = new Set(['', 'red', 'blue', 'yellow', 'green']);
const ALLOWED_FIELDS = new Set(['saved', 'dedicated', 'testimony', 'counselorMemo', 'teamColor', 'counselorRegId']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCounselorStaff(reg) {
  const teams = String(reg?.serviceArea || reg?.notes || '').split(',').map(team => team.trim());
  return reg?.registrationType === 'staff' && teams.includes('상담자');
}

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-camp-progress') return null;
    const role = parts[1];
    const email = parts[2] === 'admin' ? '' : normalizeEmail(parts[2]);
    const expires = parseInt(parts[3], 10);
    if (!['admin', 'counselor'].includes(role) || !expires || Date.now() > expires) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    if (!ok) return null;
    if (role === 'counselor') {
      const account = await env.CAMP_KV.get(`camp-progress:account:${email}`, 'json');
      if (!account || account.disabled) return null;
    }
    return { role, email };
  } catch {
    return null;
  }
}

async function counselorRegIdsForEmail(env, campId, email) {
  const registrations = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: `camp:${campId}:reg:`, ...(cursor ? { cursor } : {}), limit: 1000 });
    const regs = await Promise.all(result.keys.map(key => env.CAMP_KV.get(key.name, 'json')));
    registrations.push(...regs.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return registrations
    .filter(reg => isCounselorStaff(reg) && normalizeEmail(reg.email) === email)
    .map(reg => reg.regId);
}

function normalizeValue(field, value) {
  if (field === 'saved' || field === 'dedicated') return !!value;
  if (field === 'teamColor') {
    const color = String(value || '').trim();
    if (!TEAM_COLORS.has(color)) throw new Error('팀 색상 값이 올바르지 않습니다.');
    return color;
  }
  if (field === 'counselorRegId') {
    const v = String(value || '').trim();
    if (v && !/^[a-zA-Z0-9_-]+$/.test(v)) throw new Error('카운슬러 ID 형식이 올바르지 않습니다.');
    return v;
  }
  return String(value || '').trim().slice(0, 4000);
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const session = await verifyToken(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400, headers: CORS });
  }

  const campId = String(body.campId || '').trim();
  const regId = String(body.regId || '').trim();
  const field = String(body.field || '').trim();
  const hasParticipantIndex = body.participantIndex !== null && body.participantIndex !== undefined;
  const participantIndex = hasParticipantIndex ? Number(body.participantIndex) : null;

  if (!/^[a-zA-Z0-9_-]+$/.test(campId) || !regId || !ALLOWED_FIELDS.has(field)) {
    return Response.json({ error: '수정 요청이 올바르지 않습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const regKey = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(regKey, 'json');
    if (!reg) {
      return Response.json({ error: '캠퍼 정보를 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    const allowedCounselors = session.role === 'admin'
      ? null
      : await counselorRegIdsForEmail(env, campId, session.email);
    const nextValue = normalizeValue(field, body.value);
    let updatedReg;

    if (hasParticipantIndex) {
      if (reg.registrationType !== 'group') {
        return Response.json({ error: '단체 신청 학생 정보가 아닙니다.' }, { status: 400, headers: CORS });
      }
      const groupCount = Math.max(parseInt(reg.groupCount, 10) || 0, Array.isArray(reg.participants) ? reg.participants.length : 0);
      if (!Number.isInteger(participantIndex) || participantIndex < 0 || participantIndex >= groupCount) {
        return Response.json({ error: '학생 번호가 올바르지 않습니다.' }, { status: 400, headers: CORS });
      }
      const current = reg.participants?.[participantIndex] || {};
      if (session.role !== 'admin' && !allowedCounselors.includes(current.counselorRegId || '')) {
        return Response.json({ error: '담당 캠퍼만 수정할 수 있습니다.' }, { status: 403, headers: CORS });
      }
      const participants = Array.from({ length: groupCount }, (_, index) =>
        index === participantIndex
          ? { ...(reg.participants?.[index] || {}), [field]: nextValue }
          : { ...(reg.participants?.[index] || {}) }
      );
      updatedReg = { ...reg, participants };
    } else if (reg.registrationType === 'staff') {
      // 카운슬러(스태프) 자신의 teamColor 수정은 본인 또는 admin만
      if (field !== 'teamColor') {
        return Response.json({ error: '스태프 레코드에는 팀 색상만 수정할 수 있습니다.' }, { status: 400, headers: CORS });
      }
      if (session.role !== 'admin' && normalizeEmail(reg.email) !== session.email) {
        return Response.json({ error: '본인의 팀 색상만 수정할 수 있습니다.' }, { status: 403, headers: CORS });
      }
      updatedReg = { ...reg, teamColor: nextValue };
    } else {
      if (session.role !== 'admin' && !allowedCounselors.includes(reg.counselorRegId || '')) {
        return Response.json({ error: '담당 캠퍼만 수정할 수 있습니다.' }, { status: 403, headers: CORS });
      }
      updatedReg = { ...reg, [field]: nextValue };
    }

    await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
    return Response.json({ ok: true, reg: updatedReg }, { headers: CORS });
  } catch (error) {
    console.error('camp progress update error:', error);
    return Response.json({ error: error.message || '저장하지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
