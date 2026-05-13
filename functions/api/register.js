/**
 * POST /api/register
 * Camp registration handler — stores in Cloudflare KV (as PENDING)
 *
 * Registration is saved with confirmed: false.
 * Admin must confirm after verifying payment → then KV count increments.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const data = await request.json();
    const {
      registrationType = 'individual',
      campId,
      name, phone, email,
      // individual fields
      grade, church, school, emergency,
      gender,
      // group fields
      maleCount, femaleCount,
      groupCount,
      // shared
      notes,
    } = data;

    // ── 공통 필수 항목 ──
    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }

    const emailNorm = email.trim().toLowerCase();

    // ── 신청 유형별 추가 검사 ──
    if (registrationType === 'individual') {
      if (!grade) {
        return Response.json({ error: '학년을 선택해주세요.' }, { status: 400, headers: CORS });
      }
      if (!gender || !['male', 'female'].includes(gender)) {
        return Response.json({ error: '성별을 선택해주세요.' }, { status: 400, headers: CORS });
      }
    }

    // ── 신청 인원 계산 ──
    let spotsNeeded, spotsM, spotsF;
    if (registrationType === 'group') {
      spotsM = Math.max(0, parseInt(maleCount) || 0);
      spotsF = Math.max(0, parseInt(femaleCount) || 0);
      spotsNeeded = spotsM + spotsF;
      if (spotsNeeded < 2) {
        return Response.json({ error: '단체 신청은 2명 이상이어야 합니다.' }, { status: 400, headers: CORS });
      }
    } else {
      spotsNeeded = 1;
      spotsM = gender === 'male' ? 1 : 0;
      spotsF = gender === 'female' ? 1 : 0;
    }

    // ── 중복 신청 확인 (이메일 기준) ──
    const dupeKey = `camp:${campId}:email:${emailNorm}`;
    if (await env.CAMP_KV.get(dupeKey)) {
      return Response.json({ error: '이미 신청된 이메일 주소입니다.' }, { status: 409, headers: CORS });
    }

    // ── 신청 데이터 저장 (미확정 상태) ──
    const regId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const reg = registrationType === 'group'
      ? {
          regId, campId,
          registrationType: 'group',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          maleCount: spotsM, femaleCount: spotsF, groupCount: spotsNeeded,
          church: church?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
        }
      : {
          regId, campId,
          registrationType: 'individual',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          grade, gender,
          church: church?.trim() || '',
          school: school?.trim() || '',
          emergency: emergency?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
          confirmed: false,
          confirmedAt: null,
        };

    // 카운트는 관리자 확정 시에만 증가 — 여기서는 reg 데이터와 중복 방지 키만 저장
    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
    ]);

    return Response.json({
      success: true,
      pending: true,
    }, { headers: CORS });

  } catch (e) {
    console.error('register error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
