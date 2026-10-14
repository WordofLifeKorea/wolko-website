export const WINTER_CAMP_POLICY = {
  campId: '2027-wolko-winter',
  campIds: ['2027-wolko-winter', '2027-unity-winter'],
  version: 'winter-2027-v1',
  fee: 550000,
  deposit: 50000,
  earlyBirdUntil: '2026-11-04T23:59:59.999+09:00',
  discounts: {
    early_bird: { amount: 50000, ko: 'Early Bird · 1차 신청기간(10월 15일 – 11월 4일)에만 적용', en: 'Early Bird · Round 1 only (Oct 15 – Nov 4)' },
    sibling: { amount: 50000, ko: '친구 · 지인 · 가족과 함께 참여', en: 'Joining with a friend or family member' },
    james_memory: { amount: 0, reward: 100000, ko: '야고보서 1–5장 전체 암송', en: 'Memorize James 1–5', note_ko: '성경 암송 테스트 통과시 10만원 환급 또는 10만원 상당 선물', note_en: 'Pass the Bible memorization test and get KRW 100,000 back (or a gift worth the same!)' },
    excellent_camper: { amount: 200000, ko: '베스트 캠퍼', en: 'Best Camper', note_ko: '바로 직전 캠프의 베스트 캠퍼만 해당됩니다.', note_en: 'Just for the Best Camper of the camp right before this one.' },
  },
};

/**
 * 신청창(접수 가능 시간) — 캠프별로 열리는 구간. 구간 밖에는 신청 버튼을 숨기고 서버도 접수하지 않는다. 시각은 모두 한국 시간.
 * to 가 null 이면 캠프 시작 전 또는 접수 마감(정원 · 캠프 상태)까지 계속 열려 있다.
 * 2027 겨울 월코 영어캠프: 1차(얼리버드) 10/15 오전 10시 – 11/4, 공백 기간(11/5 – 11/17)은 닫고, 2차(일반) 11/18 오전 10시부터.
 */
export const REGISTRATION_WINDOWS = {
  '2027-wolko-winter': [
    { round: 1, from: '2026-10-15T10:00:00+09:00', to: '2026-11-04T23:59:59.999+09:00' },
    { round: 2, from: '2026-11-18T10:00:00+09:00', to: null },
    // 임시 접수: 2026-10-14 18:00 KST 까지 (오늘 한정, 1차와 같은 조건)
    { round: 1, from: '2026-10-14T17:00:00+09:00', to: '2026-10-14T18:00:00+09:00' },
  ],
  // 2026 제주 캠퍼스데이: 접수 중이다가 10월 21일 오후 2시에 마감 (외부 신청서이므로 버튼만 닫는다)
  '2026-jeju-campus-day': [
    { round: 1, from: null, to: '2026-10-21T14:00:00+09:00' },
  ],
};

/**
 * 개인 신청 지원 연령(출생연도 기준, 양 끝 포함). 범위가 있는 캠프는 생년월일을 받아 범위 밖이면 신청을 막고 문의로 안내한다.
 * 2027 겨울 월코 영어캠프: 예비 초6(2015년생) – 예비 고1(2011년생).
 */
export const BIRTH_YEAR_RANGES = {
  '2027-wolko-winter': { min: 2011, max: 2015 },
};

/**
 * 성별 정원(남·여 따로) — 확정 정원과 예비 인원을 성별마다 따로 센다.
 * 2027 겨울 월코 영어캠프: 남 25 + 여 25 (전체 50), 예비는 남 5 + 여 5.
 * 정원이 차면 그 성별의 다음 신청은 예비로 접수되고, 예비까지 차면 그 성별 접수가 마감된다. 예비 순위는 예약금 확인 순서로 관리한다(관리자 화면).
 */
export const GENDER_CAPACITY = {
  '2027-wolko-winter': { male: 25, female: 25, waitlist: 5 },
};

/** 생년월일(YYYY-MM-DD) 검사: { ok, reason: 'none'|'missing'|'invalid'|'out-of-range', range } */
export function birthYearCheck(campId, birthDate) {
  const range = BIRTH_YEAR_RANGES[campId];
  if (!range) return { ok: true, reason: 'none', range: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || '').trim());
  if (!m) return { ok: false, reason: birthDate ? 'invalid' : 'missing', range };
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const real = new Date(Date.UTC(year, month - 1, day));
  if (real.getUTCFullYear() !== year || real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day) return { ok: false, reason: 'invalid', range };
  if (year < range.min || year > range.max) return { ok: false, reason: 'out-of-range', range };
  return { ok: true, reason: 'ok', range };
}

/** 지금 접수 상태: { state: 'none'|'open'|'before'|'gap', nextOpenAt } — none 은 신청창이 따로 없는 캠프 */
export function registrationState(campId, now = Date.now()) {
  const windows = REGISTRATION_WINDOWS[campId];
  if (!windows) return { state: 'none', nextOpenAt: null };
  const times = windows.map(w => ({ from: w.from ? Date.parse(w.from) : -Infinity, to: w.to ? Date.parse(w.to) : Infinity }));
  if (times.some(w => now >= w.from && now <= w.to)) return { state: 'open', nextOpenAt: null };
  const next = times.filter(w => w.from > now).sort((a, b) => a.from - b.from)[0];
  if (!next) return { state: 'gap', nextOpenAt: null };
  return { state: now < times[0].from ? 'before' : 'gap', nextOpenAt: new Date(next.from).toISOString() };
}

export function usesWinterCampPolicy(campId) {
  return WINTER_CAMP_POLICY.campIds.includes(campId);
}

export function winterCampQuote(values, spots = 1, appliedAt = Date.now()) {
  const policy = WINTER_CAMP_POLICY;
  const counts = {};
  const entries = Array.isArray(values) ? values.map(key => [key, 1]) : Object.entries(values || {});
  for (const [key, value] of entries) {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0 || count > spots) throw new Error('장학금 적용 인원을 확인해주세요.');
    if (!count) continue;
    if (!Object.hasOwn(policy.discounts, key)) throw new Error('지원하지 않는 장학금 항목입니다.');
    counts[key] = count;
  }
  if (Object.keys(counts).filter(key => key !== 'excellent_camper').length > 2) throw new Error('장학금은 최대 두 항목만 선택할 수 있습니다.');
  if (counts.early_bird && (!Number.isFinite(new Date(appliedAt).getTime()) || new Date(appliedAt).getTime() > Date.parse(policy.earlyBirdUntil))) {
    throw new Error('Early Bird 신청 기한은 1차 신청기간(2026년 11월 4일)까지입니다.');
  }
  const discount = Object.entries(counts).reduce((sum, [key, count]) => sum + policy.discounts[key].amount * count, 0);
  return {
    scholarshipPolicyVersion: policy.version,
    scholarshipDiscounts: counts,
    scholarshipDiscountAmount: discount,
    scholarshipDiscountText: Object.entries(counts).map(([key, count]) => {
      const item = policy.discounts[key];
      const payment = item.reward ? '선차감 없음 · 종료 후 확인하여 지급' : `${(item.amount * count).toLocaleString('ko-KR')}원 할인`;
      return `${item.ko} ${count}명 (${payment})`;
    }).join(', '),
    scholarshipDeferredReward: (counts.james_memory || 0) * 100000,
    scholarshipDeferredRewardStatus: counts.james_memory ? 'pending_verification' : null,
    campFeeBase: policy.fee * spots,
    campFeeFinal: Math.max(0, policy.fee * spots - discount),
    depositAmount: policy.deposit * spots,
  };
}
