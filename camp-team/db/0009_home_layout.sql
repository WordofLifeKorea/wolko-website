-- 9단계: 캠프팀 홈 화면 배치 (관리자 기본 배치 + 개인별 조정)
-- scope = 'default'(관리자가 정한 모두의 기본 홈) 또는 'u:이메일'(그 사람만의 홈). 개인 행이 있으면 그 사람은 개인 배치를 쓴다.
-- 삭제(초기화)는 행을 지우는 것으로 처리한다 — 업무 자료가 아니라 보기 설정이라 휴지통 대상이 아니다.
CREATE TABLE IF NOT EXISTS home_layout (
  scope     TEXT PRIMARY KEY,
  json      TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updatedBy TEXT
);
