const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const TEAM_OVERVIEW_KEYS = ['customTeams', 'personRoles', 'personTeams', 'campExclude', 'campRoles', 'customMembers'];
const SAVED_TIMINGS = new Set(['before', 'after']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCounselorStaff(reg) {
  const teams = String(reg?.serviceArea || reg?.notes || '').split(',').map(team => team.trim());
  return reg?.registrationType === 'staff' && teams.includes('상담자');
}

function normalizeStaffTeam(team) {
  return team === '수업' ? '티칭' : team;
}

function staffTeams(reg) {
  return String(reg?.serviceArea || reg?.notes || '')
    .split(',')
    .map(team => normalizeStaffTeam(team.trim()))
    .filter(Boolean);
}

function safeTeamColor(value) {
  return ['red', 'blue', 'yellow', 'green'].includes(value) ? value : '';
}

function isPlaceholderParticipantName(name, index) {
  const normalized = String(name || '').trim();
  return normalized === `학생 ${index + 1}` || normalized === `Student ${index + 1}`;
}

function isFinalConfirmed(reg) {
  if (reg.status === 'confirmed') return true;
  return reg.status === undefined && reg.confirmed === true;
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

async function listCampRegistrations(env, campId) {
  const registrations = [];
  const prefix = `camp:${campId}:reg:`;
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
    const regs = await Promise.all(result.keys.map(key => env.CAMP_KV.get(key.name, 'json')));
    registrations.push(...regs.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return registrations;
}

function emptyTeamOverview() {
  return {
    customTeams: [],
    personRoles: {},
    personTeams: {},
    campExclude: [],
    campRoles: {},
    customMembers: [],
  };
}

function normalizeTeamOverview(config) {
  const source = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const next = emptyTeamOverview();
  TEAM_OVERVIEW_KEYS.forEach(key => {
    next[key] = Array.isArray(next[key])
      ? (Array.isArray(source[key]) ? source[key] : [])
      : (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) ? source[key] : {});
  });
  return next;
}

function camperFromRegistration(reg) {
  return {
    camperId: reg.regId,
    regId: reg.regId,
    participantIndex: null,
    campId: reg.campId,
    name: reg.name || '이름 없음',
    grade: reg.grade || '',
    gender: reg.gender || '',
    church: reg.church || '',
    phone: reg.phone || '',
    email: reg.email || '',
    counselorRegId: reg.counselorRegId || '',
    teacherName: reg.teacherName || '',
    saved: !!reg.saved,
    savedTiming: SAVED_TIMINGS.has(reg.savedTiming) ? reg.savedTiming : '',
    dedicated: !!reg.dedicated,
    testimony: reg.testimony || '',
    counselorMemo: reg.counselorMemo || '',
    teamColor: safeTeamColor(reg.teamColor),
    registrationType: reg.registrationType || 'individual',
    confirmed: isFinalConfirmed(reg),
  };
}

function campersFromGroup(reg) {
  const count = Math.max(parseInt(reg.groupCount, 10) || 0, Array.isArray(reg.participants) ? reg.participants.length : 0);
  return Array.from({ length: count }, (_, index) => {
    const participant = reg.participants?.[index] || {};
    const participantName = String(participant.name || '').trim();
    if (!participantName || isPlaceholderParticipantName(participantName, index)) return null;
    return {
      camperId: `${reg.regId}:${index}`,
      regId: reg.regId,
      participantIndex: index,
      campId: reg.campId,
      name: participantName,
      grade: reg.groupCount ? `단체 ${reg.groupCount}명` : '',
      gender: participant.gender || '',
      church: reg.church || '',
      phone: reg.phone || '',
      email: reg.email || '',
      counselorRegId: participant.counselorRegId || '',
      teacherName: participant.teacherName || '',
      saved: !!participant.saved,
      savedTiming: SAVED_TIMINGS.has(participant.savedTiming) ? participant.savedTiming : '',
      dedicated: !!participant.dedicated,
      testimony: participant.testimony || '',
      counselorMemo: participant.counselorMemo || '',
      teamColor: safeTeamColor(participant.teamColor),
      registrationType: 'group-participant',
      confirmed: isFinalConfirmed(reg),
    };
  }).filter(Boolean);
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
  }
  const session = await verifyToken(request, env);
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const campId = url.searchParams.get('campId');
  if (!campId || !/^[a-zA-Z0-9_-]+$/.test(campId)) {
    return Response.json({ error: '캠프를 선택해주세요.' }, { status: 400, headers: CORS });
  }

  try {
    const registrations = await listCampRegistrations(env, campId);
    const counselors = registrations
      .filter(isCounselorStaff)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'))
      .map(reg => ({
        regId: reg.regId,
        campId: reg.campId,
        name: reg.name || '이름 없음',
        email: normalizeEmail(reg.email),
        phone: reg.phone || '',
        teamColor: safeTeamColor(reg.teamColor),
      }));
    const counselorRegIds = counselors
      .filter(counselor => counselor.email && counselor.email === session.email)
      .map(counselor => counselor.regId);
    const campers = registrations
      .filter(reg => reg.registrationType !== 'staff')
      .flatMap(reg => reg.registrationType === 'group' ? campersFromGroup(reg) : [camperFromRegistration(reg)]);
    const teamOverview = normalizeTeamOverview(await env.CAMP_KV.get(`admin:team-overview:${campId}`, 'json'));
    const campStaff = registrations
      .filter(reg => reg.registrationType === 'staff')
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'))
      .map(reg => ({
        regId: reg.regId,
        name: reg.name || '이름 없음',
        email: normalizeEmail(reg.email),
        teams: staffTeams(reg),
      }));

    return Response.json({
      session,
      campId,
      counselors,
      counselorRegIds,
      campers,
      campStaff,
      canEditAll: session.role === 'admin',
      teamOverview,
    }, { headers: CORS });
  } catch (error) {
    console.error('camp progress data error:', error);
    return Response.json({ error: '데이터를 불러오지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
