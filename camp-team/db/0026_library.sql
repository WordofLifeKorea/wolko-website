-- 0026: 보관함 — 설교·메시지 / 찬양 콘티 / 게임·활동 / 장소·시설 카드를 한 표에 모은다(탭으로 나눠 보여 줌).
-- 노래 가사는 이 표에 글로 저장하지 않는다(저작권): 가사 파일은 자료실 파일로 연결만 한다.
CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                    -- sermon | worship | game | venue
  title TEXT NOT NULL,
  titleEn TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',         -- 한글/영어 짝 태그 (자료실 태그와 같은 형식)
  lang TEXT NOT NULL DEFAULT '',         -- '' | ko | en | both
  scripture TEXT NOT NULL DEFAULT '',
  speaker TEXT NOT NULL DEFAULT '',
  itemDate TEXT,                         -- 설교한 날 / 장소 답사한 날 (모르면 비움)
  campId TEXT,                           -- 관련 캠프(선택)
  fileId TEXT,                           -- 연결한 자료실 파일(선택)
  extra TEXT NOT NULL DEFAULT '{}',      -- 종류별 칸(JSON): 장소 주소·연락처·비용·답사 메모, 게임 인원·시간·준비물·규칙, 찬양 키·발음 제목·언어별 파일
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT,
  isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_library_kind ON library_items(kind, deletedAt);
CREATE INDEX IF NOT EXISTS idx_library_camp ON library_items(campId);
