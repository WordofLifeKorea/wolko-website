-- AI 업무 추천: 체크리스트 템플릿 화면에서 「AI 추천 받기」로 받은 추천 업무를 서버에 저장해 둔다.
-- 덧붙이기만 한다(새 표 + 색인). 기존 자료는 건드리지 않는다.
-- status: new(아직 고르지 않음) · kept(✓ 눌러 업무가 만들어짐) · dropped(✕ 눌러 넣지 않음, 「다시 넣기」로 되돌릴 수 있음)
-- 업무가 만들어질 때 tasks.sourceKey = 'ai:<추천 id>' 로 남겨서 같은 추천이 두 번 업무가 되지 않게 한다.
-- 하루 요청 횟수(사람마다 20번)는 audit_log 의 AI 사용 기록(action = 'ai_task_suggest')으로 센다.
CREATE TABLE IF NOT EXISTS task_ai_suggestions (
  id         TEXT PRIMARY KEY,
  campId     TEXT NOT NULL,
  templateId TEXT,                              -- 추천을 받을 때 고른 템플릿 (없으면 NULL)
  batchId    TEXT NOT NULL,                     -- 한 번의 「AI 추천 받기」로 만들어진 묶음
  title      TEXT NOT NULL,
  offsetDays INTEGER,                           -- 캠프 시작일 기준 며칠 전(-)/후(+). 모르면 NULL
  priority   TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  section    TEXT NOT NULL DEFAULT '',
  reason     TEXT NOT NULL DEFAULT '',          -- AI 가 적은 한 줄 이유
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','kept','dropped')),
  createdAt  TEXT NOT NULL,
  createdBy  TEXT,
  decidedAt  TEXT,
  decidedBy  TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_sugg_lookup ON task_ai_suggestions(campId, templateId, status);
