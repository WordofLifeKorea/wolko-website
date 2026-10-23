-- 3단계: 일정 · 업무 · 체크리스트 템플릿
ALTER TABLE tasks ADD COLUMN ownerSuggestion TEXT NOT NULL DEFAULT '';  -- 템플릿이 제안한 담당자. 사람이 확인해서 ownerName 에 확정하기 전에는 담당자가 아니다.
ALTER TABLE tasks ADD COLUMN sourceKey TEXT NOT NULL DEFAULT '';        -- 어디서 만들어졌는지(템플릿/CSV). 같은 것을 두 번 만들지 않는 데 쓴다.
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(campId, sourceKey);

-- 팀 일정 (포털에서 입력). googleEventId 는 나중에 Google Calendar 와 연결할 때 채운다.
CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  campId        TEXT REFERENCES camps(id),
  title         TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'team' CHECK (kind IN ('team','camp','out')),  -- 팀 일정 / 캠프 일정 / 부재
  startDate     TEXT NOT NULL,
  endDate       TEXT,
  startTime     TEXT NOT NULL DEFAULT '',
  endTime       TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  googleEventId TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(startDate);

-- 체크리스트 템플릿: 캠프를 만들 때 복사해서 쓰는 준비 업무 목록
CREATE TABLE IF NOT EXISTS checklist_templates (
  id          TEXT PRIMARY KEY,
  nameKo      TEXT NOT NULL,
  nameEn      TEXT NOT NULL DEFAULT '',
  typeId      TEXT REFERENCES camp_types(id),
  description TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checklist_items (
  id              TEXT PRIMARY KEY,
  templateId      TEXT NOT NULL REFERENCES checklist_templates(id),
  title           TEXT NOT NULL,
  offsetDays      INTEGER,                -- 캠프 시작일 기준 며칠 전(-)/후(+). 비어 있으면 마감일 없이 만든다.
  ownerSuggestion TEXT NOT NULL DEFAULT '',
  priority        TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  notes           TEXT NOT NULL DEFAULT '',
  sortOrder       INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_template ON checklist_items(templateId);
