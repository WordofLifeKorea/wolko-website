-- 13단계: 잔액 대조 + 경비 리포트 연동

-- 잔액 대조: 월코 재정 담당에게 받은 "통장 실제 잔액"과 장부 잔액을 비교한 기록 (기록·확인용 — 돈을 움직이지 않는다)
CREATE TABLE IF NOT EXISTS ledger_reconcile (
  id            TEXT PRIMARY KEY,
  periodId      TEXT NOT NULL REFERENCES ledger_periods(id),
  asOfDate      TEXT NOT NULL,           -- 이 날짜까지의 잔액을 비교
  bankBalance   INTEGER NOT NULL,        -- 통장 실제 잔액 (최소 단위 정수, 원)
  ledgerBalance INTEGER NOT NULL,        -- 그 시점의 장부 잔액
  diff          INTEGER NOT NULL,        -- bankBalance - ledgerBalance (0 이면 일치)
  note          TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL, createdBy TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_reconcile_period ON ledger_reconcile(periodId, asOfDate);

-- 경비 연동 규칙
--  kind='withdraw': key = 경비 리포트의 출금 계좌 id → value = '1' 이면 "캠프 계좌"로 보고 장부에 반영
--  kind='account' : key = 경비 리포트의 카테고리(예: Food (8968)) → value = 장부 항목 이름(예: 식비)
CREATE TABLE IF NOT EXISTS ledger_expense_rules (
  kind      TEXT NOT NULL CHECK (kind IN ('withdraw','account')),
  key       TEXT NOT NULL,
  value     TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL, updatedBy TEXT,
  PRIMARY KEY (kind, key)
);

-- 경비 리포트의 항목(줄) 중 캠프 계좌에서 나간 것들의 처리 상태. 같은 줄은 한 번만 반영된다.
--  state: linked(장부에 반영됨) / pending(자동 반영 못 함: reason 참고) / ignored(사용자가 제외)
--  reason: noPeriod(그 날짜의 열린 기간이 없음) / closed(기간이 마감됨) / dup(장부에 비슷한 거래가 이미 있음)
CREATE TABLE IF NOT EXISTS ledger_expense_rows (
  reportId   TEXT NOT NULL,
  rowIdx     INTEGER NOT NULL,
  state      TEXT NOT NULL CHECK (state IN ('linked','pending','ignored')),
  reason     TEXT NOT NULL DEFAULT '',
  entryDate  TEXT NOT NULL,              -- 송금 처리 완료일(KST)
  amount     INTEGER NOT NULL,           -- 원화 환산 금액
  item       TEXT NOT NULL DEFAULT '',
  memo       TEXT NOT NULL DEFAULT '',
  project    TEXT NOT NULL DEFAULT '',
  title      TEXT NOT NULL DEFAULT '',
  submitter  TEXT NOT NULL DEFAULT '',   -- 이름만 (이메일은 가져오지 않는다)
  account    TEXT NOT NULL DEFAULT '',   -- 경비 카테고리
  withdraw   TEXT NOT NULL DEFAULT '',   -- 출금 계좌 id
  currency   TEXT NOT NULL DEFAULT 'KRW',
  origAmount REAL,                       -- 외화일 때 원래 금액
  entryId    TEXT,                       -- 반영된(또는 연결된) 장부 줄
  candidate  TEXT,                       -- 중복 의심 장부 줄
  periodId   TEXT,                       -- 반영한(또는 반영하려던) 기간
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, updatedBy TEXT,
  PRIMARY KEY (reportId, rowIdx)
);
CREATE INDEX IF NOT EXISTS idx_expense_rows_state ON ledger_expense_rows(state);

-- 이미 끝난 리포트(송금 완료·반려)는 다시 읽지 않기 위한 표시
CREATE TABLE IF NOT EXISTS ledger_expense_seen (
  reportId  TEXT PRIMARY KEY,
  status    TEXT NOT NULL,
  checkedAt TEXT NOT NULL
);
