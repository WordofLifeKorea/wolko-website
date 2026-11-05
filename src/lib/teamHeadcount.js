// 섬기는이 사람 수 세기 — 목록 한 항목이 부부(두 사람)일 수 있어서 '항목 수'가 아니라 '사람 수'로 센다.
// 기준: 목록에 실제로 보이는 이름(name_ko, 없으면 name_en)을 '&'로 나눠 이름 하나를 한 사람으로 센다.
//   예) '김환규 & 김씬띠아' → 2명, '챕먼 조' → 1명.
// 이름에 배우자가 적혀 있지 않아도 프로필에 배우자 값(spouse_ko / spouse_en)이 있으면 2명으로 센다.
//   예) 송승현(배우자 신진아, 목록 이름에는 안 보임) → 2명. 화면에 보이는 이름은 바꾸지 않는다.
// /give 선교사 고르기 · 프로필 옆 목록이 같이 쓴다.
export const headcountOf = (p) => {
  const d = (p && p.data) || p || {};
  const name = String(d.name_ko || d.name_en || '');
  const named = Math.max(1, name.split('&').filter((s) => s.trim()).length);
  const hasSpouse = String(d.spouse_ko || d.spouse_en || '').trim() !== '';
  return named === 1 && hasSpouse ? 2 : named;
};
export const headcount = (list) => (list || []).reduce((n, p) => n + headcountOf(p), 0);
