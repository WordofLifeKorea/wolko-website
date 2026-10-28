/**
 * 복음 통계 ↔ CRS 연동 — "지역교회 사역" 보고의 연결 교회 A/B/C 수와 리더십 훈련 인원.
 *  CRS(Firebase churches/{id})의 교회마다
 *    grade          'A' | 'B' | 'C' | ''   — 본부 양식의 연결 교회 등급 (A 가까운 관계 · B 좋은 관계 · C 좋은 연락)
 *    leaderTraining { 'YYYY-MM': 훈련받은 리더 수 } — 달마다 기록
 *  를 두고, 서버가 읽어 위치(평택/제주)별로 센다. 위치는 교회의 시/도(region)가 제주면 제주, 아니면 평택(본토).
 *  교회 이름·연락처는 밖으로 내지 않는다.
 */
export const GRADES = ['A', 'B', 'C'];
export const crsLocation = church => (/제주|jeju/i.test(String(church?.region || '')) ? 'jeju' : 'mainland');

const cleanGrade = v => (GRADES.includes(String(v || '').toUpperCase()) ? String(v).toUpperCase() : '');
const cleanCount = v => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; };

/** CRS churches 레코드 → 숫자만 남긴 [{ location, grade, leaders: { 'YYYY-MM': n } }] */
export function slimCrsChurches(records) {
  return Object.values(records || {}).filter(Boolean).map(c => ({
    location: crsLocation(c), grade: cleanGrade(c.grade),
    leaders: Object.fromEntries(Object.entries(c.leaderTraining || {}).filter(([m]) => /^\d{4}-\d{2}$/.test(m)).map(([m, n]) => [m, cleanCount(n)]).filter(([, n]) => n > 0)),
  }));
}

/** 위치별 { churchA, churchB, churchC, leadershipTraining(그 달) } */
export function ministryFromCrs(slim, month) {
  const empty = () => ({ churchA: 0, churchB: 0, churchC: 0, leadershipTraining: 0 });
  const out = { mainland: empty(), jeju: empty() };
  for (const c of slim || []) {
    const bucket = out[c.location === 'jeju' ? 'jeju' : 'mainland'];
    if (c.grade) bucket[`church${c.grade}`] += 1;
    bucket.leadershipTraining += cleanCount(c.leaders?.[month]);
  }
  return out;
}
