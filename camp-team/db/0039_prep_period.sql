-- 준비기간(캠프 시작 전에 스태프가 먼저 모여 교육·준비하는 기간) + 체크리스트 자동 적용 질문. 모두 덧붙이기만 한다(기존 행은 그대로, 값이 없으면 "준비기간 없음" · "묻지 않음").
--   camps.prepStart / prepEnd        : 준비기간 (YYYY-MM-DD). 둘 다 NULL = 준비기간이 없는 캠프. 둘 다 있거나 둘 다 없어야 한다(코드가 확인)
--   checklist_templates.autoApply    : 1 = 새 캠프를 만들 때 "이 체크리스트를 적용할까요?" 하고 물어보기 (묻기만 하고, 사람이 「적용」을 눌러야 만들어진다)
ALTER TABLE camps ADD COLUMN prepStart TEXT;
ALTER TABLE camps ADD COLUMN prepEnd TEXT;
ALTER TABLE checklist_templates ADD COLUMN autoApply INTEGER NOT NULL DEFAULT 0;
