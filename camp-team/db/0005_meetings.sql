-- 4단계: 회의록 · 안건(구역)별 논의 · 결정 이력 · 첨부 · 전사문
-- 한국어/영어는 "같은 회의, 같은 구역" 안에 나란히 저장해서 업무·결정이 항상 같은 대상을 가리키게 한다.
ALTER TABLE meetings ADD COLUMN titleEn TEXT NOT NULL DEFAULT '';
ALTER TABLE meetings ADD COLUMN purposeEn TEXT NOT NULL DEFAULT '';
ALTER TABLE meetings ADD COLUMN attendees TEXT NOT NULL DEFAULT '';      -- "A, B, C"
ALTER TABLE meetings ADD COLUMN recordNote TEXT NOT NULL DEFAULT '';     -- 기록 범위 (예: 약 56분)
ALTER TABLE meetings ADD COLUMN sourcesNote TEXT NOT NULL DEFAULT '';    -- 자료 설명 (녹취록, 사진 …)
ALTER TABLE meetings ADD COLUMN status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('draft','final'));

-- 회의의 구역(안건별 논의). 기존 agenda_items 표를 확장해서 쓴다. topic = 한국어 제목.
ALTER TABLE agenda_items ADD COLUMN titleEn TEXT NOT NULL DEFAULT '';
ALTER TABLE agenda_items ADD COLUMN bodyKo TEXT NOT NULL DEFAULT '';
ALTER TABLE agenda_items ADD COLUMN bodyEn TEXT NOT NULL DEFAULT '';
ALTER TABLE agenda_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'discussion' CHECK (kind IN ('summary','context','discussion','other'));  -- context = 배경 설명(결정 아님)
ALTER TABLE agenda_items ADD COLUMN sectionNo INTEGER;
ALTER TABLE agenda_items ADD COLUMN tags TEXT NOT NULL DEFAULT '';       -- ",camp crew,예산," 형태 (쉼표로 감싸서 정확히 찾는다)
CREATE INDEX IF NOT EXISTS idx_agenda_meeting ON agenda_items(meetingId);

-- 결정: 제안 → 방향 합의 → 최종 결정 / 보류 / 변경. 이전 결정은 지우지 않고 "대체됨" 으로 남긴다.
CREATE TABLE IF NOT EXISTS decisions (
  id           TEXT PRIMARY KEY,
  meetingId    TEXT REFERENCES meetings(id),
  agendaItemId TEXT REFERENCES agenda_items(id),
  campId       TEXT REFERENCES camps(id),
  kind         TEXT NOT NULL CHECK (kind IN ('proposal','direction','final','hold','changed')),
  textKo       TEXT NOT NULL DEFAULT '',
  textEn       TEXT NOT NULL DEFAULT '',
  decidedDate  TEXT,
  supersedesId TEXT REFERENCES decisions(id),
  state        TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','superseded','withdrawn')),
  tags         TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_decisions_camp ON decisions(campId);
CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON decisions(meetingId);

-- 업무가 어느 안건/결정에서 나왔는지
ALTER TABLE tasks ADD COLUMN agendaItemId TEXT;
ALTER TABLE tasks ADD COLUMN decisionId TEXT;

-- 회의에 파일(녹음, 필기 PDF, 사진, 참고 문서)을 연결 — 파일은 자료실에 한 번만 올리고 연결만 한다
CREATE TABLE IF NOT EXISTS meeting_files (
  id        TEXT PRIMARY KEY,
  meetingId TEXT NOT NULL REFERENCES meetings(id),
  fileId    TEXT NOT NULL REFERENCES files(id),
  role      TEXT NOT NULL DEFAULT 'reference' CHECK (role IN ('minutes','transcript','notes','photo','audio','reference')),
  createdAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT,
  UNIQUE (meetingId, fileId)
);

-- 전사 텍스트 (다른 프로그램으로 만든 전사문을 붙여넣어 보관). 나중에 AI 회의록 초안의 재료가 된다.
CREATE TABLE IF NOT EXISTS meeting_texts (
  id        TEXT PRIMARY KEY,
  meetingId TEXT NOT NULL REFERENCES meetings(id),
  kind      TEXT NOT NULL DEFAULT 'transcript' CHECK (kind IN ('transcript','notes')),
  lang      TEXT NOT NULL DEFAULT '',
  body      TEXT NOT NULL,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_meeting_texts ON meeting_texts(meetingId);
