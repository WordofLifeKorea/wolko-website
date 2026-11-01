// 섬기는이 직책 · 사역 거점 이름 — 목록(/people), 프로필(/team/…), 프로필 옆 목록이 같이 쓴다.
// 한 곳에서만 고치면 모든 화면이 같은 말로 바뀐다.

// role_badge(영문) → 한글 표시
export const ROLE_KO = {
  Missionary: '선교사',
  Missionaries: '선교사',
  'Field Director': '필드 디렉터',
  'Jeju Director': '제주 디렉터',
  Director: '디렉터',
  'Short-term Worker': '단기 사역자',
  Intern: '인턴',
  Staff: '간사',
};
export const roleKo = (badge) => (badge ? ROLE_KO[badge] || badge : '');

// campus 값 → 사역 거점 이름
export const CAMPUS = {
  pyeongtaek: { ko: '평택 월코센터', en: 'Pyeongtaek WOLKO Center' },
  jeju: { ko: '제주 월비', en: 'Jeju WOLBI' },
};
export const campusOf = (campus) => (campus === 'pyeongtaek' ? CAMPUS.pyeongtaek : CAMPUS.jeju);
