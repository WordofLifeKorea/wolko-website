/**
 * 복음 통계 — 월코 캠프 자동 집계.
 *  - 캠프 일정(id·시작일)은 빌드 때 만든 /camp-schedules.json 에서 읽는다. 시작한 달이 그 캠프가 속한 달이다.
 *  - 캠퍼: 잔금까지 마쳐 "최종 확정"된 신청만 센다(개인 1명, 단체는 이름이 적힌 참가자 수). 스태프 신청은 세지 않는다.
 *  - 구원: 캠프 후 구원(savedTiming 'after') + 시점 없이 구원만 체크된 옛 기록. 캠프 전 구원('before')은 이 캠프의 구원이 아니라서 뺀다.
 *  - 헌신: dedicated 체크.
 *  - 스태프: 신청 기록에서 세지 않고, 마스터·관리자가 캠프마다 직접 입력한 숫자(KV gospel:campstaff:{캠프})를 더한다.
 *  숫자만 돌려주고 이름·연락처 등 개인정보는 밖으로 내지 않는다.
 */
export const CAMP_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
export const STAFF_KEY = id => `gospel:campstaff:${id}`;
const AUTO_KEY = id => `gospel:campauto:${id}`;
export const MAX_STAFF = 500;
const AUTO_TTL_SECONDS = 120;

export const campLocation = id => (/jeju|wolbi/i.test(String(id || '')) ? 'jeju' : 'mainland');
export const monthOfSchedule = schedule => (/^(\d{4}-\d{2})/.exec(String(schedule?.startDate || '')) || [])[1] || '';

let scheduleCache = { at: 0, list: null };
export async function loadSchedules(env, request) {
  if (scheduleCache.list && Date.now() - scheduleCache.at < 300000) return scheduleCache.list;
  try {
    if (!env.ASSETS?.fetch) return [];                     // Cloudflare Pages 에서는 항상 있다
    const res = await env.ASSETS.fetch(new Request(new URL('/camp-schedules.json', request.url)));
    if (!res.ok) return [];
    const list = (await res.json()).filter(c => c && CAMP_ID_RE.test(String(c.id)) && !/test/i.test(c.id));
    scheduleCache = { at: Date.now(), list };
    return list;
  } catch { return []; }
}
export const resetScheduleCache = () => { scheduleCache = { at: 0, list: null }; };

export const isFinalConfirmed = reg => reg?.status === 'confirmed' || (reg?.status === undefined && reg?.confirmed === true);
const salvationOf = x => x?.savedTiming === 'after' || (x?.saved === true && !x?.savedTiming);

/** 신청 한 건 → 확정 캠퍼 수 · 구원 · 헌신 (확정되지 않았거나 스태프 신청이면 0) */
export function countRegistration(reg) {
  const zero = { campers: 0, salvations: 0, dedications: 0 };
  if (!reg || reg.registrationType === 'staff' || !isFinalConfirmed(reg)) return zero;
  const people = reg.registrationType === 'group'
    ? (Array.isArray(reg.participants) ? reg.participants : []).filter(p => p && String(p.name || '').trim())
    : [reg];
  return people.reduce((sum, p) => ({ campers: sum.campers + 1, salvations: sum.salvations + (salvationOf(p) ? 1 : 0), dedications: sum.dedications + (p.dedicated === true ? 1 : 0) }), zero);
}

async function listKeys(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

/** 캠프 하나의 자동 집계(2분 동안 KV 에 담아 둔다) */
export async function campAuto(env, campId) {
  const cached = await env.CAMP_KV.get(AUTO_KEY(campId), 'json');
  if (cached) return cached;
  const total = { campers: 0, salvations: 0, dedications: 0 };
  const keys = await listKeys(env, `camp:${campId}:reg:`);
  for (let i = 0; i < keys.length; i += 40) {
    const regs = await Promise.all(keys.slice(i, i + 40).map(key => env.CAMP_KV.get(key, 'json')));
    for (const reg of regs) { const c = countRegistration(reg); total.campers += c.campers; total.salvations += c.salvations; total.dedications += c.dedications; }
  }
  await env.CAMP_KV.put(AUTO_KEY(campId), JSON.stringify(total), { expirationTtl: AUTO_TTL_SECONDS });
  return total;
}

export async function loadStaff(env, campId) {
  const saved = await env.CAMP_KV.get(STAFF_KEY(campId), 'json');
  const n = Number(saved?.count);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/** 그 달에 시작한 캠프들의 집계 — 캠퍼도 스태프도 없는 캠프(접수 전, 외부 신청서 등)는 뺀다 */
export async function monthCamps(env, request, month) {
  const schedules = (await loadSchedules(env, request)).filter(s => monthOfSchedule(s) === month);
  const out = [];
  for (const s of schedules) {
    const auto = await campAuto(env, s.id);
    const staff = await loadStaff(env, s.id);
    if (!auto.campers && !staff) continue;
    out.push({ id: s.id, titleKo: s.titleKo || s.id, titleEn: s.titleEn || s.titleKo || s.id, location: campLocation(s.id), campers: auto.campers, staff, salvations: auto.salvations, dedications: auto.dedications });
  }
  return out;
}

/** 지난 캠프까지 모두 — 일정 파일에 있는 모든 캠프의 집계(최근 시작일 순). 캠퍼도 스태프도 없는 캠프는 뺀다 */
export async function allCamps(env, request) {
  const schedules = (await loadSchedules(env, request)).slice().sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  const out = [];
  for (const s of schedules) {
    const auto = await campAuto(env, s.id);
    const staff = await loadStaff(env, s.id);
    if (!auto.campers && !staff) continue;
    out.push({ id: s.id, month: monthOfSchedule(s), titleKo: s.titleKo || s.id, titleEn: s.titleEn || s.titleKo || s.id, dateKo: s.dateKo || '', location: campLocation(s.id), campers: auto.campers, staff, salvations: auto.salvations, dedications: auto.dedications });
  }
  return out;
}

/** 자동 집계를 월 합계(summarize 결과)에 더한다 — 참석 = 캠퍼 + 스태프 */
export function addCampsToSummary(summary, camps) {
  for (const c of camps) {
    for (const place of [c.location, 'all']) {
      summary[place].campCount += 1;
      summary[place].campAttendance += c.campers + c.staff;
      summary[place].campSalvations += c.salvations;
      summary[place].campDedications += c.dedications;
    }
  }
  return summary;
}
