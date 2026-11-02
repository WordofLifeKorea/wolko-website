-- 0042: 진행표 공개 보기 링크 — 「링크를 아는 사람은 누구나 읽기만」 (로그인 없음).
-- 새 표 하나 + 색인뿐이라 기존 자료는 바뀌지 않는다. 링크는 지우지 않고 「끄기」(revokedAt)만 표시해 기록을 남긴다.
--   token       : 길고 추측할 수 없는 글자(32자 이상, 주소에 쓸 수 있는 글자만). 이 값을 아는 사람만 열 수 있다.
--   showOwners  : 1 이면 담당자 이름도 보인다 (기본 0 = 숨김)
--   teams       : 쉼표로 이은 팀 이름. 비어 있으면 모든 팀, 있으면 그 팀 일정 + 팀이 정해지지 않은 공통 일정만
--   expiresAt   : 이 시각(UTC ISO) 이후에는 열리지 않음. NULL = 기한 없음
--   revokedAt   : 「끄기」를 누른 시각. 값이 있으면 바로 열리지 않음
CREATE TABLE IF NOT EXISTS camp_share_links (
  id TEXT PRIMARY KEY,
  campId TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  showOwners INTEGER NOT NULL DEFAULT 0,
  teams TEXT NOT NULL DEFAULT '',
  expiresAt TEXT,
  revokedAt TEXT,
  createdBy TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  lastViewedAt TEXT,
  viewCount INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_share_links_camp ON camp_share_links(campId, createdAt);
