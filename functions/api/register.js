/**
 * POST /api/register
 * Camp registration handler — stores in Cloudflare KV
 * KV binding: CAMP_KV  (set in Cloudflare Pages → Settings → Functions → KV bindings)
 *
 * Supports two registration types:
 *   registrationType: 'individual'  — single camper, reserves 1 spot
 *   registrationType: 'group'       — contact person + maleCount/femaleCount, reserves N spots
 *
 * Gender tracking:
 *   individual: gender ('male' | 'female') required
 *   group: maleCount + femaleCount required
 *   capacityMale / capacityFemale: per-gender caps (optional; if set, enforced)
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
      campId, capacity,
      name, phone, email,
      // individual fields
      grade, church, school, emergency,
      gender,                  // 'male' | 'female'
      // group fields
      maleCount, femaleCount,
      groupCount,              // legacy or pre-calculated total
      // per-gender caps (sent from client based on camp config)
      capacityMale, capacityFemale,
      // shared
      notes,
    } = data;

    // ── 공통 필수 항목 ──
    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }

    const emailNorm = email.trim().toLowerCase();
    const maxCap = parseInt(capacity) || 40;
    const capM = capacityMale ? parseInt(capacityMale) : null;
    const capF = capacityFemale ? parseInt(capacityFemale) : null;

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

    // ── 현재 신청 수 확인 ──
    const countKey    = `camp:${campId}:count`;
    const countKeyM   = `camp:${campId}:count:male`;
    const countKeyF   = `camp:${campId}:count:female`;

    const [currentCount, currentM, currentF] = await Promise.all([
      env.CAMP_KV.get(countKey).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(countKeyM).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(countKeyF).then(v => parseInt(v || '0')),
    ]);

    // ── 전체 정원 초과 확인 ──
    if (currentCount + spotsNeeded > maxCap) {
      const remaining = maxCap - currentCount;
      if (remaining <= 0) {
        return Response.json({ error: '정원이 마감되었습니다.' }, { status: 409, headers: CORS });
      }
      return Response.json(
        { error: `남은 정원(${remaining}명)보다 신청 인원이 많습니다.` },
        { status: 409, headers: CORS }
      );
    }

    // ── 성별 정원 초과 확인 (캠프별 성별 cap 설정 시) ──
    if (capM !== null && spotsM > 0 && currentM + spotsM > capM) {
      const remaining = capM - currentM;
      if (remaining <= 0) {
        return Response.json({ error: '남학생 정원이 마감되었습니다.' }, { status: 409, headers: CORS });
      }
      return Response.json(
        { error: `남학생 남은 정원(${remaining}명)보다 신청 인원이 많습니다.` },
        { status: 409, headers: CORS }
      );
    }
    if (capF !== null && spotsF > 0 && currentF + spotsF > capF) {
      const remaining = capF - currentF;
      if (remaining <= 0) {
        return Response.json({ error: '여학생 정원이 마감되었습니다.' }, { status: 409, headers: CORS });
      }
      return Response.json(
        { error: `여학생 남은 정원(${remaining}명)보다 신청 인원이 많습니다.` },
        { status: 409, headers: CORS }
      );
    }

    // ── 중복 신청 확인 (이메일 기준) ──
    const dupeKey = `camp:${campId}:email:${emailNorm}`;
    if (await env.CAMP_KV.get(dupeKey)) {
      return Response.json({ error: '이미 신청된 이메일 주소입니다.' }, { status: 409, headers: CORS });
    }

    // ── 신청 데이터 저장 ──
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
        };

    const newCount = currentCount + spotsNeeded;
    const newM = currentM + spotsM;
    const newF = currentF + spotsF;

    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
      env.CAMP_KV.put(countKey, String(newCount)),
      spotsM > 0 ? env.CAMP_KV.put(countKeyM, String(newM)) : Promise.resolve(),
      spotsF > 0 ? env.CAMP_KV.put(countKeyF, String(newF)) : Promise.resolve(),
    ]);

    return Response.json({
      success: true,
      count: newCount, countMale: newM, countFemale: newF,
      capacity: maxCap,
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
