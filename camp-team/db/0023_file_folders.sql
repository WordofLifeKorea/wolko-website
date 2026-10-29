-- 0023: 자료실 폴더. 폴더째 올린 자료를 한 묶음으로 보고, 폴더 이름이나 파일 이름으로 찾을 수 있게 한다.
-- file_folders: 한 단계 폴더(하위 폴더는 만들지 않고 파일 이름에 경로를 남긴다). 지워도 안의 파일은 그대로 남는다(폴더만 사라짐).
-- files.folderId: 이 파일이 들어 있는 폴더(없으면 NULL = 폴더 없는 자료). 기존 파일은 영향이 없다.
CREATE TABLE IF NOT EXISTS file_folders (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  nameEn    TEXT NOT NULL DEFAULT '',
  campId    TEXT,
  typeId    TEXT,
  createdBy TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);
ALTER TABLE files ADD COLUMN folderId TEXT;
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folderId);
