-- 2단계: 파일 관리 (분류, 버전 이력, 여러 캠프에 연결, 금액 자료 제한)
ALTER TABLE files ADD COLUMN category TEXT NOT NULL DEFAULT 'etc';        -- 자료 종류
ALTER TABLE files ADD COLUMN topic TEXT NOT NULL DEFAULT '';              -- 주제 (Camp Crew, 후속 양육 …)
ALTER TABLE files ADD COLUMN restricted INTEGER NOT NULL DEFAULT 0;       -- 1 = 금액 자료(예산·지출): 금액 권한이 있는 사람만 보임
ALTER TABLE files ADD COLUMN linkKind TEXT NOT NULL DEFAULT '';           -- 외부 링크 종류: google-doc / google-sheet / google-slide / google-form / drive / other
ALTER TABLE files ADD COLUMN currentVersionId TEXT;                       -- 지금 적용 중인 버전
ALTER TABLE files ADD COLUMN lang TEXT NOT NULL DEFAULT '';               -- 원본 언어(ko/en) — 나중에 번역 기능에서 사용

-- 업로드한 파일의 버전. 새 버전을 올려도 이전 버전은 그대로 남는다.
CREATE TABLE IF NOT EXISTS file_versions (
  id         TEXT PRIMARY KEY,
  fileId     TEXT NOT NULL REFERENCES files(id),
  versionNo  INTEGER NOT NULL,
  backend    TEXT NOT NULL CHECK (backend IN ('nas','r2')),
  storageKey TEXT NOT NULL,
  fileName   TEXT NOT NULL,
  mime       TEXT NOT NULL DEFAULT 'application/octet-stream',
  sizeBytes  INTEGER NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  uploadedBy TEXT NOT NULL DEFAULT '',
  createdAt  TEXT NOT NULL,
  deletedAt  TEXT,
  isTest     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_versions_file ON file_versions(fileId);

-- 같은 파일을 다시 올리지 않고 다른 캠프/행사에도 연결
CREATE TABLE IF NOT EXISTS file_links (
  id        TEXT PRIMARY KEY,
  fileId    TEXT NOT NULL REFERENCES files(id),
  campId    TEXT NOT NULL REFERENCES camps(id),
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL DEFAULT '',
  deletedAt TEXT,
  UNIQUE (fileId, campId)
);
CREATE INDEX IF NOT EXISTS idx_file_links_camp ON file_links(campId);
CREATE INDEX IF NOT EXISTS idx_files_camp ON files(campId);
