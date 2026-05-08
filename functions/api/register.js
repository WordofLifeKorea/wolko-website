/**
 * POST /api/register
 * Camp registration handler — stores in Cloudflare KV
 * KV binding: CAMP_KV  (set in Cloudflare Pages → Settings → Functions → KV bindings)
 *
 * Supports two registration types:
 *   registrationType: 'individual'  — single camper, reserves 1 spot
 *   registrationType: 'group'       — contact person + groupCount, reserves N spots
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
      // group fields
      groupCount,
      // shared
      notes,
    } = data;

    // ── 공통 필수 항목 ──
    if (!campId || !name?.trim() || !phone?.trim() || !email?.trim()) {
      return Response.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400, headers: CORS });
    }

    const emailNorm = email.trim().toLowerCase();
    const maxCap = parseInt(capacity) || 40;

    // ── 신청 유형별 추가 검사 ──
    if (registrationType === 'individual' && !grade) {
      return Response.json({ error: '학년을 선택해주세요.' }, { status: 400, headers: CORS });
    }

    const spotsNeeded = registrationType === 'group'
      ? Math.max(1, parseInt(groupCount) || 1)
      : 1;

    if (registrationType === 'group' && spotsNeeded < 2) {
      return Response.json({ error: '단체 신청은 2명 이상이어야 합니다.' }, { status: 400, headers: CORS });
    }

    // ── 현재 신청 수 확인 ──
    const countKey = `camp:${campId}:count`;
    const currentCount = parseInt(await env.CAMP_KV.get(countKey) || '0');

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
          groupCount: spotsNeeded,
          church: church?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
        }
      : {
          regId, campId,
          registrationType: 'individual',
          name: name.trim(), phone: phone.trim(), email: emailNorm,
          grade,
          church: church?.trim() || '',
          school: school?.trim() || '',
          emergency: emergency?.trim() || '',
          notes: notes?.trim() || '',
          registeredAt: new Date().toISOString(),
        };

    const newCount = currentCount + spotsNeeded;

    await Promise.all([
      env.CAMP_KV.put(`camp:${campId}:reg:${regId}`, JSON.stringify(reg)),
      env.CAMP_KV.put(dupeKey, regId),
      env.CAMP_KV.put(countKey, String(newCount)),
    ]);

    return Response.json({ success: true, count: newCount, capacity: maxCap }, { headers: CORS });

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
