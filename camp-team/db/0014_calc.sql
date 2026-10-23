-- 14단계: 예산 계산기(시나리오). 캠프비를 얼마로 정하고 인원·항목이 어떠면 남는 금액이 얼마인지 미리 따져 보는 계산을 저장해 둔다.
-- 계산 내용(model)은 JSON 한 덩어리로 저장하고, 서버가 모양을 검사해서 저장한다.
CREATE TABLE IF NOT EXISTS calc_scenarios (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  campId    TEXT REFERENCES camps(id),
  periodId  TEXT REFERENCES ledger_periods(id),
  model     TEXT NOT NULL,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, createdBy TEXT, updatedBy TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
