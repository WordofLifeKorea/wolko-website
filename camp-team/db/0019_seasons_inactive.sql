-- 0019: 캠프 연도·시즌, 비활성 업무 (ALTER 는 한 번만 실행된다 — migrate-remote.sh 가 번호를 지정해서 실행)
-- 캠프의 연도(예: 2027)와 시즌(여름·겨울·봄·가을 등 자유 입력). 비어 있어도 된다.
ALTER TABLE camps ADD COLUMN year INTEGER;
ALTER TABLE camps ADD COLUMN season TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_camps_year ON camps(year);
-- 비활성 업무: 목록에는 있지만 진행 중 업무·알림·진행률·달력·TV 등 "할 일 집계"에서는 빠진다. 팀원이 확인하고 활성으로 바꾼다.
ALTER TABLE tasks ADD COLUMN inactive INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tasks_inactive ON tasks(inactive);
