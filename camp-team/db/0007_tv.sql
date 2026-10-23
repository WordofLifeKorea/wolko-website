-- 6단계: TV 대시보드 (화면 배치 · 설정 · 팀 공지) + 캠프의 주제/정원/신청 연동 ID
ALTER TABLE camps ADD COLUMN theme TEXT NOT NULL DEFAULT '';                 -- 캠프 주제·말씀 (TV 위젯에 표시)
ALTER TABLE camps ADD COLUMN capacity INTEGER;                               -- 정원 (신청 현황 위젯에서 사용, 선택)
ALTER TABLE camps ADD COLUMN registrationCampId TEXT NOT NULL DEFAULT '';    -- 기존 신청 시스템의 캠프 ID (신청 인원 "숫자"만 읽어 오는 데 사용, 선택)

-- TV 화면 배치(JSON). id='main' 하나를 쓰고, 나중에 여러 TV 를 위해 id 를 늘릴 수 있다.
CREATE TABLE IF NOT EXISTS tv_layout (
  id        TEXT PRIMARY KEY,
  json      TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updatedBy TEXT NOT NULL DEFAULT ''
);
-- TV 설정: token, theme(dark/light), language(en/ko/both), refreshSec, reloadHours, weatherLabel, weatherLat, weatherLon
CREATE TABLE IF NOT EXISTS tv_settings (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
-- 팀 공지 (TV 의 Team Announcements 위젯)
CREATE TABLE IF NOT EXISTS notices (
  id        TEXT PRIMARY KEY,
  message   TEXT NOT NULL,
  messageEn TEXT NOT NULL DEFAULT '',
  active    INTEGER NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
