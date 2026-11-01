-- 0028: 캠프 후 평가 설문 — 질문은 캠프 담당자가 정하고, 링크(토큰)를 받은 사람이 로그인 없이 답한다. 결과는 수정 권한이 있는 사람만 본다.
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY, campId TEXT NOT NULL, title TEXT NOT NULL, titleEn TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '[]',                 -- JSON: [{id,type:rating|choice|text,ko,en,options:[{ko,en}]}]
  status TEXT NOT NULL DEFAULT 'open',                  -- open | closed
  publicToken TEXT UNIQUE,                              -- 있으면 링크로 답할 수 있다(비우면 링크 중지)
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT '', deletedAt TEXT, isTest INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_surveys_camp ON surveys(campId, deletedAt);
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY, surveyId TEXT NOT NULL, answers TEXT NOT NULL,   -- JSON: {질문번호: 값}
  ipHash TEXT NOT NULL DEFAULT '',                      -- 같은 사람이 하루에 너무 많이 보내는 것만 막는 용도(주소 자체는 저장하지 않음)
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_survey_resp ON survey_responses(surveyId, createdAt);
