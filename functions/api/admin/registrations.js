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

const CAMP_BASE_FEE = 499000;
const SCHOLARSHIP_DISCOUNTS = {
  wolbi_syme: { amount: 50000, label: '월비 또는 SYME 졸업자 및 프로그램 참여자의 자녀 또는 추천·소개' },
  sibling: { amount: 50000, label: '형제·자매 또는 친구 동반 참여' },
  excellent_camper: { amount: 150000, label: '지난 캠프 우수 캠퍼' },
};
const SIBLING_CAMP_LABELS = {
  wolko: '월코 캠프',
  jeju: '제주 캠프',
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

// 단체 신청은 참가자 명단에 이름이 실제로 입력된 인원만 정원에 반영한다.
// (참가자 명단을 나중에 제출하는 단체 신청은 groupCount만큼 자리를 확보해도
//  이름이 입력되기 전까지는 정원 카운트에 포함하지 않는다)
function registrationSpots(reg) {
  if (reg.registrationType === 'staff') {
    return { total: 0, male: 0, female: 0 };
  }
  if (reg.registrationType === 'group') {
    const participants = Array.isArray(reg.participants) ? reg.participants : [];
    const named = participants.filter(p => p && String(p.name || '').trim());
    return {
      total: named.length,
      male: named.filter(p => p.gender === 'male').length,
      female: named.filter(p => p.gender === 'female').length,
    };
  }
  return {
    total: 1,
    male: reg.gender === 'male' ? 1 : 0,
    female: reg.gender === 'female' ? 1 : 0,
  };
}

function formatWon(amount) {
  return `${Math.max(0, parseInt(amount, 10) || 0).toLocaleString('ko-KR')}원`;
}

function normalizeScholarshipDiscounts(values, maxCount = 1) {
  const limit = Math.max(1, parseInt(maxCount, 10) || 1);
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  return Object.entries(values).reduce((acc, [key, rawCount]) => {
    if (!SCHOLARSHIP_DISCOUNTS[key]) return acc;
    const count = Math.min(Math.max(parseInt(rawCount, 10) || 0, 0), limit);
    if (count > 0) acc[key] = count;
    return acc;
  }, {});
}

function scholarshipDiscountAmount(values) {
  return Object.entries(values || {}).reduce((sum, [key, count]) => {
    return sum + ((SCHOLARSHIP_DISCOUNTS[key]?.amount || 0) * (parseInt(count, 10) || 0));
  }, 0);
}

function scholarshipDiscountText(values) {
  const entries = Object.entries(values || {}).filter(([key, count]) => SCHOLARSHIP_DISCOUNTS[key] && (parseInt(count, 10) || 0) > 0);
  if (!entries.length) return '';
  return entries.map(([key, count]) => {
    const num = parseInt(count, 10) || 0;
    const item = SCHOLARSHIP_DISCOUNTS[key];
    return `${item.label} ${num}명 (${formatWon(item.amount * num)})`;
  }).join(', ');
}

function normalizeScholarshipDiscountDetailsForAdmin(details, discounts) {
  const source = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  const normalized = {};

  if ((parseInt(discounts?.wolbi_syme, 10) || 0) > 0 && source.wolbi_syme && typeof source.wolbi_syme === 'object') {
    const year = String(source.wolbi_syme.year ?? '').trim();
    const participantName = String(source.wolbi_syme.participantName ?? '').trim();
    if (year || participantName) normalized.wolbi_syme = { year, participantName };
  }

  if ((parseInt(discounts?.sibling, 10) || 0) > 0 && source.sibling && typeof source.sibling === 'object') {
    const camperName = String(source.sibling.camperName ?? '').trim();
    const camp = String(source.sibling.camp ?? '').trim();
    if (camperName || camp) normalized.sibling = { camperName, camp };
  }

  return normalized;
}

function scholarshipDiscountDetailText(details) {
  const parts = [];
  if (details?.wolbi_syme) {
    const info = [details.wolbi_syme.participantName, details.wolbi_syme.year].filter(Boolean).join(' · ');
    if (info) parts.push(`월비/SYME 졸업자 및 참여자: ${info}`);
  }
  if (details?.sibling) {
    const campLabel = SIBLING_CAMP_LABELS[details.sibling.camp] || details.sibling.camp;
    const info = [details.sibling.camperName, campLabel].filter(Boolean).join(' / ');
    if (info) parts.push(`형제·자매 또는 친구: ${info}`);
  }
  return parts.join(', ');
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

/**
 * 신규 신청 정원 게이트(register.js)가 참조하는 submissions 카운터를
 * 실제 등록 데이터(이름 입력된 인원 기준) 로 동기화한다.
 * staff 신청은 정원 집계에서 제외.
 */
async function syncSubmissionCounters(env, campId, registrations) {
  const totals = registrations.reduce((acc, reg) => {
    if (reg.registrationType === 'staff') return acc;
    const spots = registrationSpots(reg);
    acc.total += spots.total;
    acc.male += spots.male;
    acc.female += spots.female;
    return acc;
  }, { total: 0, male: 0, female: 0 });

  await Promise.all([
    env.CAMP_KV.put(`camp:${campId}:submissions`, String(totals.total)),
    env.CAMP_KV.put(`camp:${campId}:submissions:male`, String(totals.male)),
    env.CAMP_KV.put(`camp:${campId}:submissions:female`, String(totals.female)),
  ]);
  return totals;
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
      await Promise.all([
        syncConfirmedCounters(env, campId, allRegs),
        syncSubmissionCounters(env, campId, allRegs),
      ]);
    } else {
      const regsByCamp = new Map();
      allRegs.forEach(reg => {
        if (!reg.campId) return;
        if (!regsByCamp.has(reg.campId)) regsByCamp.set(reg.campId, []);
        regsByCamp.get(reg.campId).push(reg);
      });
      await Promise.all(
        Array.from(regsByCamp, ([id, regs]) => Promise.all([
          syncConfirmedCounters(env, id, regs),
          syncSubmissionCounters(env, id, regs),
        ]))
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
    const campRegs = await listCampRegistrations(env, campId);

    await Promise.all([env.CAMP_KV.delete(regKey), env.CAMP_KV.delete(dupeKey)]);

    const remainingRegs = campRegs.filter(item => item.regId !== regId);
    const [counts] = await Promise.all([
      syncConfirmedCounters(env, campId, remainingRegs),
      syncSubmissionCounters(env, campId, remainingRegs),
    ]);
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
      const nextRegs = replaceRegistration(campRegs, updatedReg);
      const [counts] = await Promise.all([
        syncConfirmedCounters(env, campId, nextRegs),
        syncSubmissionCounters(env, campId, nextRegs),
      ]);

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
      const nextRegs = replaceRegistration(campRegs, updatedReg);
      const [counts] = await Promise.all([
        syncConfirmedCounters(env, campId, nextRegs),
        syncSubmissionCounters(env, campId, nextRegs),
      ]);

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
      const revertRegs = replaceRegistration(campRegs, updatedReg);
      const [counts] = await Promise.all([
        syncConfirmedCounters(env, campId, revertRegs),
        syncSubmissionCounters(env, campId, revertRegs),
      ]);
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
    const { regId, campId, field, value, participantIndex, action } = await request.json();
    if (!regId || !campId) {
      return Response.json({ error: 'regId, campId가 필요합니다.' }, { status: 400, headers: CORS });
    }

    // ── 단체 학생 명단에서 특정 학생 삭제 (뒤 순번 자동 당김) ──
    if (action === 'removeParticipant') {
      const regKey = `camp:${campId}:reg:${regId}`;
      const reg = await env.CAMP_KV.get(regKey, 'json');
      if (!reg) {
        return Response.json({ error: '해당 신청을 찾을 수 없습니다.' }, { status: 404, headers: CORS });
      }
      if (reg.registrationType !== 'group') {
        return Response.json({ error: '단체 신청의 학생만 삭제할 수 있습니다.' }, { status: 400, headers: CORS });
      }
      const index = Number(participantIndex);
      const slotCount = Math.max(parseInt(reg.groupCount, 10) || 0, Array.isArray(reg.participants) ? reg.participants.length : 0);
      if (!Number.isInteger(index) || index < 0 || index >= slotCount) {
        return Response.json({ error: '학생 정보가 올바르지 않습니다.' }, { status: 400, headers: CORS });
      }
      if (slotCount <= 1) {
        return Response.json({ error: '마지막 학생은 삭제할 수 없습니다. 신청 전체를 삭제해주세요.' }, { status: 400, headers: CORS });
      }

      // 전체 슬롯 배열을 만든 뒤 해당 인덱스를 제거 → 뒤 학생이 자동으로 앞으로 당겨짐
      const slots = Array.from({ length: slotCount }, (_, i) => ({ ...(reg.participants?.[i] || {}) }));
      slots.splice(index, 1);

      const named = slots.filter(p => p && String(p.name || '').trim());
      const nextGroupCount = slots.length;
      const nextMaleCount = named.filter(p => p.gender === 'male').length;
      const nextFemaleCount = named.filter(p => p.gender === 'female').length;

      // 정원(슬롯) 감소 → 예약금/잔금 재계산 및 장학금 한도 재정규화
      const spots = Math.max(1, nextGroupCount);
      const normalizedScholarshipDiscounts = normalizeScholarshipDiscounts(reg.scholarshipDiscounts, spots);
      const normalizedScholarshipDiscountAmount = scholarshipDiscountAmount(normalizedScholarshipDiscounts);
      const normalizedScholarshipDiscountDetails = normalizeScholarshipDiscountDetailsForAdmin(
        reg.scholarshipDiscountDetails,
        normalizedScholarshipDiscounts
      );
      const campFeeBase = CAMP_BASE_FEE * spots;

      const updatedReg = {
        ...reg,
        participants: slots,
        groupCount: nextGroupCount,
        maleCount: nextMaleCount,
        femaleCount: nextFemaleCount,
        scholarshipDiscounts: normalizedScholarshipDiscounts,
        scholarshipDiscountDetails: normalizedScholarshipDiscountDetails,
        scholarshipDiscountText: scholarshipDiscountText(normalizedScholarshipDiscounts),
        scholarshipDiscountDetailText: scholarshipDiscountDetailText(normalizedScholarshipDiscountDetails),
        scholarshipDiscountAmount: normalizedScholarshipDiscountAmount,
        campFeeBase,
        campFeeFinal: Math.max(0, campFeeBase - normalizedScholarshipDiscountAmount),
      };

      await env.CAMP_KV.put(regKey, JSON.stringify(updatedReg));
      const campRegs = await listCampRegistrations(env, campId);
      const nextRegs = replaceRegistration(campRegs, updatedReg);
      await Promise.all([
        syncConfirmedCounters(env, campId, nextRegs),
        syncSubmissionCounters(env, campId, nextRegs),
      ]);

      return Response.json({ success: true, reg: updatedReg }, { headers: CORS });
    }

    if (!field) {
      return Response.json({ error: 'field가 필요합니다.' }, { status: 400, headers: CORS });
    }

    const ALLOWED_FIELDS = ['gender', 'phone', 'notes', 'serviceArea', 'counselorRegId', 'teacherName', 'counselorMemo', 'saved', 'dedicated', 'scholarshipDiscounts'];
    const PARTICIPANT_FIELDS = ['name', 'gender', 'birthDate', 'grade', 'parentInfo', 'refundAccount', 'counselorRegId', 'teacherName', 'counselorMemo', 'saved', 'dedicated'];
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
    if (participantIndex === undefined && field === 'scholarshipDiscounts') {
      if (reg.registrationType === 'staff') {
        return Response.json({ error: '스태프 신청에는 장학금을 적용할 수 없습니다.' }, { status: 400, headers: CORS });
      }
      const spots = Math.max(1, registrationSpots(reg).total || 1);
      const normalizedScholarshipDiscounts = normalizeScholarshipDiscounts(value, spots);
      const normalizedScholarshipDiscountAmount = scholarshipDiscountAmount(normalizedScholarshipDiscounts);
      const normalizedScholarshipDiscountDetails = normalizeScholarshipDiscountDetailsForAdmin(
        reg.scholarshipDiscountDetails,
        normalizedScholarshipDiscounts
      );
      const campFeeBase = parseInt(reg.campFeeBase, 10) || (CAMP_BASE_FEE * spots);
      updatedReg = {
        ...reg,
        scholarshipDiscounts: normalizedScholarshipDiscounts,
        scholarshipDiscountDetails: normalizedScholarshipDiscountDetails,
        scholarshipDiscountText: scholarshipDiscountText(normalizedScholarshipDiscounts),
        scholarshipDiscountDetailText: scholarshipDiscountDetailText(normalizedScholarshipDiscountDetails),
        scholarshipDiscountAmount: normalizedScholarshipDiscountAmount,
        campFeeBase,
        campFeeFinal: Math.max(0, campFeeBase - normalizedScholarshipDiscountAmount),
      };
    } else if (participantIndex !== undefined) {
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

      // 참가자 이름/성별이 바뀌면 정원 카운터(신청 게이트 + 확정 인원)를 실제 명단 기준으로 즉시 재계산
      if (field === 'name' || field === 'gender') {
        const campRegs = await listCampRegistrations(env, campId);
        const nextRegs = replaceRegistration(campRegs, updatedReg);
        await Promise.all([
          syncConfirmedCounters(env, campId, nextRegs),
          syncSubmissionCounters(env, campId, nextRegs),
        ]);
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
