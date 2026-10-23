-- 12단계: 엑셀 가져오기 기록 (언제 누가 어떤 파일을 올려 무엇이 바뀌었는지)
CREATE TABLE IF NOT EXISTS ledger_imports (
  id        TEXT PRIMARY KEY,
  periodId  TEXT NOT NULL REFERENCES ledger_periods(id),
  fileName  TEXT NOT NULL DEFAULT '',
  summary   TEXT NOT NULL DEFAULT '{}',   -- {added, changed, removed, unchanged, skipped, categories, plan} 숫자
  createdAt TEXT NOT NULL, createdBy TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_imports_period ON ledger_imports(periodId, createdAt);
