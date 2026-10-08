export const WINTER_CAMP_POLICY = {
  campId: '2027-wolko-winter',
  campIds: ['2027-wolko-winter', '2027-unity-winter'],
  version: 'winter-2027-v1',
  fee: 550000,
  deposit: 50000,
  earlyBirdUntil: '2026-11-05T23:59:59.999+09:00',
  discounts: {
    early_bird: { amount: 50000, ko: 'Early Bird · 2026년 11월 5일까지 신청', en: 'Early Bird · Apply by November 5, 2026' },
    sibling: { amount: 50000, ko: '친구 · 지인 · 가족과 함께 참여', en: 'Attend with a friend, acquaintance, or family member' },
    james_memory: { amount: 0, reward: 100000, ko: '야고보서 1–5장 전체 암송', en: 'Memorize James 1–5', note_ko: '성경 암송 테스트 통과시 10만원 환급 또는 10만원 상당 선물', note_en: 'Pass the Bible memorization test for a KRW 100,000 refund or equivalent gift' },
    excellent_camper: { amount: 200000, ko: '베스트 캠퍼', en: 'Best Camper', note_ko: '바로 직전 캠프의 베스트 캠퍼만 해당됩니다.', note_en: 'Applies only to the Best Camper of the immediately preceding camp.' },
  },
};

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
  if (Object.keys(counts).length > 2) throw new Error('장학금은 최대 두 항목만 선택할 수 있습니다.');
  if (counts.early_bird && (!Number.isFinite(new Date(appliedAt).getTime()) || new Date(appliedAt).getTime() > Date.parse(policy.earlyBirdUntil))) {
    throw new Error('Early Bird 신청 기한은 2026년 11월 5일까지입니다.');
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
