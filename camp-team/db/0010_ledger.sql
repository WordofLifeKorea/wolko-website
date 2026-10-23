-- 10단계: 회계 장부 (실제 수입·지출) — 예산 화면 확장
-- 1) 캠프팀 역할 확장: director(캠프팀 디렉터), treasurer(월코 전체 재정 담당 — 확인용 조회 전용)
--    SQLite 는 CHECK 조건을 바꿀 수 없어서 표를 다시 만들어 옮긴다 (다른 표가 이 표를 참조하지 않는다).
CREATE TABLE IF NOT EXISTS camp_members_new (
  email     TEXT PRIMARY KEY,
  name      TEXT NOT NULL DEFAULT '',
  role      TEXT NOT NULL CHECK (role IN ('admin','director','finance','treasurer','member')),
  active    INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  isTest    INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO camp_members_new (email,name,role,active,createdAt,updatedAt,isTest) SELECT email,name,role,active,createdAt,updatedAt,isTest FROM camp_members;
DROP TABLE camp_members;
ALTER TABLE camp_members_new RENAME TO camp_members;

-- 2) 항목 목록 (엑셀의 "목록" 탭): 수입 항목 / 지출 항목. 쓰던 항목은 지우지 않고 "사용 안 함"으로 바꾼다.
CREATE TABLE IF NOT EXISTS ledger_categories (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL CHECK (kind IN ('income','expense')),
  name      TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  active    INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT,
  UNIQUE (kind, name)
);
INSERT OR IGNORE INTO ledger_categories (id,kind,name,sortOrder,active,createdAt,updatedAt,createdBy) VALUES
  ('lc-i1','income','캠프비',10,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-i2','income','이월금',20,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-i3','income','후원금',30,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-i4','income','기타수입',40,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e1','expense','식비',10,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e2','expense','간식비',20,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e3','expense','프로그램활동비',30,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e4','expense','영어활동비',40,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e5','expense','숙박시설비',50,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e6','expense','물품구입비',60,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e7','expense','스텝관리비',70,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e8','expense','강사비',80,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system'),
  ('lc-e9','expense','기타',90,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','system');

-- 3) 장부 기간: 디렉터가 시작·끝 날짜를 정한다(분기·6개월 등). 마감하면 잠기고, 남은 금액이 다음 기간의 "이월금"으로 넘어간다.
CREATE TABLE IF NOT EXISTS ledger_periods (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  startDate      TEXT NOT NULL,
  endDate        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  currency       TEXT NOT NULL DEFAULT 'KRW',
  closingBalance INTEGER,                 -- 마감할 때의 최종 잔액(최소 단위 정수)
  closedAt TEXT, closedBy TEXT,
  carryPeriodId  TEXT,                    -- 남은 금액을 넘겨 준 다음 기간
  note           TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

-- 4) 거래(실제 수입·지출). 금액은 항상 양수이고 구분(수입/지출)으로 방향을 나타낸다.
--    source: manual(직접 입력) / excel(엑셀 가져오기) / expense(경비 리포트 연동) / carry(이전 기간에서 넘어온 이월금)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id          TEXT PRIMARY KEY,
  periodId    TEXT NOT NULL REFERENCES ledger_periods(id),
  entryDate   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('income','expense')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  campId      TEXT REFERENCES camps(id),
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','excel','expense','carry')),
  externalKey TEXT,                       -- 연동·이월 건을 중복 없이 한 번만 만들기 위한 열쇠
  srcRow      INTEGER,                    -- 엑셀에서 온 줄 번호(다음 가져오기 때 같은 줄을 찾는 데 씀)
  fingerprint TEXT,                       -- 엑셀 줄 내용의 지문(바뀌었는지 비교)
  editedLocal INTEGER NOT NULL DEFAULT 0, -- 1 = 가져온 뒤 포털에서 직접 고친 줄(다음 가져오기 때 덮어쓰지 않고 물어본다)
  importId    TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, updatedBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_period ON ledger_entries(periodId, entryDate);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_ext ON ledger_entries(periodId, externalKey) WHERE externalKey IS NOT NULL AND deletedAt IS NULL;

-- 5) 기간 예산(엑셀의 "예산" 탭): 기간 안에서 항목별로 쓰기로 한 금액
CREATE TABLE IF NOT EXISTS ledger_plan (
  periodId  TEXT NOT NULL REFERENCES ledger_periods(id),
  kind      TEXT NOT NULL CHECK (kind IN ('income','expense')),
  category  TEXT NOT NULL,
  amount    INTEGER NOT NULL CHECK (amount >= 0),
  updatedAt TEXT NOT NULL, updatedBy TEXT,
  PRIMARY KEY (periodId, kind, category)
);
