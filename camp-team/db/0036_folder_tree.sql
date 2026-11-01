-- 0036: 자료실 폴더 트리 — 폴더 안에 폴더(최대 5단계), 순서 바꾸기, 폴더 삭제 후 보관함 복구.
-- 더하기만 한다(기존 표·열·자료는 그대로). 이미 있는 한 단계 폴더는 모두 맨 위(최상위) 폴더로 남고, 파일의 folderId 도 그대로다.
--   file_folders.parentId    : 위 폴더(NULL = 최상위). 단계 수·순환은 서버가 막는다.
--   file_folders.sortOrder   : 같은 위치 안의 순서(NULL = 예전 순서: 새것이 위). 사람이 순서를 바꾸면 1, 2, 3… 이 붙는다.
--   file_folders.deletedWith : 어떤 폴더를 「안의 것까지 모두 삭제」할 때 함께 지워진 폴더·파일에 그 폴더의 id 가 붙는다(복구할 때 함께 되돌린다).
--   files.sortOrder / files.deletedWith : 위와 같은 뜻(파일).
ALTER TABLE file_folders ADD COLUMN parentId TEXT;
ALTER TABLE file_folders ADD COLUMN sortOrder INTEGER;
ALTER TABLE file_folders ADD COLUMN deletedWith TEXT;
ALTER TABLE files ADD COLUMN sortOrder INTEGER;
ALTER TABLE files ADD COLUMN deletedWith TEXT;
CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parentId);
CREATE INDEX IF NOT EXISTS idx_file_folders_deleted_with ON file_folders(deletedWith);
CREATE INDEX IF NOT EXISTS idx_files_deleted_with ON files(deletedWith);
