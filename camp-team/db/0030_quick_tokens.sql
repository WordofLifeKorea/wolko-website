-- 0030: 폰에서 업무 추가 — 사람별 개인 주소(토큰). 이 열쇠로는 「내 업무 만들기」만 된다.
CREATE TABLE IF NOT EXISTS quick_tokens (
  email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, lastUsedAt TEXT
);
