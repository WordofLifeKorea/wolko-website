-- 0029: 사람 배정 — 캠프 참가자·스태프 명단, 조·방·차량, 배정. (민감한 정보라 이름·성별·학년·교회·역할만 둔다: 전화·주소·생년월일은 저장하지 않는다)
CREATE TABLE IF NOT EXISTS camp_slots (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, kind TEXT NOT NULL,                -- group(조) | room(방·숙소) | vehicle(차량)
  name TEXT NOT NULL, capacity INTEGER,                                          -- 정원·좌석 수(비워도 됨)
  gender TEXT NOT NULL DEFAULT '',                                               -- 방: M | F | '' (성별 규칙)
  leader TEXT NOT NULL DEFAULT '',                                               -- 조장 · 방 담당 · 차량 운전자 (이름)
  notes TEXT NOT NULL DEFAULT '', sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slots_camp ON camp_slots(campId, kind, deletedAt);
CREATE TABLE IF NOT EXISTS camp_people (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',                                               -- M | F | ''
  grade TEXT NOT NULL DEFAULT '',                                                -- 학년(초3, 중1, 고2, 성인 …) 자유 입력
  church TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant',                                      -- participant | staff | leader
  notes TEXT NOT NULL DEFAULT '',
  groupId TEXT, roomId TEXT, vehicleId TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_people_camp ON camp_people(campId, deletedAt);
