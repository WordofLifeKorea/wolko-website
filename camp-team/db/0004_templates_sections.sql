-- 4단계 준비: 체크리스트 구역(섹션)·임시 기준일 표시, 업무의 구역
ALTER TABLE checklist_items ADD COLUMN section TEXT NOT NULL DEFAULT '';      -- 예: "1. 기획·운영 준비"
ALTER TABLE checklist_items ADD COLUMN provisional INTEGER NOT NULL DEFAULT 0; -- 1 = 기준일을 임시로 정함(사람이 확인 전)
ALTER TABLE tasks ADD COLUMN section TEXT NOT NULL DEFAULT '';
