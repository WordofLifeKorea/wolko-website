/**
 * 월코 포털 "캠프 관리자"의 신청 데이터 → 캠프팀 캠프별 공간 연동 (읽기 전용).
 *
 * 기존 신청 데이터(CAMP_KV 의 `camp:{캠프ID}:reg:*`)를 읽기만 한다. put / delete 는 호출하지 않고,
 * 읽은 내용을 캠프팀 DB 에 복사해 저장하지도 않는다(화면을 열 때마다 읽어서 요약만 돌려준다).
 *
 * 개인정보는 두 단계로 나눈다.
 *  - 캠프팀 명단에 있는 사람: 이름·성별·학년·교회·학교·특이사항·신청 상태·낸 금액·장학/할인
 *  - sensitive(디렉터·캠프 재정·관리자)만 추가: 연락처·이메일·비상연락처·생년월일·보호자 정보·환불 은행/계좌/예금주·상담 메모·신앙 상태
 *
 * 인원·금액 시나리오 (대기 명단은 따로 센다)
 *  - min      최종 확정(잔금까지 확인)된 신청만
 *  - expected 예약금 수납 이상 — 홈페이지 신청 게이지와 같은 기준 (그중 완납 / 예약금만 낸 사람을 나눠서 보여 준다)
 *  - max      신청한 사람 전부(접수 대기 포함) — 마감까지 모두 온다면
 */
export const REG_PREFIX = (id) => `camp:${id}:reg:`;
export const PORTAL_ID = /^[A-Za-z0-9_-]{1,60}$/;
const MAX_REGS = 3000;

/** 한 캠프의 신청 전부(캠퍼 + 스태프 지원서). 읽기 전용 — get/list 만 쓴다. */
export async function listRegs(env, portalCampId) {
  if (!env.CAMP_KV || typeof env.CAMP_KV.list !== 'function' || !PORTAL_ID.test(String(portalCampId || ''))) return null;
  const out = []; let cursor;
  do {
    const res = await env.CAMP_KV.list({ prefix: REG_PREFIX(portalCampId), ...(cursor ? { cursor } : {}), limit: 1000 });
    const got = await Promise.all(res.keys.map((k) => env.CAMP_KV.get(k.name, 'json')));
    out.push(...got.filter(Boolean));
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor && out.length < MAX_REGS);
  return out;
}

const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const str = (v, n = 200) => String(v ?? '').trim().slice(0, n);

/** pending(접수 대기) | deposit(예약금 수납) | confirmed(최종 확정) — 포털 관리자와 같은 판정 */
export function statusOf(reg) {
  if (reg.status === 'confirmed' || (reg.status === undefined && reg.confirmed === true)) return 'confirmed';
  return reg.status === 'deposit' ? 'deposit' : 'pending';
}
const isStaff = (reg) => reg.registrationType === 'staff';
const isGroup = (reg) => reg.registrationType === 'group';
const named = (reg) => (Array.isArray(reg.participants) ? reg.participants : []).filter((p) => p && str(p.name));

/** 이 신청이 차지하는 자리 수: 개인 1, 단체는 신청한 인원(없으면 이름이 입력된 인원) */
export function headsOf(reg) {
  if (isStaff(reg)) return 0;
  if (isGroup(reg)) return int(reg.groupCount) || named(reg).length;
  return 1;
}
/** 이 신청의 총 납입금(할인 적용 후). 없으면 기본 금액 − 할인으로 계산하고, 그것도 없으면 null */
export function totalOf(reg) {
  const fin = Number(reg.campFeeFinal);
  if (Number.isFinite(fin) && fin >= 0 && reg.campFeeFinal !== '' && reg.campFeeFinal != null) return Math.round(fin);
  const base = Number(reg.campFeeBase);
  if (Number.isFinite(base) && base > 0) return Math.max(0, Math.round(base - (Number(reg.scholarshipDiscountAmount) || 0)));
  return null;
}
/** 예약금: 신청에 기록된 값 → 없으면 호출한 쪽이 넘긴 1인 예약금 × 자리 수 → 모르면 null */
export function depositOf(reg, perHead) {
  const own = Number(reg.depositAmount);
  if (Number.isFinite(own) && own > 0) return Math.round(own);
  return perHead > 0 ? Math.round(perHead * Math.max(1, headsOf(reg))) : null;
}

const GENDER = { male: '남', female: '여' };
export const genderLabel = (g) => GENDER[g] || '';

/** 개인정보(연락처·계좌 등)는 sensitive 일 때만 넣는다 */
function camperRow(reg, p, sensitive) {
  const group = isGroup(reg), src = group ? p : reg;
  const row = {
    regId: reg.regId, type: reg.registrationType === 'group' ? 'group' : 'individual', status: statusOf(reg), waitlist: !!reg.isWaitlist,
    name: str(src.name, 60), gender: src.gender === 'male' || src.gender === 'female' ? src.gender : '', grade: str(src.grade, 30),
    church: str(reg.church, 80), school: str(reg.school, 80), groupName: group ? str(reg.name, 60) : '',
    notes: str(reg.notes, 500), scholarship: str(reg.scholarshipDiscountText || reg.scholarshipDiscountDetailText, 300),
    payOnSite: !!reg.payOnSite, refundRegistered: !!(str(reg.refundAccount) || str(src.refundAccount)), registeredAt: str(reg.registeredAt, 30),
  };
  if (sensitive) row.private = {
    saved: src.saved === true, dedicated: src.dedicated === true, counselorMemo: str(src.counselorMemo || (!group ? reg.counselorMemo : ''), 500),
    phone: str(reg.phone, 30), email: str(reg.email, 100), emergency: str(reg.emergency, 100), birthDate: str(src.birthDate, 20), parentInfo: str(p?.parentInfo, 100),
    refundBank: str(reg.refundBank, 40), refundAccount: str(src.refundAccount || reg.refundAccount, 60), refundHolder: str(reg.refundHolder, 40),
  };
  return row;
}

function staffRow(reg, sensitive) {
  const row = {
    regId: reg.regId, name: str(reg.name, 60), gender: reg.gender === 'male' || reg.gender === 'female' ? reg.gender : '', teams: [reg.team1, reg.team2].map((x) => str(x, 40)).filter(Boolean),
    church: str(reg.church, 80), englishAbility: str(reg.englishAbility, 40), mediaTech: str(reg.mediaTech, 80), instruments: str(reg.instruments, 80), previousCamp: str(reg.previousCamp, 40),
    confirmed: reg.confirmed === true || reg.status === 'confirmed', registeredAt: str(reg.registeredAt, 30),
  };
  if (sensitive) row.private = { phone: str(reg.phone, 30), email: str(reg.email, 100), birthDate: str(reg.birthDate, 20), pastorName: str(reg.pastorName, 60), pastorContact: str(reg.pastorContact, 60) };
  return row;
}

const emptyTotals = () => ({ regs: 0, heads: 0, income: 0, received: 0, unknownFee: 0, paidInFull: { regs: 0, heads: 0, income: 0 }, depositOnly: { regs: 0, heads: 0, income: 0, received: 0, balanceDue: 0 }, pending: { regs: 0, heads: 0, income: 0 } });

/**
 * 신청 목록 → 요약.
 * opts: { sensitive: 연락처·계좌까지 포함할지, depositPerHead: 신청에 예약금 기록이 없을 때 쓸 1인 예약금, includeCampers: 명단 포함 여부 }
 */
export function summarize(regs, { sensitive = false, depositPerHead = 0, includeCampers = true } = {}) {
  const camp = regs.filter((r) => !isStaff(r)), staff = regs.filter(isStaff);
  const live = camp.filter((r) => !r.isWaitlist), waitlist = camp.filter((r) => r.isWaitlist);
  const S = { min: emptyTotals(), expected: emptyTotals(), max: emptyTotals() };
  const buckets = { min: new Map(), expected: new Map(), max: new Map() }, fixed = { min: 0, expected: 0, max: 0 };
  const byStatus = { pending: { regs: 0, heads: 0 }, deposit: { regs: 0, heads: 0 }, confirmed: { regs: 0, heads: 0 }, waitlist: { regs: waitlist.length, heads: waitlist.reduce((n, r) => n + headsOf(r), 0) } };
  const gender = { male: 0, female: 0, unknown: 0 }, grades = {}, discounts = {};

  for (const reg of live) {
    const st = statusOf(reg), heads = headsOf(reg), total = totalOf(reg), dep = depositOf(reg, depositPerHead);
    byStatus[st].regs++; byStatus[st].heads += heads;
    const received = total == null ? 0 : st === 'confirmed' ? total : st === 'deposit' ? Math.min(total, dep || 0) : 0;
    for (const key of ['min', 'expected', 'max']) {
      if (key === 'min' && st !== 'confirmed') continue; if (key === 'expected' && st === 'pending') continue;
      const t = S[key]; t.regs++; t.heads += heads; t.received += received; if (total == null) t.unknownFee += heads; else t.income += total;
      if (st === 'confirmed') { t.paidInFull.regs++; t.paidInFull.heads += heads; t.paidInFull.income += total || 0; }
      else if (st === 'deposit') { t.depositOnly.regs++; t.depositOnly.heads += heads; t.depositOnly.income += total || 0; t.depositOnly.received += received; t.depositOnly.balanceDue += Math.max(0, (total || 0) - received); }
      else { t.pending.regs++; t.pending.heads += heads; t.pending.income += total || 0; }
      if (total != null && heads > 0) { const unit = total / heads; if (Number.isInteger(unit)) buckets[key].set(unit, (buckets[key].get(unit) || 0) + heads); else fixed[key] += total; }
    }
    // 인원 구성(성별·학년)·할인 사용 현황은 신청한 사람 전부(대기 명단 제외) 기준
    if (isGroup(reg)) { for (const p of named(reg)) { gender[p.gender === 'male' || p.gender === 'female' ? p.gender : 'unknown']++; const g = str(p.grade, 20) || '미입력'; grades[g] = (grades[g] || 0) + 1; } const unnamed = Math.max(0, heads - named(reg).length); gender.unknown += unnamed; if (unnamed) grades['이름 미입력'] = (grades['이름 미입력'] || 0) + unnamed; }
    else { gender[reg.gender === 'male' || reg.gender === 'female' ? reg.gender : 'unknown']++; const g = str(reg.grade, 20) || '미입력'; grades[g] = (grades[g] || 0) + 1; }
    for (const [k, n] of Object.entries(reg.scholarshipDiscounts || {})) { const c = int(n); if (c) discounts[k] = (discounts[k] || 0) + c; }
  }
  const feeRows = {};
  for (const key of ['min', 'expected', 'max']) feeRows[key] = { buckets: [...buckets[key].entries()].sort((a, b) => b[0] - a[0]).map(([unit, qty]) => ({ unit, qty })), fixed: fixed[key] };

  const out = { counts: { applications: camp.length, waitlist: waitlist.length, staff: staff.length }, scenarios: S, feeRows, byStatus, gender, grades, discounts, payOnSite: live.filter((r) => r.payOnSite).length };
  if (includeCampers) {
    const rows = [];
    for (const reg of camp) {
      if (isGroup(reg)) { for (const p of named(reg)) rows.push(camperRow(reg, p, sensitive)); const un = Math.max(0, headsOf(reg) - named(reg).length); if (un) rows.push({ regId: reg.regId, type: 'group', status: statusOf(reg), waitlist: !!reg.isWaitlist, name: '', unnamed: un, groupName: str(reg.name, 60), gender: '', grade: '', church: str(reg.church, 80), school: '', notes: '', scholarship: '', payOnSite: !!reg.payOnSite, refundRegistered: !!str(reg.refundAccount), registeredAt: str(reg.registeredAt, 30), ...(sensitive ? { private: { phone: str(reg.phone, 30), email: str(reg.email, 100), emergency: '', birthDate: '', parentInfo: '', refundBank: str(reg.refundBank, 40), refundAccount: str(reg.refundAccount, 60), refundHolder: str(reg.refundHolder, 40) } } : {}) }); }
      else rows.push(camperRow(reg, reg, sensitive));
    }
    rows.sort((a, b) => (a.waitlist - b.waitlist) || a.registeredAt.localeCompare(b.registeredAt));
    out.campers = rows;
    const staffRows = staff.map((r) => staffRow(r, sensitive)).sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    const byTeam = {}; for (const r of staffRows) for (const t of r.teams.length ? r.teams : ['미정']) byTeam[t] = (byTeam[t] || 0) + 1;
    out.staff = { total: staffRows.length, confirmed: staffRows.filter((r) => r.confirmed).length, byTeam, items: staffRows };
  }
  return out;
}
