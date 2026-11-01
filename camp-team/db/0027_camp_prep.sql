-- 0027: 캠프 준비 — 당일 진행표 · 준비물 · 연락처 · 반복 캠프(시리즈) · 폰 캘린더 구독 주소
-- 모두 새 표(또는 비워 둘 수 있는 새 칸)라서 기존 자료는 바뀌지 않는다.
CREATE TABLE IF NOT EXISTS camp_timeline (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, dayDate TEXT NOT NULL,           -- YYYY-MM-DD
  startTime TEXT NOT NULL DEFAULT '', endTime TEXT NOT NULL DEFAULT '',       -- HH:MM (비워도 됨)
  title TEXT NOT NULL, titleEn TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', ownerName TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_timeline_camp ON camp_timeline(campId, dayDate, startTime);
CREATE TABLE IF NOT EXISTS camp_supplies (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, name TEXT NOT NULL, nameEn TEXT NOT NULL DEFAULT '', qty TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'need',                                        -- need | bought | ready | skip
  ownerName TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_supplies_camp ON camp_supplies(campId);
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'other',                    -- church | school | vendor | speaker | venue | other
  name TEXT NOT NULL, org TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', campId TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_contacts_kind ON contacts(kind, deletedAt);
CREATE TABLE IF NOT EXISTS camp_series (
  id TEXT PRIMARY KEY, nameKo TEXT NOT NULL, nameEn TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'church',   -- church | school | other
  months TEXT NOT NULL DEFAULT '',                                            -- 열리는 달 직접 선택 (예: 3,7,12)
  typeId TEXT, notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE camps ADD COLUMN seriesId TEXT;                                   -- 반복 캠프 묶음(선택)
CREATE TABLE IF NOT EXISTS calendar_tokens (
  email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL  -- 사람별 폰 캘린더 구독 주소(읽기 전용)
);
