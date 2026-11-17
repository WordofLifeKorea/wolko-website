/**
 * 복음 통계 — 연간 "복음 도달(Gospel Reach)" 목표.
 *
 * 도달 인원 = 개인 전도로 복음을 들은 인원 + 캠프 참석 + 월코·교회 행사 참석 + 전도지 + SNS 도달 (영적 대화는 복음 전달 전 단계라 넣지 않는다).
 * 목표는 본부(Mike VanProoyen)에 낸 숫자 그대로 — 평택(본토)·제주를 따로 세운다.
 * 2026년은 포탈 보고를 연중에 시작해 기록이 일부뿐이라, 평택만 임시로 30,000 으로 둔다(제주는 정하지 않음).
 */
export const REACH_FIELD_IDS = ['evangelism', 'campAttendance', 'eeAttendance', 'literature', 'social'];

export const REACH_GOALS = {
  mainland: { 2026: 30000, 2027: 42000, 2028: 46800, 2029: 51700, 2030: 57000 },
  jeju: { 2027: 32000, 2028: 36800, 2029: 41700, 2030: 47000 },
};

/** 포탈 보고가 한 해를 다 덮지 못하는 해 — 화면에 '일부만 집계' 안내를 붙인다 */
export const REACH_PARTIAL_YEARS = [2026];

/** 화면에 내려보내는 꼴 */
export const reachGoalsPayload = () => ({ fields: REACH_FIELD_IDS, goals: REACH_GOALS, partialYears: REACH_PARTIAL_YEARS });

/** 한 지역 집계(summary.mainland 등)의 도달 인원 */
export const reachOf = totals => REACH_FIELD_IDS.reduce((sum, id) => sum + (Number(totals?.[id]) || 0), 0);
