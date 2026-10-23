-- 캠프팀 포털 1단계 데이터베이스 구조 (Cloudflare D1 / SQLite)
-- 기존 CAMP_KV 와 완전히 별개의 새 데이터베이스(DB 바인딩)에만 만든다.
-- 모든 행: id(고유 번호), createdAt, updatedAt, deletedAt(삭제 표시 — 복구 가능), createdBy, isTest(1 = 테스트 자료)

CREATE TABLE IF NOT EXISTS camp_members (
  email     TEXT PRIMARY KEY,
  name      TEXT NOT NULL DEFAULT '',
  role      TEXT NOT NULL CHECK (role IN ('admin','finance','member')),
  active    INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  isTest    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS camp_types (
  id          TEXT PRIMARY KEY,
  nameKo      TEXT NOT NULL,
  nameEn      TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS camps (
  id        TEXT PRIMARY KEY,
  typeId    TEXT NOT NULL REFERENCES camp_types(id),
  nameKo    TEXT NOT NULL,
  nameEn    TEXT NOT NULL DEFAULT '',
  startDate TEXT,
  endDate   TEXT,
  status    TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','done','canceled')),
  location  TEXT NOT NULL DEFAULT '',
  notes     TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_camps_type ON camps(typeId);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  campId     TEXT REFERENCES camps(id),
  title      TEXT NOT NULL,
  ownerName  TEXT NOT NULL DEFAULT '',   -- 비어 있어도 저장 가능 (임의로 채우지 않는다)
  ownerEmail TEXT NOT NULL DEFAULT '',
  dueDate    TEXT,                       -- YYYY-MM-DD, 비어 있어도 됨
  status     TEXT NOT NULL DEFAULT 'Not Started'
             CHECK (status IN ('Not Started','In Progress','Waiting for Confirmation','Delayed','Completed','Not Applicable')),
  priority   TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  notes      TEXT NOT NULL DEFAULT '',
  meetingId  TEXT,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_camp ON tasks(campId);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(dueDate);

CREATE TABLE IF NOT EXISTS meetings (
  id        TEXT PRIMARY KEY,
  campId    TEXT REFERENCES camps(id),
  meetDate  TEXT NOT NULL,
  meetTime  TEXT NOT NULL DEFAULT '',
  title     TEXT NOT NULL,
  purpose   TEXT NOT NULL DEFAULT '',
  summaryKo TEXT NOT NULL DEFAULT '',
  summaryEn TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agenda_items (
  id          TEXT PRIMARY KEY,
  meetingId   TEXT REFERENCES meetings(id),
  campId      TEXT REFERENCES camps(id),
  topic       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','discussed','decided')),
  nextMeeting INTEGER NOT NULL DEFAULT 0,   -- 1 = 다음 회의 안건
  note        TEXT NOT NULL DEFAULT '',
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id          TEXT PRIMARY KEY,
  campId      TEXT REFERENCES camps(id),
  typeId      TEXT REFERENCES camp_types(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL DEFAULT 'etc',     -- pdf, doc, xls, ppt, img, audio, etc
  storage     TEXT NOT NULL DEFAULT 'link' CHECK (storage IN ('nas','drive','link')),
  externalUrl TEXT NOT NULL DEFAULT '',
  uploadedBy  TEXT NOT NULL DEFAULT '',
  statusLabel TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

-- 금액이 들어가는 표. 이 표는 권한이 있는 사람의 요청에서만 읽는다.
CREATE TABLE IF NOT EXISTS budget_lines (
  id           TEXT PRIMARY KEY,
  campId       TEXT REFERENCES camps(id),
  category     TEXT NOT NULL DEFAULT '',
  label        TEXT NOT NULL,
  plannedAmount INTEGER NOT NULL DEFAULT 0,
  actualAmount  INTEGER,
  currency     TEXT NOT NULL DEFAULT 'KRW',
  notes        TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id       TEXT PRIMARY KEY,
  at       TEXT NOT NULL,
  actor    TEXT NOT NULL,
  action   TEXT NOT NULL,
  entity   TEXT NOT NULL,
  entityId TEXT NOT NULL,
  detail   TEXT NOT NULL DEFAULT ''
);
