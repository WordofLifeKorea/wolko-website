-- 업무 확인(체크) + 캠프 날짜가 바뀌면 기한 함께 옮기기. 덧붙이기만 한다(기존 행은 그대로, 값이 없으면 예전처럼 동작).
--   completedBy / completedAt : 체크해서 완료로 바꾼 사람(화면에 보이는 이름, 없으면 이메일)과 시각(ISO). 체크를 풀면 둘 다 비운다
--   templateItemId            : 체크리스트 템플릿에서 만든 업무라면 원래 항목 번호
--   offsetDays                : 그 항목의 기준일(캠프 시작일 기준, 음수 = 전). 캠프 시작일이 바뀔 때 기한을 다시 계산하는 데 쓴다
--   dueEdited                 : 1 = 사람이 기한을 직접 바꾼 업무 → 캠프 날짜가 바뀌어도 자동으로 옮기지 않는다
ALTER TABLE tasks ADD COLUMN completedBy TEXT;
ALTER TABLE tasks ADD COLUMN completedAt TEXT;
ALTER TABLE tasks ADD COLUMN templateItemId TEXT;
ALTER TABLE tasks ADD COLUMN offsetDays INTEGER;
ALTER TABLE tasks ADD COLUMN dueEdited INTEGER NOT NULL DEFAULT 0;
