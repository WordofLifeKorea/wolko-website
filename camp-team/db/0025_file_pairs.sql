-- 0025: 한·영 짝 묶기 — 같은 내용의 한국어 자료와 영어 자료를 한 쌍으로 묶는다.
-- 비워 둘 수 있는 칸이다: 기존 자료는 그대로이고, 묶기는 사람이 확인한 뒤에만 저장한다.
ALTER TABLE files ADD COLUMN pairId TEXT;                          -- 같은 값을 가진 자료끼리 한 쌍 (한국어 ↔ 영어)
CREATE INDEX IF NOT EXISTS idx_files_pair ON files(pairId);
