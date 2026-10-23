-- 캠프별 공간 화면의 "내 배치"(카드 순서·숨김). 사람마다 따로 저장되고 다른 사람 화면에는 영향이 없다.
CREATE TABLE IF NOT EXISTS space_layout (
  email TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
