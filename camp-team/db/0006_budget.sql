-- 5단계: 캠프 예산 (금액 자료 — 서버에서 금액 권한이 있는 사람만 읽고 쓴다)
-- 금액은 "최소 단위 정수"로 저장한다: KRW 는 1원 단위(소수 없음), USD 는 센트(100분의 1). 소수점 오차를 없애기 위함.
ALTER TABLE budget_lines ADD COLUMN expectedAmount INTEGER;                       -- 예상 지출 (비어 있으면 예산 계획과 같다고 본다)
ALTER TABLE budget_lines ADD COLUMN vendor TEXT NOT NULL DEFAULT '';             -- 업체/지급처
ALTER TABLE budget_lines ADD COLUMN paidAt TEXT;                                 -- 지급일
ALTER TABLE budget_lines ADD COLUMN status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ordered','paid'));

-- 캠프별 총 예산(상한). 통화마다 하나.
CREATE TABLE IF NOT EXISTS budget_targets (
  id          TEXT PRIMARY KEY,
  campId      TEXT NOT NULL REFERENCES camps(id),
  currency    TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_target ON budget_targets(campId, currency) WHERE deletedAt IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_camp ON budget_lines(campId);
