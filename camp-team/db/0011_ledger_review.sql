-- 11단계: 거래의 "분류 확인 필요" 표시 (경비 리포트에서 자동으로 들어온 줄 중 항목을 아직 확정하지 않은 것)
ALTER TABLE ledger_entries ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0;
