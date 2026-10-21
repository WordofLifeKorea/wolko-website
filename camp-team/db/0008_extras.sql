-- 7단계: 용어집(고정 단어)과 AI 초안 보관
-- 용어집: AI 가 회의록 초안을 쓰거나 나중에 번역할 때 "이 단어는 바꾸지 말라"고 알려 주는 목록 (캠프 이름, 직책, 고유명사 등)
CREATE TABLE IF NOT EXISTS glossary (
  id        TEXT PRIMARY KEY,
  termKo    TEXT NOT NULL DEFAULT '',
  termEn    TEXT NOT NULL DEFAULT '',
  keep      INTEGER NOT NULL DEFAULT 1,       -- 1 = 번역하지 않고 그대로 둔다, 0 = 이 번역어를 쓴다
  notes     TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
-- AI 초안: 결과는 항상 "검토 가능한 초안"으로 먼저 저장되고, 사람이 골라서 적용해야 회의록에 들어간다. 근거(전사문 인용)가 함께 저장된다.
CREATE TABLE IF NOT EXISTS ai_drafts (
  id          TEXT PRIMARY KEY,
  meetingId   TEXT NOT NULL REFERENCES meetings(id),
  kind        TEXT NOT NULL DEFAULT 'minutes',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied','rejected')),
  model       TEXT NOT NULL DEFAULT '',
  sourceChars INTEGER NOT NULL DEFAULT 0,
  sourceNote  TEXT NOT NULL DEFAULT '',
  resultJson  TEXT NOT NULL,
  createdAt TEXT NOT NULL, createdBy TEXT, appliedAt TEXT, deletedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_meeting ON ai_drafts(meetingId);

-- Google Calendar 연동 준비: 포털 일정이 마지막으로 구글 달력에 반영된 시각 (구글 쪽 일정 번호는 events.googleEventId)
ALTER TABLE events ADD COLUMN googleSyncedAt TEXT;
