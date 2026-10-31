-- 0024: 자료실 태그·언어·성경 본문·설교자 + 「AI 정리함」 일괄 올리기 묶음(한 번에 되돌리기)
-- 모두 비워 둘 수 있는 칸이다: 기존 자료는 그대로이고, 모르는 값은 비워 둔다(AI 도 지어내지 않는다).
ALTER TABLE files ADD COLUMN tags TEXT NOT NULL DEFAULT '';        -- 쉼표로 나눈 주제 태그 (예: 구원,복음,학생)
-- (자료의 언어는 0002 에서 만든 files.lang 을 그대로 쓴다: '' | ko | en | both)
ALTER TABLE files ADD COLUMN scripture TEXT NOT NULL DEFAULT '';   -- 성경 본문 위치 (예: 요한복음 3:16-21) — 글에 분명히 있을 때만
ALTER TABLE files ADD COLUMN speaker TEXT NOT NULL DEFAULT '';     -- 설교자·강사 — 글에 분명히 있을 때만
ALTER TABLE files ADD COLUMN aiBatchId TEXT;                       -- 일괄 올리기 묶음 번호
CREATE INDEX IF NOT EXISTS idx_files_batch ON files(aiBatchId);
CREATE TABLE IF NOT EXISTS ai_batches (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'intake', actor TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, undoneAt TEXT, undoneBy TEXT
);
