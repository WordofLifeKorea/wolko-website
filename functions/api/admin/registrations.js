/**
 * GET  /api/admin/registrations        — list all registrations
 * GET  /api/admin/registrations?campId — filter by camp
 * DELETE /api/admin/registrations?regId=&campId= — delete one registration
 * PATCH /api/admin/registrations       — 예약금 수납 or 최종 확정
 *   body: { regId, campId, action: 'deposit'|'confirm', campTitleKo, campDateKo }
 *
 * Status 흐름:
 *   pending → deposit (예약금 수납, 알림톡 ①)
 *           → confirmed (최종 확정, KV 카운트 증가, 알림톡 ②)
 *
 * 구 데이터 호환: status 없는 데이터는 confirmed 필드로 판단
 */
import { sendAlimtalk } from '../../lib/solapi.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function verifyToken(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;

  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    const expires = parseInt(parts[1]);
    if (!expires || Date.now() > expires) return false;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

/** 잔금까지 확인되어 최종 확정된 신청인지 여부 */
function isFinalConfirmed(reg) {
  if (reg.status === 'confirmed') return true;
  return reg.status === undefined && reg.confirmed === true;
}

function registrationSpots(reg) {
  if (reg.registrationType === 'staff') {
    return { total: 0, male: 0, female: 0 };
  }
  if (reg.registrationType === 'group') {
    return {
      total: reg.groupCount || 1,
      male: reg.maleCount || 0,
      female: reg.femaleCount || 0,
    };
  }
  return {
    total: 1,
    male: reg.gender === 'male' ? 1 : 0,
    female: reg.gender === 'female' ? 1 : 0,
  };
}

async function listCampRegistrations(env, campId) {
  const registrations = [];
  const prefix = `camp:${campId}:reg:`;
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
    const regs = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
    registrations.push(...regs.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return registrations;
}

function replaceRegistration(registrations, updatedReg) {
  let replaced = false;
  const next = registrations.map(reg => {
    if (reg.regId !== updatedReg.regId) return reg;
    replaced = true;
    return updatedReg;
  });
  if (!replaced) next.push(updatedReg);
  return next;
}

/** 공개 정원 그래프용 KV 카운터를 최종확정 신청 기준으로 동기화 */
async function syncConfirmedCounters(env, campId, registrations) {
  const counts = registrations.reduce((acc, reg) => {
    if (!isFinalConfirmed(reg)) return acc;
    const spots = registrationSpots(reg);
    acc.count += spots.total;
    acc.countMale += spots.male;
    acc.countFemale += spots.female;
    return acc;
  }, { count: 0, countMale: 0, countFemale: 0 });

  await Promise.all([
    env.CAMP_KV.put(`camp:${campId}:count`, String(counts.count)),
    env.CAMP_KV.put(`camp:${campId}:count:male`, String(counts.countMale)),
    env.CAMP_KV.put(`camp:${campId}:count:female`, String(counts.countFemale)),
  ]);
  return counts;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const campId = url.searchParams.get('campId');

  try {
    let allRegs = [];
    if (campId) {
      const prefix = `camp:${campId}:reg:`;
      let cursor;
      do {
        const result = await env.CAMP_KV.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
        const regs = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
        allRegs.push(...regs.filter(Boolean));
        cursor = result.list_complete ? null : result.cursor;
      } while (cursor);
    } else {
      let cursor;
      do {
        const result = await env.CAMP_KV.list({ prefix: 'camp:', ...(cursor ? { cursor } : {}), limit: 1000 });
        const regKeys = result.keys.filter(k => /^camp:[^:]+:reg:/.test(k.name));
        const regs = await Promise.all(regKeys.map(k => env.CAMP_KV.get(k.name, 'json')));
        allRegs.push(...regs.filter(Boolean));
        cursor = result.list_complete ? null : result.cursor;
      } while (cursor);
    }

    if (campId) {
      await syncConfirmedCounters(env, campId, allRegs);
    } else {
      const regsByCamp = new Map();
      allRegs.forEach(reg => {
        if (!reg.campId) return;
        if (!regsByCamp.has(reg.campId)) regsByCamp.set(reg.campId, []);
        regsByCamp.get(reg.campId).push(reg);
      });
      await Promise.all(
        Array.from(regsByCamp, ([id, regs]) => syncConfirmedCounters(env, id, regs))
      );
    }

    allRegs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    return Response.json({ registrations: allRegs }, { headers: CORS });
  } catch (e) {
    console.error('admin registrations error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  const url = new URL(request.url);
  const regId = url.searchParams.get('regId');
  const campId = url.searchParams.get('campId');
  if (!regId || !campId) {
    return Response.json({ error: 'regId와 campId가 필요합니다.' }, { status: 400, headers: CORS });
  }

  try {
    const regKey = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(regKey, 'json');
    if (!reg) {
      return Response.json({ error: '해당 신청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    const dupeKey = `camp:${campId}:email:${reg.email}`;
    const spotsToFree = reg.registrationType === 'group' ? (reg.groupCount || 1) : 1;
    const spotsM = reg.registrationType === 'group' ? (reg.maleCount || 0) : (reg.gender === 'male' ? 1 : 0);
    const spotsF = reg.registrationType === 'group' ? (reg.femaleCount || 0) : (reg.gender === 'female' ? 1 : 0);

    const subKey    = `camp:${campId}:submissions`;
    const subKeyM   = `camp:${campId}:submissions:male`;
    const subKeyF   = `camp:${campId}:submissions:female`;
    const campRegs = await listCampRegistrations(env, campId);

    const ops = [env.CAMP_KV.delete(regKey), env.CAMP_KV.delete(dupeKey)];

    // submissions 카운터는 항상 감소
    const [curSubs, curSubsM, curSubsF] = await Promise.all([
      env.CAMP_KV.get(subKey).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(subKeyM).then(v => parseInt(v || '0')),
      env.CAMP_KV.get(subKeyF).then(v => parseInt(v || '0')),
    ]);
    ops.push(env.CAMP_KV.put(subKey, String(Math.max(0, curSubs - spotsToFree))));
    if (spotsM > 0) ops.push(env.CAMP_KV.put(subKeyM, String(Math.max(0, curSubsM - spotsM))));
    if (spotsF > 0) ops.push(env.CAMP_KV.put(subKeyF, String(Math.max(0, curSubsF - spotsF))));

    await Promise.all(ops);
    const counts = await syncConfirmedCounters(
      env,
      campId,
      campRegs.filter(item => item.regId !== regId)
    );
    return Response.json({ success: true, newCount: counts.count }, { headers: CORS });
  } catch (e) {
    console.error('admin delete error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

/**
 * PATCH /api/admin/registrations
 * Body: { regId, campId, action: 'deposit'|'confirm', campTitleKo, campDateKo }
 *
 * deposit  — 예약금 수납 확인: 예약금 알림톡
 * confirm  — 최종 확정: KV 카운트 증가 + 최종확정 알림톡
 */
export async function onRequestPatch(context) {
  const { env, request } = context;
  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const { regId, campId, action = 'confirm', campTitleKo, campDateKo } = await request.json();
    if (!regId || !campId) {
      return Response.json({ error: 'regId와 campId가 필요합니다.' }, { status: 400, headers: CORS });
    }

    const regKey = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(regKey, 'json');
    if (!reg) {
      return Response.json({ error: '해당 신청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    const campName = campTitleKo || campId;
    const campDate = campDateKo || '';
    const isGroup  = reg.registrationType === 'group';

    // ── 예약금 수납 ──────────────────────────────────────────────────────────────
    if (action === 'deposit') {
      if (reg.status === 'deposit' || reg.status === 'confirmed') {
        return Response.json({ error: '이미 예약금이 수납된 신청입니다.' }, { status: 409, headers: CORS });
      }

      const updatedReg = {
        ...reg,
        status: 'deposit',
        confirmed: false,
        depositConfirmedAt: new Date().toISOString(),
      };

      const campRegs = await listCampRegistrations(env, campId);
      await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
      const counts = await syncConfirmedCounters(
        env,
        campId,
        replaceRegistration(campRegs, updatedReg)
      );

      // 예약금 수납 알림톡
      context.waitUntil((async () => {
        if (isGroup) {
          await sendAlimtalk(env, reg.phone, env.KAKAO_TEMPLATE_DEPOSIT_GROUP, {
            '#{담당자}': reg.name,
            '#{캠프명}': campName,
            '#{일정}':   campDate,
            '#{인원}':   `남학생 ${reg.maleCount}명 · 여학생 ${reg.femaleCount}명 (총 ${reg.groupCount}명)`,
            '#{교회명}': reg.church || '—',
          });
        } else {
          await sendAlimtalk(env, reg.phone, env.KAKAO_TEMPLATE_DEPOSIT_INDIVIDUAL, {
            '#{이름}':   reg.name,
            '#{캠프명}': campName,
            '#{일정}':   campDate,
          });
        }
      })().catch(e => console.error('deposit alimtalk failed:', e)));

      return Response.json({
        success: true,
        ...counts,
        reg: updatedReg,
      }, { headers: CORS });
    }

    // ── 최종 확정 ────────────────────────────────────────────────────────────────
    if (action === 'confirm') {
      if (reg.status === 'confirmed' || reg.confirmed === true) {
        return Response.json({ error: '이미 최종 확정된 신청입니다.' }, { status: 409, headers: CORS });
      }

      const updatedReg = {
        ...reg,
        status: 'confirmed',
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      };

      const campRegs = await listCampRegistrations(env, campId);
      await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
      const counts = await syncConfirmedCounters(
        env,
        campId,
        replaceRegistration(campRegs, updatedReg)
      );

      // 최종 확정 알림톡
      context.waitUntil((async () => {
        if (isGroup) {
          await sendAlimtalk(env, reg.phone, env.KAKAO_TEMPLATE_GROUP, {
            '#{담당자}': reg.name,
            '#{캠프명}': campName,
            '#{일정}':   campDate,
            '#{인원}':   `남학생 ${reg.maleCount}명 · 여학생 ${reg.femaleCount}명 (총 ${reg.groupCount}명)`,
            '#{교회명}': reg.church || '—',
          });
        } else {
          await sendAlimtalk(env, reg.phone, env.KAKAO_TEMPLATE_INDIVIDUAL, {
            '#{이름}':   reg.name,
            '#{캠프명}': campName,
            '#{일정}':   campDate,
          });
        }
      })().catch(e => console.error('confirm alimtalk failed:', e)));

      return Response.json({
        success: true,
        ...counts,
        reg: updatedReg,
      }, { headers: CORS });
    }

    // ── 확정 → 예약금 되돌리기 ──────────────────────────────────────────────────
    if (action === 'revert') {
      const isConfirmed = reg.status === 'confirmed' || (reg.status === undefined && reg.confirmed === true);
      if (!isConfirmed) {
        return Response.json({ error: '최종확정 상태가 아닙니다.' }, { status: 409, headers: CORS });
      }

      const updatedReg = {
        ...reg,
        status: 'deposit',
        confirmed: false,
        revertedAt: new Date().toISOString(),
      };
      delete updatedReg.confirmedAt;

      const campRegs = await listCampRegistrations(env, campId);
      await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
      const counts = await syncConfirmedCounters(
        env,
        campId,
        replaceRegistration(campRegs, updatedReg)
      );
      return Response.json({
        success: true,
        ...counts,
        reg: updatedReg,
      }, { headers: CORS });
    }

    return Response.json({ error: `알 수 없는 action: ${action}` }, { status: 400, headers: CORS });

  } catch (e) {
    console.error('admin patch error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

/**
 * PUT /api/admin/registrations
 * Body: { regId, campId, field, value }
 * 개별 필드 업데이트 (gender 등)
 */
export async function onRequestPut(context) {
  const { env, request } = context;
  if (!await verifyToken(request, env)) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const { regId, campId, field, value, participantIndex } = await request.json();
    if (!regId || !campId || !field) {
      return Response.json({ error: 'regId, campId, field가 필요합니다.' }, { status: 400, headers: CORS });
    }

    const ALLOWED_FIELDS = ['gender', 'phone', 'notes', 'serviceArea', 'counselorRegId', 'counselorMemo', 'saved', 'dedicated'];
    const PARTICIPANT_FIELDS = ['name', 'gender', 'counselorRegId', 'counselorMemo', 'saved', 'dedicated'];
    const allowedFields = participantIndex === undefined ? ALLOWED_FIELDS : PARTICIPANT_FIELDS;
    if (!allowedFields.includes(field)) {
      return Response.json({ error: '업데이트할 수 없는 필드입니다.' }, { status: 400, headers: CORS });
    }

    const regKey = `camp:${campId}:reg:${regId}`;
    const reg = await env.CAMP_KV.get(regKey, 'json');
    if (!reg) {
      return Response.json({ error: '해당 신청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
    }

    if ((field === 'saved' || field === 'dedicated') && typeof value !== 'boolean') {
      return Response.json({ error: '영적 상태 값이 올바르지 않습니다.' }, { status: 400, headers: CORS });
    }
    if (field === 'counselorRegId' && value) {
      const counselor = await env.CAMP_KV.get(`camp:${campId}:reg:${value}`, 'json');
      const counselorTeams = String(counselor?.serviceArea || counselor?.notes || '').split(',').map(team => team.trim());
      if (!counselor || counselor.registrationType !== 'staff' || !counselorTeams.includes('상담자')) {
        return Response.json({ error: '같은 캠프의 상담자 팀 스태프만 카운슬러로 지정할 수 있습니다.' }, { status: 400, headers: CORS });
      }
    }

    let updatedReg;
    if (participantIndex !== undefined) {
      if (reg.registrationType !== 'group') {
        return Response.json({ error: '단체 신청의 학생 정보만 수정할 수 있습니다.' }, { status: 400, headers: CORS });
      }
      const index = Number(participantIndex);
      const groupCount = Math.max(parseInt(reg.groupCount) || 0, Array.isArray(reg.participants) ? reg.participants.length : 0);
      if (!Number.isInteger(index) || index < 0 || index >= groupCount) {
        return Response.json({ error: '학생 정보가 올바르지 않습니다.' }, { status: 400, headers: CORS });
      }
      if (field === 'gender' && value && !['male', 'female'].includes(value)) {
        return Response.json({ error: '학생 성별 값이 올바르지 않습니다.' }, { status: 400, headers: CORS });
      }
      const participants = Array.from({ length: groupCount }, (_, participantPosition) =>
        participantPosition === index
          ? { ...(reg.participants?.[participantPosition] || {}), [field]: typeof value === 'string' ? value.trim() : value }
          : { ...(reg.participants?.[participantPosition] || {}) }
      );
      const allGendersEntered = participants.every(participant => ['male', 'female'].includes(participant.gender));
      const nextMaleCount = allGendersEntered ? participants.filter(participant => participant.gender === 'male').length : (reg.maleCount || 0);
      const nextFemaleCount = allGendersEntered ? participants.filter(participant => participant.gender === 'female').length : (reg.femaleCount || 0);
      updatedReg = { ...reg, participants, maleCount: nextMaleCount, femaleCount: nextFemaleCount };

      if (allGendersEntered && (nextMaleCount !== (reg.maleCount || 0) || nextFemaleCount !== (reg.femaleCount || 0))) {
        const countKeyM = `camp:${campId}:count:male`;
        const countKeyF = `camp:${campId}:count:female`;
        const subKeyM = `camp:${campId}:submissions:male`;
        const subKeyF = `camp:${campId}:submissions:female`;
        const [curCountM, curCountF, curSubsM, curSubsF] = await Promise.all([
          env.CAMP_KV.get(countKeyM).then(v => parseInt(v || '0')),
          env.CAMP_KV.get(countKeyF).then(v => parseInt(v || '0')),
          env.CAMP_KV.get(subKeyM).then(v => parseInt(v || '0')),
          env.CAMP_KV.get(subKeyF).then(v => parseInt(v || '0')),
        ]);
        const maleDelta = nextMaleCount - (reg.maleCount || 0);
        const femaleDelta = nextFemaleCount - (reg.femaleCount || 0);
        const ops = [
          env.CAMP_KV.put(subKeyM, String(Math.max(0, curSubsM + maleDelta))),
          env.CAMP_KV.put(subKeyF, String(Math.max(0, curSubsF + femaleDelta))),
        ];
        if (isFinalConfirmed(reg)) {
          ops.push(env.CAMP_KV.put(countKeyM, String(Math.max(0, curCountM + maleDelta))));
          ops.push(env.CAMP_KV.put(countKeyF, String(Math.max(0, curCountF + femaleDelta))));
        }
        await Promise.all(ops);
      }
    } else {
      updatedReg = { ...reg, [field]: value };
    }
    await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
    return Response.json({ success: true, reg: updatedReg }, { headers: CORS });
  } catch (e) {
    console.error('admin update field error:', e);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
