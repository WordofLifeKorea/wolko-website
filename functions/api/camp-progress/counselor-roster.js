/**
 * GET /api/camp-progress/counselor-roster?campId=...
 *
 * 가입 폼용 공개 엔드포인트: 지정된 캠프의 '상담자' 팀 스태프 신청자 목록을 반환.
 * 비밀번호·로그인 정보 없음. 캠프별로 명단이 새로 빌딩됨 → 새 캠프 열리면 자동 반영.
 */
const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCounselorStaff(reg) {
  const teams = String(reg?.serviceArea || reg?.notes || '').split(',').map(team => team.trim());
  return reg?.registrationType === 'staff' && teams.includes('상담자');
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

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.CAMP_KV) {
    return Response.json({ error: '서버 설정이 필요합니다.' }, { status: 500, headers: CORS });
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
      .map(reg => ({
        name: reg.name || '',
        email: normalizeEmail(reg.email),
      }))
      .filter(c => c.name && c.email)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    // 중복 제거 (동일 이메일이 여러 번 신청한 케이스 대비)
    const seen = new Set();
    const unique = counselors.filter(c => {
      if (seen.has(c.email)) return false;
      seen.add(c.email);
      return true;
    });

    return Response.json({ campId, counselors: unique }, { headers: CORS });
  } catch (error) {
    console.error('camp progress counselor-roster error:', error);
    return Response.json({ error: '명단을 불러오지 못했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
